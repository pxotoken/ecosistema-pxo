export class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async createUser(userData) {
    const existingUserByWallet = await this.userRepository.getUserByWalletAddress(userData.wallet_address);
    if (existingUserByWallet) {
      await this.userRepository.updateLastAccess(existingUserByWallet.id);
      return existingUserByWallet;
    }

    if (userData.mail) {
      const existingUserByEmail = await this.userRepository.getUserByEmail(userData.mail);
      if (existingUserByEmail) {
        if (!existingUserByEmail.wallet_address) {
          return await this.userRepository.updateUser({
            id: existingUserByEmail.id,
            wallet_address: userData.wallet_address,
            provider_id: userData.provider_id
          });
        }
        await this.userRepository.updateLastAccess(existingUserByEmail.id);
        return existingUserByEmail;
      }
    }

    return await this.userRepository.createUser(userData);
  }

  async getUserByWalletAddress(walletAddress) {
    return await this.userRepository.getUserByWalletAddress(walletAddress);
  }

  async getUserByEmail(email) {
    return await this.userRepository.getUserByEmail(email);
  }

  async getUserById(id) {
    return await this.userRepository.getUserById(id);
  }

  async updateUser(userData) {
    return await this.userRepository.updateUser(userData);
  }

  async updateKYCStatus(userId, status) {
    return await this.userRepository.updateKYCStatus(userId, status);
  }

  async updateLastAccess(userId) {
    return await this.userRepository.updateLastAccess(userId);
  }

  async getOrCreateUser(walletAddress, email, providerId) {
    let user = await this.userRepository.getUserByWalletAddress(walletAddress);
    
    if (user) {
      await this.userRepository.updateLastAccess(user.id);
      return user;
    }

    if (!email || !providerId) {
      throw new Error('Email and provider ID are required to create a new user');
    }

    return await this.createUser({
      mail: email,
      provider_id: providerId,
      wallet_address: walletAddress,
      KYC_status: 'PENDING'
    });
  }
}
