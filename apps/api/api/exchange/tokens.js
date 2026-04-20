import { getServerSupabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Tokens API called');
    
    const supabase = getServerSupabase();

    // Get all tokens
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select('*')
      .order('symbol');

    if (error) {
      console.error('❌ Error fetching tokens:', error);
      return res.status(500).json({ error: 'Failed to fetch tokens' });
    }

    console.log('✅ Tokens fetched:', tokens.length);

    res.status(200).json({
      success: true,
      tokens: tokens || []
    });

  } catch (error) {
    console.error('❌ Error in tokens API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
