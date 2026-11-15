import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../services/auth.service';
import { db } from '../db/store';
import { config } from '../config/env';
import jwt from 'jsonwebtoken';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createApp } from '../app';

describe('AuthService & Production Authentication Security', () => {
  beforeEach(() => {
    // Reset DataStore state
    (db as any).seed();
  });

  it('authenticates valid credentials with bcrypt comparison', async () => {
    const result = await AuthService.login('employee@flowforge.internal', 'Password123!');
    expect(result).toBeDefined();
    expect(result.user.email).toBe('employee@flowforge.internal');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    // Verify password hash is sanitized and not returned
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it('rejects incorrect password with generic 401 message', async () => {
    await expect(
      AuthService.login('employee@flowforge.internal', 'WrongPassword!')
    ).rejects.toThrow('Invalid email or password');
  });

  it('rejects login when password is missing', async () => {
    await expect(
      AuthService.login('employee@flowforge.internal', '')
    ).rejects.toThrow('Invalid email or password');
  });

  it('rejects login for non-existent users with generic message to prevent enumeration', async () => {
    await expect(
      AuthService.login('nobody@flowforge.internal', 'Password123!')
    ).rejects.toThrow('Invalid email or password');
  });

  it('rejects login for suspended accounts with 403', async () => {
    const user = db.users.find((u) => u.email === 'employee@flowforge.internal')!;
    user.status = 'SUSPENDED';

    await expect(
      AuthService.login('employee@flowforge.internal', 'Password123!')
    ).rejects.toThrow('Account is suspended');
  });

  it('registers new user and enforces EMPLOYEE role (prevents privilege escalation)', async () => {
    const regResult = await AuthService.register({
      name: 'Jane Attacker',
      email: 'jane.attacker@flowforge.internal',
      password: 'SecurePassword2026!',
      role: 'ADMIN' as any, // Attacker tries to register as ADMIN
      departmentId: 'dept-1',
    });

    // Role MUST be forced to EMPLOYEE
    expect(regResult.user.name).toBe('Jane Attacker');
    expect(regResult.user.role).toBe('EMPLOYEE');
    expect(regResult.tokens.accessToken).toBeDefined();

    // Verify stored password in db is properly hashed
    const stored = db.users.find((u) => u.email === 'jane.attacker@flowforge.internal');
    expect(stored).toBeDefined();
    expect(stored?.role).toBe('EMPLOYEE');
    expect(stored?.passwordHash).not.toBe('SecurePassword2026!');
    expect(stored?.passwordHash?.startsWith('$2')).toBe(true);
  });

  it('supports token refresh and session rotation', async () => {
    const loginResult = await AuthService.login('employee@flowforge.internal', 'Password123!');
    const newTokens = AuthService.refreshTokens(loginResult.tokens.refreshToken);
    expect(newTokens.accessToken).toBeDefined();
    expect(newTokens.refreshToken).toBeDefined();

    // Reusing the rotated refresh token should fail
    expect(() => AuthService.refreshTokens(loginResult.tokens.refreshToken)).toThrow();
  });

  it('supports session revocation on logout', async () => {
    const loginResult = await AuthService.login('employee@flowforge.internal', 'Password123!');
    AuthService.logout(loginResult.tokens.refreshToken);
    expect(() => AuthService.refreshTokens(loginResult.tokens.refreshToken)).toThrow();
  });

  it('restricts demo role-switching when disabled or in production', () => {
    const originalDemo = config.enableDemoRoleSwitch;
    try {
      (config as any).enableDemoRoleSwitch = false;
      expect(() => AuthService.switchUserByRole('ADMIN')).toThrow('Demo role switching is disabled');
    } finally {
      (config as any).enableDemoRoleSwitch = originalDemo;
    }
  });

  it('middleware rejects tampered or invalid JWT tokens', () => {
    let status = 0;
    let jsonBody: any = null;
    const req: any = {
      headers: { authorization: 'Bearer invalid-tampered-token-xyz' },
      query: {},
    };
    const res: any = {
      status: (code: number) => {
        status = code;
        return {
          json: (b: any) => {
            jsonBody = b;
          },
        };
      },
    };
    let nextCalled = false;
    authenticate(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(status).toBe(401);
    expect(jsonBody?.message).toContain('Invalid or expired authorization token');
  });

  it('middleware rejects tokens passed via URL query parameters', () => {
    const token = jwt.sign({ id: 'user-employee', role: 'EMPLOYEE' }, config.jwtSecret);
    let status = 0;
    let jsonBody: any = null;
    const req: any = {
      headers: {},
      query: { token }, // Token passed in query string should be ignored
    };
    const res: any = {
      status: (code: number) => {
        status = code;
        return {
          json: (b: any) => {
            jsonBody = b;
          },
        };
      },
    };
    let nextCalled = false;
    authenticate(req, res, () => {
      nextCalled = true;
    });

    // Must be rejected with 401 because query param tokens are forbidden
    expect(nextCalled).toBe(false);
    expect(status).toBe(401);
  });
});
