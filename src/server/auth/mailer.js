// Outgoing email through any SMTP server or transactional provider's SMTP relay.
// Configured only from environment variables (.env.local); nothing is hard-coded.
//   SMTP_HOST, SMTP_PORT (465 = implicit TLS, otherwise STARTTLS), SMTP_USER, SMTP_PASS, MAIL_FROM
// When SMTP is not configured, sending fails closed with a logged warning: the
// reset link is never written to logs.
import 'server-only'
import nodemailer from 'nodemailer'

let transport

export function mailConfigured(env = process.env) {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.MAIL_FROM)
}

function getTransport(env = process.env) {
  if (!transport) {
    const port = Number(env.SMTP_PORT)
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  }
  return transport
}

/** Returns true when the message was handed to the SMTP server. Never throws. */
export async function sendMail({ to, subject, text, html }) {
  if (!mailConfigured()) {
    console.warn('[mail] SMTP is not configured (SMTP_HOST, SMTP_PORT, MAIL_FROM); message not sent')
    return false
  }
  try {
    await getTransport().sendMail({ from: process.env.MAIL_FROM, to, subject, text, html })
    return true
  } catch {
    console.error('[mail] sending failed')
    return false
  }
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function passwordResetMessage({ firstName, link, minutes }) {
  const hello = firstName ? `Hello ${firstName},` : 'Hello,'
  const text = `${hello}\n\nA password reset was requested for your VALOUR admin account.\n\nSet a new password: ${link}\n\nThis link works once and expires in ${minutes} minutes. Your two-factor authentication stays on.\nIf you did not ask for this, you can ignore this email; your password has not changed.\n`
  const html = `<p>${esc(hello)}</p><p>A password reset was requested for your VALOUR admin account.</p><p><a href="${esc(link)}">Set a new password</a></p><p>This link works once and expires in ${minutes} minutes. Your two-factor authentication stays on.</p><p>If you did not ask for this, you can ignore this email; your password has not changed.</p>`
  return { subject: 'Reset your VALOUR admin password', text, html }
}
