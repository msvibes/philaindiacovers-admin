-- covers.image_file was nullable at the schema level with nothing but
-- T-02's import-time validation preventing a null value in practice — the
-- same class of gap this project has closed before (a database constraint
-- doesn't care whether the app that inserted the row was well-behaved).
-- Confirmed empirically before applying, not assumed: the live covers
-- table has exactly one row and zero rows with a null image_file.
alter table covers
  alter column image_file set not null;
