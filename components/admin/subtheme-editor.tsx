"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import type { ActionResult } from "@/app/admin/subthemes/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { subthemeSchema, type SubthemeInput } from "@/lib/validations/subtheme"

export function SubthemeEditor({
  defaultValues,
  onSave,
  submitLabel = "Save",
  resetOnSuccess = false,
}: {
  defaultValues: SubthemeInput
  onSave: (data: SubthemeInput) => Promise<ActionResult>
  submitLabel?: string
  resetOnSuccess?: boolean
}) {
  const [open, setOpen] = useState(!resetOnSuccess)

  const form = useForm<SubthemeInput>({
    resolver: zodResolver(subthemeSchema),
    defaultValues,
  })

  async function onSubmit(values: SubthemeInput) {
    const result = await onSave(values)
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    toast.success("Saved")
    if (resetOnSuccess) {
      form.reset()
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        + Add Subtheme
      </Button>
    )
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. AMR" className="max-w-32 uppercase" />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    Used in abstract reference numbers for this subtheme, e.g. ASM-ABJ-2026-AMR-001.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Active</FormLabel>
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : submitLabel}
              </Button>
              {resetOnSuccess && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
