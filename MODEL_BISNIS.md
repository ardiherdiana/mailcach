# Model Bisnis Mailcach

## Ringkasan Singkat

Mailcach adalah panel digital yang menjual akses ke layanan premium berbasis AI dan aset kreatif secara eceran kepada kreator konten Indonesia. Modal berupa subscription bulanan, dijual per-pemakaian dengan sistem kredit (1 kredit = Rp 1).

---

## Modal Bulanan

| Layanan | Paket | Biaya USD | Kurs (Rp 18.000) | Biaya Rp |
|---------|-------|-----------|-------------------|----------|
| ElevenLabs | Starter (30.000 chars/bln) | $5/bln | — | Rp 90.000 |
| Envato Elements | Monthly (unlimited download) | $17.99/bln | — | Rp 323.820 |
| **Total Modal** | | **$22.99** | | **Rp 413.820** |

> Catatan: Kurs berfluktuasi. Hitung ulang tiap bulan sebelum bayar subscription.

---

## Struktur Harga Jual

### ElevenLabs Voice

| Item | Nilai |
|------|-------|
| HPP (harga pokok) | Rp 3 / karakter (Rp 90.000 ÷ 30.000 chars) |
| Harga jual | Rp 5 / karakter (5 kredit/karakter) |
| Gross margin | **40%** |
| BEP (balik modal) | 18.000 karakter / bulan (Rp 90.000 ÷ Rp 5) |

Contoh: User beli 10.000 kredit → bisa generate 2.000 karakter voice.

### Envato Elements

Model: user beli **paket waktu** berdasarkan tier dan durasi. 2 tier × 3 durasi = 6 paket.

| Tier | Kuota/hari | 1 Hari | 1 Minggu | 1 Bulan |
|------|-----------|--------|----------|---------|
| **Lite** | 10 file | Rp 10.000 | Rp 15.000 | Rp 45.000 |
| **Pro** | 20 file | Rp 15.000 | Rp 25.000 | Rp 65.000 |

HPP per hari = Rp 323.820 ÷ 30 = **Rp 10.794/hari**

| Paket | Harga | HPP | Margin |
|-------|-------|-----|--------|
| Lite 1 Hari | Rp 10.000 | Rp 10.794 | **-8% (tipis)** |
| Lite 1 Minggu | Rp 15.000 | Rp 75.558 | hitung per bulan |
| Lite 1 Bulan | Rp 45.000 | Rp 323.820 | **-86% (rugi besar)** |
| Pro 1 Hari | Rp 15.000 | Rp 10.794 | **+39%** ✓ |
| Pro 1 Minggu | Rp 25.000 | Rp 75.558 | hitung per bulan |
| Pro 1 Bulan | Rp 65.000 | Rp 323.820 | **-80% (rugi besar)** |

> ⚠️ **Catatan penting:** Margin per-paket negatif jika dihitung vs HPP bulanan subscription. Ini HANYA profit jika total revenue semua paket dalam 1 bulan > Rp 323.820. Contoh: jual 10× Pro Harian = Rp 150.000/bulan (masih rugi). Perlu **minimal 33 transaksi Pro Harian** atau kombinasi untuk BEP Envato saja.
>
> **Solusi terbaik:** Ambil Envato subscription tahunan ($107.88/tahun = Rp 1.941.840/tahun = Rp 5.300/hari). Dengan HPP Rp 5.300/hari, semua paket langsung profit.

BEP per bulan (jika pakai annual Envato):
- Cukup jual **2 paket Pro Harian** per hari = Rp 10.600/hari > HPP Rp 5.300/hari ✓

---

## Sistem Kredit & Paket Top Up

1 kredit = Rp 1. User beli kredit dulu, lalu pakai untuk layanan.

| Paket | Bayar | Dapat Kredit | Bonus | Catatan |
|-------|-------|--------------|-------|---------|
| Starter | Rp 10.000 | 10.000 | — | Entry level |
| Basic | Rp 25.000 | 27.500 | +10% | **Paling laris** |
| Pro | Rp 50.000 | 60.000 | +20% | — |
| Ultimate | Rp 100.000 | 130.000 | +30% | Margin tipis, hati-hati |

### Analisis Margin dengan Bonus (worst case: semua dipakai ElevenLabs)

| Paket | Margin ElevenLabs | Margin Envato* |
|-------|-------------------|---------------|
| 10k (0%) | 40% | tergantung volume |
| 25k (+10%) | ~34% | tergantung volume |
| 50k (+20%) | ~27% | tergantung volume |
| 100k (+30%) | ~18% | tergantung volume |

*Envato: untung kalau total file bulan itu sudah lewat BEP 162 file.

**Kesimpulan bonus:** Masih untung selama margin ElevenLabs di atas HPP (Rp 3/char). Bonus 30% di paket 100k paling berisiko — awasi jika user banyak generate ElevenLabs script panjang.

---

## Target Pasar

- Kreator konten YouTube, TikTok, Instagram Indonesia
- Freelancer yang butuh aset Envato untuk project sesekali (< 17 file/bulan → lebih murah beli eceran daripada subscribe sendiri)
- Pemilik UMKM yang buat konten sendiri tanpa tim
- Pelajar/mahasiswa yang butuh voice over atau template sesekali

**Pain point yang diselesaikan:**
- Envato $17.99/bln terlalu mahal untuk yang butuh 1–5 file/bln
- ElevenLabs $5/bln terlalu mahal untuk yang baru coba atau pakai sesekali
- Kreator Indonesia lebih terbiasa bayar satuan (like Shopee, Tokopedia)

---

## Kanal Penjualan

### Shopee (Utama)
- Buka toko di Shopee, jual paket kredit sebagai "produk digital"
- Iklan Shopee Ads: budget Rp 25.000/hari
- Listing terpisah per paket (10k, 25k, 50k, 100k)
- Buyer checkout → admin kirim voucher kode redeem → user input di panel

**Flow pembelian via Shopee:**
1. User beli paket di Shopee
2. Admin lihat order masuk
3. Admin buat voucher di panel (menu Voucher → Buat Voucher)
4. Admin kirim kode voucher ke chat Shopee
5. User input kode di Mailcach → saldo otomatis bertambah

### WhatsApp / Direct (Secondary)
- Broadcast ke grup kreator konten
- Reseller bisa beli voucher bulk dengan harga khusus

---

## Proyeksi Break Even Point (Total Bisnis)

Modal tetap per bulan: **Rp 413.820**

Skenario minimal untuk balik modal:

| Skenario | Target | Revenue | Status |
|----------|--------|---------|--------|
| Envato saja | 207 file/bln | Rp 414.000 | BEP ✓ |
| ElevenLabs saja | 82.764 karakter/bln | Rp 413.820 | BEP ✓ |
| Mix 50/50 | 100 file + 41k chars | ~Rp 414k | BEP ✓ |

Target realistis bulan pertama: **50 transaksi Envato + beberapa ElevenLabs** = sudah menutup modal.

---

## Strategi Harga vs Kompetitor

Kompetitor jual Envato Rp 1.000/file. Kita jual Rp 2.000/file.

**Kenapa bisa tetap kompetitif di Rp 2.000:**
- Langsung pakai (tidak perlu request manual ke admin)
- Panel sendiri, lebih profesional
- Bisa pakai kapan saja 24 jam
- Bundle dengan ElevenLabs (one-stop shop)

Jika mau head-to-head: turunkan ke Rp 1.500/file, tapi BEP naik ke 216 file/bulan.

---

## Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Kurs naik (USD menguat) | Modal naik, margin turun | Naikkan harga jual atau kurangi bonus |
| ElevenLabs naikkan harga | HPP naik | Pantau pricing, sesuaikan harga jual |
| Envato suspend akun | Tidak bisa download | Pakai akun backup, refund kredit user |
| User abuse (generate ribuan chars) | Margin tergerus | Tambah rate limit per transaksi jika perlu |
| Kompetitor turun harga | Kehilangan user | Fokus ke UX dan kecepatan, bukan perang harga |

---

## Strategi Launch

**Fase 1 — ElevenLabs dulu (sekarang, tanpa modal tambahan)**
- Panel sudah jalan, API key sudah ada
- Pastikan ElevenLabs API key punya permission `voices_read` dan `text_to_speech` (cek di elevenlabs.io/app/account/api-keys)
- Jualan via Shopee / WA circle dulu
- Target: 3–5 customer bulan pertama untuk validasi

**Fase 2 — Tambah Envato (setelah ada cashflow)**
- Beli Envato Elements subscription (monthly dulu Rp 323.820, annual kalau sudah yakin)
- Inspect endpoint download via DevTools saat klik Download pada aset
- Update `getDownloadUrl()` di `backend/src/routes/services/envato.ts` sesuai endpoint asli
- Upload cookies via Admin → Envato Session (perlu refresh ~30 hari)

**Target realistis:**
- Bulan 1–2: 30–50 order ElevenLabs → BEP
- Bulan 3: tambah Envato
- Bulan 6: 100–150 order/bulan total

---

## Catatan Operasional

- **ElevenLabs API key**: aktifkan permission `voices_read` + `text_to_speech` di dashboard ElevenLabs
- **Envato cookies**: upload ulang tiap ~30 hari via Admin → Envato Session. Sidebar admin tampilkan warning `!` kalau expired
- Bayar subscription tiap tanggal yang sama setiap bulan, jangan sampai lapse
- Pantau total file Envato yang didownload — jika mendekati BEP, pastikan revenue sudah masuk
- Catat pengeluaran dan pemasukan di spreadsheet terpisah (Mailcach tidak punya laporan keuangan otomatis)
- Shopee Ads Rp 25.000/hari = Rp 750.000/bulan → tambahkan ke fixed cost jika aktif beriklan
- **Rotasi akun Envato**: tidak perlu sampai 300+ order/bulan. 1 akun cukup untuk ratusan order karena Envato unlimited download
