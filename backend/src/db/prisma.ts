import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var prismaClientGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaClientGlobal ||
  new PrismaClient({
    log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (config.nodeEnv !== 'production') {
  globalThis.prismaClientGlobal = prisma;
}

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  provider: string;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      connected: true,
      latencyMs: Date.now() - start,
      provider: 'postgresql',
    };
  } catch (err: any) {
    return {
      connected: false,
      provider: 'postgresql',
      error: err.message || 'Database unreachable',
    };
  }
}
