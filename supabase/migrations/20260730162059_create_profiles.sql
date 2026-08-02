-- profiles: extends auth.users with app-level role
create table profiles (
  id uuid primary key references auth.users (id),
  role text not null default 'collector' check (role in ('collector', 'admin', 'verifier')),
  display_name text,
  created_at timestamptz not null default now()
);
