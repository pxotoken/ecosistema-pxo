import { getServerSupabase } from '../../lib/supabase.js';

const supabase = getServerSupabase();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 KYC Requests API called');
    
    // Get status from query params
    const { status } = req.query;

    console.log('📊 Requested status:', status);

    if (!status) {
      return res.status(400).json({ error: 'Status parameter is required' });
    }

    // Get KYC requests - same as Next.js implementation
    const { data: requests, error } = await supabase
      .from('kyc_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching KYC requests:', error);
      return res.status(500).json({ error: 'Error fetching KYC requests' });
    }

    console.log('📋 Found requests:', requests?.length || 0);

    // Return data directly like Next.js
    console.log('✅ Returning requests:', requests?.length || 0);

    res.status(200).json(requests || []);
  } catch (error) {
    console.error('❌ Error in KYC requests API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
