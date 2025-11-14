# BrainLeap Backend (Mock Auth)

## Environment Setup

1. Copy `env/example.env` to `env/.env` and fill in your real secrets (Supabase keys, Gemini API key/model, etc.).
2. Set `MOCK_AUTH=true` to use mock login locally, or `MOCK_AUTH=false` to proxy real Supabase auth.

## Mock Login Mode

The backend now supports a mock authentication mode that accepts any email/password combination and returns a stub user/token. This is enabled by default so local development works without connecting to Supabase.

- Keep `MOCK_AUTH=true` in `env/.env` to stay offline.
- To connect to the real Supabase database, set `MOCK_AUTH=false` and provide valid `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY`.

> ⚠️ **Important:** Disable mock login (`MOCK_AUTH=false`) before deploying to staging or production environments.


