-- Tracks failed login attempts per IP so the login action can throttle
-- credential-stuffing/brute-force attempts at the app layer, independent of
-- whatever default rate limit Supabase Auth itself applies. Only failed
-- attempts are recorded (a legitimate user retrying a few times, or logging
-- in repeatedly across a day, should never be throttled).
create table login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_address text,
  email text not null,
  created_at timestamptz not null default now()
);

create index login_attempts_ip_created_idx on login_attempts (ip_address, created_at);

alter table login_attempts enable row level security;

-- No policies: this table is written and read exclusively by the login
-- Server Action via the service-role client. No session (author, reviewer,
-- admin, or anonymous) should ever read or write it directly.
