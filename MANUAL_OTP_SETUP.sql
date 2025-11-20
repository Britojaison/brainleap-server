-- Create a table to store OTP codes
create table if not exists public.verification_codes (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  code text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Create an index on email for faster lookups
create index if not exists verification_codes_email_idx on public.verification_codes (email);

-- Enable Row Level Security (RLS)
alter table public.verification_codes enable row level security;

-- Create a policy to allow the service role (backend) to do everything
create policy "Service role can do everything on verification_codes"
  on public.verification_codes
  using (true)
  with check (true);
