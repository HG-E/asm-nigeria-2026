-- Adds the required ASM ID Number field to author registration/profile
-- (spec sections 8 and 9). No existing rows in user_profiles at the time of
-- this migration, so it's safe to add as NOT NULL directly.

alter table public.user_profiles
  add column asm_id_number text not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    asm_id_number,
    role,
    professional_title,
    institution,
    department,
    country,
    phone,
    orcid
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'asm_id_number', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'author'),
    new.raw_user_meta_data->>'professional_title',
    new.raw_user_meta_data->>'institution',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'orcid'
  );
  return new;
end;
$$;
