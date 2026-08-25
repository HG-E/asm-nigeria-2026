"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { addReviewerAction } from "@/app/admin/reviewers/actions"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { digitsOnly } from "@/lib/utils"
import { addReviewerSchema, type AddReviewerInput } from "@/lib/validations/reviewer"

type Subtheme = { id: string; name: string }

type SubmitOutcome =
  | { kind: "created"; email: string; emailSent: boolean }
  | { kind: "reused" }

export function AddReviewerForm({ subthemes }: { subthemes: Subtheme[] }) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null)

  const form = useForm<AddReviewerInput>({
    resolver: zodResolver(addReviewerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      asmIdNumber: "",
      institution: "",
      expertise: "",
      subthemeId: "",
    },
  })

  async function onSubmit(values: AddReviewerInput) {
    setSubmitError(null)
    setOutcome(null)
    const result = await addReviewerAction(values)
    if ("error" in result) {
      setSubmitError(result.error)
      return
    }
    setOutcome(
      "emailSent" in result
        ? { kind: "created", email: values.email, emailSent: result.emailSent }
        : { kind: "reused" }
    )
    form.reset()
  }

  return (
    <div className="space-y-4">
      {outcome?.kind === "created" && (
        <Alert>
          <AlertDescription>
            {outcome.emailSent ? (
              <>
                Reviewer account created. An email with a link to set their password has been
                sent to <strong>{outcome.email}</strong>.
              </>
            ) : (
              <>
                Reviewer account created, but the welcome email could not be sent. Ask them to
                use &quot;Forgot password?&quot; on the login page with{" "}
                <strong>{outcome.email}</strong> to set their password.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      {outcome?.kind === "reused" && (
        <Alert>
          <AlertDescription>
            This reviewer already has an account — added them to this subtheme too. No new
            credentials needed; they use their existing login.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
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
              name="lastName"
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
            name="email"
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
              name="institution"
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
              name="asmIdNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ASM ID Number (optional)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      {...field}
                      onChange={(e) => field.onChange(digitsOnly(e.target.value, 9))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="subthemeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Subtheme</FormLabel>
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
            name="expertise"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expertise (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Clinical microbiology, AMR genomics" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {submitError && (
            <p className="text-destructive text-sm" role="alert">
              {submitError}
            </p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Add Reviewer"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
