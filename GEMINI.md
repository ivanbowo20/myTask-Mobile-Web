# Aturan Pengembangan

## Pengujian & Validasi
- DILARANG menggunakan tool `browser_subagent` atau membuka browser otomatis.
- DILARANG mengambil screenshot halaman.
- Validasi kode hanya boleh dilakukan melalui terminal menggunakan `npm run build` atau `npm test`.
- Pengujian visual di browser akan dilakukan sendiri oleh user.

## ATURAN TERMINAL & DEV SERVER
1. AI DILARANG KERAS menyalakan `npm run dev` atau `npm run start` secara mandiri atau di background.
2. Hanya USER yang berhak menyalakan dan mematikan dev server.
3. AI hanya boleh menjalankan perintah terminal yang bersifat read-only (seperti `git status`, `npm run lint`) atau perintah penghapus cache (`Remove-Item .next`).
4. Jika AI butuh server menyala untuk tes, AI HARUS meminta izin user terlebih dahulu.
