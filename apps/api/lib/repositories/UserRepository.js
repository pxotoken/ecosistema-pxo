export class UserRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async createUser(userData) {
    const { data, error } = await this.supabase
      .from('users')
      .insert([{
        provider_id: userData.provider_id,
        mail: userData.mail,
        wallet_address: userData.wallet_address,
        KYC_status: userData.KYC_status || 'PENDING',
        first_name: userData.first_name,
        last_name: userData.last_name,
        profile_picture: userData.profile_picture,
        country: userData.country,
        last_access: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  async getUserByWalletAddress(walletAddress) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user by wallet address:', error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
  }

  async getUserByEmail(email) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('mail', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user by email:', error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
  }

  async getUserById(id) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user by ID:', error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
  }

  async updateUser(userData) {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  async updateLastAccess(userId) {
    const { error } = await this.supabase
      .from('users')
      .update({
        last_access: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating last access:', error);
      throw new Error(`Failed to update last access: ${error.message}`);
    }
  }

  async updateKYCStatus(userId, status) {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        KYC_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating KYC status:', error);
      throw new Error(`Failed to update KYC status: ${error.message}`);
    }

    return data;
  }

  async getAllActiveUsers() {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, mail, first_name, last_name')
      .eq('verificated', true)
      .not('mail', 'is', null);

    if (error) {
      console.error('Error fetching active users:', error);
      throw new Error(`Failed to fetch active users: ${error.message}`);
    }

    return data || [];
  }
}
