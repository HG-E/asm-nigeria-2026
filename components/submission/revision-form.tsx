"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { saveRevisionAction, submitRevisionAction } from "@/app/author/submissions/[id]/actions"
import { Step5Upload } from "@/components/submission/step5-upload"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { countWords, step3Schema, type Step3Input } from "@/lib/validations/submission"

type CurrentDocument = {
  id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  storage_path: string
} | null

export function RevisionForm({
  submissionId,
  userId,
  wordLimit,
  defaultAbstractText,
  currentDocument,
  allowedFileTypes,
  maxFileSizeMb,
}: {
  submissionId: string
  userId: string
  wordLimit: number
  defaultAbstractText: string
  currentDocument: CurrentDocument
  allowedFileTypes: string[]
  maxFileSizeMb: number
}) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<Step3Input>({
    resolver: zodResolver(step3Schema),
    defaultValues: { abstractText: defaultAbstractText },
  })

  const abstractText = useWatch({ control: form.control, name: "abstractText" })
  const wordCount = countWords(abstractText)
  const overLimit = wordCount > wordLimit

  async function handleSaveDraft(values: Step3Input) {
    setSubmitError(null)
    setSaving(true)
    try {
      const result = await saveRevisionAction(submissionId, values)
      if ("error" in result) {
        setSubmitError(result.error)
        return
      }
      toast.success("Revision saved")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitRevision(values: Step3Input) {
    setSubmitError(null)
    if (countWords(values.abstractText) > wordLimit) {
      setSubmitError(`Your abstract exceeds the ${wordLimit}-word limit.`)
      return
    }
    setSubmitting(true)
    try {
      const saveResult = await saveRevisionAction(submissionId, values)
      if ("error" in saveResult) {
        setSubmitError(saveResult.error)
        return
      }
      const result = await submitRevisionAction(submissionId)
      if ("error" in result) {
        setSubmitError(result.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="abstractText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Revised abstract</FormLabel>
                <FormControl>
                  <Textarea rows={14} {...field} />
                </FormControl>
                <p
                  className={cn(
                    "text-sm",
                    overLimit ? "text-destructive font-medium" : "text-muted-foreground"
                  )}
                >
                  Word count: {wordCount} / {wordLimit}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="outline"
            onClick={form.handleSubmit(handleSaveDraft)}
            disabled={saving || submitting || overLimit}
          >
            {saving ? "Saving..." : "Save draft"}
          </Button>
        </form>
      </Form>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Supporting document</h3>
        <Step5Upload
          submissionId={submissionId}
          userId={userId}
          currentDocument={currentDocument}
          allowedFileTypes={allowedFileTypes}
          maxFileSizeMb={maxFileSizeMb}
          backHref={`/author/submissions/${submissionId}`}
          nextHref={`/author/submissions/${submissionId}`}
        />
      </div>

      {submitError && (
        <p className="text-destructive text-sm" role="alert">
          {submitError}
        </p>
      )}

      <Button
        type="button"
        onClick={form.handleSubmit(handleSubmitRevision)}
        disabled={submitting || saving || overLimit}
      >
        {submitting ? "Submitting..." : "Submit Revision"}
      </Button>
    </div>
  )
}
