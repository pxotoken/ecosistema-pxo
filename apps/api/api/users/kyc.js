import { getServerSupabase } from '../../lib/supabase.js';
import { UserRepository } from '../../lib/repositories/UserRepository.js';
import { UserService } from '../../lib/services/UserService.js';

const supabase = getServerSupabase();
const userRepository = new UserRepository(supabase);
const userService = new UserService(userRepository);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in KYC API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleGet(req, res) {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing required parameter: user_id' });
  }

  try {
    const user = await userService.getUserById(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ 
      data: {
        KYC_status: user.KYC_status,
        legal_identification: user.legal_identification,
        imagen_KYC: user.imagen_KYC,
        selfie_pictures: user.selfie_pictures,
        identification_photos: user.identification_photos,
        passport: user.passport
      }
    });
  } catch (error) {
    console.error('Error fetching KYC data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch KYC data',
      details: error.message 
    });
  }
}

async function handlePost(req, res) {
  const { 
    user_id, 
    first_name, 
    last_name, 
    email, 
    phone, 
    country, 
    legal_identification_type,
    frontPhotoUrl,
    backPhotoUrl,
    passport,
    existingPassport,
    existingFrontPhoto,
    existingBackPhoto,
    KYC_status = 'VALIDATING'
  } = req.body;

  // Validaciones
  if (!user_id) {
    return res.status(400).json({ error: 'Missing required field: user_id' });
  }

  if (!['passport', 'dni'].includes(legal_identification_type)) {
    return res.status(400).json({ 
      error: 'Invalid document type. Must be "passport" or "dni"' 
    });
  }

  try {
    // Verificar que el usuario existe
    const existingUser = await userService.getUserById(user_id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Preparar datos de actualización para la tabla users
    const updateData = {
      id: user_id,
      first_name,
      last_name,
      mail: email,
      phone,
      country,
      legal_identification: legal_identification_type,
      KYC_status
    };

    // Manejar documentos según el tipo
    if (legal_identification_type === 'passport') {
      updateData.passport = passport || existingPassport || '';
      updateData.identification_photos = [];
    } else {
      // Para DNI: construir array con fotos en posiciones fijas [frontal, trasera]
      const frontPhoto = frontPhotoUrl || existingFrontPhoto;
      const backPhoto = backPhotoUrl || existingBackPhoto;
      
      // Mantener array con posiciones fijas para no perder el orden
      updateData.identification_photos = [
        frontPhoto || null,
        backPhoto || null
      ].filter(photo => photo !== null);
      
      updateData.passport = '';
    }

    // Actualizar datos de KYC en la tabla users
    const user = await userService.updateUser(updateData);

    // Crear registro en kyc_requests para el panel de administración
    const isPassport = legal_identification_type === 'passport';
    const kycRequestData = {
      user_id,
      first_name,
      last_name,
      email,
      phone,
      country,
      legal_identification_type,
      identification_photos: isPassport ? [] : (updateData.identification_photos || []),
      passport: isPassport ? (updateData.passport || null) : null,
      status: KYC_status
    };

    const { data: kycRequest, error: kycError } = await supabase
      .from('kyc_requests')
      .insert(kycRequestData)
      .select()
      .single();

    if (kycError) {
      console.error('Error creating KYC request:', kycError);
      // No fallar la operación si no se puede crear el registro de kyc_requests
    } else {
      console.log('✅ KYC request created:', kycRequest.id);
    }

    return res.status(200).json({ 
      data: user,
      message: 'KYC data submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting KYC data:', error);
    return res.status(400).json({ 
      error: 'Failed to submit KYC data',
      details: error.message 
    });
  }
}

async function handlePut(req, res) {
  const { user_id, KYC_status, request_id } = req.body;

  if (!user_id || !KYC_status) {
    return res.status(400).json({ 
      error: 'Missing required fields: user_id, KYC_status' 
    });
  }

  if (!['PENDING', 'VALIDATING', 'VALIDATED', 'REJECTED'].includes(KYC_status)) {
    return res.status(400).json({ 
      error: 'Invalid KYC status. Must be one of: PENDING, VALIDATING, VALIDATED, REJECTED' 
    });
  }

  try {
    // Actualizar estado en la tabla users
    const user = await userService.updateKYCStatus(user_id, KYC_status);
    
    // Si se proporciona request_id, actualizar también en kyc_requests
    if (request_id) {
      const { error: kycError } = await supabase
        .from('kyc_requests')
        .update({ 
          status: KYC_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', request_id);

      if (kycError) {
        console.error('Error updating KYC request:', kycError);
        // No fallar la operación si no se puede actualizar kyc_requests
      } else {
        console.log('✅ KYC request updated:', request_id);
      }
    }
    
    return res.status(200).json({ 
      data: user,
      message: `KYC status updated to ${KYC_status}`
    });
  } catch (error) {
    console.error('Error updating KYC status:', error);
    return res.status(400).json({ 
      error: 'Failed to update KYC status',
      details: error.message 
    });
  }
}


