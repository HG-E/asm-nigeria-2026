"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { addRegistrationDeskMemberAction } from "@/app/admin/registration-desk/actions"
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
  addRegistrationDeskMemberSchema,
  type AddRegistrationDeskMemberInput,
} from "@/lib/validations/registration-desk"

export function AddRegistrationDeskForm() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<{ email: string; emailSent: boolean } | null>(null)

  const form = useForm<AddRegistrationDeskMemberInput>({
    resolver: zodResolver(addRegistrationDeskMemberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      institution: "",
    },
  })

  async function onSubmit(values: AddRegistrationDeskMemberInput) {
    setSubmitError(null)
    setOutcome(null)
    const result = await addRegistrationDeskMemberAction(values)
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
                Registration desk account created. An email with a link to set their password
                has been sent to <strong>{outcome.email}</strong>.
              </>
            ) : (
              <>
                Registration desk account created, but the welcome email could not be sent. Ask
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

          <FormField
            control={form.control}
            name="institution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institution (optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
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
            {form.formState.isSubmitting ? "Creating..." : "Add Registration Desk Member"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
