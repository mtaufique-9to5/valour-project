// Database connection settings for server code. `server-only` keeps this module
// (and anything parsed from DATABASE_URL) out of client bundles.
import 'server-only'

// Applied by the mariadb driver to every new connection
// (`SET @@sql_mode=?, @@time_zone=?`), for VALOUR's connections only:
// - strict mode rejects over-long or invalid values instead of silently
//   truncating them;
// - UTC session time keeps database-side defaults (CURRENT_TIMESTAMP) consistent
//   with the UTC values Prisma writes.
export const SESSION_VARIABLES = Object.freeze({
  sql_mode: 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION',
  time_zone: '+00:00',
})

// Turns a mysql:// or mariadb:// URL into driver options. Errors name the
// variable only — never its value or any part of it. Query parameters on the URL
// are not used; TLS and other options are configured explicitly when needed.
export function parseDatabaseUrl(raw, name = 'DATABASE_URL') {
  if (!raw) throw new Error(`${name} is not set (see .env.example).`)

  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${name} is not a valid URL (URL-encode special characters in the password).`)
  }
  if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
    throw new Error(`${name} must start with mysql:// or mariadb://.`)
  }

  let user, password, database
  try {
    user = decodeURIComponent(url.username)
    password = decodeURIComponent(url.password)
    database = decodeURIComponent(url.pathname.replace(/^\//, ''))
  } catch {
    throw new Error(`${name} contains invalid URL-encoding.`)
  }
  if (!url.hostname || !user || !database) {
    throw new Error(`${name} must include a user, host and database name.`)
  }

  return { host: url.hostname, port: url.port ? Number(url.port) : 3306, user, password, database }
}
