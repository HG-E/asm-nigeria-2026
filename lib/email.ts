import "server-only"

import nodemailer from "nodemailer"

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      pool: true,
      maxConnections: 3,
    })
  }
  return transporter
}

// Matches the exact disposable-account patterns this project's own test
// scripts and scripts/check-test-data.mjs use (e.g. `smoke-*`,
// `*@example.com`, `*test-fixture*`). A real registrant/author/reviewer
// email will never match this -- so this only ever silences mail aimed at
// throwaway test accounts, never a real person. Without this, every test
// run's notifications (registration confirmations, decision emails,
// welcome emails, ...) genuinely attempt delivery through the real SMTP
// account and come back as real "Address not found" bounces into the real
// inbox, exactly as happened repeatedly before this guard existed.
const TEST_RECIPIENT_PATTERN = /smoke|@example\.com$|test-fixture/i

export async function sendMail(options: { to: string; subject: string; html: string }) {
  if (TEST_RECIPIENT_PATTERN.test(options.to)) {
    console.log(`[sendMail] Skipping send to test-pattern address: ${options.to} (${options.subject})`)
    return
  }

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error("Email is not configured (EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD missing).")
  }

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}
