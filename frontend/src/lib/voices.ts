export interface Voice {
  id: string
  name: string
  gender: "Pria" | "Wanita"
  accent: string
  description: string
}

export const VOICES: Voice[] = [
  { id: "rachel", name: "Rachel", gender: "Wanita", accent: "American", description: "Jernih & profesional" },
  { id: "bella", name: "Bella", gender: "Wanita", accent: "American", description: "Hangat & ramah" },
  { id: "elli", name: "Elli", gender: "Wanita", accent: "British", description: "Elegan & formal" },
  { id: "adam", name: "Adam", gender: "Pria", accent: "American", description: "Dalam & berwibawa" },
  { id: "josh", name: "Josh", gender: "Pria", accent: "American", description: "Santai & natural" },
  { id: "antoni", name: "Antoni", gender: "Pria", accent: "British", description: "Tegas & percaya diri" },
]

export const CHARS_PER_PREVIEW = 200

export const CREDITS_PER_CHAR = 5

export const TOPUP_PACKAGES = [
  { id: "10k",  price: 10_000,  credits: 10_000 },
  { id: "25k",  price: 25_000,  credits: 27_500 },
  { id: "50k",  price: 50_000,  credits: 60_000 },
  { id: "100k", price: 100_000, credits: 130_000 },
]
