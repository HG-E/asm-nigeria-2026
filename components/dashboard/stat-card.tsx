import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const ACCENT_ICON_CLASSES = {
  blue: "bg-brand-blue-tint text-brand-blue",
  gold: "bg-brand-gold-tint text-brand-gold-deep",
  red: "bg-brand-red-tint text-brand-red",
  muted: "bg-muted text-muted-foreground",
} as const

export type StatAccent = keyof typeof ACCENT_ICON_CLASSES

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "muted",
  hint,
  href,
}: {
  label: string
  value: number | string
  icon?: LucideIcon
  accent?: StatAccent
  hint?: string
  /** When set, the whole card links to a pre-filtered view (e.g. the same list scoped to this stat's status) instead of being purely decorative. */
  href?: string
}) {
  const content = (
    <CardContent className="flex items-center gap-3">
      {Icon && (
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/card:scale-105",
            ACCENT_ICON_CLASSES[accent]
          )}
        >
          <Icon className="size-4.5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs leading-snug font-medium">{label}</p>
        <p className="font-sans text-2xl leading-tight font-bold tabular-nums">{value}</p>
        {hint && <p className="text-muted-foreground truncate text-xs">{hint}</p>}
      </div>
    </CardContent>
  )

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${label}: ${value}. View filtered list.`}
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30">
          {content}
        </Card>
      </Link>
    )
  }

  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {content}
    </Card>
  )
}

export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-2 grid grid-cols-2 gap-4 duration-500 sm:grid-cols-3 lg:grid-cols-5",
        className
      )}
    >
      {children}
    </div>
  )
}
