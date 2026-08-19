"use client"

import { useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { submitRegistrationAction } from "@/app/register-conference/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  currentRegistrationPeriod,
  feeFor,
  PARTICIPANT_CATEGORIES,
  WORKSHOP_FEE,
  type ParticipantCategory,
} from "@/lib/registration-fees"
import { registrationSchema, type RegistrationInput } from "@/lib/validations/registration"

const period = currentRegistrationPeriod()

export function RegistrationForm() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      institution: "",
      participantCategory: undefined,
      includeWorkshop: false,
      company: "",
    },
  })

  const category = form.watch("participantCategory") as ParticipantCategory | undefined
  const includeWorkshop = form.watch("includeWorkshop")
  const fee = category ? feeFor(category, period) : null

  async function onSubmit(values: RegistrationInput) {
    setSubmitError(null)
    setReceiptError(null)
    if (!receiptFile) {
      setReceiptError("Please upload your payment receipt or screenshot.")
      return
    }

    const formData = new FormData()
    formData.set("fullName", values.fullName)
    formData.set("email", values.email)
    formData.set("phone", values.phone ?? "")
    formData.set("institution", values.institution ?? "")
    formData.set("participantCategory", values.participantCategory)
    formData.set("includeWorkshop", String(values.includeWorkshop))
    formData.set("company", values.company ?? "")
    formData.set("receipt", receiptFile)

    const result = await submitRegistrationAction(formData)
    if ("error" in result) {
      setSubmitError(result.error)
      return
    }
    setReferenceNumber(result.referenceNumber)
  }

  if (referenceNumber) {
    return (
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">Registration received</h2>
        <p className="text-muted-foreground text-sm">
          Your reference number is <strong className="text-foreground">{referenceNumber}</strong>.
          A confirmation email is on its way. The secretariat will verify your receipt and confirm
          your registration within 2-3 working days.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-muted/50 space-y-1 rounded-lg border p-4 text-sm">
          <p className="font-medium">
            {period === "early" ? "Early/Regular registration (till Oct 26, 2026)" : "Late registration (after Oct 26, 2026)"}
          </p>
          <p className="text-muted-foreground">
            Complete your bank transfer first (see the Payment section on the homepage), then
            fill this form with your receipt.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number (optional)</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" {...field} />
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
        </div>

        <FormField
          control={form.control}
          name="participantCategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Participant category</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PARTICIPANT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} — {feeFor(c, period)}
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
          name="includeWorkshop"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  Add the pre-conference hands-on workshop ({WORKSHOP_FEE[period]})
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        {fee && (
          <p className="text-sm">
            <span className="font-medium">Amount due: </span>
            {fee}
            {includeWorkshop && <> + {WORKSHOP_FEE[period]} workshop fee</>}
          </p>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Payment receipt or screenshot</label>
          <p className="text-muted-foreground text-sm">Accepted formats: PDF, JPG, PNG. Maximum size: 1MB.</p>
          <div
            className="hover:bg-muted/50 cursor-pointer rounded-lg border border-dashed p-6 text-center text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            {receiptFile ? receiptFile.name : "Click to select your receipt"}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              setReceiptError(null)
              setReceiptFile(e.target.files?.[0] ?? null)
            }}
          />
          {receiptError && (
            <p className="text-destructive text-sm" role="alert">
              {receiptError}
            </p>
          )}
        </div>

        {/* Honeypot -- hidden from real visitors */}
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input tabIndex={-1} autoComplete="off" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        {submitError && (
          <p className="text-destructive text-sm" role="alert">
            {submitError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Submitting..." : "Submit registration"}
        </Button>
      </form>
    </Form>
  )
}
