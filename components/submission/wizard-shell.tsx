import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const STEPS = [
  "Abstract Information",
  "Authors",
  "Abstract Content",
  "Declarations",
  "Document Upload",
  "Payment",
  "Review & Submit",
]

export function WizardShell({
  currentStep,
  children,
}: {
  currentStep: number
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ol className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {STEPS.map((label, i) => {
          const stepNumber = i + 1
          const isCurrent = stepNumber === currentStep
          const isDone = stepNumber < currentStep
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-1.5",
                isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs",
                  isCurrent && "bg-primary text-primary-foreground",
                  isDone && "bg-muted",
                  !isCurrent && !isDone && "border border-border"
                )}
              >
                {stepNumber}
              </span>
              {label}
            </li>
          )
        })}
      </ol>
      <Card>
        <CardHeader>
          <CardTitle>
            Step {currentStep}: {STEPS[currentStep - 1]}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
