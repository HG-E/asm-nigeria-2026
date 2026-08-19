"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { reviewSchema, type ReviewInput } from "@/lib/validations/review"

type ActionResult = { error: string } | { success: true }

const CRITERIA: { name: keyof ReviewInput; label: string }[] = [
  { name: "scoreOriginality", label: "Originality" },
  { name: "scoreRelevance", label: "Scientific relevance" },
  { name: "scoreMethodology", label: "Methodological quality" },
  { name: "scoreClarity", label: "Clarity" },
  { name: "scoreSignificance", label: "Significance" },
]

const RECOMMENDATIONS = [
  { value: "accepted_oral", label: "Accept — Oral" },
  { value: "accepted_poster", label: "Accept — Poster" },
  { value: "accepted", label: "Accept" },
  { value: "minor_revision", label: "Minor Revision" },
  { value: "major_revision", label: "Major Revision" },
  { value: "rejected", label: "Reject" },
]

export function ReviewForm({
  defaultValues,
  onSave,
  onSubmitReview,
  readOnly = false,
}: {
  defaultValues: Partial<ReviewInput>
  onSave: (data: ReviewInput) => Promise<ActionResult>
  onSubmitReview: (data: ReviewInput) => Promise<ActionResult>
  readOnly?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues,
  })

  async function handleSave(values: ReviewInput) {
    setError(null)
    const result = await onSave(values)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success("Progress saved")
  }

  async function handleSubmitReview(values: ReviewInput) {
    setError(null)
    const result = await onSubmitReview(values)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success("Review submitted")
    router.refresh()
  }

  return (
    <Form {...form}>
      <fieldset disabled={readOnly} className="space-y-6">
        {readOnly && (
          <Alert>
            <AlertDescription>
              This review has been submitted and is locked.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Scientific assessment (1–5)</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CRITERIA.map((c) => (
              <FormField
                key={c.name}
                control={form.control}
                name={c.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c.label}</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Score" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="recommendation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recommendation</FormLabel>
              {readOnly ? (
                <p className="text-sm">
                  {RECOMMENDATIONS.find((r) => r.value === field.value)?.label ?? "—"}
                </p>
              ) : (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a recommendation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RECOMMENDATIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="commentsToCommittee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments to Scientific Committee</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="commentsToAuthor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments for Author (optional)</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        {!readOnly && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs">
              Once submitted, your review is locked and cannot be edited.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={form.handleSubmit(handleSave)}
                disabled={form.formState.isSubmitting}
              >
                Save Progress
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(handleSubmitReview)}
                disabled={form.formState.isSubmitting}
              >
                Submit Review
              </Button>
            </div>
          </div>
        )}
      </fieldset>
    </Form>
  )
}
