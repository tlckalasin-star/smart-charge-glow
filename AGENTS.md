<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

---

# Project Instructions — smart-charge-glow

> For all AI agents (OpenAI Codex, general agents, Lovable AI)

## Project Context

Full-stack TypeScript app on **TanStack Start** + React 19.
Controls SolarX EV chargers via **Tuya IoT Cloud API**. Deployed to Vercel.

## Commands

```bash
bun dev        # Dev server (Vite + HMR)
bun build      # Production (Nitro → Vercel)
bun lint       # ESLint — must pass before commit
bun format     # Prettier
```

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (full-stack React 19) |
| Routing | @tanstack/react-router (file-based, `src/routes/`) |
| Data | @tanstack/react-query + server functions |
| Styling | Tailwind CSS v4 |
| UI | Radix UI + shadcn/ui (`src/components/ui/`) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Notifications | Sonner |
| Server | Nitro → Vercel |
| IoT API | Tuya Cloud (HMAC-SHA256) |
| Language | TypeScript strict (no `any`) |

## Key Paths

```
src/routes/                    # File-based routes (auto-registered)
src/components/ui/             # shadcn/ui — never modify directly
src/lib/tuya/api.functions.ts  # Server functions (Tuya API) — server-only
src/lib/tuya/client.ts         # OAuth + HMAC-SHA256 signing
src/lib/tuya/mock.ts           # Mock data for offline dev
src/lib/tuya/types.ts          # TypeScript types
src/routeTree.gen.ts           # AUTO-GENERATED — never edit
src/server.ts                  # SSR handler + error normalization
src/start.ts                   # TanStack Start instance
```

## Rules

- No `any`, no `@ts-ignore` — strict TypeScript always
- Tuya API calls = server-side only (`'use server'`)
- `@/` → `src/` path alias
- Never edit `routeTree.gen.ts`
- Never add duplicate plugins to `vite.config.ts`
- shadcn/ui → use as-is, add via CLI only

---

## Learning Mode (ALWAYS REQUIRED)

After every code change, explain:

1. 🔍 **Why this file** — original problem, how file is involved
2. ⚙️ **How the logic works** — data flow, call chain, state
3. 🐛 **Root cause** — real cause not just error message
4. ✨ **Better pattern** — show alternative with reasoning if one exists
5. ⚠️ **Edge cases** — what current code doesn't handle

---

## Standard Workflow

> **Read → Think → Change step by step → Verify**

1. Read AGENTS.md + related source files
2. Explain: current behavior, affected files, dependencies
3. Plan ordered changes + trade-offs → wait for approval if high-risk
4. Change one file/function at a time with explanation
5. `bun lint` must pass → `bun build` must succeed
6. Diff table + answer all 5 Learning Mode questions
7. Conventional Commit: `fix(scope): description`
