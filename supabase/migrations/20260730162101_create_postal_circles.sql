-- postal_circles: reference/lookup table, seeded once with the 23 official India Post circles
create table postal_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
