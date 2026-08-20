-- Registration now collects two more uploads alongside the payment
-- receipt: a passport photograph (for the participation pack/badge --
-- required, every registrant needs one) and an ASM membership certificate
-- (optional -- only members have one, and it exists to support the member
-- rate/benefits, not to gate registration itself). Table is still empty in
-- production, so passport_photo_path can be added NOT NULL directly.
alter table conference_registrations
  add column passport_photo_path text not null,
  add column asm_certificate_path text;
