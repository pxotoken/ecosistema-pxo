import { getServerSupabase } from '../../lib/supabase.js';
import { UserRepository } from '../../lib/repositories/UserRepository.js';
import { UserService } from '../../lib/services/UserService.js';
import { withAdminAuth } from '../../lib/authMiddleware.js';

const supabase = getServerSupabase();
const userRepository = new UserRepository(supabase);
const userService = new UserService(userRepository);

const ADMIN_UUID = "989e3702-b515-4d6e-8627-fa0142a1a88f";
const ADMIN_EMAIL = "admin@pxo.com";

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'PUT':
        return await handlePut(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in admin users API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleGet(req, res) {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('users')
      .select('id, first_name, last_name, mail, wallet_address, user_type, country, KYC_status, created_at, last_access, verificated', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`mail.ilike.%${search}%,wallet_address.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const usersWithRoles = data.map(user => ({
      ...user,
      is_admin: user.user_type?.includes(ADMIN_UUID) || user.mail === ADMIN_EMAIL,
      role: user.user_type?.includes(ADMIN_UUID) || user.mail === ADMIN_EMAIL ? 'admin' : 'user'
    }));

    return res.status(200).json({ 
      data: usersWithRoles,
      count,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

async function handlePut(req, res) {
  try {
    const { userId, action } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, action' 
      });
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let newUserType = user.user_type || '';

    if (action === 'grant_admin') {
      if (!newUserType.includes(ADMIN_UUID)) {
        newUserType = newUserType ? `${newUserType},${ADMIN_UUID}` : ADMIN_UUID;
      }
    } else if (action === 'revoke_admin') {
      newUserType = newUserType
        .split(',')
        .filter(uuid => uuid.trim() !== ADMIN_UUID)
        .join(',');
      
      if (!newUserType || newUserType.trim() === '') {
        newUserType = null;
      }
    } else {
      return res.status(400).json({ error: 'Invalid action. Use grant_admin or revoke_admin' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ user_type: newUserType })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const updatedUser = {
      ...data,
      is_admin: data.user_type?.includes(ADMIN_UUID) || data.mail === ADMIN_EMAIL,
      role: data.user_type?.includes(ADMIN_UUID) || data.mail === ADMIN_EMAIL ? 'admin' : 'user'
    };

    return res.status(200).json({ 
      data: updatedUser,
      message: `Admin role ${action === 'grant_admin' ? 'granted' : 'revoked'} successfully`
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export default withAdminAuth(handler);
