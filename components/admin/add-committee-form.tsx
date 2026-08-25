"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { addCommitteeMemberAction } from "@/app/admin/committee/actions"
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
import { digitsOnly } from "@/lib/utils"
import {
  addCommitteeMemberSchema,
  type AddCommitteeMemberInput,
} from "@/lib/validations/committee"

export function AddCommitteeForm() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<{ email: string; emailSent: boolean } | null>(null)

  const form = useForm<AddCommitteeMemberInput>({
    resolver: zodResolver(addCommitteeMemberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      asmIdNumber: "",
      institution: "",
      title: "",
    },
  })

  async function onSubmit(values: AddCommitteeMemberInput) {
    setSubmitError(null)
    setOutcome(null)
    const result = await addCommitteeMemberAction(values)
    if ("error" in result) {
      setSubmitError(result.error)
      return
    }
    setOutcome({ email: values.email, emailSent: result.emailSent })
    form.reset()
  }

  return (
    <div className="space-y-4">
      {outcome && (
        <Alert>
          <AlertDescription>
            {outcome.emailSent ? (
              <>
                Committee member account created. An email with a link to set their password
                has been sent to <strong>{outcome.email}</strong>.
              </>
            ) : (
              <>
                Committee member account created, but the welcome email could not be sent. Ask
                them to use &quot;Forgot password?&quot; on the login page with{" "}
                <strong>{outcome.email}</strong> to set their password.
              </>
            )}
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
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Committee title (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Chair, Scientific Committee" {...field} />
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
            {form.formState.isSubmitting ? "Creating..." : "Add Committee Member"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
