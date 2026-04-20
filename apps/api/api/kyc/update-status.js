import { getServerSupabase } from '../../lib/supabase.js';
import { UserService } from '../../lib/services/UserService.js';
import { UserRepository } from '../../lib/repositories/UserRepository.js';

const supabase = getServerSupabase();
const userRepository = new UserRepository(supabase);
const userService = new UserService(userRepository);

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Update KYC Status API called');
    
    const { requestId, status, rejectionReason } = req.body;

    if (!requestId || !status) {
      return res.status(400).json({ error: 'Missing required fields: requestId, status' });
    }

    if (!['PENDING', 'VALIDATING', 'VALIDATED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: PENDING, VALIDATING, VALIDATED, REJECTED' 
      });
    }

    // Get the KYC request
    const { data: kycRequest, error: fetchError } = await supabase
      .from('kyc_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !kycRequest) {
      console.error('❌ Error fetching KYC request:', fetchError);
      return res.status(404).json({ error: 'KYC request not found' });
    }

    console.log('📋 Found KYC request:', kycRequest.id, 'for user:', kycRequest.user_id);

    // Update KYC request status
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'REJECTED' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    if (status === 'VALIDATED') {
      updateData.reviewed_at = new Date().toISOString();
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('kyc_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating KYC request:', updateError);
      return res.status(500).json({ error: 'Failed to update KYC request' });
    }

    console.log('✅ KYC request updated:', updatedRequest.id);

    // Update user KYC status
    const userUpdateData = {
      KYC_status: status
    };

    // If validated, update user information
    if (status === 'VALIDATED') {
      userUpdateData.first_name = kycRequest.first_name;
      userUpdateData.last_name = kycRequest.last_name;
      userUpdateData.phone = kycRequest.phone;
      userUpdateData.country = kycRequest.country;
      userUpdateData.legal_identification = kycRequest.legal_identification_type;

      if (kycRequest.legal_identification_type === 'passport') {
        userUpdateData.passport = kycRequest.passport;
        userUpdateData.identification_photos = [];
      } else {
        userUpdateData.identification_photos = kycRequest.identification_photos;
        userUpdateData.passport = '';
      }
    }

    const updatedUser = await userService.updateUser({
      id: kycRequest.user_id,
      ...userUpdateData
    });

    console.log('✅ User KYC status updated:', updatedUser.id);

    return res.status(200).json({
      data: {
        kycRequest: updatedRequest,
        user: updatedUser
      },
      message: `KYC status updated to ${status}`
    });

  } catch (error) {
    console.error('❌ Error in update KYC status API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}