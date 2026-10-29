import Link from "next/link"

import { Reveal } from "@/components/marketing/reveal"
import { SiteHeader } from "@/components/marketing/site-header"
import { PARTNERS, type Partner } from "@/components/marketing/partners-data"

import "./landing.css"

// Takes an optional override so this can be exercised with mock data for
// visual QA (more partners than exist yet) without touching the real list.
export function PartnersPage({ partners = PARTNERS }: { partners?: Partner[] } = {}) {
  return (
    <div className="asm-landing speakers-page">
      <SiteHeader />

      <section className="section-dark sp-hero">
        <div className="wrap">
          <Reveal>
            <span className="caption eyebrow" style={{ color: "var(--gold)" }}>Partner With Us</span>
            <h1 className="headline" style={{ color: "#fff" }}>
              Our Partners
            </h1>
            <div className="rule" />
            <p className="body-lg" style={{ color: "rgba(255,255,255,.85)", maxWidth: 640 }}>
              The organizations collaborating with ASM Nigeria 2026 to advance One Health
              microbiology across Nigeria. Read about them below, or{" "}
              <Link href="/#partners" style={{ color: "var(--gold)" }}>
                see how to become one
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          {partners.length > 0 ? (
            <div className="partners-grid">
              {partners.map((p, i) => (
                <Reveal key={p.name} delay={(i % 3) * 80} className="partner-full-card">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="pfc-logo-link">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.logo} alt={p.name} className="pfc-logo" />
                  </a>
                  <span className="chip chip-blue pfc-type">{p.type}</span>
                  <h2 className="pfc-name">{p.name}</h2>
                  <p className="pfc-desc">{p.fullDesc}</p>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="pfc-link">
                    Visit website ↗
                  </a>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="body-lg" style={{ textAlign: "center", color: "var(--muted)" }}>
              Partnerships will be announced here as they are confirmed.
            </p>
          )}
        </div>
      </section>

      <section className="section-dark sp-closing">
        <div className="wrap">
          <Reveal className="sp-closing-inner">
            <h2 className="headline" style={{ color: "#fff" }}>Become a Partner</h2>
            <p className="body-lg" style={{ color: "rgba(255,255,255,.85)" }}>
              ASM Nigeria 2026 brings together researchers, clinicians, policymakers, and industry
              leaders from across Nigeria and beyond. Get in touch to discuss tiers, packages, and
              pricing.
            </p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Link href="/#contacts" className="btn btn-primary btn-lg">🤝 Get In Touch</Link>
              <Link href="/#partners" className="btn btn-secondary btn-lg">Learn More</Link>
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
