import bcrypt from 'bcryptjs';
import { db } from '../db/store';
import { Department, Role, User } from '../types';
import { AppError } from '../middleware/errorHandler';

export class UserService {
  static listUsers(): Omit<User, 'passwordHash'>[] {
    return db.users.map((u) => {
      const { passwordHash: _, ...sanitized } = u;
      const manager = u.managerId ? db.users.find((m) => m.id === u.managerId) : null;
      return {
        ...sanitized,
        managerName: manager?.name,
      };
    });
  }

  static createUser(payload: {
    name: string;
    email: string;
    role: Role;
    departmentId?: string;
    managerId?: string;
    password?: string;
  }): Omit<User, 'passwordHash'> {
    if (db.users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new AppError('User with this email already exists', 409);
    }

    const dept = payload.departmentId
      ? db.departments.find((d) => d.id === payload.departmentId)
      : undefined;

    const manager = payload.managerId
      ? db.users.find((m) => m.id === payload.managerId)
      : undefined;

    const passwordHash = bcrypt.hashSync(payload.password || 'Password123!', 10);
    const now = new Date().toISOString();

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: payload.name,
      email: payload.email.toLowerCase(),
      passwordHash,
      role: payload.role,
      status: 'ACTIVE',
      departmentId: payload.departmentId || null,
      departmentName: dept?.name,
      managerId: payload.managerId || null,
      managerName: manager?.name,
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);

    const { passwordHash: _, ...sanitized } = newUser;
    return sanitized;
  }

  static listDepartments(): Department[] {
    return db.departments;
  }

  static createDepartment(payload: { name: string; code: string; managerId?: string }): Department {
    if (db.departments.some((d) => d.name.toLowerCase() === payload.name.toLowerCase())) {
      throw new AppError('Department already exists', 409);
    }

    const now = new Date().toISOString();
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: payload.name,
      code: payload.code.toUpperCase(),
      managerId: payload.managerId || null,
      createdAt: now,
      updatedAt: now,
    };

    db.departments.push(newDept);
    return newDept;
  }
}
