-- Seed the 23 officially verified India Post circles.
-- Source: docs/Postal-Circles-Reference.md — names preserved exactly as India Post lists them
-- ("Orissa" not "Odisha", "North Eastern" not "North East").
insert into postal_circles (name) values
  ('Andhra Pradesh'),
  ('Assam'),
  ('Bihar'),
  ('Chhattisgarh'),
  ('Delhi'),
  ('Gujarat'),
  ('Haryana'),
  ('Himachal Pradesh'),
  ('Jammu and Kashmir'),
  ('Jharkhand'),
  ('Karnataka'),
  ('Kerala'),
  ('Madhya Pradesh'),
  ('Maharashtra'),
  ('North Eastern'),
  ('Orissa'),
  ('Punjab'),
  ('Rajasthan'),
  ('Tamil Nadu'),
  ('Telangana'),
  ('Uttar Pradesh'),
  ('Uttarakhand'),
  ('West Bengal');
