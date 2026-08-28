"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { toggleAttendedAction } from "@/app/admin/registrations/actions"
import { Checkbox } from "@/components/ui/checkbox"

export function AttendedToggle({
  registrationId,
  attended,
}: {
  registrationId: string
  attended: boolean
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleChange(checked: boolean) {
    setIsSubmitting(true)
    const result = await toggleAttendedAction(registrationId, checked)
    setIsSubmitting(false)
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    toast.success(checked ? "Marked as attended" : "Marked as not attended")
    router.refresh()
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={attended}
        disabled={isSubmitting}
        onCheckedChange={(checked) => handleChange(checked === true)}
      />
      Attended
    </label>
  )
}
