# Database migrations

Keep future schema changes as numbered SQL files in this directory.

The current database already contains `public.focus_sessions`; no migration is required for the focus timer. Its existing structure and account permissions are documented in [Development](../docs/DEVELOPMENT.md#focus-sessions).

The initial create-table draft was not applied because it conflicted with the existing table. No tables, rows, grants, or policies were changed.
