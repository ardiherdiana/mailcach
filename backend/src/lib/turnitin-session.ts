import fs from "fs"
import path from "path"

const SESSION_FILE = path.join(process.cwd(), "data", "turnitin-session.json")

export interface TurnitinSession {
  cookies: string
  userAgent: string
  assignmentId: string
  authorId: string
  updatedAt: string
  note?: string
}

export function loadTurnitinSession(): TurnitinSession | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null
    return JSON.parse(fs.readFileSync(SESSION_FILE, "utf8")) as TurnitinSession
  } catch {
    return null
  }
}

export function parseTurnitinCookies(raw: string): string {
  if (!raw.trim().startsWith("#")) return raw.trim()
  const parts: string[] = []
  for (const line of raw.split("\n")) {
    const l = line.trim()
    if (!l || l.startsWith("#")) continue
    const cols = l.split("\t")
    if (cols.length < 7) continue
    parts.push(`${cols[5]}=${cols[6]?.trim() ?? ""}`)
  }
  return parts.join("; ")
}

export function saveTurnitinSession(data: {
  cookies: string
  userAgent: string
  assignmentId: string
  authorId: string
  note?: string
}): TurnitinSession {
  const session: TurnitinSession = { ...data, updatedAt: new Date().toISOString() }
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true })
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), "utf8")
  return session
}

export function clearTurnitinSession(): void {
  if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE)
}
