// Overlays real registrant data onto the fixed badge artwork
// (public/badges/template.png): the photo circle, name, affiliation and
// registration ID all land on plain white background on the template, so
// these are drawn directly on top -- no separate "blank" template asset
// needed. Positions are percentages of the badge's own box, which is locked
// to the template image's exact aspect ratio (2242:3168), so they stay
// correctly placed at any print or screen size. The vertical budget between
// the photo circle's bottom edge (~64.5%) and the "PARTICIPANT" banner's top
// edge (~71.5%) is tight, and the QR's bottom edge has to clear the website
// URL footer (~93.5%) -- both were measured directly off the template, not
// guessed, after the previous pass let the QR run into the footer's space.
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

      {/* Name -- as large as the circle-to-banner gap allows: readable across
          a table on a badge hanging from a lanyard, not just up close. */}
      <div
        className="absolute flex items-center justify-center bg-white px-[1%] text-center leading-[1.05] font-extrabold text-[#1b2a5e]"
        style={{ left: "5%", top: "64.6%", width: "90%", height: "5.1%", fontSize: "4.9%" }}
      >
        <span className="line-clamp-2">{fullName}</span>
      </div>

      {/* Affiliation */}
      <div
        className="absolute flex items-center justify-center bg-white px-[1%] text-center text-[#1b2a5e]"
        style={{ left: "5%", top: "69.7%", width: "90%", height: "1.9%", fontSize: "2.6%" }}
      >
        <span className="line-clamp-1">{affiliation || " "}</span>
      </div>

      {/* Registration ID -- the full reference number, not a shortened form,
          sized to stay on one line in the space beside the static
          "REGISTRATION ID" label already in the artwork. */}
      <div
        className="absolute flex items-center overflow-hidden bg-white font-bold whitespace-nowrap text-[#1b2a5e]"
        style={{ left: "50.5%", top: "84.5%", width: "38%", height: "2.6%", fontSize: "1.9%" }}
      >
        {registrationId}
      </div>

      {/* QR code -- generated at the highest error-correction level (see
          lib/registration-qr.ts) so it still scans reliably off a printed,
          laminated badge. Sized and positioned to stay clear of the website
          URL footer below it, not just fit the empty column. */}
      <div className="absolute" style={{ left: "26%", top: "82%", width: "15%", aspectRatio: "1 / 1" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Check-in QR code" className="size-full object-contain" />
      </div>
    </div>
  )
}
