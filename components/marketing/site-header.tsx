"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

// Icons for the bottom mobile tab bar -- plain stroke-based outlines (not
// emoji) so this persistent, always-on-screen chrome reads as native-app
// rather than decorative, matching the rest of the site's emoji-as-accent
// style used only for one-off callouts.
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}
function IconTicket() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3Z" />
      <path d="M10 7v10" strokeDasharray="2.5 2.5" />
    </svg>
  )
}
function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  )
}
function IconSpeakers() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3 3 0 0 1 0 5.8" />
      <path d="M17.5 14.2a6.5 6.5 0 0 1 4 5.8" />
    </svg>
  )
}
function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

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
  { href: "/partners", label: "Partners" },
]

const DESKTOP_NAV_LINKS = NAV_LINKS.filter((link) =>
  ["Become a Member", "Speakers", "Accommodation", "Contact", "Partners"].includes(link.label)
)

// The persistent bottom tab bar (mobile only) deliberately surfaces just the
// handful of destinations people actually reach for on a conference site --
// everything else (accommodation, FAQ, partners, ...) stays one tap away
// behind "Menu", which reuses the same off-canvas panel as the hamburger
// instead of duplicating a second menu system.
const TAB_ITEMS = [
  { href: "/", label: "Home", Icon: IconHome, accent: false, match: (p: string) => p === "/" },
  { href: "/register", label: "Submit", Icon: IconDoc, accent: false, match: (p: string) => p === "/register" },
  { href: "/#registration", label: "Register", Icon: IconTicket, accent: true, match: () => false },
  { href: "/speakers", label: "Speakers", Icon: IconSpeakers, accent: false, match: (p: string) => p.startsWith("/speakers") },
] as const

export function SiteHeader() {
  const pathname = usePathname()
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
    <>
    <header>
      <nav id="nav" className={navScrolled ? "nav-scrolled" : ""} role="navigation" aria-label="Main navigation">
        <div className="nav-wrap">
          <Link href="/" className="nav-brand" aria-label="ASM Nigeria Conference 2026 home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/asm-logo.png" alt="ASM: Microbes Make Our World" className="nav-logo-img" width={120} height={40} />
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
      {/* Siblings of <header>, not children of it -- header is
          `transform: translateZ(0)` (for sticky-paint reasons above), which
          would make it the containing block for any `position: fixed`
          descendant and pin the tab bar to header's own box instead of the
          viewport. */}
      <nav className="tab-bar" aria-label="Primary">
        {TAB_ITEMS.map((item) => {
          const active = item.match(pathname ?? "")
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`tab-bar-item${active ? " active" : ""}${item.accent ? " accent" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <item.Icon />
              <span>{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          className="tab-bar-item"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <IconMenu />
          <span>Menu</span>
        </button>
      </nav>
    </>
  )
}
