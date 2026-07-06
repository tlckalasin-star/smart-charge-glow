---
applyTo: "**"
---

# GitHub Copilot Instructions — solarx-tuya-integration

## Project Context

This is a full-stack TypeScript application using **TanStack Start** that controls SolarX / EV charger devices via the **Tuya IoT Cloud API**. Deployed on Vercel via Nitro.

The actual source code is in the `smart-charge-glow/` subdirectory. All commands must be run from there.

## Tech Stack

- **Framework**: TanStack Start (full-stack React 19)
- **Routing**: `@tanstack/react-router` — file-based routes in `src/routes/`
- **Data Fetching**: `@tanstack/react-query` + TanStack Start server functions
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **UI**: Radix UI primitives + shadcn/ui pattern (`src/components/ui/`)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Notifications**: Sonner
- **Server**: Nitro (Vercel preset)
- **IoT**: Tuya Cloud API with HMAC-SHA256 auth
- **Package Manager**: Bun
- **Language**: TypeScript (strict mode)

## Code Generation Rules

### TypeScript
- NEVER use `any` type — always use specific types or `unknown`
- NEVER use `@ts-ignore` — fix the type properly
- Use Zod schemas for runtime validation of external data
- Export types from `src/lib/tuya/types.ts` for Tuya-related interfaces

### Components
- Use shadcn/ui components from `src/components/ui/` — do not reinvent
- Use `cn()` from `src/lib/utils.ts` for conditional class names
- Responsive design: use `useIsMobile()` from `src/hooks/use-mobile.tsx`
- Use Sonner `toast()` for notifications

### Server Functions (Tuya API)
- ALL Tuya API calls must be in `src/lib/tuya/api.functions.ts`
- Always mark with `'use server'` directive
- Never import Tuya client in client-side components
- Use mock data from `src/lib/tuya/mock.ts` for development

### Routing
- Routes live in `src/routes/` — TanStack Router auto-registers them
- NEVER manually edit `src/routeTree.gen.ts` — it is auto-generated
- Use `createFileRoute()` for all route files

### Build Config
- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config`
- Do NOT add: tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (already bundled)

## Lovable Integration Warning

This project is synced with [Lovable](https://lovable.dev).
- Never suggest force push, rebase, amend, or squash of already-pushed commits
- Keep the branch in a working/buildable state

## Commands

```bash
# All from smart-charge-glow/
bun dev        # Dev server
bun build      # Production build
bun lint       # ESLint
bun format     # Prettier
```

---

## Learning Mode

After every code suggestion or change, always explain:

1. **Why this approach** — what problem it solves, why this file/pattern
2. **How it works** — trace the data flow step by step
3. **Root cause** (for bugs) — real cause, not just the error message
4. **Better alternatives** — if a cleaner pattern exists, show it
5. **Edge cases** — what the current code doesn't handle yet

---

## Standard Workflow

> Read → Think → Change step by step → Verify

1. Read relevant files before making changes
2. Explain what the current code does and what's affected
3. Plan changes in order, highlight trade-offs
4. Modify one file/function at a time with explanation
5. Ensure `bun lint` and `bun build` both pass
6. Summarize what changed and why (diff table)
7. Suggest a Conventional Commit message

**Commit format**:
```
<type>(<scope>): <description>

<what & why>
```
Types: `feat` `fix` `refactor` `chore` `docs` `style` `test`
