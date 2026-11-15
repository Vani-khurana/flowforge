import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';

// Security enforcement: Warn or enforce cryptographically secure JWT secret in production
if (nodeEnv === 'production' && (jwtSecret === 'fallback-secret-for-dev' || jwtSecret.length < 32)) {
  console.warn(
    '⚠️ [SECURITY ADVISORY] JWT_SECRET must be configured with at least 32 cryptographically random characters in production.'
  );
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || '',
  enableDemoRoleSwitch:
    process.env.ENABLE_DEMO_ROLE_SWITCH === 'true' ||
    (nodeEnv !== 'production' && process.env.ENABLE_DEMO_ROLE_SWITCH !== 'false'),
};
