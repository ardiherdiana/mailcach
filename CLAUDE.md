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
- `INBOX_DOMAIN` — domain penerima email (default: `mailcach.com`)
- `WORKER_SECRET` — shared secret dengan Cloudflare Worker (header `X-Worker-Secret`)

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
- Email Inbox: 10 kredit per pencarian
- Turnitin: 10.000 kredit per dokumen — **kredit dipotong saat admin complete job, bukan saat user submit**. Biaya didefinisikan di kedua file `backend/src/routes/services/turnitin.ts` dan `backend/src/routes/admin/turnitin-jobs.ts` (`CREDITS_PER_CHECK`)
- Domain inbox: `INBOX_DOMAIN` env var (default: `mailcach.com`); security via `WORKER_SECRET` env var (header `X-Worker-Secret` dari Cloudflare Worker)

### Backend structure
```
backend/
├── src/
│   ├── index.ts                      # Express entry, CORS, semua routes
│   ├── middleware/auth.ts            # JWT verify (AuthRequest), requireRole()
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma singleton
│   │   ├── envato-session.ts         # Load/save/parse cookies Envato (file-based)
│   │   └── turnitin-session.ts       # Load/save/parse cookies Turnitin (file-based)
│   └── routes/
│       ├── auth.ts                   # POST /register, POST /login
│       ├── me.ts                     # GET /me, GET /me/transactions
│       ├── vouchers.ts               # POST /vouchers/redeem
│       ├── inbox-inbound.ts          # POST /inbox/inbound — Cloudflare Worker webhook, simpan ke inbox_emails
│       ├── services/
│       │   ├── elevenlabs.ts         # POST /services/elevenlabs/generate
│       │   ├── envato.ts             # GET /packages, GET /status, POST /buy, POST /download
│       │   ├── inbox.ts              # POST /services/inbox/search (charge 10kr), GET /detail
│       │   └── turnitin.ts           # POST /services/turnitin/submit (upload, PENDING), GET /jobs, GET /jobs/:id/download
│       └── admin/
│           ├── users.ts              # GET/PATCH/DELETE /admin/users
│           ├── vouchers.ts           # GET/POST/DELETE /admin/vouchers
│           ├── envato-session.ts     # GET/POST/DELETE /admin/envato-session
│           ├── turnitin-session.ts   # GET/POST/DELETE /admin/turnitin-session + POST /detect
│           └── turnitin-jobs.ts      # GET /admin/turnitin/jobs, GET /jobs/:id/file, POST /jobs/:id/complete, DELETE /jobs/:id
├── data/
│   ├── envato-session.json           # Cookies Envato (file, bukan DB) — jangan commit
│   ├── turnitin-session.json         # Cookies Turnitin + assignmentId + authorId — jangan commit
│   ├── turnitin-uploads/             # File upload dari user — jangan commit
│   └── turnitin-results/             # PDF hasil dari admin — jangan commit
└── prisma/
    ├── schema.prisma                 # User, Transaction, Voucher, VoucherRedemption, EnvatoAccess, TurnitinJob
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
│   ├── logo.tsx                      # MailcachLogo SVG component
│   ├── protected-route.tsx
│   ├── admin-route.tsx
│   └── low-credit-alert.tsx
├── pages/
│   ├── login.tsx / register.tsx / forgot-password.tsx  # forgot-password: dummy OTP flow (DUMMY_OTP="123456"), no real backend
│   ├── dashboard.tsx                 # 4 stat cards (totalSpent, topup, txns, services)
│   ├── dashboard-layout.tsx          # Sidebar + topbar (TopbarBalance), breadcrumb
│   ├── generate.tsx                  # ElevenLabs — input Voice ID manual + script
│   ├── downloader.tsx                # Envato — beli paket + download URL
│   ├── history.tsx                   # Riwayat transaksi
│   ├── inbox.tsx                     # Email Inbox — cari email di domain mailcach.com (10kr/search)
│   ├── turnitin.tsx                  # Cek Plagiarisme — upload file → PENDING job, polling status, download PDF result
│   ├── topup.tsx                     # Redeem voucher + WA admin (6283877696525)
│   └── admin/
│       ├── users.tsx                 # Manajemen user (role, credits, delete)
│       ├── vouchers.tsx              # Buat/hapus voucher (8 digit, auto-generate)
│       ├── envato-session.tsx        # Upload cookies Envato (Netscape format didukung)
│       └── turnitin-jobs.tsx         # Admin view jobs, download file user, upload PDF hasil + potong kredit
└── lib/
    ├── api.ts                        # Typed API client untuk semua endpoint
    ├── voices.ts                     # CREDITS_PER_CHAR=5, CHARS_PER_PREVIEW konstanta
    └── services.ts                   # DOWNLOAD_SERVICES — Envato config & creditsPerDownload
```

### Turnitin workflow
Bukan automated — ini manual admin-assisted flow:
1. User upload file → `POST /services/turnitin/submit` → job `PENDING` dibuat, **kredit belum dipotong**
2. Admin buka **Admin → Turnitin Jobs**, download file user, proses manual di Turnitin nyata
3. Admin upload PDF hasil → `POST /admin/turnitin/jobs/:id/complete` → kredit dipotong atomik, job jadi `COMPLETED`
4. User download PDF hasil dari halaman Turnitin

Cookies Turnitin disimpan di `backend/data/turnitin-session.json` (file, bukan DB). Perlu `assignmentId` + `authorId` dari akun Turnitin — bisa auto-detect via `POST /admin/turnitin-session/detect` dari cookies.

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
