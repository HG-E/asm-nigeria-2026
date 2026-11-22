"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { ORAL_SCHEDULE, POSTER_SCHEDULE, type ScheduleEntry } from "@/components/marketing/schedule-data"
import { Reveal } from "@/components/marketing/reveal"
import { SiteHeader } from "@/components/marketing/site-header"

import "./landing.css"

type Track = "oral" | "poster"

function groupByDay(entries: ScheduleEntry[]) {
  const groups = new Map<string, ScheduleEntry[]>()
  for (const e of entries) {
    const list = groups.get(e.day)
    if (list) list.push(e)
    else groups.set(e.day, [e])
  }
  return groups
}

function matchesQuery(e: ScheduleEntry, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return e.presenter.toLowerCase().includes(q) || e.abstractNumber.toLowerCase().includes(q)
}

export function SchedulePage() {
  const [track, setTrack] = useState<Track>("oral")
  const [query, setQuery] = useState("")

  const entries = track === "oral" ? ORAL_SCHEDULE : POSTER_SCHEDULE
  const filtered = useMemo(() => entries.filter((e) => matchesQuery(e, query)), [entries, query])
  const grouped = useMemo(() => groupByDay(filtered), [filtered])

  return (
    <div className="asm-landing speakers-page schedule-page">
      <SiteHeader />

      <section className="section-dark sp-hero">
        <div className="wrap">
          <Reveal>
            <span className="caption eyebrow" style={{ color: "var(--gold)" }}>Programme</span>
            <h1 className="headline" style={{ color: "#fff" }}>
              Conference Schedule
            </h1>
            <div className="rule" />
            <p className="body-lg" style={{ color: "rgba(255,255,255,.85)", maxWidth: 640 }}>
              The full oral and poster presentation timetable for ASM Nigeria 2026, 22–25
              November in Abuja. Each presenter gets a fixed slot: 8 minutes for oral
              presentations (6 minutes to present, 2 for questions), and a short pitch-and-question
              slot for posters. Find your abstract number below, or download the full schedule to
              keep offline.
            </p>
            <div className="hero-actions">
              <a href="/schedule/ASM-Nigeria-2026-Schedule.pdf" className="btn btn-primary btn-lg" download>
                ⬇️ Download Full Schedule (PDF)
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="headline" style={{ textAlign: "center", marginBottom: 28 }}>How It Works</h2>
          <div className="schedule-howitworks">
            <div className="schedule-howitworks-card">
              <h3>Oral Presentations</h3>
              <p className="schedule-howitworks-meta">198 accepted presentations &middot; 5 parallel rooms &middot; 8 minutes per presenter (6 to present, 2 for questions)</p>
              <ul>
                <li><strong>Monday 23 November:</strong> afternoon only, 15:10&ndash;17:30</li>
                <li><strong>Tuesday 24 November:</strong> morning 11:25&ndash;13:00, afternoon 13:20&ndash;14:20</li>
                <li><strong>Wednesday 25 November:</strong> morning only, 10:30&ndash;12:00, ending before the 12:00 mentorship activity</li>
              </ul>
            </div>
            <div className="schedule-howitworks-card">
              <h3>Poster Presentations</h3>
              <p className="schedule-howitworks-meta">89 accepted presentations &middot; 5 poster zones &middot; 3 minutes per presenter (2-minute pitch, 1-minute questions)</p>
              <ul>
                <li><strong>Tuesday 24 November:</strong> four rounds, 14:30&ndash;14:45, 14:50&ndash;15:05, 15:10&ndash;15:25, and 15:30&ndash;15:45, with a 5-minute gap between rounds to move between zones</li>
                <li><strong>Open viewing &amp; judging:</strong> 15:50&ndash;16:20, ahead of the 16:30 policy dialogue</li>
              </ul>
            </div>
          </div>

          <div className="schedule-toolbar">
            <div className="schedule-tabs" role="tablist" aria-label="Presentation track">
              <button
                type="button"
                role="tab"
                aria-selected={track === "oral"}
                className={track === "oral" ? "schedule-tab active" : "schedule-tab"}
                onClick={() => setTrack("oral")}
              >
                Oral Presentations ({ORAL_SCHEDULE.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={track === "poster"}
                className={track === "poster" ? "schedule-tab active" : "schedule-tab"}
                onClick={() => setTrack("poster")}
              >
                Poster Presentations ({POSTER_SCHEDULE.length})
              </button>
            </div>
            <input
              type="search"
              className="schedule-search"
              placeholder="Search by presenter name or abstract number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search the schedule"
            />
          </div>

          {grouped.size > 0 ? (
            Array.from(grouped.entries()).map(([day, dayEntries]) => (
              <div key={day} className="schedule-day-group">
                <h3 className="schedule-day-heading">{day}</h3>
                <div className="table-wrap">
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Abstract Number</th>
                        <th>Presenter</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayEntries.map((e) => (
                        <tr key={`${e.abstractNumber}-${e.time}`}>
                          <td>{e.time}</td>
                          <td className="schedule-abstract-no">{e.abstractNumber}</td>
                          <td>{e.presenter}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <p className="body-lg" style={{ textAlign: "center", color: "var(--muted)" }}>
              No presentations match &ldquo;{query}&rdquo;. Try a different name or abstract number.
            </p>
          )}
        </div>
      </section>

      <section className="section-dark sp-closing">
        <div className="wrap">
          <Reveal className="sp-closing-inner">
            <h2 className="headline" style={{ color: "#fff" }}>Ready to Join Us?</h2>
            <p className="body-lg" style={{ color: "rgba(255,255,255,.85)" }}>
              Register for ASM Nigeria 2026 and be part of four days of science, dialogue, and
              discovery in Abuja.
            </p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Link href="/#registration" className="btn btn-primary btn-lg">🎟️ Register Now</Link>
              <a href="/schedule/ASM-Nigeria-2026-Schedule.pdf" className="btn btn-secondary btn-lg" download>
                ⬇️ Download Schedule
              </a>
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
                  <li><Link href="/schedule">Schedule</Link></li>
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
