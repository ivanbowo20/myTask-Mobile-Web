# Panduan Development — TaskFlow v2

## ⚠️ Aturan Penting: JANGAN Campur Dev & Build

Next.js pakai folder `.next/` yang SAMA untuk dev dan build.
Kalau `npm run dev` lagi jalan terus kamu `npm run build`,
cache dev akan tertimpa → CSS/JS hilang di browser (404).

### Tabel Aksi
| Aksi | Aturan |
|------|--------|
| `npm run dev` jalan | ❌ JANGAN `npm run build` |
| Mau `npm run build` | ✅ Stop dev dulu (Ctrl+C) |
| Habis `npm run build` | ✅ Pakai `npm run dev:clean` |
| Dev error aneh | ✅ `npm run dev:clean` |
| Mau build aman | ✅ `npm run build:safe` |

### Script yang Tersedia
- `npm run dev` — dev server biasa
- `npm run dev:clean` — hapus .next dulu, baru dev (RECOMMENDED)
- `npm run build` — build production biasa
- `npm run build:safe` — hapus .next dulu, baru build
- `npm run start` — jalankan production build
- `npm run lint` — cek kode

### Troubleshooting
**CSS hilang, tampilan polos** → `npm run dev:clean`
**Port 3000 dipakai** → `Get-Process node | Stop-Process`
