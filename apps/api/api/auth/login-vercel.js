import { thirdwebAuth, JWT_EXPIRATION_SECONDS } from '../../lib/thirdwebAuthServer-simple.js';
import { fetchInAppWalletMetadataFromThirdweb } from '../../lib/thirdwebServer.js';
import { getServerSupabase } from '../../lib/supabase.js';
import { UserRepository } from '../../lib/repositories/UserRepository.js';
import { UserService } from '../../lib/services/UserService.js';

const supabase = getServerSupabase();
const userRepository = new UserRepository(supabase);
const userService = new UserService(userRepository);

export default async function handler(req, res) {
  // Set CORS headers for credentials
  const origin = req.headers.origin || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('🔍 Login API called (Vercel optimized)');
    const { payload } = req.body;

    if (!payload) {
      console.log('❌ Missing payload in request');
      res.status(400).json({ error: 'Missing payload' });
      return;
    }

    console.log('🔍 Verifying payload...');
    const verifiedPayload = await thirdwebAuth.verifyPayload({
      payload: payload.payload,
      signature: payload.signature
    });
    
    console.log('🔍 Payload verification result:', verifiedPayload);
    
    if (!verifiedPayload.valid) {
      console.log('❌ Invalid payload');
      res.status(401).json({ error: 'Invalid payload' });
      return;
    }

    const walletAddress = verifiedPayload.payload.address;
    console.log('🔍 Wallet address:', walletAddress);

    console.log('🔐 Auth provider candidates from verifyPayload:', {
      valid: verifiedPayload.valid,
      payloadAddress: verifiedPayload?.payload?.address,
      authProvider: verifiedPayload?.authProvider,
      provider: verifiedPayload?.provider,
      payloadProvider: verifiedPayload?.payload?.provider,
    });

    // Get wallet metadata from Thirdweb
    console.log('🔍 Searching for wallet metadata with params:', {
      queryBy: "walletAddress",
      walletAddress: walletAddress,
      thirdwebSecretKey: process.env.THIRDWEB_SECRET_KEY ? 'SET' : 'NOT_SET'
    });

    const walletData = await fetchInAppWalletMetadataFromThirdweb({
      queryBy: "walletAddress",
      walletAddress: walletAddress,
    });

    console.log('🔍 Wallet metadata search result:', {
      data: walletData,
      isArray: Array.isArray(walletData),
      length: walletData?.length,
      type: typeof walletData
    });

    let userEmail = '';
    let providerId = walletAddress;

    if (!walletData || walletData.length === 0) {
      console.log('❌ No wallet metadata found for address:', walletAddress);
      console.log('🔍 This is expected for external wallets like MetaMask');
      console.log('🔍 Proceeding with external wallet login...');

      console.log('🔐 Derived auth provider:', {
        providerClass: 'external_wallet',
        walletAddress,
      });
      
      // For external wallets like MetaMask, use wallet address as identifier
      userEmail = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}@wallet.local`;
      providerId = walletAddress;
    } else {
      const walletInfo = walletData[0];
      const { email, userId, linkedAccounts } = walletInfo;
      userEmail = email || linkedAccounts?.[0]?.details?.email || '';
      providerId = userId || walletAddress;

      const firstLinkedAccount = linkedAccounts?.[0] || null;
      const linkedAccountProvider =
        firstLinkedAccount?.provider ||
        firstLinkedAccount?.type ||
        firstLinkedAccount?.linkedAccountType ||
        firstLinkedAccount?.details?.provider ||
        firstLinkedAccount?.details?.type ||
        null;

      console.log('🔐 Derived auth provider:', {
        providerClass: 'in_app_wallet',
        walletInfoUserId: userId || null,
        walletInfoEmail: email || linkedAccounts?.[0]?.details?.email || null,
        linkedAccountProvider,
      });

      console.log('🔐 WalletInfo linkedAccounts[0] shape:', {
        keys: firstLinkedAccount ? Object.keys(firstLinkedAccount) : [],
        providerCandidateFields: {
          provider: firstLinkedAccount?.provider,
          type: firstLinkedAccount?.type,
          linkedAccountType: firstLinkedAccount?.linkedAccountType,
          detailsProvider: firstLinkedAccount?.details?.provider,
          detailsType: firstLinkedAccount?.details?.type,
          details: firstLinkedAccount?.details ? Object.keys(firstLinkedAccount.details) : null,
        },
      });
    }

    console.log('🔍 User info:', { userEmail, providerId, walletAddress });

    // Create or get user from Supabase
    let user = null;
    try {
      user = await userService.getOrCreateUser(walletAddress, userEmail, providerId);
      console.log('✅ User created/retrieved:', user.id);
    } catch (error) {
      console.error('❌ Error creating/getting user:', error);
      
      // Create user with minimal data as fallback
      try {
        user = await userService.createUser({
          mail: userEmail,
          provider_id: providerId,
          wallet_address: walletAddress,
          KYC_status: 'PENDING'
        });
        console.log('✅ User created with minimal data for external wallet');
      } catch (createError) {
        console.error('❌ Failed to create user:', createError);
        res.status(500).json({ error: 'Failed to create user' });
        return;
      }
    }

    // Generate JWT
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      address: walletAddress,
      chain_id: 1,
      domain: process.env.VITE_THIRDWEB_AUTH_DOMAIN || req.headers.host,
      expiration_time: (currentTimeInSeconds + JWT_EXPIRATION_SECONDS).toString(),
      invalid_before: currentTimeInSeconds.toString(),
      nonce: Math.random().toString(36).substring(2, 15)
    };

    console.log('🔍 Generating JWT...');
    const jwt = await thirdwebAuth.generateJWT({
      payload: jwtPayload,
    });

    console.log('✅ JWT generated successfully');
    
    // Set cookies with Vercel-optimized settings
    console.log('🍪 Setting cookies for Vercel...');
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Vercel production settings - simplified
      res.setHeader('Set-Cookie', [
        `pxo_jwt=${jwt}; HttpOnly; Path=/; Secure; SameSite=Lax; Max-Age=${30 * 60}`,
        `pxo_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; Secure; SameSite=Lax; Max-Age=${30 * 60}`
      ]);
    } else {
      // Development settings
      res.setHeader('Set-Cookie', [
        `pxo_jwt=${jwt}; Path=/; SameSite=Lax; Max-Age=${30 * 60}`,
        `pxo_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; SameSite=Lax; Max-Age=${30 * 60}`
      ]);
    }
    
    console.log('🍪 Cookies set successfully');
    
    // Log response headers to verify cookies were set
    console.log('🍪 Response headers after setting cookies:', JSON.stringify(res.getHeaders(), null, 2));
    
    // Check if Set-Cookie header was actually set
    const setCookieHeader = res.getHeader('Set-Cookie');
    console.log('🍪 Set-Cookie header value:', setCookieHeader);
    
    // Return success response with JWT for localStorage fallback
    res.status(200).json({
      success: true,
      jwt,
      user,
      expiresIn: JWT_EXPIRATION_SECONDS,
      message: 'Login successful (Vercel optimized)'
    });

  } catch (error) {
    console.error('❌ Error in login API:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Login failed',
      details: error.message 
    });
  }
}
