# Applying DB Migrations

This project stores SQL migrations in the `db/` directory. To use the ticketing/scan features you must apply the migrations to your Postgres (Supabase) database in order.

Order to apply:

1. `db/001_add_scan_enabled_activation_requests_and_otps.sql`
2. `db/002_events_tickets.sql`

Options to apply migrations

1) Using psql (self-hosted Postgres or direct DB access)

Set these environment variables and run the included script:

```bash
PGHOST=127.0.0.1 PGDATABASE=dirt_trails PGUSER=postgres PGPASSWORD=secret ./scripts/apply_migrations.sh
```

2) Using Supabase (managed)

Supabase often does not expose direct DB credentials by default. Use the SQL editor in the Supabase dashboard and run each file's contents in order, or provide direct DB connection vars if available:

```bash
SUPABASE_DB_HOST=<host> SUPABASE_DB_NAME=<db> SUPABASE_DB_USER=<user> SUPABASE_DB_PASSWORD=<pass> ./scripts/apply_migrations.sh
```

3) Manual: copy-paste into the Supabase SQL editor

Open the Supabase dashboard and run the SQL from each file in the `db/` folder in the order above.

Verification

After running migrations, verify the tables exist:

```sql
\dt public.ticket_types
\dt public.orders
\dt public.order_items
\dt public.tickets
\dt public.activation_requests
\dt public.event_otps
```

Notes

- The migrations create `pgcrypto` extension. Ensure your DB user can create extensions or run the extension creation with a superuser.
- If using Supabase, create the migrations in a dev project first and confirm RLS policies allow the queries the frontend will run.
