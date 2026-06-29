import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = "Mailcach <noreply@mailcach.com>"
const PRIMARY = "#16a34a"
const PRIMARY_DARK = "#15803d"

// ── OTP in-memory store ──────────────────────────────────────────────────────

interface OtpEntry {
  otp: string
  expiresAt: number
  type: "register" | "reset"
}

const otpStore = new Map<string, OtpEntry>()

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function storeOtp(email: string, type: "register" | "reset"): string {
  const otp = generateOtp()
  otpStore.set(`${type}:${email}`, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 menit
    type,
  })
  return otp
}

export function verifyOtp(email: string, otp: string, type: "register" | "reset"): boolean {
  const entry = otpStore.get(`${type}:${email}`)
  if (!entry) return false
  if (entry.expiresAt < Date.now()) { otpStore.delete(`${type}:${email}`); return false }
  if (entry.otp !== otp) return false
  otpStore.delete(`${type}:${email}`)
  return true
}

// ── Email templates ──────────────────────────────────────────────────────────

function baseTemplate(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:${PRIMARY};border-radius:10px;padding:8px;vertical-align:middle;">
                    <img src="https://mailcach.com/favicon.svg" width="20" height="20" alt="" style="display:block;filter:brightness(0) invert(1);" />
                  </td>
                  <td style="padding-left:10px;font-size:16px;font-weight:600;color:#18181b;vertical-align:middle;">
                    Mailcach
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;padding:40px 40px 32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;font-size:12px;color:#a1a1aa;line-height:1.6;">
              Email ini dikirim otomatis. Jangan membalas email ini.<br/>
              &copy; ${new Date().getFullYear()} Mailcach. Semua hak dilindungi.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function otpBlock(otp: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td align="center">
        <div style="display:inline-block;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 40px;">
          <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:${PRIMARY};font-family:monospace;">${otp}</span>
        </div>
      </td>
    </tr>
  </table>`
}

// ── Send functions ───────────────────────────────────────────────────────────

export async function sendRegisterOtp(email: string, name: string, otp: string) {
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Verifikasi Email Kamu</h2>
    <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Halo, <strong>${name}</strong>!</p>
    <p style="margin:0;font-size:15px;color:#52525b;line-height:1.6;">
      Terima kasih sudah mendaftar di Mailcach. Masukkan kode OTP berikut untuk menyelesaikan pendaftaran:
    </p>

    ${otpBlock(otp)}

    <p style="margin:0 0 16px;font-size:13px;color:#71717a;line-height:1.6;">
      Kode berlaku selama <strong>10 menit</strong>. Jangan bagikan kode ini kepada siapapun.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f4f4f5;padding-top:16px;margin-top:8px;">
      <tr>
        <td style="font-size:12px;color:#a1a1aa;">
          Jika kamu tidak mendaftar di Mailcach, abaikan email ini.
        </td>
      </tr>
    </table>`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `${otp} — Kode Verifikasi Mailcach`,
    html: baseTemplate("Verifikasi Email", `Kode OTP kamu: ${otp}`, body),
  })
}

export async function sendForgotPasswordOtp(email: string, name: string, otp: string) {
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Reset Password</h2>
    <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Halo, <strong>${name}</strong>!</p>
    <p style="margin:0;font-size:15px;color:#52525b;line-height:1.6;">
      Kami menerima permintaan reset password untuk akun kamu. Masukkan kode OTP berikut:
    </p>

    ${otpBlock(otp)}

    <p style="margin:0 0 16px;font-size:13px;color:#71717a;line-height:1.6;">
      Kode berlaku selama <strong>10 menit</strong>. Jangan bagikan kode ini kepada siapapun.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f4f4f5;padding-top:16px;margin-top:8px;">
      <tr>
        <td style="font-size:12px;color:#a1a1aa;">
          Jika kamu tidak meminta reset password, abaikan email ini. Akun kamu aman.
        </td>
      </tr>
    </table>`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `${otp} — Kode Reset Password Mailcach`,
    html: baseTemplate("Reset Password", `Kode OTP reset password kamu: ${otp}`, body),
  })
}
