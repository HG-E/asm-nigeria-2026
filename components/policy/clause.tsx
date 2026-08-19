export function Clause({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[2rem_1fr] gap-3 border-t py-5 first:border-t-0 first:pt-0 sm:grid-cols-[2.5rem_1fr]">
      <span className="font-heading text-primary text-lg font-semibold">{number}</span>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="text-muted-foreground space-y-2 text-sm">{children}</div>
      </div>
    </div>
  )
}
