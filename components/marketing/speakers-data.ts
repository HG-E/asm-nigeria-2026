// Single source of truth for speaker profiles and the sub-theme labels they
// reference -- shared by the homepage's speaker teaser (landing-page.tsx)
// and the dedicated /speakers page (speakers-page.tsx) so the two can never
// drift out of sync with each other.

export type Speaker = {
  accent: string
  initials: string
  image: string
  chip: string
  chipLabel: string
  name: string
  title: string
  sub: string | null
  subthemeIndex: number | null
  bio: string
}

export const ELIGIBLE_SUBTHEMES = [
  { bg: "var(--red)", color: "#fff", label: "Antimicrobial Resistance" },
  { bg: "var(--gold)", color: "var(--blue-d)", label: "Emerging Infectious Diseases" },
  { bg: "var(--blue)", color: "#fff", label: "Microbial Science & Governance" },
  { bg: "var(--red)", color: "#fff", label: "AI & Biotechnology" },
  { bg: "var(--gold)", color: "var(--blue-d)", label: "Next-Gen Scientists" },
]

// Listed in whatever order is convenient to edit; SPEAKERS below is what the
// site actually renders, always ordered keynote/convener first and then by
// sub-theme 1 through 5 -- so a newly added speaker lands in the right place
// just by setting subthemeIndex.
const SPEAKER_LIST: Speaker[] = [
  {
    accent: "var(--red)",
    initials: "KE",
    image: "/speakers/kehinde-eniola.jpg",
    chip: "chip-red",
    chipLabel: "Keynote Speaker",
    name: "Prof. Kehinde I.T. Eniola",
    title: "Pioneer Vice Chancellor",
    sub: "Kogi State University, Kabba",
    subthemeIndex: null,
    bio: "Professor Kehinde I. T. Eniola, fNSM, is the Pioneer Vice Chancellor of Kogi State University, Kabba, having previously served as Acting Vice Chancellor of Joseph Ayo Babalola University (JABU) in 2022. A Professor of Environmental and Public Health Microbiology, he holds a B.Sc., M.Sc., and Ph.D. in Microbiology from the University of Ilorin, with doctoral research in Environmental Microbiology, and his scholarship spans water quality, sanitation and hygiene (WASH), microbial pollution, biodegradation, and the application of microbiology to public health and sustainable development. He served as President of the Nigerian Society for Microbiology (2014–2018), where he remains a Fellow (fNSM), and as ASM Nigeria Country Ambassador (2018–2023), promoting professional networking, mentorship, and scientific engagement across the country. An advocate for entrepreneurial, “money-making” microbiology, he is known for translating scientific knowledge into practical opportunity and societal impact. Popularly called the “Digital VC” for his embrace of innovative, technology-driven solutions in education and microbiology, he brings a rare combination of research depth, professional leadership, and institutional administration to the One Health platform.",
  },
  {
    accent: "var(--gold)",
    initials: "SA",
    image: "/speakers/sylvia-anyadoh-nwadike.jpg",
    chip: "chip-gold",
    chipLabel: "Conference Convener",
    name: "Sylvia O. Anyadoh-Nwadike, PhD",
    title: "ASM Country Ambassador to Nigeria",
    sub: null,
    subthemeIndex: null,
    bio: "",
  },
  {
    accent: "var(--blue)",
    initials: "UU",
    image: "/speakers/uduma-oji-uduma.jpg",
    chip: "chip-blue",
    chipLabel: "Chief Host",
    name: "Prof. Uduma Oji Uduma",
    title: "Vice-Chancellor",
    sub: "National Open University of Nigeria (NOUN)",
    subthemeIndex: null,
    bio: "Professor Uduma Oji Uduma is a Professor of Philosophy and Logic and a Barrister-at-Law. He is the 6th Substantive Vice-Chancellor of the National Open University of Nigeria (NOUN).",
  },
  {
    accent: "var(--blue)",
    initials: "MM",
    image: "/speakers/md-mukhtar.jpg",
    chip: "chip-blue",
    chipLabel: "Guest Speaker",
    name: "Prof. MD Mukhtar",
    title: "Professor of Pharmaceutical & Medical Microbiology",
    sub: "Bayero University, Kano",
    subthemeIndex: 3,
    bio: "Professor MD Mukhtar (Mukhtar Muhammad Dauda), FNSM, is a Professor of Pharmaceutical and Medical Microbiology at Bayero University, Kano, where he currently heads the Department of Pharmaceutical Microbiology and Biotechnology in the Faculty of Pharmaceutical Sciences. His research centres on drug research and chemotherapy, public health, and microbial biotechnology, and he is President and co-founder of the Centre for Environmental and Public Health Research and Development (CEPHARD). He has authored over 100 peer-reviewed publications and four books, including Evaluation of Quality of Pediatric Antimicrobials, and has supervised more than 150 M.Sc. and Ph.D. students across Microbiology, Pharmaceutical Microbiology, Microbial Genetics, and General Biology. He was the pioneer Editor-in-Chief of the Bayero Journal of Pure and Applied Sciences (2008–present), has chaired Bayero University's Ethical Review Committee for Science, Technology and Environmental Research since 2019 and its Kano Studies Journal of Savannah and Sudanic Research since 2020, and serves as an accreditation panelist for Nigeria's National Universities Commission (NUC), National Board for Technical Education (NBTE), and National Commission for Colleges of Education (NCCE). He was the pioneer Head of the Department of Microbiology at Gombe State University (2013–2016) and later Acting HOD of Microbiology at BUK, and chaired the Kano State Presidential Committee of the Federal Government's Special Public Works programme (2020–2021). A National Secretary of the Nigerian Society for Microbiology and Council Member/Board of Trustees member of Maryam Abacha American University of Niger, he holds membership across more than a dozen national and international scientific and professional bodies, including the American Society for Microbiology, and has presented at over 50 national and international conferences.",
  },
  {
    accent: "var(--red)",
    initials: "UB",
    image: "/speakers/umar-bindir.jpg",
    chip: "chip-blue",
    chipLabel: "Guest Speaker",
    name: "Engr. Umar Buba Bindir, PhD",
    title: "Founder & COO, Bindir Knowledge Development Centre",
    sub: "Former Director-General, NOTAP",
    subthemeIndex: 4,
    bio: "Engr. Umar Buba Bindir, PhD — also known as the Babban Mufti of Adamawa Emirate — is a First Class Agricultural Engineer from Adamawa State, with postgraduate training from Cranfield University (formerly Cranfield Institute of Technology) in the United Kingdom, where he specialised in Agricultural Machinery Design and Development. He is a Chartered Engineer (CEng, UK), a COREN-registered engineer, and a Fellow of the Nigerian Academy of Engineering, the Nigerian Society of Engineers, the Nigerian Institution of Agricultural Engineers, and the Solar Energy Society of Nigeria, and is a recipient of Nigeria's National Productivity Order of Merit (NPOM). A retired university lecturer, he spent many years in the federal civil service, including as Director-General/CEO of the National Office for Technology Acquisition and Promotion (NOTAP), and later served as Secretary to the Government of Adamawa State (2015–2019). He is a widely recognised voice in Nigeria's science, technology and innovation (STI) sector, a regular commentator on national television and radio, and an inventor and patent holder — notably of the K-Allo basic-education tool designed to address Africa's out-of-school-children crisis. His public-service career also spans the design and implementation of major poverty-eradication programmes, including FEAP, PAP 2000 and NAPEP, and he served as National Coordinator of the National Social Investment Programme (NSIP) from 2020 to 2023. He is currently Founder and Chief Operating Officer of the Bindir Knowledge Development Centre International (BKC) in Yola, which equips in- and out-of-school children and youth with technical and entrepreneurial skills in technology, agriculture, education and entrepreneurship.",
  },
  {
    accent: "var(--gold)",
    initials: "NM",
    image: "/speakers/najmus-mahfooz.jpg",
    chip: "chip-blue",
    chipLabel: "Guest Speaker",
    name: "Dr. Najmus Mahfooz",
    title: "Senior Research Scientist",
    sub: "The Ohio State University Wexner Medical Center",
    subthemeIndex: 5,
    bio: "Dr. Najmus Mahfooz is a Senior Research Scientist with over 15 years of expertise in molecular biology, immunology and infectious disease research, currently directing research and laboratory operations in the Department of Microbial Infection and Immunity at The Ohio State University Wexner Medical Center. Her landmark study on IL-35 as a competitive inhibitor of the IL-12 receptor complex, published in Immunohorizons (2023), opened new avenues for therapeutic intervention in inflammatory disease, and she co-investigated the efficacy of 222nm UV-C light for SARS-CoV-2 disinfection, published in Scientific Reports (2022). A skilled functional genomicist, she has engineered CRISPR/Cas9 knockout strains of Staphylococcus spp. to study biofilm formation and virulence, and earlier in her career pioneered RNAi-based loss-of-function assays in non-model insects to elucidate the role of Hox genes in limb development, work published in PNAS and PLoS ONE. She has managed daily operations for a team of 10+ scientists, authored more than 25 Standard Operating Procedures, served as primary safety officer for a BSL-3 facility, and maintained strict compliance with IACUC, IBC and IRB regulations, alongside serving on graduate admissions committees for Ohio State's M.S. and Ph.D. programmes. A committed mentor to junior scientists, postdoctoral fellows and undergraduates, she previously held a faculty position at Princess Nora University in Saudi Arabia, teaching biochemistry, nutritional epidemiology and inherited metabolic diseases. She earned her Ph.D. in Molecular and Developmental Biology from Wayne State University (2006), where she received the Outstanding Graduate Teaching Assistant Award and the Best Poster Presentation Award, and holds a BSc in Microbiology from Bayero University, Kano (1994). With 12+ peer-reviewed publications and a strong record of grant-funded research, she is dedicated to translating basic science discoveries into clinically relevant solutions.",
  },
  {
    accent: "var(--gold)",
    initials: "AP",
    image: "/speakers/andrew-pekosz.jpg",
    chip: "chip-blue",
    chipLabel: "Guest Speaker",
    name: "Prof. Andrew Pekosz",
    title: "Professor and Vice Chair, Molecular Microbiology & Immunology",
    sub: "Johns Hopkins Bloomberg School of Public Health, USA",
    subthemeIndex: 2,
    bio: "Professor Andrew Pekosz is Professor and Vice Chair of the W. Harry Feinstone Department of Molecular Microbiology and Immunology at the Johns Hopkins Bloomberg School of Public Health in Baltimore, Maryland. He directs the Johns Hopkins Center for Excellence in Influenza Research and Response (JH-CEIRR) and the Center for Emerging Viral Infectious Diseases (CEVID). His laboratory studies the basic biology of influenza, coronaviruses and other emerging and zoonotic virus infections. He has authored more than 250 publications, serves on the editorial boards of several scientific journals, and has served on National Institutes of Health scientific and policy review boards focused on biosafety and biocontainment. A frequent expert voice in the public conversation on COVID-19, influenza, vaccines, biosafety, emerging infectious diseases and pandemic preparedness, he has been interviewed by national and international news organisations including National Public Radio, the Associated Press, the New York Times, the Washington Post, CNN, C-SPAN, the BBC and Bloomberg Television, as well as numerous local radio and television stations.",
  },
  {
    accent: "var(--red)",
    initials: "MC",
    image: "/speakers/mark-chee.jpg",
    chip: "chip-blue",
    chipLabel: "Guest Speaker",
    name: "Dr. Mark Kuan Leng Chee, PhD",
    title: "Assistant Professor of Biology",
    sub: "Hood College, Maryland, USA",
    subthemeIndex: 1,
    bio: "Dr. Mark Kuan Leng Chee is a microbiologist, infectious disease biologist and educator, and Assistant Professor of Biology at Hood College, Maryland, where he teaches microbiology, infectious disease biology, genetics and general biology. He holds a PhD and BS from Duke University and a graduate certificate in Epidemiology and Clinical Research from Stanford University. Appointed an ASM Science Teaching Fellow for 2014–2015, he joined Martin Methodist College (later the University of Tennessee Southern) as Assistant Professor of Biology in 2015, where he developed his research interest in infectious diseases, before moving to Hood College in 2024. His research examines interactions between bacterial pathogens, commensal microorganisms and animal hosts using Drosophila (vinegar flies) as a model system, providing insight into microbial ecology, host–microbe interactions and pathogen biology that underpin the study of antimicrobial resistance across interconnected biological systems — supported by his expertise in bacterial culture, molecular biology, gene expression, PCR and synthetic biology. In 2022, he launched the Microbiology, Public Health & History (MPH) film festival with an ASM Community Science Grant, and in 2024, with Marina Wylie of the Uniformed Services University, won a Civic Engagement Microgrant from Research!America to support the festival's first year at Hood College; now in its fifth season, past features have included The Silent Pandemic — the Global Fight Against Antibiotic Resistance. His academic interests extend beyond laboratory microbiology to infectious-disease epidemiology, pandemic history, vaccination and public-health communication.",
  },
]

export const SPEAKERS: Speaker[] = [
  ...SPEAKER_LIST.filter((s) => s.subthemeIndex === null),
  ...SPEAKER_LIST.filter((s) => s.subthemeIndex !== null).sort(
    (a, b) => (a.subthemeIndex as number) - (b.subthemeIndex as number)
  ),
]
