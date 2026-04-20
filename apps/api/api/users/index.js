import { getServerSupabase } from '../../lib/supabase.js';
import { UserRepository } from '../../lib/repositories/UserRepository.js';
import { UserService } from '../../lib/services/UserService.js';

const supabase = getServerSupabase();
const userRepository = new UserRepository(supabase);
const userService = new UserService(userRepository);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
    console.error('Error in users API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleGet(req, res) {
  const { wallet_address, email, id } = req.query;

  if (wallet_address) {
    const user = await userService.getUserByWalletAddress(wallet_address);
    return res.status(200).json({ data: user });
  }

  if (email) {
    const user = await userService.getUserByEmail(email);
    return res.status(200).json({ data: user });
  }

  if (id) {
    const user = await userService.getUserById(id);
    return res.status(200).json({ data: user });
  }

  return res.status(400).json({ error: 'Missing required parameter: wallet_address, email, or id' });
}

async function handlePost(req, res) {
  const { mail, provider_id, wallet_address, KYC_status, first_name, last_name, profile_picture, country } = req.body;

  if (!mail || !provider_id || !wallet_address) {
    return res.status(400).json({ 
      error: 'Missing required fields: mail, provider_id, wallet_address' 
    });
  }

  try {
    const user = await userService.createUser({
      mail,
      provider_id,
      wallet_address,
      KYC_status,
      first_name,
      last_name,
      profile_picture,
      country
    });

    return res.status(201).json({ data: user });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(400).json({ 
      error: 'Failed to create user',
      details: error.message 
    });
  }
}

async function handlePut(req, res) {
  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' });
  }

  try {
    const user = await userService.updateUser({
      id,
      ...updateData
    });

    return res.status(200).json({ data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(400).json({ 
      error: 'Failed to update user',
      details: error.message 
    });
  }
}





