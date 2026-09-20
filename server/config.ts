import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it in your .env file.`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtAccessSecret: requireEnv('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  accessTokenExpiry: '15m',
  refreshTokenExpiryDays: 7,
  isProduction: process.env.NODE_ENV === 'production',
};