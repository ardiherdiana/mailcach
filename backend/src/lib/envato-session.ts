import fs from "fs"
import path from "path"

const SESSION_FILE = path.join(process.cwd(), "data", "envato-session.json")

export interface PuppeteerCookie {
  name: string
  value: string
  domain: string
  path: string
  secure: boolean
  expires: number
}

export interface EnvatoSession {
  cookies: string              // header string untuk fetch biasa
  rawCookies: PuppeteerCookie[] // structured untuk Puppeteer
  userAgent: string
  updatedAt: string
  note?: string
}

export function loadSession(): EnvatoSession | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null
    return JSON.parse(fs.readFileSync(SESSION_FILE, "utf8")) as EnvatoSession
  } catch {
    return null
  }
}

// Konversi Netscape cookie format → header string + structured cookies
export function parseNetscapeCookies(raw: string): { header: string; cookies: PuppeteerCookie[] } {
  if (!raw.trim().startsWith("#")) {
    // Sudah header string — tidak bisa dapat structured cookies
    return { header: raw.trim(), cookies: [] }
  }

  const cookies: PuppeteerCookie[] = []
  const parts: string[] = []

  for (const line of raw.split("\n")) {
    const l = line.trim()
    if (!l || l.startsWith("#")) continue
    const cols = l.split("\t")
    if (cols.length < 7) continue

    const [domain, , cookiePath, secureStr, expiryStr, name, value] = cols
    const trimmedValue = value?.trim() ?? ""

    cookies.push({
      name,
      value: trimmedValue,
      domain: domain.startsWith(".") ? domain : `.${domain}`,
      path: cookiePath ?? "/",
      secure: secureStr?.toUpperCase() === "TRUE",
      expires: parseInt(expiryStr ?? "0", 10) || 0,
    })
    parts.push(`${name}=${trimmedValue}`)
  }

  return { header: parts.join("; "), cookies }
}

export function saveSession(data: { cookies: string; rawCookies: PuppeteerCookie[]; userAgent: string; note?: string }): EnvatoSession {
  const session: EnvatoSession = { ...data, updatedAt: new Date().toISOString() }
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true })
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), "utf8")
  return session
}

export function clearSession(): void {
  if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE)
}
