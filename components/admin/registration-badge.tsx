// Overlays real registrant data onto the fixed badge artwork
// (public/badges/template.png): the photo circle, name, affiliation and
// registration ID are all plain white background on the template, so these
// are drawn directly on top -- no separate "blank" template asset needed.
// Positions are percentages of the badge's own box, which is locked to the
// template image's exact aspect ratio (2242:3168), so they stay correctly
// placed at any print or screen size.
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

      {/* Name */}
      <div
        className="absolute flex items-center justify-center bg-white px-[2%] text-center font-bold text-[#1b2a5e]"
        style={{ left: "15%", top: "63.8%", width: "70%", height: "4.2%", fontSize: "3.1%" }}
      >
        <span className="line-clamp-1">{fullName}</span>
      </div>

      {/* Affiliation */}
      <div
        className="absolute flex items-center justify-center bg-white px-[2%] text-center text-[#1b2a5e]"
        style={{ left: "10%", top: "68%", width: "80%", height: "3.6%", fontSize: "2.1%" }}
      >
        <span className="line-clamp-1">{affiliation || " "}</span>
      </div>

      {/* Registration ID (short form, next to the static "REGISTRATION ID" label already in the artwork) */}
      <div
        className="absolute flex items-center bg-white font-bold text-[#1b2a5e]"
        style={{ left: "50.5%", top: "84.3%", width: "20%", height: "4%", fontSize: "3%" }}
      >
        {registrationId}
      </div>

      {/* QR code -- fully opaque, so it naturally covers the sample QR graphic beneath it */}
      <div className="absolute" style={{ left: "24.3%", top: "82%", width: "17%", aspectRatio: "1 / 1" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Check-in QR code" className="size-full object-contain" />
      </div>
    </div>
  )
}
