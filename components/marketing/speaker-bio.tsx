// Genus names are italicized per scientific convention; "spp." and the rest
// of the text stay upright. Add further taxa here as new bios need them.
const ITALIC_TERMS = /(Drosophila|Staphylococcus)/g

export function SpeakerBio({ text }: { text: string }) {
  const parts = text.split(ITALIC_TERMS)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <em key={i}>{part}</em> : part
      )}
    </>
  )
}
