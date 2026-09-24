import Link from "next/link"

import { Reveal } from "@/components/marketing/reveal"
import { SiteHeader } from "@/components/marketing/site-header"
import { SpeakerBio } from "@/components/marketing/speaker-bio"
import { ELIGIBLE_SUBTHEMES, SPEAKERS } from "@/components/marketing/speakers-data"

import "./landing.css"

export function SpeakersPage() {
  return (
    <div className="asm-landing speakers-page">
      <SiteHeader />

      <section className="section-dark sp-hero">
        <div className="wrap">
          <Reveal>
            <span className="caption eyebrow" style={{ color: "var(--gold)" }}>Distinguished Speakers</span>
            <h1 className="headline" style={{ color: "#fff" }}>
              Meet Our Speakers
            </h1>
            <div className="rule" />
            <p className="body-lg" style={{ color: "rgba(255,255,255,.85)", maxWidth: 640 }}>
              The researchers, administrators, and innovators shaping four days of One Health
              science at ASM Nigeria 2026 — read their full profiles below, or{" "}
              <Link href="/#registration" style={{ color: "var(--gold)" }}>
                register to meet them in Abuja
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="speakers-row speakers-row-full">
            {SPEAKERS.map((sp, i) => (
              <Reveal key={sp.name} delay={(i % 3) * 80} className="speaker-card open" style={{ "--accent": sp.accent } as React.CSSProperties}>
                <div className="sp-header">
                  {sp.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sp.image} alt={sp.name} className="sp-avatar sp-avatar-img" />
                  ) : (
                    <div className="sp-avatar" style={sp.initials === "SA" ? { background: "var(--gold-d)" } : undefined}>{sp.initials}</div>
                  )}
                  <div className="sp-info">
                    <div className="sp-chip"><span className={`chip ${sp.chip}`}>{sp.chipLabel}</span></div>
                    <div className="sp-name">{sp.name}</div>
                    <div className="sp-title">{sp.title}{sp.sub && <><br />{sp.sub}</>}</div>
                    {sp.subthemeIndex && (
                      <div className="sp-subtheme">
                        <span
                          className="sp-subtheme-num"
                          style={{
                            background: ELIGIBLE_SUBTHEMES[sp.subthemeIndex - 1].bg,
                            color: ELIGIBLE_SUBTHEMES[sp.subthemeIndex - 1].color,
                          }}
                        >
                          {sp.subthemeIndex}
                        </span>
                        Speaking on: {ELIGIBLE_SUBTHEMES[sp.subthemeIndex - 1].label}
                      </div>
                    )}
                  </div>
                </div>
                <div className="sp-body">
                  <div className="sp-body-inner">
                    <p className="sp-bio">{sp.bio ? <SpeakerBio text={sp.bio} /> : "Full biography coming soon."}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-dark sp-closing">
        <div className="wrap">
          <Reveal className="sp-closing-inner">
            <h2 className="headline" style={{ color: "#fff" }}>Hear From Them In Person</h2>
            <p className="body-lg" style={{ color: "rgba(255,255,255,.85)" }}>
              Join ASM Nigeria 2026 — 22–25 November, Abuja — for keynotes, plenaries, and
              subtheme sessions with every speaker above.
            </p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Link href="/#registration" className="btn btn-primary btn-lg">🎟️ Register Now</Link>
              <Link href="/register" className="btn btn-secondary btn-lg">📄 Submit Abstract</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer role="contentinfo">
        <div className="footer-top">
          <div className="wrap">
            <div className="footer-grid">
              <div className="footer-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/asm-logo.png"
                  alt="ASM — Microbes Make Our World"
                  style={{ height: 36, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: 12, display: "block" }}
                />
                <div className="fb-tagline">One Health. One Future. One Scientific Community.</div>
                <div className="fb-desc">The Maiden American Society for Microbiology Nigeria Conference brings together One Health scientists and stakeholders for four days of science, dialogue, and discovery in Abuja.</div>
              </div>
              <div className="footer-col">
                <h4>Conference</h4>
                <ul>
                  <li><Link href="/#why">Why Attend</Link></li>
                  <li><Link href="/#themes">Sub-Themes</Link></li>
                  <li><Link href="/#programme">Programme</Link></li>
                  <li><Link href="/speakers">Speakers</Link></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Participate</h4>
                <ul>
                  <li><Link href="/register">Submit Abstract</Link></li>
                  <li><Link href="/#registration">Register</Link></li>
                  <li><Link href="/#accommodation">Accommodation</Link></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Information</h4>
                <ul>
                  <li><Link href="/#contacts">Contact</Link></li>
                  <li><Link href="/terms">Terms</Link></li>
                  <li><Link href="/privacy">Privacy</Link></li>
                  <li><a href="https://www.asm.org" target="_blank" rel="noopener noreferrer">ASM Global ↗</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="wrap">
            &copy; 2026 ASM Country Ambassador to Nigeria Project Fund
          </div>
        </div>
      </footer>
    </div>
  )
}
