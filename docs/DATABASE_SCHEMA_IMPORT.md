# KYP database schema import

This project’s schema is defined by ordered SQL migrations under `supabase/migrations/`. For a **single file** you can run in another environment, use:

- **`docs/kyp_database_schema.sql`** — all migrations concatenated in **lexicographic (timestamp) order** (~6k lines).

Regenerate it anytime after adding migrations:

```bash
( printf '%s\n' '-- KYP consolidated (see docs/DATABASE_SCHEMA_IMPORT.md)'; \
  for f in $(ls supabase/migrations/*.sql | LC_ALL=C sort); do \
    echo ""; echo "-- $(basename "$f")"; cat "$f"; \
  done ) > docs/kyp_database_schema.sql
```

## Recommended: stay on Supabase

The app targets **Supabase** (PostgREST + `auth` schema + RLS). The usual workflow is:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

That applies migrations from `supabase/migrations/` without manual concatenation.

## Requirements (PostgreSQL)

| Requirement | Notes |
|-------------|--------|
| **PostgreSQL** | **13+** (uses `gen_random_uuid()` built-in; no extension required in modern Postgres). **15** is a safe choice. |
| **`auth` schema** | Many tables reference **`auth.users(id)`**. That table is created and owned by **Supabase Auth**, not by these migrations. |
| **Roles** | RLS policies use **`authenticated`**, **`anon`**, and sometimes **`service_role`**. Supabase defines these; vanilla Postgres does not. |
| **RLS** | Policies use **`auth.uid()`**, **`auth.jwt()`**, etc. — provided in Supabase. |

So: **importing into plain RDS/Neon/Cockroach without adapting FKs and auth will fail or won’t match the app.**

### If you use another Postgres host (not Supabase)

You have two realistic options:

1. **Keep Supabase for Auth + DB** (simplest): point `VITE_SUPABASE_URL` / keys at Supabase; only move other infra.

2. **Custom Postgres**: you must either:
   - Create a compatible **`auth`** schema and **`users`** table (and roles) matching what Supabase exposes, **or**
   - Replace every **`REFERENCES auth.users(id)`** with your own `public.app_users` (or similar) and rewrite RLS to use your session variables — this is a **large** fork of the schema and app.

Triggers in some migrations attach to **`auth.users`** (e.g. auto-add workspace members). Those only run on Supabase unless you recreate equivalent hooks.

## What the consolidated file contains

- **Tables, constraints, indexes** for KYP (workspaces, projects, user journeys, law firms, examples, etc.).
- **Row Level Security** policies on most tables.
- **Functions / triggers** where migrations define them.
- **Data inserts** in a few migrations (e.g. seed rows, backfills). Replaying on a non-empty DB may conflict — prefer migrations on a **fresh** database.

## After import

1. **Create at least one user** in Supabase Auth (or your replacement), then align **`workspace_users`** and seed data as needed.
2. **Edge functions** (`supabase/functions/`) are **not** in the SQL file — deploy separately if you use them.
3. **Storage buckets** (if any) are not in migrations — configure in the provider UI.

## Security note

The consolidated SQL is **DDL for your own project**; treat it like source code. Do not commit **connection strings or keys**.
