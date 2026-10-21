// Shared database client for server code (route handlers, server actions,
// server components). `server-only` makes the build fail if this module is ever
// imported from a client component, so database code and credentials cannot
// reach the browser.
import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { parseDatabaseUrl, SESSION_VARIABLES } from './db-config.js'

// Small pool: one web process on a local/shared MariaDB server.
const CONNECTION_LIMIT = 5

function createClient() {
  // Pool options for the mariadb driver. parseDatabaseUrl never puts the URL or
  // password into its errors; session variables (strict SQL mode, UTC) are set
  // on every new connection.
  const adapter = new PrismaMariaDb({
    ...parseDatabaseUrl(process.env.DATABASE_URL),
    connectionLimit: CONNECTION_LIMIT,
    sessionVariables: SESSION_VARIABLES,
  })
  return new PrismaClient({
    adapter,
    // Query logging stays off so SQL parameters never end up in logs.
    log: ['warn', 'error'],
  })
}

// Reuse one client across hot reloads in development instead of opening a new
// pool on every file change.
const globalForPrisma = globalThis

export const db = globalForPrisma.valourPrisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.valourPrisma = db
