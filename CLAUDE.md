# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note**: This is the project root (`smart-charge-glow/`). All commands run from here.

## Commands

- `bun dev` — starts the Vite development server (with HMR)
- `bun build` — builds for production (Nitro + Vercel preset)
- `bun build:dev` — builds in development mode
- `bun preview` — previews the production build locally
- `bun lint` — lints the codebase with ESLint
- `bun format` — formats code with Prettier

> **Note**: Bun is the **package manager**. Build toolchain is **Vite + Nitro** (not Bun runtime).

## Architecture

This is a **full-stack TypeScript application** built on **TanStack Start** (a full-stack React framework), with Vite as the build tool and Nitro as the server engine. It integrates with the **Tuya IoT Cloud API** for smart device control (SolarX / EV charger). Deployed to Vercel.

### Frontend

- **Framework**: React 19 with TanStack Start
- **Routing**: `@tanstack/react-router` (file-based routes in `src/routes/`)
- **Data Fetching**: `@tanstack/react-query` (server functions + client queries)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **UI Components**: Radix UI primitives + shadcn/ui pattern (`src/components/ui/`)
- **Charts**: Recharts (`recharts`)
- **Forms**: React Hook Form + Zod validation
- **Fonts**: IBM Plex Sans Thai, JetBrains Mono (via `@fontsource`)
- **Notifications**: Sonner toast library

### Directory Structure

```
src/
├── routes/           # File-based routes (TanStack Router)
│   ├── __root.tsx    # Root layout
│   ├── index.tsx     # Dashboard / main page
│   ├── history.tsx   # Charging history
│   ├── settings.tsx  # App settings
│   ├── device-info.tsx
│   └── debug.tsx
├── components/
│   ├── ui/           # shadcn/ui base components (do not modify directly)
│   ├── app-shell.tsx # Main layout wrapper
│   ├── alert-banner.tsx
│   └── page-header.tsx
├── hooks/
│   └── use-mobile.tsx  # Responsive breakpoint hook
├── lib/
│   ├── tuya/           # Tuya IoT API integration
│   │   ├── api.functions.ts  # TanStack Start server functions (Tuya API calls)
│   │   ├── client.ts         # Tuya OAuth client (HMAC-SHA256 signing)
│   │   ├── server.ts         # Server-side Tuya helpers
│   │   ├── mock.ts           # Mock data for dev/testing
│   │   └── types.ts          # Tuya API TypeScript types
│   ├── app-settings.tsx      # App-wide settings context
│   ├── alerts.ts             # Alert/notification helpers
│   ├── error-capture.ts      # SSR error capture
│   ├── error-page.ts         # Error page renderer
│   ├── lovable-error-reporting.ts
│   └── utils.ts              # Shared utilities (cn, etc.)
├── router.tsx          # TanStack Router instance
├── routeTree.gen.ts    # Auto-generated route tree (do not edit)
├── server.ts           # SSR fetch handler + error normalization (Vercel edge)
├── start.ts            # TanStack Start instance + middleware
└── styles.css          # Global styles + Tailwind CSS
```

### Backend / Server

- **Runtime**: Nitro (via `@tanstack/react-start`) — deployed to **Vercel** (`nitro: { preset: "vercel" }`)
- **Server Entry**: `src/server.ts` — wraps SSR handler, normalises catastrophic errors
- **Start Instance**: `src/start.ts` — TanStack Start app with error-catching middleware
- **API Layer**: `src/lib/tuya/api.functions.ts` — server functions proxying Tuya Cloud API

### Build Config

- **`vite.config.ts`**: Uses `@lovable.dev/vite-tanstack-config` — do **NOT** add already-bundled plugins (tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro, componentTagger)
- **`src/routeTree.gen.ts`**: Auto-generated — do **NOT** edit manually

## Lovable Integration

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev).
> - **Do NOT force push, rebase, amend, or squash already-pushed commits**
> - All pushed commits sync back to Lovable automatically
> - Keep the branch in a working/buildable state at all times

## Key Conventions

- **Path alias**: `@/` maps to `src/` (configured via `vite-tsconfig-paths`)
- **No `any`**: Strict TypeScript — avoid `any` and `@ts-ignore`
- **Server functions**: Tuya API calls are server-only — `'use server'` in `api.functions.ts`; never call from client
- **shadcn/ui components**: `src/components/ui/` — use as-is; add via CLI only
- **Mock mode**: `src/lib/tuya/mock.ts` provides mock data for offline development

---

## Learning Mode (จำไว้ตลอด)

> [!IMPORTANT]
> ผู้ใช้ต้องการ **เรียนรู้** ไปพร้อมกับการแก้โค้ด ทุกครั้งที่แก้ไขโค้ด ต้องอธิบายควบคู่เสมอ

หลังแก้โค้ดทุกครั้ง ต้องตอบคำถามเหล่านี้ให้ครบ:

### 🔍 ทำไมถึงแก้ไฟล์นี้?
บอกว่าปัญหาเดิมคืออะไร และไฟล์นี้เกี่ยวข้องยังไง

### ⚙️ Logic นี้ทำงานยังไง?
อธิบาย flow — ข้อมูลไหลจากไหนไปไหน, function ถูกเรียกเมื่อไหร่, state เปลี่ยนยังไง

### 🐛 ถ้าเกิด error แบบนี้ root cause คืออะไร?
ระบุ root cause จริงๆ ไม่ใช่แค่ symptom

### ✨ มีวิธีเขียนให้ดีกว่านี้ไหม?
แสดง pattern ที่ดีกว่าพร้อมเหตุผล

### ⚠️ Edge case ที่ยังไม่ได้คิดถึง
ระบุ edge case ที่โค้ดปัจจุบันยังไม่ handle

---

## Standard Workflow (ทำทุกครั้งตามลำดับนี้)

> [!IMPORTANT]
> **อ่านก่อน → คิดก่อน → แก้ทีละส่วน → ตรวจสอบเสมอ**
> ห้ามข้ามขั้นตอน แม้งานจะดูเล็กน้อย

### Step 1 — อ่านโปรเจกต์ก่อน
- อ่าน CLAUDE.md ทั้งหมด
- อ่านไฟล์ที่เกี่ยวข้องกับงานที่ได้รับ
- ดู imports/exports เพื่อเข้าใจ dependency

### Step 2 — อธิบายโครงสร้าง
- สรุปว่าโค้ดที่จะแก้ทำอะไรอยู่
- บอกว่าไฟล์ไหนเกี่ยวข้องบ้าง
- ระบุ dependency ที่อาจได้รับผลกระทบ

### Step 3 — วางแผนก่อนแก้
- เขียน plan ว่าจะแก้อะไรบ้าง เรียงลำดับ
- ถ้ามี trade-off ให้บอก พร้อมแนะนำ option ที่ดีที่สุด
- รอ approval ถ้างานใหญ่หรือ risk สูง

### Step 4 — แก้ทีละส่วน
- แก้ทีละไฟล์ / ทีละ function ไม่ทำรวมกันทีเดียว
- อธิบายแต่ละจุดที่แก้ว่าทำไม
- ไม่แก้ไฟล์ที่ไม่เกี่ยวข้อง

### Step 5 — รัน build / lint / test

```bash
bun lint        # ต้องผ่านก่อน
bun build       # ต้อง build สำเร็จ
```

- ถ้า lint error → แก้ก่อน commit
- ถ้า build fail → หา root cause อธิบายให้ผู้ใช้เข้าใจ

### Step 6 — สรุป diff

| ไฟล์ | สิ่งที่เปลี่ยน | เหตุผล |
|------|--------------|--------|
| `src/xxx.ts` | เพิ่ม error handling | ป้องกัน crash เมื่อ API timeout |

และตอบคำถาม Learning Mode ทั้ง 5 ข้อให้ครบ

### Step 7 — ช่วย commit

```
<type>(<scope>): <short description>

<อธิบาย what & why>
```

**Types**: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`

**ตัวอย่าง**:
```
fix(tuya): handle API timeout gracefully

เพิ่ม try/catch รอบ fetchDeviceStatus ป้องกัน crash
เมื่อ Tuya API ไม่ตอบกลับภายใน 5 วินาที แสดง error toast แทน
```
