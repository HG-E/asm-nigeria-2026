-- Durable record of public contact-form submissions from the landing page.
-- Previously the form just fired an email with no persistence -- if SMTP
-- failed, the message was gone with no trace. This also backs IP/email
-- based rate limiting (checked by the server action before insert) and
-- gives admins a record even if the notification/auto-reply emails fail.
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  ip_address text,
  secretariat_notified_at timestamptz,
  auto_reply_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index contact_messages_ip_created_idx on contact_messages (ip_address, created_at);
create index contact_messages_email_created_idx on contact_messages (email, created_at);

alter table contact_messages enable row level security;

-- All writes happen through the contact-form server action using the
-- service-role admin client (bypasses RLS by design, same as other
-- backend-only inserts in this app) -- no public insert policy needed.
-- Reads are admin-only; this isn't submission data other roles need.
create policy admin_read_contact_messages on contact_messages for select
using (auth_has_role('admin'::user_role));
