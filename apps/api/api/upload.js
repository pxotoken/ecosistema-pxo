import { getServerSupabase } from '../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import { readFile, unlink } from 'fs/promises';
import os from 'os';

const supabase = getServerSupabase();
const bucket = 'pxos-files';
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    // Parse multipart form data using Formidable
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      keepExtensions: true,
      uploadDir: os.tmpdir(), // Use OS temp directory for cross-platform compatibility
      filter: ({ mimetype }) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        return allowedTypes.includes(mimetype);
      }
    });

    let fields, files;
    try {
      [fields, files] = await form.parse(req);
    } catch (parseError) {
      console.error('Formidable parse error:', parseError);
      return res.status(400).json({ 
        error: 'Failed to parse form data',
        details: parseError.message 
      });
    }
    
    const file = files.file?.[0];
    const folder = fields.folder?.[0] || bucket;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type again (in case filter didn't work)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only JPEG, PNG and WebP images are allowed.' 
      });
    }

    // Generate unique filename
    const fileExtension = file.mimetype.split('/')[1];
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    // Read file buffer using ES modules
    let fileBuffer;
    try {
      fileBuffer = await readFile(file.filepath);
    } catch (readError) {
      console.error('File read error:', readError);
      console.error('Attempted file path:', file.filepath);
      return res.status(500).json({ 
        error: 'Failed to read uploaded file',
        details: readError.message 
      });
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    // Clean up temporary file
    try {
      await unlink(file.filepath);
    } catch (unlinkError) {
      console.warn('Failed to delete temporary file:', unlinkError.message);
    }

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ 
        error: 'Failed to upload file to storage',
        details: error.message 
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return res.status(200).json({ 
      success: true,
      url: urlData.publicUrl,
      path: fileName,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
