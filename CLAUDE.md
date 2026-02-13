# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IMMO NPL (LegalRecover)** — SaaS B2B application for managing legal cases in real estate debt recovery (coproprietes). Two portals: Client (syndics) and Admin (avocats/lawyers).

## Architecture

- **Backend**: Directus (hosted on VPS via Coolify, PostgreSQL) — headless CMS providing REST API, auth, file storage, RBAC
- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS + ShadCN UI
- **Monorepo**: pnpm workspaces + Turborepo

```
apps/frontend/     → Next.js 15 frontend
apps/directus/     → Directus extensions (hooks, endpoints) + schema snapshots
packages/shared/   → Shared TypeScript types for Directus collections
```

## Commands

```bash
pnpm dev                    # Start all apps in dev mode (via Turborepo)
pnpm build                  # Build all apps
pnpm lint                   # Lint all apps
pnpm --filter frontend dev  # Start only the frontend
pnpm --filter frontend build
pnpm dlx shadcn@latest add <component>  # Add a ShadCN component (run from apps/frontend/)
```

## Key Conventions

### Language
- All UI text, labels, and user-facing content must be in **French**
- Code identifiers (variables, functions, components) in **English**
- Collection/field names in Directus are in **French** (dossiers, debiteurs, creances, etc.)

### Frontend Patterns
- **Route groups**: `(auth)/` for login, `(client)/` for syndic portal, `(admin)/` for lawyer portal
- **Auth flow**: Login via `/api/auth/login` API route -> Directus auth -> HTTP-only cookie -> middleware.ts guards routes -> dal.ts reads user in Server Components
- **Data fetching**: Server Components use `@directus/sdk` via `lib/directus.ts` client; CRUD functions live in `lib/api/<collection>.ts`
- **Form validation**: Zod schemas in `lib/validations/` + react-hook-form
- **Notifications**: Sonner (toast)
- **Icons**: Lucide React exclusively

### Design System
Source of truth: `DESIGN_SYSTEM.md`. Key tokens:
- Sidebar: `#0f172a` (client) / `#020617` (admin), width 280px
- Primary accent: `#6366f1` (indigo)
- Semantic colors: success `#10b981`, destructive `#ef4444`, warning `#f59e0b`, info `#3b82f6`
- Fonts: Inter (body), Playfair Display (brand/display)
- Border radius: buttons/inputs 8px, cards 12px, modals 16px, badges pill
- All CSS tokens defined as HSL variables in `globals.css`, mapped in `tailwind.config.ts`

### Directus Schema
12 custom collections with `dossiers` as the central hub. Full schema in `PLAN.md` Phase 2.
- References auto-generated as `LR-YYYY-NNN` via hook
- Timeline events auto-created on status change via hook
- Aggregated dashboard stats via custom endpoint (`/dashboard-stats/`)
- Three roles: Administrateur (full), Avocat (CRUD most collections), Syndic (read own data only, filtered by `syndics.user_id = $CURRENT_USER`)

### Directus Extensions
Located in `apps/directus/extensions/`:
- `hooks/auto-reference/` — generates sequential dossier reference on create
- `hooks/auto-timeline/` — creates timeline event on dossier status change
- `endpoints/dashboard-stats/` — aggregated stats for client and admin dashboards
