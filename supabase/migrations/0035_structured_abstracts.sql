-- Structured abstracts: Background / Methods / Results / Conclusion.
--
-- Purely additive. abstract_text stays the canonical single-string form that
-- reviewers, committee, admin and notifications already read; for structured
-- versions it is now composed from these four columns by the app, so nothing
-- that reads it changes. Every existing row keeps NULL here and is treated as
-- a legacy free-text abstract (no backfill: splitting free text into sections
-- automatically would be guesswork and could misattribute an author's words).
--
-- A version is "structured" iff all four columns are non-empty; the Book of
-- Abstracts export uses that to print sections when present and the original
-- paragraph otherwise.
alter table submission_versions
  add column abstract_background text,
  add column abstract_methods text,
  add column abstract_results text,
  add column abstract_conclusion text;
