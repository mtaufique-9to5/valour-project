// Prisma CLI configuration (migrations, validation, client generation).
// Prisma 7 does not read .env files on its own, so local settings are loaded
// from .env.local when it exists (Node's built-in loader; existing environment
// variables are not overwritten). Values are never logged.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, env } from 'prisma/config'

const localEnvFile = fileURLToPath(new URL('./.env.local', import.meta.url))
if (existsSync(localEnvFile)) process.loadEnvFile(localEnvFile)

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Required; env() fails with the variable's name only, never its value.
    url: env('DATABASE_URL'),
    // Only needed by `prisma migrate dev` (local); optional elsewhere.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
})
