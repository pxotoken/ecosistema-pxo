import type { CreateUserInput, UpdateUserInput, User, UserRepository } from '../repositories/UserRepository.js';

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async createUser(userData: CreateUserInput): Promise<User> {
    if (userData.wallet_address) {
      const existingByWallet = await this.repo.getUserByWalletAddress(userData.wallet_address);
      if (existingByWallet) {
        await this.repo.updateLastAccess(existingByWallet.id);
        return existingByWallet;
      }
    }

    if (userData.mail) {
      const existingByEmail = await this.repo.getUserByEmail(userData.mail);
      if (existingByEmail) {
        if (!existingByEmail.wallet_address && userData.wallet_address) {
          return await this.repo.updateUser({
            id: existingByEmail.id,
            wallet_address: userData.wallet_address,
            provider_id: userData.provider_id,
          });
        }
        await this.repo.updateLastAccess(existingByEmail.id);
        return existingByEmail;
      }
    }

    return await this.repo.createUser(userData);
  }

  async getOrCreateUser(walletAddress: string, email: string, providerId: string): Promise<User> {
    const user = await this.repo.getUserByWalletAddress(walletAddress);
    if (user) {
      await this.repo.updateLastAccess(user.id);
      return user;
    }
    if (!email || !providerId) {
      throw new Error('Email and provider ID are required to create a new user');
    }
    return await this.createUser({
      mail: email,
      provider_id: providerId,
      wallet_address: walletAddress,
      KYC_status: 'PENDING',
    });
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.repo.getUserByWalletAddress(walletAddress);
  }

  async updateUser(userData: UpdateUserInput): Promise<User> {
    return this.repo.updateUser(userData);
  }
}
