"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

// Every in-page-section link is written as "/#section" rather than bare
// "#section" so this header works identically whether it's rendered on the
// homepage itself (a same-document hash jump, same as "#section" would be)
// or from another page like /speakers (a real navigation to the homepage
// that then jumps to the section, instead of silently doing nothing).
const NAV_LINKS = [
  { href: "/#why", label: "Why Attend" },
  { href: "https://asm.org/membership", label: "Become a Member", external: true },
  { href: "/speakers", label: "Speakers" },
  { href: "/#themes", label: "Themes" },
  { href: "/#planning-committee", label: "Committee" },
  { href: "/#abstract", label: "Abstract" },
  { href: "/#registration", label: "Register" },
  { href: "/#accommodation", label: "Accommodation" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contacts", label: "Contact" },
  { href: "/#partners", label: "Partners" },
]

const DESKTOP_NAV_LINKS = NAV_LINKS.filter((link) =>
  ["Become a Member", "Speakers", "Accommodation", "Contact", "Partners"].includes(link.label)
)

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)

  useEffect(() => {
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setNavScrolled(window.scrollY > 60)
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  return (
    <header>
      <nav id="nav" className={navScrolled ? "nav-scrolled" : ""} role="navigation" aria-label="Main navigation">
        <div className="nav-wrap">
          <Link href="/" className="nav-brand" aria-label="ASM Nigeria Conference 2026 home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/asm-logo.png" alt="ASM — Microbes Make Our World" className="nav-logo-img" width={120} height={40} />
          </Link>
          <div className="nav-links" role="list">
            {DESKTOP_NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.href} href={link.href} role="listitem" target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} role="listitem">
                  {link.label}
                </Link>
              )
            )}
            <Link href="/#registration" className="nav-cta" role="listitem">
              Register Now
            </Link>
          </div>
          <button
            className="hamburger"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span /> <span /> <span />
          </button>
        </div>
        <nav id="mobile-nav" className={mobileOpen ? "nav-mobile open" : "nav-mobile"} aria-label="Mobile navigation">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            )
          )}
        </nav>
      </nav>
    </header>
  )
}
