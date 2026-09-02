import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto/auth.dto';

// Permission matrix - same as our frontend
const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: [
    'dashboard:view', 'dashboard:edit',
    'ingredients:view', 'ingredients:create', 'ingredients:edit', 'ingredients:delete',
    'recipes:view', 'recipes:create', 'recipes:edit', 'recipes:delete', 'recipes:pricing',
    'inventory:view', 'inventory:receive', 'inventory:adjust', 'inventory:delete',
    'orders:view', 'orders:create', 'orders:cancel', 'orders:refund',
    'kds:view', 'kds:manage',
    'nutrition:view', 'nutrition:edit',
    'analytics:view', 'analytics:export',
    'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete',
    'users:manage', 'settings:manage',
  ],
  MANAGER: [
    'dashboard:view',
    'ingredients:view', 'ingredients:create', 'ingredients:edit',
    'recipes:view', 'recipes:create', 'recipes:edit', 'recipes:pricing',
    'inventory:view', 'inventory:receive', 'inventory:adjust',
    'orders:view', 'orders:create', 'orders:cancel',
    'kds:view', 'kds:manage',
    'nutrition:view', 'nutrition:edit',
    'analytics:view', 'analytics:export',
    'suppliers:view', 'suppliers:create', 'suppliers:edit',
  ],
  HEAD_CHEF: [
    'dashboard:view',
    'ingredients:view', 'ingredients:create', 'ingredients:edit',
    'recipes:view', 'recipes:create', 'recipes:edit',
    'inventory:view', 'inventory:receive',
    'orders:view',
    'kds:view', 'kds:manage',
    'nutrition:view',
    'analytics:view',
    'suppliers:view',
  ],
  GUEST: [
    'dashboard:view',
    'recipes:view',
    'orders:view',
    'menu:view',
  ],
  SERVER: [
    'dashboard:view',
    'ingredients:view',
    'recipes:view',
    'orders:view', 'orders:create',
    'kds:view',
    'nutrition:view',
    'suppliers:view',
    'menu:view',
  ],
  INVENTORY: [
    'dashboard:view',
    'ingredients:view', 'ingredients:create', 'ingredients:edit',
    'recipes:view',
    'inventory:view', 'inventory:receive', 'inventory:adjust',
    'suppliers:view', 'suppliers:create', 'suppliers:edit',
  ],
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Skip password check if no password provided (passwordless mode)
    if (dto.password && dto.password !== '') {
      const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
      if (!validPassword) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const permissions = JSON.parse(user.permissions || '[]');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        permissions,
        organizationId: user.organizationId,
        locationId: user.locationId,
      },
    };
  }

  async register(dto: RegisterDto, currentUser: any) {
    // Only OWNER can create users
    if (currentUser.role !== 'OWNER') {
      throw new UnauthorizedException('Only owners can create users');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const permissions = ROLE_PERMISSIONS[dto.role || 'SERVER'] || ROLE_PERMISSIONS.SERVER;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || 'SERVER',
        permissions: JSON.stringify(permissions),
        organizationId: currentUser.organizationId,
        locationId: currentUser.locationId,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        organizationId: true,
        locationId: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      name: `${user.firstName} ${user.lastName}`,
      permissions: JSON.parse(user.permissions || '[]'),
    };
  }
}
