"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { restructureAcceptedAbstractAction } from "@/app/author/submissions/[id]/actions"
import {
  StructuredAbstractFields,
  useAbstractOverLimit,
} from "@/components/submission/structured-abstract-fields"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { step3Schema, type Step3Input } from "@/lib/validations/submission"

export function RestructureAbstractForm({
  submissionId,
  defaultSections,
  legacyText,
  alreadyStructured,
}: {
  submissionId: string
  defaultSections: Step3Input
  legacyText?: string
  alreadyStructured: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const form = useForm<Step3Input>({
    resolver: zodResolver(step3Schema),
    defaultValues: defaultSections,
  })
  const overLimit = useAbstractOverLimit(form.control)

  async function onSubmit(values: Step3Input) {
    setError(null)
    setSaving(true)
    try {
      const result = await restructureAcceptedAbstractAction(submissionId, values)
      if ("error" in result) {
        setError(result.error)
        return
      }
      toast.success("Your abstract has been saved for the Book of Abstracts")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <StructuredAbstractFields control={form.control} legacyText={legacyText} />
        <p className="text-muted-foreground text-xs">
          This restructures the wording you already had accepted -- it isn&apos;t a new submission. The
          version the committee reviewed is kept on record.
        </p>
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving || overLimit}>
          {saving ? "Saving..." : alreadyStructured ? "Save changes" : "Save for the Book of Abstracts"}
        </Button>
      </form>
    </Form>
  )
}
