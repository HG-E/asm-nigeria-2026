import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

const LOGO_ASPECT = 657 / 264

export function BrandMark({
  href = "/",
  suffix,
  height = 34,
  className,
}: {
  href?: string
  suffix?: string
  height?: number
  className?: string
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-3", className)}>
      <Image
        src="/brand/asm-logo.png"
        alt="ASM — Microbes Make Our World"
        width={Math.round(height * LOGO_ASPECT)}
        height={height}
        priority
        className="shrink-0"
      />
      {suffix && (
        <span className="text-muted-foreground border-border hidden border-l pl-3 text-sm font-medium sm:inline">
          {suffix}
        </span>
      )}
    </Link>
  )
}
