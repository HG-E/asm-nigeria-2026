"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { decisionSchema, type DecisionInput } from "@/lib/validations/decision"

const DECISIONS = [
  { value: "accepted_oral", label: "Accept — Oral" },
  { value: "accepted_poster", label: "Accept — Poster" },
  { value: "accepted", label: "Accept" },
  { value: "minor_revision", label: "Minor Revision" },
  { value: "major_revision", label: "Major Revision" },
  { value: "rejected", label: "Reject" },
]

type ActionResult = { error: string } | { success: true }

export function DecisionForm({
  defaultValues,
  lockReason,
  onSave,
}: {
  defaultValues: Partial<DecisionInput>
  lockReason: "final" | "not_decidable" | null
  onSave: (data: DecisionInput) => Promise<ActionResult>
}) {
  const isLocked = lockReason !== null
  const form = useForm<DecisionInput>({
    resolver: zodResolver(decisionSchema),
    defaultValues,
  })

  async function onSubmit(values: DecisionInput) {
    const result = await onSave(values)
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    toast.success("Decision saved — awaiting admin sign-off before the author is notified.")
  }

  return (
    <Form {...form}>
      <fieldset disabled={isLocked} className="space-y-4">
        <FormField
          control={form.control}
          name="decision"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Decision</FormLabel>
              {isLocked ? (
                <p className="text-sm">
                  {DECISIONS.find((d) => d.value === field.value)?.label ?? "—"}
                </p>
              ) : (
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a decision" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DECISIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
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
          name="decisionNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes to the record (internal)</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="authorMessage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message to author (optional)</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="revisionDeadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Revision deadline (if applicable)</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isLocked && (
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Decision"}
          </Button>
        )}
        {lockReason === "final" && (
          <p className="text-muted-foreground text-sm">
            This decision has been finalized and the author notified. It can no longer be
            changed.
          </p>
        )}
        {lockReason === "not_decidable" && (
          <p className="text-muted-foreground text-sm">
            Reviews are still in progress. A decision can be proposed once all reviews for
            this submission are complete.
          </p>
        )}
      </fieldset>
    </Form>
  )
}
