"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button, buttonVariants } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import {
  StructuredAbstractFields,
  useAbstractOverLimit,
} from "@/components/submission/structured-abstract-fields"
import { step3Schema, type Step3Input } from "@/lib/validations/submission"
import type { ActionResult } from "@/app/author/submissions/[id]/actions"

export function Step3Form({
  defaultValues,
  legacyText,
  onSubmit,
  backHref,
}: {
  defaultValues: Step3Input
  legacyText?: string
  onSubmit: (data: Step3Input) => Promise<ActionResult>
  backHref: string
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<Step3Input>({
    resolver: zodResolver(step3Schema),
    defaultValues,
  })

  const overLimit = useAbstractOverLimit(form.control)

  async function handleSubmit(values: Step3Input) {
    setSubmitError(null)
    const result = await onSubmit(values)
    if ("error" in result) {
      setSubmitError(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <StructuredAbstractFields control={form.control} legacyText={legacyText} />

        {submitError && (
          <p className="text-destructive text-sm" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex justify-between">
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            Back
          </Link>
          <Button type="submit" disabled={form.formState.isSubmitting || overLimit}>
            {form.formState.isSubmitting ? "Saving..." : "Next"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
