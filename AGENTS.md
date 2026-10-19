# Agent Guidelines

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles mapped 1:1 (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

## ATURAN TERMINAL & DEV SERVER
1. AI DILARANG KERAS menyalakan `npm run dev` atau `npm run start` secara mandiri atau di background.
2. Hanya USER yang berhak menyalakan dan mematikan dev server.
3. AI hanya boleh menjalankan perintah terminal yang bersifat read-only (seperti `git status`, `npm run lint`) atau perintah penghapus cache (`Remove-Item .next`).
4. Jika AI butuh server menyala untuk tes, AI HARUS meminta izin user terlebih dahulu.

