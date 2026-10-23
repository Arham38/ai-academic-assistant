import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z
    .string()
    .min(8, 'JWT_SECRET must be at least 8 characters long')
    .default('dev_jwt_secret_key_change_in_prod'),
  INTERNAL_SERVICE_SECRET: z
    .string()
    .min(8, 'INTERNAL_SERVICE_SECRET must be at least 8 characters long')
    .default('dev_internal_mesh_key_change_in_prod'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/academic_assistant'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  INTERNAL_FASTAPI_URL: z.string().url().default('http://localhost:8000'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formattedErrors = result.error.format();
    // eslint-disable-next-line no-console
    console.error('[-] Fatal Environment Validation Error:');
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(formattedErrors, null, 2));
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type EnvConfig = z.infer<typeof envSchema>;
