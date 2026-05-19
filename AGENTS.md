# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

RH System is a Next.js 15 web application for managing HR projects. Built with TypeScript, React 19, Tailwind CSS, and Supabase (PostgreSQL), it provides a dashboard for tracking project status, filtering by sector and status, and managing project lifecycle.

## Key Technologies

- **Framework**: Next.js 15.5.7 with App Router and Turbopack
- **Frontend**: React 19.2.0, TypeScript, Tailwind CSS 4
- **UI Components**: Radix UI primitives with custom styling
- **Backend**: Supabase PostgreSQL with RLS policies
- **Forms**: React Hook Form + Zod for validation
- **Visual Editing**: Orchids Visual Edits (localhost editing support)
- **Theme**: Light/dark mode via localStorage

## Development Commands

```bash
# Start development server (with Turbopack for faster HMR)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint (ignores build errors by default)
npm run lint
```

Visit `http://localhost:3000` after `npm run dev`.

## Project Structure

### `/src/app` - Pages and API Routes

- **`page.tsx`** - Main dashboard showing project stats, search, filters (sector, status, sort), and grid/list view toggle
- **`layout.tsx`** - Root layout with theme provider and visual edits messenger
- **`configuracoes/page.tsx`** - Settings page (appearance, notifications, security, user profile, data export)
- **`/api/projetos/route.ts`** - API endpoints for fetching and creating projects
  - GET: Filters by status, sector, search term; supports ordering
  - POST: Create new project (initializes as "ativo")
- **`/api/projetos/[id]/route.ts`** - Individual project endpoints
  - GET: Fetch single project
  - PATCH: Update project fields
  - DELETE: Delete project
- **`/api/projetos/[id]/sync-github/route.ts`** - GitHub synchronization
  - POST: Sync project's `data_atualizacao` with latest GitHub commit timestamp

### `/src/components`

- **`layout/`** - AppLayout (collapsible sidebar with responsive main content), Header, Sidebar navigation
- **`theme-provider.tsx`** - React Context for light/dark mode (persists to localStorage as "rh-theme")
- **`project-card.tsx`** - Card component displaying project info (name, description, status, sector, responsible person, contact email)
- **`create-project-modal.tsx`** - Modal form for creating new projects
- **`edit-project-modal.tsx`** - Modal form for editing existing projects

### `/src/lib`

- **`supabase.ts`** - Initializes Supabase client with public anon key; defines `Projeto` TypeScript type
- **`utils.ts`** - Helper function `cn()` for merging Tailwind classes with clsx + tailwind-merge

## Data Model

```typescript
type Projeto = {
  id: string;
  nome: string;
  setor: string | null;  // Department (Saúde Pública, Educação, etc.)
  descricao: string | null;
  status: "ativo" | "construcao" | "inativo";
  versao: string | null;
  url_base: string | null;
  logo_url: string | null;
  responsavel: string | null;  // Responsible person
  email_contato: string | null;
  data_criacao: string;
  data_atualizacao: string;
  criado_por: string | null;
};
```

**Supabase table**: `projetos` in public schema (all fields are in Portuguese)

## Sector Options

Fixed list defined in `/src/app/page.tsx`:
- "Saúde Pública", "Saúde", "Corporativo", "Educação", "Financeiro", "Tecnologia", "Administrativo"

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xwztnhlcafgcffozwxyg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Both are public (NEXT_PUBLIC prefix) and safe to expose. API operations use row-level security (RLS) in Supabase.

Optional for GitHub integration:
```
GITHUB_TOKEN=<personal_access_token>
```

The GITHUB_TOKEN increases API rate limits (5000/hour vs 60/hour). Generate at https://github.com/settings/tokens with `public_repo` scope. If not set, GitHub API calls use public rate limit.

## Important Patterns

1. **Client Components**: Most components use `"use client"` directive (pages and modals handle interactivity)
2. **API Routes**: Use Next.js API routes (not server actions) for Supabase queries
3. **Error Handling**: Currently basic (try-catch logs to console); no toast notifications for errors
4. **Loading States**: Dashboard shows skeleton cards while fetching; refresh button animates on loading
5. **Modals**: CreateProjectModal and EditProjectModal are conditionally rendered in page state
6. **Styling**: Tailwind with custom spacing, colors, and dark mode variants (e.g., `dark:bg-gray-800`)

## Common Development Tasks

### Add a New Page
1. Create file in `/src/app/<page-name>/page.tsx`
2. Wrap content with `<AppLayout>` component for consistent header/sidebar
3. Export as default export

### Add an API Endpoint
1. Create `/src/app/api/<resource>/route.ts`
2. Export async GET/POST/PATCH/DELETE functions
3. Use Supabase client from `/src/lib/supabase.ts` for database queries
4. Return `NextResponse.json()` with appropriate status codes

### Modify a Component
- Most components use Tailwind classes directly (no CSS modules)
- Use `cn()` utility from `/src/lib/utils.ts` for conditional Tailwind merging
- Dark mode: prefix classes with `dark:` (e.g., `bg-white dark:bg-gray-800`)

### Update TypeScript Types
- Proyecto types in `/src/lib/supabase.ts`
- Import `Projeto` type from `@/lib/supabase` when needed

### Sync Project with GitHub
Projects can automatically sync their `data_atualizacao` (last updated time) with the latest commit from a GitHub repository:

1. **Prerequisites**: Project must have `url_base` pointing to a GitHub repository
   - Format: `https://github.com/owner/repo` or `git@github.com:owner/repo.git`

2. **How it works**:
   - User clicks "Sincronizar com GitHub" in project card menu
   - API fetches the latest commit date from GitHub REST API
   - Updates `data_atualizacao` in Supabase with the commit timestamp
   - Dashboard reflects the change immediately after page reload

3. **Rate Limiting**:
   - Without GITHUB_TOKEN: 60 requests/hour per IP (GitHub public rate limit)
   - With GITHUB_TOKEN: 5000 requests/hour (set in `.env.local`)

4. **Error Handling**:
   - Returns 400 if project has no URL base
   - Returns 400 if URL is not a valid GitHub repository
   - Returns 500 if GitHub API is unreachable

## Debugging

- **Console**: Check browser DevTools for API errors and component logs
- **Supabase**: Visit Supabase dashboard to inspect `projetos` table directly
- **API**: Test endpoints with `/api/projetos?status=ativo&setor=Tecnologia` query strings
- **Theme**: Check localStorage key `rh-theme` to verify theme persistence

## Build Configuration

- **Next.js Config** (`next.config.ts`):
  - Turbopack enabled with Orchids visual edits loader
  - TypeScript and ESLint errors ignored during builds (enable in production if needed)
  - Remote image patterns allow any https/http hostname (security consideration for production)

## Known Issues & TODOs

- Settings page has placeholder event handlers (toggles, save buttons don't persist)
- No authentication/authorization currently (all data accessible via anon key)
- Error handling is minimal; consider adding toast notifications (sonner package is already installed)
- Responsiveness: Sidebar collapses on mobile; grid adjusts from 1 to 4 columns

## Testing

No test files in repository. To add tests:
- Use Jest + React Testing Library (common for Next.js projects)
- Place `.test.ts` or `.test.tsx` files alongside components
- Run via `npm test` (configure in package.json if needed)

## Deployment

Built with Vercel as the implied hosting platform (based on Next.js defaults). Deploy via:
- Push to main branch in Git
- Vercel auto-deploys and sets environment variables from Supabase project
- Ensure Supabase RLS policies are configured for production access control
