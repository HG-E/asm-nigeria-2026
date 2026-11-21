import Link from "next/link"

import { AWARDEES } from "@/components/marketing/awardees-data"
import { Reveal } from "@/components/marketing/reveal"
import { SiteHeader } from "@/components/marketing/site-header"

import "./landing.css"

export function AwardeesPage() {
  return (
    <div className="asm-landing speakers-page">
      <SiteHeader />

      <section className="section-dark sp-hero">
        <div className="wrap">
          <Reveal>
            <span className="caption eyebrow" style={{ color: "var(--gold)" }}>Honoring Excellence</span>
            <h1 className="headline" style={{ color: "#fff" }}>
              Conference Awardees
            </h1>
            <div className="rule" />
            <p className="body-lg" style={{ color: "rgba(255,255,255,.85)", maxWidth: 640 }}>
              Recognizing outstanding contributions to microbiology and One Health in Nigeria,
              honored at ASM Nigeria 2026.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          {AWARDEES.length > 0 ? (
            <div className="speakers-row speakers-row-full">
              {AWARDEES.map((a, i) => (
                <Reveal
                  key={a.name}
                  delay={(i % 3) * 80}
                  className="speaker-card open"
                  style={{ "--accent": a.accent } as React.CSSProperties}
                >
                  <div className="sp-header">
                    {a.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.image} alt={a.name} className="sp-avatar sp-avatar-img" />
                    ) : (
                      <div className="sp-avatar">{a.initials}</div>
                    )}
                    <div className="sp-info">
                      <div className="sp-chip"><span className={`chip ${a.chip}`}>{a.chipLabel}</span></div>
                      <div className="sp-name">{a.name}</div>
                      <div className="sp-title">{a.title}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="body-lg" style={{ textAlign: "center", color: "var(--muted)" }}>
              Awardees will be announced here as they are confirmed.
            </p>
          )}
        </div>
      </section>

      <section className="section-dark sp-closing">
        <div className="wrap">
          <Reveal className="sp-closing-inner">
            <h2 className="headline" style={{ color: "#fff" }}>Join Us in Celebrating Them</h2>
            <p className="body-lg" style={{ color: "rgba(255,255,255,.85)" }}>
              Join ASM Nigeria 2026 (22–25 November, Abuja) as we recognize these honorees in
              person.
            </p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Link href="/#registration" className="btn btn-primary btn-lg">🎟️ Register Now</Link>
              <Link href="/speakers" className="btn btn-secondary btn-lg">Meet Our Speakers</Link>
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
                  alt="ASM: Microbes Make Our World"
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
                  <li><Link href="/awardees">Awardees</Link></li>
                  <li><Link href="/partners">Partners</Link></li>
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
