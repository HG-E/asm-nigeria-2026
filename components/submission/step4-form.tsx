"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { step4Schema, type Step4Input } from "@/lib/validations/submission"
import type { ActionResult } from "@/app/author/submissions/[id]/actions"

export function Step4Form({
  defaultValues,
  onSubmit,
  backHref,
}: {
  defaultValues: Partial<Step4Input>
  onSubmit: (data: Step4Input) => Promise<ActionResult>
  backHref: string
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<Step4Input>({
    resolver: zodResolver(step4Schema),
    defaultValues,
  })

  async function handleSubmit(values: Step4Input) {
    setSubmitError(null)
    const result = await onSubmit(values)
    if ("error" in result) {
      setSubmitError(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="noConflictOfInterest"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  I declare there is no conflict of interest in relation to this submission.
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ethicalApprovalObtained"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  I confirm ethical approval has been obtained for this study, where applicable.
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fundingDeclaration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Funding/Support Declaration</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder='Describe your funding source, or write "None"'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="originalityConfirmed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  I confirm this abstract is original work and has not been previously published.
                </FormLabel>
                <FormMessage />
              </div>
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
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Next"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
