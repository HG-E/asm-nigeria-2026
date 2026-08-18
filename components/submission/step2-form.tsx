"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { Trash2 } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { step2Schema, type Step2Input } from "@/lib/validations/submission"
import type { ActionResult } from "@/app/author/submissions/[id]/actions"

type CorrespondingAuthor = {
  first_name: string
  last_name: string
  institution: string | null
  department: string | null
  country: string | null
  email: string
  orcid: string | null
}

export function Step2Form({
  correspondingAuthor,
  defaultValues,
  onSubmit,
  backHref,
}: {
  correspondingAuthor: CorrespondingAuthor
  defaultValues: Step2Input
  onSubmit: (data: Step2Input) => Promise<ActionResult>
  backHref: string
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<Step2Input>({
    resolver: zodResolver(step2Schema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "coAuthors",
  })

  async function handleSubmit(values: Step2Input) {
    setSubmitError(null)
    const result = await onSubmit(values)
    if ("error" in result) {
      setSubmitError(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-medium">1. Corresponding Author</h3>
          <Card className="bg-muted/40">
            <CardContent className="text-sm">
              <p className="font-medium">
                {correspondingAuthor.first_name} {correspondingAuthor.last_name}
              </p>
              <p className="text-muted-foreground">{correspondingAuthor.email}</p>
              <p className="text-muted-foreground">
                {correspondingAuthor.institution}
                {correspondingAuthor.department ? `, ${correspondingAuthor.department}` : ""}
                {correspondingAuthor.country ? ` — ${correspondingAuthor.country}` : ""}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                From your profile. Update it on the Profile page if this needs to change.
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Co-Authors</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  firstName: "",
                  lastName: "",
                  institution: "",
                  department: "",
                  country: "",
                  email: "",
                  orcid: "",
                })
              }
            >
              + Add Co-Author
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-muted-foreground text-sm">No co-authors added yet.</p>
          )}

          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {index + 2}. Co-Author {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(index)}
                    aria-label="Remove co-author"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`coAuthors.${index}.firstName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`coAuthors.${index}.lastName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name={`coAuthors.${index}.email`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`coAuthors.${index}.institution`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`coAuthors.${index}.department`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`coAuthors.${index}.country`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`coAuthors.${index}.orcid`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ORCID (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="0000-0000-0000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
