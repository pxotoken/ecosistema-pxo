import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const BUCKET = 'pxos-files';
const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DEFAULT_FOLDER = 'identification-photos';

export interface UploadResult {
  url: string;
  path: string;
}

export class KycStorage {
  constructor(private readonly supabase: SupabaseClient) {}

  static isAllowedMime(mimeType: string): boolean {
    return ALLOWED_MIMES.includes(mimeType);
  }

  async uploadImage(
    buffer: Buffer,
    mimeType: string,
    folder: string = DEFAULT_FOLDER,
  ): Promise<UploadResult> {
    if (!KycStorage.isAllowedMime(mimeType)) {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }
    const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
    const filename = `${folder}/${randomUUID()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(filename);
    return { url: data.publicUrl, path: filename };
  }
}
