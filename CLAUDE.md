# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mailcach is a full-stack monorepo — panel digital yang menjual akses layanan AI dan aset kreatif:
- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS v4, shadcn/ui (`frontend/`)
- **Backend**: Node.js + TypeScript, Express, Prisma ORM, MySQL (`backend/`)

## Backend commands

Run from `backend/`:

```bash
npm run dev          # Start with tsx watch (hot reload)
npm run build        # Compile TypeScript → dist/
npm run db:migrate   # Run Prisma migrations (requires MySQL running)
npm run db:generate  # Regenerate Prisma client after schema change
npm run db:seed      # Seed: admin@mailcach.com/admin123 + user@mailcach.com/user123 (50k credits)
npm run db:studio    # Open Prisma Studio
```

Backend runs on port `3001`. Copy `.env.example` → `.env` dan set:
- `DATABASE_URL` — MySQL connection string
- `JWT_SECRET` — secret untuk JWT
- `ELEVENLABS_API_KEY` — API key ElevenLabs (sk_...)

## Frontend commands

Run from `frontend/`:

```bash
npm run dev        # Start Vite dev server (port 5173, proxy /api → localhost:3001)
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm run typecheck  # Type-check without emit
npm run format     # Prettier (auto-fixes formatting)
```

## Architecture

### Auth flow
JWT-based. Token disimpan di `localStorage` key `mailcach_token`, user di `mailcach_user`. `AuthContext` (`src/contexts/auth-context.tsx`) expose `user`, `isAdmin`, `setUser`. Protected routes pakai `ProtectedRoute`, admin routes pakai `AdminRoute`.

### Credit system
- 1 kredit = Rp 1
- ElevenLabs: 5 kredit/karakter
- Envato: dibeli per paket waktu (Lite/Pro × 1hari/minggu/bulan)
- `CreditProvider` fetch dari `GET /api/me` — tidak ada localStorage
- Saldo ditampilkan di topbar (`TopbarBalance`), bukan sidebar
- Envato per-download cost: 2.000 kredit — didefinisikan di `frontend/src/lib/services.ts` (`DOWNLOAD_SERVICES`)
- Email Inbox: 10 kredit per pencarian — email disimpan di tabel `inbox_emails` (DB lokal), diterima via Cloudflare Worker → `POST /api/inbox/inbound`
- Domain inbox: `INBOX_DOMAIN` env var (default: `mailcach.com`); security via `WORKER_SECRET` env var (header `X-Worker-Secret` dari Cloudflare Worker)

### Backend structure
```
backend/
├── src/
│   ├── index.ts                      # Express entry, CORS, semua routes
│   ├── middleware/auth.ts            # JWT verify (AuthRequest), requireRole()
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma singleton
│   │   └── envato-session.ts         # Load/save/parse cookies Envato (file-based)
│   └── routes/
│       ├── auth.ts                   # POST /register, POST /login
│       ├── me.ts                     # GET /me, GET /me/transactions
│       ├── vouchers.ts               # POST /vouchers/redeem
│       ├── inbox-inbound.ts          # POST /inbox/inbound — Mailgun webhook, simpan ke inbox_emails
│       ├── services/
│       │   ├── elevenlabs.ts         # POST /services/elevenlabs/generate
│       │   ├── envato.ts             # GET /packages, GET /status, POST /buy, POST /download
│       │   └── inbox.ts              # POST /services/inbox/search (charge 10kr), GET /detail
│       └── admin/
│           ├── users.ts              # GET/PATCH/DELETE /admin/users
│           ├── vouchers.ts           # GET/POST/DELETE /admin/vouchers
│           └── envato-session.ts     # GET/POST/DELETE /admin/envato-session
├── data/
│   └── envato-session.json           # Cookies Envato (file, bukan DB) — jangan commit
└── prisma/
    ├── schema.prisma                 # User, Transaction, Voucher, VoucherRedemption, EnvatoAccess
    ├── migrations/
    └── seed.ts
```

### Frontend structure
```
frontend/src/
├── contexts/
│   ├── auth-context.tsx              # JWT, user, isAdmin, login/logout
│   └── credit-context.tsx            # credits, refresh(), isLowCredit
├── components/
│   ├── protected-route.tsx
│   ├── admin-route.tsx
│   └── low-credit-alert.tsx
├── pages/
│   ├── login.tsx / register.tsx
│   ├── dashboard.tsx                 # 4 stat cards (totalSpent, topup, txns, services)
│   ├── dashboard-layout.tsx          # Sidebar + topbar (TopbarBalance), breadcrumb
│   ├── generate.tsx                  # ElevenLabs — input Voice ID manual + script
│   ├── downloader.tsx                # Envato — beli paket + download URL
│   ├── history.tsx                   # Riwayat transaksi
│   ├── topup.tsx                     # Redeem voucher + WA admin (6283877696525)
│   └── admin/
│       ├── users.tsx                 # Manajemen user (role, credits, delete)
│       ├── vouchers.tsx              # Buat/hapus voucher (8 digit, auto-generate)
│       └── envato-session.tsx        # Upload cookies Envato (Netscape format didukung)
└── lib/
    ├── api.ts                        # Typed API client untuk semua endpoint
    ├── voices.ts                     # CREDITS_PER_CHAR=5, CHARS_PER_PREVIEW konstanta
    └── services.ts                   # DOWNLOAD_SERVICES — Envato config & creditsPerDownload
```

### Envato session management
Cookies Envato disimpan di `backend/data/envato-session.json` (file, bukan DB). Admin upload via halaman **Admin → Envato Session**. Mendukung format Netscape (dari ekstensi Cookie-Editor) dan header string biasa. Perlu diperbarui ~30 hari sekali. Sidebar admin menampilkan icon `!` merah kalau session tidak aktif.

### ElevenLabs
User input Voice ID manual (ambil dari elevenlabs.io/app/voice-library → My Voices). Backend call `POST /v1/text-to-speech/{voiceId}` dengan `eleven_multilingual_v2`. Audio dikembalikan sebagai base64 data URL. Kredit dipotong atomik via Prisma transaction sebelum API call.

### Envato download flow
1. User beli paket (kredit → `EnvatoAccess` record di DB)
2. User input URL aset dari elements.envato.com
3. Backend fetch halaman dengan cookies sesi → parse `__NEXT_DATA__` atau coba endpoint internal
4. File di-proxy langsung ke browser user
5. Kuota (`filesUsed`) bertambah atomik; di-rollback kalau fetch gagal

### Stack
- **React 19** + TypeScript strict, ES2023
- **Vite 8** — path alias `@/*` → `./src/*`, proxy `/api` → `localhost:3001`
- **Tailwind CSS v4** via `@tailwindcss/vite`; theme via CSS vars di `src/index.css`
- **shadcn/ui** zinc base, Radix Nova — tambah via `npx shadcn add <component>`
- **lucide-react** icons; `cn()` dari `src/lib/utils.ts` untuk class merging
- **Prisma** ORM + MySQL; atomic transactions untuk kredit & voucher

### Linting & formatting
- ESLint flat config (`eslint.config.js`) — TypeScript ESLint, React Hooks, React Refresh
- Prettier + `prettier-plugin-tailwindcss` (80-char line width, auto Tailwind class sort)
