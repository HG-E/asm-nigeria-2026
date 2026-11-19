// Overlays real registrant data onto the fixed badge artwork
// (public/badges/template.png): the photo circle, name, affiliation and
// registration ID all land on plain white background on the template, so
// these are drawn directly on top -- no separate "blank" template asset
// needed. Positions are percentages of the badge's own box, which is locked
// to the template image's exact aspect ratio (2242:3168), so they stay
// correctly placed at any print or screen size.
export function RegistrationBadge({
  photoUrl,
  fullName,
  affiliation,
  registrationId,
  qrDataUrl,
}: {
  photoUrl: string | null
  fullName: string
  affiliation: string | null
  registrationId: string
  qrDataUrl: string
}) {
  return (
    <div
      className="badge-card relative w-full overflow-hidden bg-white"
      style={{ aspectRatio: "2242 / 3168" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/badges/template.png" alt="" className="absolute inset-0 size-full object-cover" />

      {/* Photo circle */}
      <div
        className="absolute overflow-hidden rounded-full border-[0.6%] border-[#1b2a5e] bg-white"
        style={{ width: "27%", aspectRatio: "1 / 1", left: "50%", top: "55%", transform: "translate(-50%, -50%)" }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={fullName} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-[#dce6f5] text-[3.5vw] font-bold text-[#1b2a5e]">
            {fullName
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
        )}
      </div>

      {/* Name -- deliberately large and bold: this has to be readable across
          a table on a badge hanging from a lanyard, not just up close. */}
      <div
        className="absolute flex items-center justify-center bg-white px-[2%] text-center leading-tight font-extrabold text-[#1b2a5e]"
        style={{ left: "8%", top: "62.5%", width: "84%", height: "6.2%", fontSize: "4.6%" }}
      >
        <span className="line-clamp-2">{fullName}</span>
      </div>

      {/* Affiliation */}
      <div
        className="absolute flex items-center justify-center bg-white px-[2%] text-center text-[#1b2a5e]"
        style={{ left: "10%", top: "69%", width: "80%", height: "3.2%", fontSize: "2.2%" }}
      >
        <span className="line-clamp-1">{affiliation || " "}</span>
      </div>

      {/* Registration ID (next to the static "REGISTRATION ID" label already in the artwork) */}
      <div
        className="absolute flex items-center bg-white font-bold text-[#1b2a5e]"
        style={{ left: "50.5%", top: "84.3%", width: "20%", height: "4%", fontSize: "3%" }}
      >
        {registrationId}
      </div>

      {/* QR code -- sized up and generated at a high error-correction level
          (see lib/registration-qr.ts) so it still scans reliably off a
          printed badge: ink bleed, slight misalignment and lamination glare
          all eat into a QR's readable margin. */}
      <div className="absolute" style={{ left: "22%", top: "80.8%", width: "21%", aspectRatio: "1 / 1" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Check-in QR code" className="size-full object-contain" />
      </div>
    </div>
  )
}
