-- Real conference content supplied by the project owner (harmonized theme,
-- subtheme blurbs + topic lists, tagline), and a schema fix discovered
-- while seeding real reviewer assignments: reviewer_profiles' unique
-- constraint was (user_id, conference_id), meaning a reviewer could only
-- ever be linked to ONE subtheme per conference. Two of the five real
-- reviewers cover two subthemes each, so that's too restrictive -- widen
-- it to (user_id, conference_id, subtheme_id) so a reviewer can have one
-- row per subtheme they cover, while still preventing an exact duplicate.

alter table conferences add column if not exists tagline text;

alter table reviewer_profiles drop constraint if exists reviewer_profiles_user_id_conference_id_key;
alter table reviewer_profiles add constraint reviewer_profiles_user_id_conference_subtheme_key
  unique (user_id, conference_id, subtheme_id);

update conferences
set
  theme = 'One Health in Action: Advancing Microbial Science for Human, Animal, Environmental and Global Health',
  tagline = 'One Health, One Future, One Scientific Community'
where is_active = true;

update conference_subthemes
set
  name = 'Combating Antimicrobial Resistance through One Health Approaches',
  description = 'Antimicrobial resistance remains one of the most urgent threats to global health, cutting across human medicine, veterinary practice, agriculture, and the environment. This subtheme invites contributions on AMR surveillance and stewardship, novel antimicrobials and diagnostics, and the environmental and food-chain reservoirs that sustain resistance, with particular attention to integrated, cross-sectoral strategies for containment.

Topics include: AMR surveillance; Antimicrobial stewardship; Novel antimicrobials and diagnostics; Environmental reservoirs of resistance; Antimicrobial resistance along the food chain; One Health approaches to AMR in agriculture; Veterinary antibiotic use and food safety.'
where id = '02133ac6-83b4-4983-842d-e4fb58b7c1e3';

update conference_subthemes
set
  name = 'Emerging and Re-emerging Infectious Diseases: Preparedness, Surveillance and Response',
  description = 'As zoonotic spillover and outbreak risk intensify globally, this subtheme focuses on the science and systems needed for early detection and rapid response. Topics include genomic epidemiology, public health microbiology, laboratory strengthening, wastewater-based surveillance, and WASH interventions that build community-level resilience against infectious threats.

Topics include: Outbreak preparedness; Zoonotic diseases; Genomic epidemiology; Public health microbiology; Laboratory strengthening; Wastewater surveillance for public health and disease monitoring; WASH interventions for sustainable communities.'
where id = '58994a1c-984f-4881-b0f0-9dad77233b69';

update conference_subthemes
set
  name = 'From Lab to Landscape — Translating Microbial Science into Resilient One Health Systems and Governance',
  description = 'Laboratory discovery only delivers public value when it is translated into policy, regulation, and ecological stewardship. This subtheme welcomes work on science-to-policy translation and One Health governance frameworks, alongside research treating soil, water, and gut microbiomes as shared infrastructure whose resilience underpins both ecosystem stability and human/animal health outcomes.

Topics include: Science-to-policy translation and evidence-based One Health governance; Soil, water, and gut microbiomes as shared ecological infrastructure; Cross-sectoral regulatory frameworks linking environmental and human/animal health; Microbiome resilience as an indicator of ecosystem and public health stability; Policy instruments for protecting environmental microbial reservoirs; Multisectoral coordination mechanisms (human, animal, environmental sectors).'
where id = '7fa922a1-050e-49ed-abb2-e6292b9e969b';

update conference_subthemes
set
  name = 'Innovation, Biotechnology and Artificial Intelligence for Sustainable Microbiology',
  description = 'Emerging technologies are reshaping how microbial science is discovered, diagnosed, and deployed. This subtheme covers AI and big-data applications in microbiology and food/environmental safety, synthetic biology and biotechnology, precision medicine and genomics, and innovations that advance progress toward the Sustainable Development Goals.

Topics include: AI in microbial sciences and diagnostics; Biotechnology and synthetic biology; Environmental and industrial microbiology; Precision medicine and genomics; Digital health and bioinformatics; Artificial intelligence and big data in food and environmental microbiology; Microbial innovations for achieving the Sustainable Development Goals.'
where id = 'a980ece1-1379-45cf-80ac-7a85e657b6c8';

update conference_subthemes
set
  name = 'Building the Next Generation of Microbial Scientists through Mentorship, Research and Scientific Leadership for One Health Sustainability',
  description = 'A sustainable One Health agenda depends on a well-supported pipeline of scientists equipped to lead across disciplines and sectors. This subtheme addresses scientific writing and publishing, career development, entrepreneurship, and industry-academia partnerships, with emphasis on mentorship structures that nurture early-career microbiologists.

Topics include: Scientific writing and publishing; Career development; Entrepreneurship and innovation; Industry-academia partnerships; Student and early-career microbiologist development.'
where id = 'b7d401bd-c690-413c-a14a-9a741ac0aab5';
