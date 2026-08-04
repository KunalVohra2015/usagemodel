<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository Guidelines

## Project Structure

This repository is a Next.js 16 modular monolith. Keep routes and layouts in
`src/app/`, reusable UI in `src/components/`, domain logic in `src/features/`,
and cross-cutting integrations in `src/lib/`. Versioned HTTP endpoints belong
under `src/app/api/v1/`; both the web app and future Chrome extension must use
the same domain rules. Static assets live in `public/`, Supabase migrations and
policies will live in `supabase/`, and product decisions live in `docs/`.

## Commands

- `npm run dev` starts the Turbopack development server at localhost:3000.
- `npm run lint` runs the Next.js TypeScript and Core Web Vitals rules.
- `npm run build` performs the production build and framework type checks.
- `npm run start` serves a completed production build.

There is no test runner yet. Add focused unit and integration scripts before
shipping application behavior; do not describe unconfigured commands as usable.

## Code Conventions

Use strict TypeScript, two-space indentation, semicolons, and double quotes,
matching the generated project. Name React components and exported types in
`PascalCase`, functions and variables in `camelCase`, and route folders in
lowercase kebab-case. Prefer Server Components. Add `"use client"` only where
browser state or APIs require it. Keep authorization and validation in domain
services rather than UI components.

## Security and Data Access

Treat every Route Handler as public. Validate inputs, authenticate requests,
check organization membership, and rely on Supabase Row Level Security as the
final authorization boundary. Never expose the Supabase service-role key or any
unprefixed secret to browser or extension code. Store screenshots in a private
bucket and return short-lived signed URLs only after authorization.

## Commits and Pull Requests

The history currently has one initial commit, so no established convention
exists. Use short imperative subjects such as `Add feedback submission schema`.
Keep commits independently testable and include migrations with their policies.
Pull requests should explain the user-visible outcome, list verification run,
link relevant issues or plan slices, and include screenshots for UI changes.
