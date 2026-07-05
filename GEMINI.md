# GEMINI.md

This file provides guidance to Gemini CLI and **Antigravity IDE** when working with code in this repository.

> **Note**: This is the project root (`smart-charge-glow/`). All commands run from here.

## Commands

- `bun dev` — starts the Vite development server (with HMR)
- `bun build` — builds for production (Nitro + Vercel preset)
- `bun build:dev` — builds in development mode
- `bun preview` — previews the production build locally
- `bun lint` — lints the codebase with ESLint
- `bun format` — formats code with Prettier

> Bun = **package manager**. Build toolchain = **Vite + Nitro** (not Bun runtime).

## Architecture

Full-stack TypeScript app on **TanStack Start** + React 19. Controls SolarX EV chargers via **Tuya IoT Cloud API**. Deployed on Vercel via Nitro.

### Stack

- **Framework**: TanStack Start (full-stack React 19)
- **Routing**: `@tanstack/react-router` — file-based routes in `src/routes/`
- **Data Fetching**: `@tanstack/react-query` + server functions
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **UI**: Radix UI + shadcn/ui (`src/components/ui/`)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Notifications**: Sonner
- **Server**: Nitro → Vercel
- **IoT**: Tuya Cloud API (HMAC-SHA256 auth)
- **Fonts**: IBM Plex Sans Thai, JetBrains Mono

### Directory Structure

```
src/
├── routes/
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Dashboard
│   ├── history.tsx      # Charging history
│   ├── settings.tsx     # App settings
│   ├── device-info.tsx
│   └── debug.tsx
├── components/
│   ├── ui/              # shadcn/ui — do NOT modify directly
│   ├── app-shell.tsx
│   ├── alert-banner.tsx
│   └── page-header.tsx
├── hooks/
│   └── use-mobile.tsx
├── lib/
│   ├── tuya/
│   │   ├── api.functions.ts  # Server functions (Tuya API proxy)
│   │   ├── client.ts         # OAuth + HMAC-SHA256 client
│   │   ├── server.ts         # Server-side helpers
│   │   ├── mock.ts           # Mock data for offline dev
│   │   └── types.ts          # TypeScript types
│   ├── app-settings.tsx
│   ├── alerts.ts
│   ├── error-capture.ts
│   ├── error-page.ts
│   ├── lovable-error-reporting.ts
│   └── utils.ts
├── router.tsx
├── routeTree.gen.ts     # AUTO-GENERATED — never edit
├── server.ts            # SSR handler + error normalization
├── start.ts             # TanStack Start instance + middleware
└── styles.css
```

### Backend

- **Runtime**: Nitro → Vercel (`nitro: { preset: "vercel" }`)
- **API**: `src/lib/tuya/api.functions.ts` — TanStack server functions (no separate REST API)
- **SSR**: `src/server.ts` wraps handler, normalizes catastrophic errors

### Build Config

- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config`
- **Never add** already-bundled plugins: tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro
- `src/routeTree.gen.ts` — **never edit** (auto-generated)

## Lovable Integration

> [!IMPORTANT]
> Connected to [Lovable](https://lovable.dev).
> - **Never force push, rebase, amend, or squash pushed commits**
> - Pushed commits auto-sync to Lovable
> - Keep branch in working/buildable state

## Key Conventions

- `@/` → `src/` path alias
- No `any`, no `@ts-ignore` — strict TypeScript
- Tuya API = server-side only (`'use server'` directive)
- shadcn/ui → use as-is, add via CLI only
- Mock mode: `src/lib/tuya/mock.ts`

---

## Learning Mode (จำไว้ตลอด)

> [!IMPORTANT]
> ผู้ใช้ต้องการ **เรียนรู้** ไปพร้อมกับการแก้โค้ด ทุกครั้งที่แก้ไขโค้ด ต้องอธิบายควบคู่เสมอ

หลังแก้โค้ดทุกครั้ง ต้องตอบคำถามเหล่านี้ให้ครบ:

### 🔍 ทำไมถึงแก้ไฟล์นี้?
บอกว่าปัญหาเดิมคืออะไร และไฟล์นี้เกี่ยวข้องยังไง ไม่ใช่แค่ "แก้แล้ว"

### ⚙️ Logic นี้ทำงานยังไง?
อธิบาย flow — ข้อมูลไหลจากไหนไปไหน, function ถูกเรียกเมื่อไหร่, state เปลี่ยนยังไง

### 🐛 Root cause จริงๆ คืออะไร?
ระบุสาเหตุจริงๆ ไม่ใช่แค่ symptom
- ไม่ใช่ "TypeError" → แต่คือ "เรียก API ก่อน auth token พร้อม"
- ไม่ใช่ "undefined" → แต่คือ "async race condition"

### ✨ มีวิธีเขียนดีกว่านี้ไหม?
แสดง pattern ที่ดีกว่าพร้อมเหตุผล (custom hook, Zod schema, separation of concerns)

### ⚠️ Edge case ที่ยังไม่ได้คิด?
ระบุสิ่งที่อาจเกิดขึ้นแต่โค้ดยังไม่ handle (timeout, null, race condition, cancel)

---

## Standard Workflow (ทำทุกครั้งตามลำดับนี้)

> [!IMPORTANT]
> **อ่านก่อน → คิดก่อน → แก้ทีละส่วน → ตรวจสอบเสมอ**

1. **อ่านโปรเจกต์** — อ่าน GEMINI.md + ไฟล์ที่เกี่ยวข้อง, ดู imports/exports
2. **อธิบายโครงสร้าง** — สรุปโค้ดปัจจุบัน, ไฟล์ที่เกี่ยวข้อง, dependency
3. **วางแผนก่อนแก้** — plan เรียงลำดับ + trade-off, รอ approval ถ้า risk สูง
4. **แก้ทีละส่วน** — ทีละไฟล์/function พร้อมคำอธิบาย, ไม่แตะไฟล์ที่ไม่เกี่ยว
5. **รัน build/lint** — `bun lint` ต้องผ่าน → `bun build` ต้องสำเร็จ
6. **สรุป diff** — ตารางสรุป + ตอบ Learning Mode ครบ 5 ข้อ
7. **ช่วย commit** — Conventional Commits (`feat/fix/refactor/chore`)
