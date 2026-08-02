-- covers: the shared catalogue
create table covers (
  id uuid primary key default gen_random_uuid(),
  image_file text,
  name_of_cover text,
  gi_item_name text,
  gi_registration_number text,
  product_category text,
  cancellation_description text,
  cachet_description text,
  overall_description text,
  postal_circle_id uuid references postal_circles (id),
  place_of_issue text,
  date_of_issue date,
  verification_status text not null default 'draft' check (verification_status in ('draft', 'verified', 'flagged')),
  verified_by uuid references profiles (id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
