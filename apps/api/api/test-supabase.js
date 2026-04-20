import { getServerSupabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Verificar variables de entorno
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseSecretKey: !!process.env.SUPABASE_SECRET_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
    };

    console.log('🔍 Environment check:', envCheck);

    // Intentar conectar a Supabase
    const supabase = getServerSupabase();
    
    // Probar una consulta simple
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection error:', error);
      return res.status(500).json({
        error: 'Supabase connection failed',
        details: error.message,
        envCheck
      });
    }

    console.log('✅ Supabase connection successful');
    
    res.status(200).json({
      success: true,
      message: 'Supabase connection successful',
      envCheck,
      data: data
    });

  } catch (error) {
    console.error('❌ Error testing Supabase:', error);
    res.status(500).json({
      error: 'Failed to test Supabase connection',
      details: error.message
    });
  }
}
