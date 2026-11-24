"use client"

import { useState } from "react"

import { RegistrationForm } from "@/components/registration/registration-form"
import { WorkshopAddOnForm } from "@/components/registration/workshop-addon-form"
import { Button } from "@/components/ui/button"

type Mode = "new" | "addon"

export function WorkshopRegistrationTabs() {
  const [mode, setMode] = useState<Mode>("new")

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>
          New registration
        </Button>
        <Button type="button" variant={mode === "addon" ? "default" : "outline"} onClick={() => setMode("addon")}>
          Add to existing registration
        </Button>
      </div>

      {mode === "new" ? (
        <RegistrationForm isCommitteeLink={false} committeeToken="" lockedCategory="Workshop Only" />
      ) : (
        <WorkshopAddOnForm />
      )}
    </div>
  )
}
