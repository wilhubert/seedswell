# AGENTS.md — Seedswell standing orders

You are working on **Seedswell**: a public countdown board for people building software. Plant a seed, call a date, ship in public. The thesis: AI made starting easy and finishing hard; the missing ingredient is a deadline other people can see.

**Status:** building. Called Nov 11, shipping **Dec 1**. This repo is Seedswell's own seed — its commit history is the first build log.

## The scope lock (read before every task)

**Shipped = a stranger can register with GitHub, create a project with a target date, connect their repo via webhook, and see commits and a ticking `day/30` counter on a public board.**

Nothing outside that sentence gets built before Dec 1. If the user asks for something not in it — comments, watchers, notification bells, badge embeds, OG images, avatar uploads, categories, filters, admin panels, analytics, emails — do not implement it. Respond by adding a one-line entry to `IDEAS.md` with today's date, and say you've parked it there. The only exceptions: bug fixes, security hardening, and changes required by the sentence above.

`DEC1.md` holds the finish line and the cut list. `IDEAS.md` is the parking lot. This protocol is non-negotiable: the failure mode this project must avoid is a beautifully over-built app on Dec 15.

## Stack (do not substitute)

- **Next.js** (App Router, TypeScript, strict) — all code in this repo
- **Supabase** — Postgres, auth (GitHub OAuth, already configured), RLS on every table
- **Vercel** — deployment; every push to `main` auto-deploys
- **GitHub webhooks** — the only sync mechanism; no OAuth repo scope, no stored GitHub tokens, no polling, no GitHub App

## Security boundaries (never cross these)

1. **RLS on every table, deny-by-default.** The Supabase anon key is public (ships in the browser) and this repo is public, so RLS policies are the _only_ thing between the internet and the data. Every new table gets RLS enabled at creation, then explicit policies: public read for board/profile/project data, `insert ... authenticated` with `auth.uid() = user_id` for own rows. Never test policies with the service role key — it bypasses RLS and hides lockouts; test with the anon key.
2. **`SUPABASE_SERVICE_ROLE_KEY` is server-only.** Used only in the webhook route (no auth context there). It must never appear in a `NEXT_PUBLIC_*` variable, client code, or logs. When wiring env vars, double-check which prefix the code uses — `NEXT_PUBLIC_` means it is bundled into the browser forever.
3. **The webhook endpoint verifies HMAC-SHA256 signatures.** Read the **raw request body before any JSON parsing** (the exact bytes GitHub signed). Recompute the HMAC with the project's stored secret, constant-time compare against the `x-hub-signature-256` header. Reject anything failing. Handle the `ping` event. Upsert by commit SHA so duplicate deliveries are idempotent. Never trust payload contents to identify the project — use the URL's project id plus the verified secret.
4. **No secrets in the repo, ever.** Env values live in Vercel env vars and `.env.local` (gitignored). The repo contains variable _names_ only.

## Data model (already decided — follow it)

- `profiles`: `id` (uuid, matches auth user), `username`, `avatar_url`, `bio`, `created_at`. Seeded on first GitHub sign-in.
- `projects`: `id`, `user_id`, `name`, `tagline`, `planted_at`, `target_days`, `shipped_at`, `ship_days`, `webhook_secret`, `connected_at`, `push_count`. No origin/status fields beyond these; the `day N/30 · X to go` counter is **computed client-side** from `planted_at + target_days`, never stored.
- `commits` (build log): `sha` (unique with project), `project_id`, `message`, `author`, `url`, `committed_at`, `pushed_at`.

Shipped = `shipped_at` set (with `ship_days` for the receipt). It is a user action; the system never auto-closes anything. (Called off with honesty note was removed Nov 14; idle dormancy is parked in `IDEAS.md`.)

## Working rules

- **Small diffs.** One task per change. No drive-by refactors, no reformatting untouched files, no new dependencies without asking first.
- **Commit messages are build-log entries.** They render publicly as Seedswell's proof of work: `Add profiles + projects schema`, `Webhook endpoint: HMAC verify + commit upsert` — never `fix`, `update`, `wip`, or `Initial commit`.
- **Deploy per milestone.** After each working unit, the change goes to `main` and gets verified on the live URL, not just locally. Local-green/prod-red is the most common AI-code failure; catch it every milestone.
- **Two-attempt circuit breaker.** If an approach fails twice, stop, explain the two failures plainly, and wait for the human. Do not try a third variation of the same idea unprompted.
- **30-minute pixel rule.** UI polish is capped: pick reasonable defaults, don't gold-plate. Styling beyond "clean and consistent" goes to `IDEAS.md`.
- **Honesty in error handling.** No silent catches, no fallbacks that hide failures, no fake success states. If the webhook verification fails, the request is rejected — visibly.
- **Respect existing files.** `DEC1.md`, `IDEAS.md`, `README.md`, and `package.json` conventions change only when the human says so.

## Known traps (verified against this setup)

- OAuth callback URL is `https://ieaynxaezauvowlvouvd.supabase.co/auth/v1/callback` — already wired on both GitHub and Supabase; don't touch it.
- Webhook raw-body access: read the body as text in the route handler before `JSON.parse`; re-serializing JSON breaks the HMAC check silently.
- Env vars must be scoped to Production in Vercel, or the first live deploy shows `Missing SUPABASE_URL` while local works.
- This repo's README was GitHub-generated before the scaffold; if merge conflicts arise, keep our README (the one with the bet in it).
- Next.js API routes run on Node runtime, not edge, for the webhook route (crypto + raw body behavior is predictable there).

## Out of scope until Dec 1

Comments · watchers/follows · notifications · share images/OG cards · badges/embeds · avatar uploads · categories/filters · search · admin tooling · emails · analytics · any auth provider besides GitHub · EU-hosting migration (deliberate v1.1).
