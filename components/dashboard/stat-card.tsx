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
}: {
  label: string
  value: number | string
  icon?: LucideIcon
  accent?: StatAccent
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
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
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5", className)}>
      {children}
    </div>
  )
}
