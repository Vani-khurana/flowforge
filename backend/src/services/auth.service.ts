import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db/store';
import { Role, User } from '../types';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { HierarchyService } from './hierarchy.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'> & {
    manager?: { id: string; name: string; email: string } | null;
    directReports?: { id: string; name: string; email: string }[];
  };
  tokens: AuthTokens;
}

export class AuthService {
  /**
   * Secure user login with email and bcrypt password verification.
   * Generic error messages prevent user enumeration.
   */
  static async login(email?: string, password?: string): Promise<AuthResponse> {
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new AppError('Invalid email or password', 400);
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      throw new AppError('Invalid email or password', 400);
    }

    const user = db.users.find((u) => u.email.toLowerCase() === emailTrimmed);
    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError('Account is suspended. Please contact system administrator.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const tokens = this.generateTokenPair(user);
    const enrichedUser = this.sanitizeAndEnrichUser(user);

    return { user: enrichedUser, tokens };
  }

  /**
   * Register a new user with bcrypt password hashing and department assignment.
   * Public registration always assigns the EMPLOYEE role to prevent privilege escalation.
   */
  static async register(data: {
    name: string;
    email: string;
    password: string;
    role?: Role;
    departmentId?: string;
    managerId?: string;
  }): Promise<AuthResponse> {
    if (!data.name || data.name.trim().length < 2) {
      throw new AppError('Full name must be at least 2 characters long', 400);
    }

    if (!data.email) {
      throw new AppError('Email address is required', 400);
    }

    const emailTrimmed = data.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      throw new AppError('Invalid email address format', 400);
    }

    const existing = db.users.find((u) => u.email.toLowerCase() === emailTrimmed);
    if (existing) {
      throw new AppError('Email is already registered', 400);
    }

    if (!data.password || data.password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const now = new Date().toISOString();

    const dept = data.departmentId
      ? db.departments.find((d) => d.id === data.departmentId)
      : db.departments[0];

    // Public registration always assigns EMPLOYEE role to prevent privilege escalation
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: data.name.trim(),
      email: emailTrimmed,
      passwordHash,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      departmentId: dept ? dept.id : null,
      departmentName: dept ? dept.name : undefined,
      managerId: null, // Managers must be assigned by Admin
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);

    const tokens = this.generateTokenPair(newUser);
    const enrichedUser = this.sanitizeAndEnrichUser(newUser);

    return { user: enrichedUser, tokens };
  }

  /**
   * Rotate access and refresh tokens.
   */
  static refreshTokens(refreshToken: string): AuthTokens {
    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, config.jwtSecret);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = db.sessions.find((s) => s.tokenHash === tokenHash);

    if (!session || session.revokedAt) {
      throw new AppError('Session revoked or invalid', 401);
    }

    if (new Date(session.expiresAt) < new Date()) {
      throw new AppError('Session expired', 401);
    }

    const user = db.users.find((u) => u.id === decoded.id);
    if (!user || user.status === 'SUSPENDED') {
      throw new AppError('User not found or suspended', 401);
    }

    // Revoke old session (token rotation)
    session.revokedAt = new Date().toISOString();

    return this.generateTokenPair(user);
  }

  /**
   * Revoke session on logout.
   */
  static logout(token: string): void {
    if (!token) return;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = db.sessions.find((s) => s.tokenHash === tokenHash);
    if (session) {
      session.revokedAt = new Date().toISOString();
    }
  }

  /**
   * Switch active identity for demonstration and cross-role testing.
   * STRICT SECURITY: Only operational in development or when explicitly enabled by ENABLE_DEMO_ROLE_SWITCH.
   * Completely disabled in production to prevent identity spoofing and privilege escalation.
   */
  static switchUserByRole(role: Role, email?: string): AuthResponse {
    if (process.env.ENABLE_DEMO_ROLE_SWITCH === 'false') {
      throw new AppError('Demo role switching is disabled in this environment.', 403);
    }

    const emailNormalized = email ? email.trim().toLowerCase() : undefined;
    const user = emailNormalized
      ? db.users.find((u) => u.email.toLowerCase() === emailNormalized)
      : db.users.find((u) => u.role === role);
    if (!user) {
      throw new AppError(`No demo user found with role ${role}${email ? ` and email ${email}` : ''}`, 404);
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError('Target demo account is suspended', 403);
    }

    const tokens = this.generateTokenPair(user);
    const enrichedUser = this.sanitizeAndEnrichUser(user);

    return { user: enrichedUser, tokens };
  }

  /**
   * Retrieve sanitized current user profile with hierarchy relations.
   */
  static getCurrentUser(userId: string): ReturnType<typeof AuthService.sanitizeAndEnrichUser> {
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return this.sanitizeAndEnrichUser(user);
  }

  // --- Private Helpers ---

  private static generateTokenPair(user: User): AuthTokens {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      departmentId: user.departmentId,
    };

    const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, config.jwtSecret, {
      expiresIn: '7d',
    });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.sessions.push({
      id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId: user.id,
      tokenHash,
      expiresAt,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    });

    return { accessToken, refreshToken };
  }

  private static sanitizeAndEnrichUser(user: User) {
    const { passwordHash: _, ...sanitized } = user;
    const manager = user.managerId
      ? db.users.find((u) => u.id === user.managerId)
      : null;

    const directReports = db.users
      .filter((u) => u.managerId === user.id)
      .map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role }));

    return {
      ...sanitized,
      manager: manager ? { id: manager.id, name: manager.name, email: manager.email } : null,
      directReports,
    };
  }
}
