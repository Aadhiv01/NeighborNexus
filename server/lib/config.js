const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/NeighborNexus'),
  JWT_SECRET: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
});

const env = schema.parse(process.env);

if (!env.JWT_SECRET) {
  if (env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  env.JWT_SECRET = 'insecure-dev-secret-change-me';
  process.env.JWT_SECRET = env.JWT_SECRET;
  console.warn('[warn] JWT_SECRET is not set. Using an insecure development default.');
}

module.exports = {
  ...env,
  isProduction: env.NODE_ENV === 'production',
  corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
};
