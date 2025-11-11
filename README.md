# BrainLeap Backend (Mock Auth)

## Mock Login Mode

The backend now supports a mock authentication mode that accepts any email/password combination and returns a stub user/token. This is enabled by default so local development works without connecting to Supabase.

- Set `MOCK_AUTH=true` (default) in `server/.env` to keep mock login on.
- To connect to the real Supabase database, set `MOCK_AUTH=false` and provide valid `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`.

> ⚠️ **Important:** Disable mock login (`MOCK_AUTH=false`) before deploying to staging or production environments.


