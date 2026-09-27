-- Abstract titles can now carry formatting (italic genus names etc.), stored as
-- a small allow-list of tags (<i>, <b>, <u>, <sup>, <sub>) inside the title
-- text. Searching the raw title would miss matches that span a tag
-- ("aureus infection" inside "<i>Staphylococcus aureus</i> infection"), so keep
-- a formatting-free copy that the admin search reads.
--
-- A generated column: derived by the database from title every time, so it can
-- never drift, and nothing that writes titles has to know about it.
alter table submissions
  add column title_plain text generated always as (
    replace(replace(replace(
      regexp_replace(title, '</?(b|i|u|sup|sub|em|strong)>', '', 'gi'),
      '&lt;', '<'), '&gt;', '>'), '&amp;', '&')
  ) stored;
