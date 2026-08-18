"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

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
import { KeywordInput } from "@/components/submission/keyword-input"
import { step1Schema, type Step1Input } from "@/lib/validations/submission"

type Subtheme = { id: string; name: string }

export function Step1Form({
  subthemes,
  defaultValues,
  onSubmit,
  submitLabel = "Next",
}: {
  subthemes: Subtheme[]
  defaultValues: Step1Input
  onSubmit: (data: Step1Input) => Promise<{ error: string } | { success: true }>
  submitLabel?: string
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<Step1Input>({
    resolver: zodResolver(step1Schema),
    defaultValues,
  })

  async function handleSubmit(values: Step1Input) {
    setSubmitError(null)
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abstract Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subthemeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scientific Subtheme</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subtheme" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subthemes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="keywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keywords</FormLabel>
              <FormControl>
                <KeywordInput value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="presentationPreference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Presentation Preference</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="oral">Oral</SelectItem>
                  <SelectItem value="poster">Poster</SelectItem>
                  <SelectItem value="either">Either</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {submitError && (
          <p className="text-destructive text-sm" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
