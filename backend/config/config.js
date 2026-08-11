/**
 * Central configuration.
 * Secrets must come from environment variables in production so they
 * are never committed to GitHub.
 */

const path = require('path');

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function envOrDev(name, devFallback) {
  if (process.env[name]) {
    return process.env[name];
  }

  if (isProduction) {
    throw new Error(`${name} must be set in production`);
  }

  return devFallback;
}

const config = {
  port: Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 3000,
  nodeEnv,
  isProduction,

  jwtSecret: envOrDev('JWT_SECRET', 'dev-only-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  databasePath:
    process.env.DATABASE_PATH ||
    path.join(__dirname, '..', '..', 'database', 'tournament.db'),

  defaultAdmin: {
    username: envOrDev('ADMIN_USERNAME', 'admin'),
    password: envOrDev('ADMIN_PASSWORD', 'changeme'),
  },
};

module.exports = config;
