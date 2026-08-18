"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"

import { Button, buttonVariants } from "@/components/ui/button"
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
import type { ActionResult } from "@/app/author/submissions/[id]/actions"

export function Step3Form({
  wordLimit,
  defaultValues,
  onSubmit,
  backHref,
}: {
  wordLimit: number
  defaultValues: Step3Input
  onSubmit: (data: Step3Input) => Promise<ActionResult>
  backHref: string
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<Step3Input>({
    resolver: zodResolver(step3Schema),
    defaultValues,
  })

  const abstractText = useWatch({ control: form.control, name: "abstractText" })
  const wordCount = countWords(abstractText)
  const overLimit = wordCount > wordLimit

  async function handleSubmit(values: Step3Input) {
    setSubmitError(null)
    if (countWords(values.abstractText) > wordLimit) {
      setSubmitError(`Your abstract exceeds the ${wordLimit}-word limit.`)
      return
    }
    const result = await onSubmit(values)
    if ("error" in result) {
      setSubmitError(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="abstractText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abstract</FormLabel>
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
