export function MailcachLogo({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.4" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.4" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  )
}
