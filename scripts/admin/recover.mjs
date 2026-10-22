// Emergency recovery for an administrator who lost access to their email or
// authenticator. Run on the server by someone with shell + database access.
//   node --conditions=react-server --env-file=.env.local scripts/admin/recover.mjs --email you@example.com [--password] [--mfa]
//     --password  set a new password (typed at a hidden prompt, never logged)
//     --mfa       turn two-factor off; it must be set up again at next sign-in
// Either change invalidates all of that user's sessions and reset links.
// Prints only what was changed; writes a sanitised [audit] line.
import { db } from '../../src/server/db.js'
import { hashPassword, passwordProblems } from '../../src/server/auth/password.js'
import { normalizeEmail } from '../../src/server/auth/service.js'
import { recordAudit } from '../../src/server/audit/audit.js'
import { ask, askNewPassword } from './prompt.mjs'

async function main() {
  const args = process.argv.slice(2)
  const email = normalizeEmail(args[args.indexOf('--email') + 1] ?? '')
  const doPassword = args.includes('--password')
  const doMfa = args.includes('--mfa')
  if (!args.includes('--email') || !email || (!doPassword && !doMfa)) {
    console.error('Usage: recover.mjs --email <address> [--password] [--mfa]')
    process.exitCode = 2
    return
  }
  if (!process.stdin.isTTY) throw new Error('Run this in an interactive terminal.')
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, password: true } })
  if (!user || !user.password) throw new Error('No administrator account with a password was found for that email.')
  if ((await ask(`Recover ${email}: ${[doPassword && 'new password', doMfa && 'reset two-factor'].filter(Boolean).join(' + ')}. Type YES to continue: `)) !== 'YES') {
    console.log('Cancelled.')
    return
  }
  const data = {}
  if (doPassword) data.password = await hashPassword(await askNewPassword(email, passwordProblems))
  if (doMfa) Object.assign(data, { twoFactorEnabled: false, twoFactorSecret: null })
  await db.user.update({ where: { id: user.id }, data })
  await recordAudit(db, { actorType: 'CLI', actorLabel: 'recover.mjs', action: 'admin_user.recover', targetType: 'user', targetId: String(user.id), after: { credentialReset: doPassword, mfaReset: doMfa } })
  console.log('Done. All existing sessions and reset links for this account are now invalid.')
}

main()
  .catch((err) => {
    console.error('Recovery failed:', err?.message ?? 'unknown error')
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
