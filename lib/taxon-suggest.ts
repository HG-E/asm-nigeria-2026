// Suggests what should probably be italic in a piece of abstract text:
// organism names, common gene names, and a few Latin phrases -- the things
// microbiology reviewers most often send abstracts back for.
//
// These are SUGGESTIONS the author accepts one by one (or all at once); nothing
// is ever changed silently, because no word list is perfect and a wrong
// automatic italic is worse than a missing one. "spp." / "sp." are never
// italicised, and neither are serovar names ("Salmonella Typhi": only the
// genus is italic).
//
// Pure function -- shared by the editor (browser) and tests.

export type SuggestionKind = "organism" | "gene" | "phrase"

export type Suggestion = {
  start: number // offset into the plain text
  end: number
  text: string
  kind: SuggestionKind
}

// Genera that turn up in clinical, veterinary, environmental and public-health
// microbiology, plus the vectors and hosts abstracts commonly name.
const GENERA = `
Acinetobacter Actinomyces Aeromonas Alcaligenes Anaplasma Ancylostoma Anopheles Aedes Culex Glossina Phlebotomus Simulium
Ascaris Aspergillus Bacillus Bacteroides Bartonella Bifidobacterium Bordetella Borrelia Brucella Burkholderia Campylobacter
Candida Chlamydia Chlamydophila Citrobacter Clostridioides Clostridium Corynebacterium Coxiella Cryptococcus Cryptosporidium
Cutibacterium Cyclospora Enterobacter Enterococcus Entamoeba Erwinia Escherichia Eubacterium Fusarium Fusobacterium
Gardnerella Giardia Haemophilus Helicobacter Histoplasma Klebsiella Lactobacillus Lactococcus Legionella Leishmania Leptospira
Leuconostoc Listeria Loa Malassezia Mansonella Micrococcus Moraxella Morganella Mucor Mycobacterium Mycoplasma Naegleria
Necator Neisseria Nocardia Onchocerca Pantoea Pasteurella Pediococcus Peptostreptococcus Plasmodium Plesiomonas Prevotella
Propionibacterium Proteus Providencia Pseudomonas Rhizopus Rickettsia Rhodococcus Saccharomyces Salmonella Schistosoma Serratia
Shigella Staphylococcus Stenotrophomonas Streptococcus Strongyloides Taenia Toxoplasma Treponema Trichomonas Trichophyton
Trichuris Trypanosoma Ureaplasma Vibrio Wuchereria Yersinia Drosophila Caenorhabditis Arabidopsis Mus Rattus Homo Bos Gallus
Sus Ovis Capra Canis Felis Equus Camelus Apis Musca Biomphalaria Bulinus Lymnaea Tilapia Clarias Oreochromis Zea Oryza Manihot
Moringa Azadirachta Vernonia Ocimum Allium Zingiber Curcuma Carica Persea Cocos Elaeis Theobroma Cannabis Nicotiana
Penicillium Trichoderma Rhizobium Azotobacter Nitrosomonas Nitrobacter Geobacter Shewanella Thiobacillus Methanobacterium
Halobacterium Sulfolobus Thermus Deinococcus Synechococcus Anabaena Microcystis Chlorella Spirulina Lemna
Achromobacter Aggregatibacter Arcobacter Bdellovibrio Bergeyella Cedecea Chryseobacterium Comamonas Cronobacter Delftia
Edwardsiella Elizabethkingia Empedobacter Ewingella Francisella Gordonia Kluyvera Kocuria Lelliottia Leclercia Mannheimia
Myroides Ochrobactrum Paenibacillus Pandoraea Photobacterium Raoultella Roseomonas Rothia Sphingomonas Streptomyces Tsukamurella
Weissella Wolbachia Zymomonas Absidia Alternaria Blastomyces Coccidioides Cladosporium Curvularia Epidermophyton Exophiala
Lichtheimia Microsporum Paracoccidioides Pneumocystis Rhizomucor Scedosporium Sporothrix Talaromyces Balantidium Babesia
Cystoisospora Dientamoeba Eimeria Encephalitozoon Enterocytozoon Fasciola Hymenolepis Isospora Leishmania Metagonimus Opisthorchis
Paragonimus Sarcocystis Theileria Toxocara Trichinella Trichostrongylus Dracunculus Brugia Dirofilaria Haemonchus Cooperia
Lucilia Cochliomyia Rhipicephalus Amblyomma Hyalomma Ixodes Ornithodoros Tunga Sarcoptes Pediculus Cimex Triatoma Rhodnius
`
  .split(/\s+/)
  .filter(Boolean)

const GENUS_SET = new Set(GENERA)
const GENUS_INITIALS = new Set(GENERA.map((g) => g[0]))

// Species epithets that are well known enough to accept on sight.
const EPITHETS = new Set(
  `
coli aureus epidermidis saprophyticus haemolyticus pneumoniae pyogenes agalactiae mutans faecalis faecium gallinarum casseliflavus
aeruginosa putida fluorescens baumannii calcoaceticus lwoffii typhi paratyphi typhimurium enteritidis enterica bongori choleraesuis
dysenteriae flexneri sonnei boydii cholerae parahaemolyticus vulnificus jejuni coli fetus tuberculosis bovis africanum leprae
avium intracellulare kansasii abscessus ulcerans marinum smegmatis fortuitum chelonae albicans glabrata tropicalis krusei parapsilosis
auris neoformans gattii fumigatus flavus niger terreus nidulans oxytoca aerogenes cloacae sakazakii freundii koseri amalonaticus
mirabilis vulgaris penneri rettgeri stuartii morganii marcescens liquefaciens influenzae parainfluenzae ducreyi pertussis
parapertussis bronchiseptica meningitidis gonorrhoeae lactamica anthracis cereus subtilis thuringiensis licheniformis megaterium
botulinum difficile perfringens tetani sordellii septicum novyi trachomatis psittaci abortus pylori pneumophila monocytogenes
burgdorferi pallidum interrogans falciparum vivax malariae ovale knowlesi gondii lamblia intestinalis histolytica lumbricoides
duodenale stercoralis mansoni haematobium japonicum solium saginata brucei cruzi donovani infantum major tropica arabiensis
gambiae funestus coluzzii stephensi aegypti albopictus quinquefasciatus melanogaster elegans thaliana sapiens musculus norvegicus
rattus taurus gallus scrofa aries hircus familiaris catus caballus dromedarius mellifera domestica niloticus gariepinus indica
oleifera sativa officinale longa papaya americana nucifera guineensis cacao cepa maydis
plantarum acidophilus rhamnosus casei reuteri lactis brevis fermentum bulgaricus thermophilus longum bifidum infantis animalis
fragilis thetaiotaomicron acnes gardnerella vaginalis trichomonas rickettsii prowazekii typhi conorii burnetii pneumocystis jirovecii
maltophilia cepacia pseudomallei mallei melitensis suis canis ovis abortus tularensis pestis enterocolitica pseudotuberculosis
diphtheriae ulcerans jeikeium striatum xerosis hominis lugdunensis pseudintermedius intermedius schleiferi capitis warneri
`
    .split(/\s+/)
    .filter(Boolean)
)

// Words that can follow a genus name in ordinary prose and are NOT a species.
const NOT_EPITHETS = new Set(
  `
the and was were are is has have had with from that this these those which who whose among between within without in on of to for by at as or
isolates isolate strains strain species infection infections isolated organisms organism bacteria bacterium serovars serovar serotypes
serotype causing caused group groups cells cell colonies colony positive negative resistant resistance sensitive susceptible carriage
prevalence infections isolation detected detection cases case patients patient samples sample spp sp cf aff subsp var
`
    .split(/\s+/)
    .filter(Boolean)
)

// Latin-looking endings, used only with a known genus in front of the word.
const LATIN_ENDING = /(?:us|ae|ii|is|um|ense|ans|ens|ica|icum|osa|ata|ella|oides|iae|ei|oi)$/

const GENE_PREFIXES =
  "bla|mec|van|mcr|tet|erm|aac|aad|aph|qnr|sul|dfr|gyr|par|cat|cfr|oqx|fos|arr|opr|mex|acr|tol|rpo|inv|hil|stx|eae|hly|omp|ctx|tem|shv|oxa|ndm|kpc|vim|imp|cmy|dha|nor|flh|fli|pil"
// A lower-case gene prefix followed straight away by a capital letter or a
// dash-number (mecA, blaCTX-M-15, vanA, mcr-1, gyrA, tet(M)) -- the shape that
// separates a gene from an ordinary word like "category" or "normal".
const GENE_PATTERN = new RegExp(
  `\\b(?:${GENE_PREFIXES})(?:\\([A-Z]\\)|[A-Z][A-Za-z0-9]*|-\\d+[A-Za-z]?)(?:-[A-Za-z0-9]+)*(?![A-Za-z0-9])`,
  "g"
)

const PHRASE_PATTERN = /\b(?:in vitro|in vivo|in situ|ex vivo|in silico|de novo|per se|sensu lato|sensu stricto|et al\.?)(?![A-Za-z])/g

function isPlausibleEpithet(word: string) {
  if (NOT_EPITHETS.has(word)) return false
  if (EPITHETS.has(word)) return true
  return word.length >= 4 && LATIN_ENDING.test(word)
}

// `italic` marks characters that are already italic, so they are not suggested
// again. Returns non-overlapping suggestions in text order.
export function findItalicSuggestions(plain: string, italic?: boolean[]): Suggestion[] {
  const found: Suggestion[] = []
  const add = (start: number, end: number, kind: SuggestionKind) => {
    if (end <= start) return
    if (italic) {
      let all = true
      for (let i = start; i < end; i++) if (!italic[i]) all = false
      if (all) return
    }
    found.push({ start, end, text: plain.slice(start, end), kind })
  }

  // Full names: Genus [epithet]. The genus is always italic; the epithet joins
  // it only when it really looks like a species epithet.
  const seenInitials = new Map<string, Set<string>>() // initial -> epithets seen in full
  for (const m of plain.matchAll(/\b([A-Z][a-z]{2,})(?:\s+([a-z][a-z-]{2,}))?/g)) {
    const genus = m[1]
    if (!GENUS_SET.has(genus)) continue
    const start = m.index
    const epithet = m[2]
    if (epithet && isPlausibleEpithet(epithet)) {
      add(start, start + genus.length + (m[0].length - genus.length), "organism")
      const set = seenInitials.get(genus[0]) ?? new Set<string>()
      set.add(epithet)
      seenInitials.set(genus[0], set)
    } else {
      add(start, start + genus.length, "organism")
    }
  }

  // Abbreviated names: E. coli, S. aureus.
  for (const m of plain.matchAll(/\b([A-Z])\.\s?([a-z][a-z-]{2,})\b/g)) {
    const [, initial, epithet] = m
    if (!GENUS_INITIALS.has(initial)) continue
    const knownFromText = seenInitials.get(initial)?.has(epithet)
    // Abbreviations are only trusted for well-known epithets or ones already
    // seen written out in full -- "B. streptococcus" alone could be anything.
    if (knownFromText || (EPITHETS.has(epithet) && !NOT_EPITHETS.has(epithet))) add(m.index, m.index + m[0].length, "organism")
  }

  for (const m of plain.matchAll(GENE_PATTERN)) add(m.index, m.index + m[0].length, "gene")
  for (const m of plain.matchAll(PHRASE_PATTERN)) add(m.index, m.index + m[0].length, "phrase")

  // Sort and drop overlaps (keep the earlier / longer one).
  found.sort((a, b) => a.start - b.start || b.end - a.end)
  const result: Suggestion[] = []
  for (const s of found) {
    const last = result[result.length - 1]
    if (last && s.start < last.end) continue
    result.push(s)
  }
  return result
}
