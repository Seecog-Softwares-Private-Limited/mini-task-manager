import { Injectable } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByIdForAuth(id: string): Promise<{ id: string; email: string } | null> {
    const user = await this.usersRepository.findById(id);
    if (!user) return null;
    return { id: user.id, email: user.email };
  }

  async validatePassword(userId: string, plainPassword: string): Promise<boolean> {
    const user = await this.usersRepository.findById(userId);
    if (!user?.passwordHash) return false;
    return bcrypt.compare(plainPassword, user.passwordHash);
  }

  async create(data: { email: string; fullName: string; password: string }): Promise<UserEntity> {
    const hash = await bcrypt.hash(data.password, 10);
    return this.usersRepository.create({
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      passwordHash: hash,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.usersRepository.deleteById(id);
  }
}
