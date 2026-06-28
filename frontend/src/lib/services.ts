export type ServiceId = "elevenlabs" | "envato"

export interface DownloadService {
  id: "envato"
  name: string
  tagline: string
  iconBg: string
  acceptedDomains: string[]
  exampleUrl: string
  fileTypes: string[]
  creditsPerDownload: number // 1 kredit = Rp 1
}

export const DOWNLOAD_SERVICES: DownloadService[] = [
  {
    id: "envato",
    name: "Envato Elements",
    tagline: "Template, musik, font, footage, dan aset kreatif premium",
    iconBg: "bg-green-500/15 text-green-600 dark:text-green-400",
    acceptedDomains: ["elements.envato.com"],
    exampleUrl: "https://elements.envato.com/corporate-promo-XXXXXXX",
    fileTypes: ["Template", "Font", "Musik", "Foto", "Footage", "Grafis"],
    creditsPerDownload: 2_000,
  },
]
