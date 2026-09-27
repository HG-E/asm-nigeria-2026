import { Fragment } from "react"

import { parseRich, type RichMark } from "@/lib/rich-text"

// Shows stored abstract text (title, sections, keywords) with its italics,
// bold, underline, superscript and subscript. The text is turned into React
// elements from the parsed runs -- never injected as HTML -- so nothing an
// author types can add anything but these five formats.
//
// Works in server and client components alike. Plain text (everything written
// before formatting existed) renders exactly as before.
export function RichText({ value, fallback = "" }: { value?: string | null; fallback?: string }) {
  const runs = parseRich(value)
  if (runs.length === 0) return <>{fallback}</>
  return (
    <>
      {runs.map((run, i) => (
        <Fragment key={i}>{wrap(run.marks, run.text)}</Fragment>
      ))}
    </>
  )
}

function wrap(marks: RichMark[], text: string) {
  let node: React.ReactNode = text
  for (const mark of [...marks].reverse()) {
    if (mark === "b") node = <strong>{node}</strong>
    else if (mark === "i") node = <em>{node}</em>
    else if (mark === "u") node = <u>{node}</u>
    else if (mark === "sup") node = <sup>{node}</sup>
    else node = <sub>{node}</sub>
  }
  return node
}
