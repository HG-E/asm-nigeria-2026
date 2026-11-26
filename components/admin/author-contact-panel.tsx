"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Author = {
  id: string
  firstName: string
  lastName: string
  email: string
  isCorresponding: boolean
  institution: string | null
}

type SaveResult =
  | { error: string }
  | { error: string; duplicateOf: string; requiresConfirm: true }
  | { success: true }

export function AuthorContactPanel({
  authors,
  save,
}: {
  authors: Author[]
  save: (
    authorId: string,
    input: { firstName: string; lastName: string; email: string },
    allowDuplicateEmail?: boolean
  ) => Promise<SaveResult>
}) {
  return (
    <ol className="list-inside list-decimal space-y-3 text-sm">
      {authors.map((author) => (
        <AuthorRow key={author.id} author={author} save={save} />
      ))}
    </ol>
  )
}

function AuthorRow({
  author,
  save,
}: {
  author: Author
  save: (
    authorId: string,
    input: { firstName: string; lastName: string; email: string },
    allowDuplicateEmail?: boolean
  ) => Promise<SaveResult>
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(author.firstName)
  const [lastName, setLastName] = useState(author.lastName)
  const [email, setEmail] = useState(author.email)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  // Set only when the server refused for the duplicate-email reason and is
  // offering the explicit "save anyway" second step -- any other edit to
  // the form (including retyping the same email) clears it, so a stale
  // confirm can't silently apply to a since-changed value.
  const [confirmDuplicate, setConfirmDuplicate] = useState<{ duplicateOf: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function resetAndClose() {
    setEditing(false)
    setFirstName(author.firstName)
    setLastName(author.lastName)
    setEmail(author.email)
    setMessage(null)
    setConfirmDuplicate(null)
  }

  function handleSave(allowDuplicateEmail: boolean) {
    setMessage(null)
    startTransition(async () => {
      const result = await save(author.id, { firstName, lastName, email }, allowDuplicateEmail)
      if ("requiresConfirm" in result) {
        setConfirmDuplicate({ duplicateOf: result.duplicateOf })
        setMessage({ kind: "error", text: result.error })
        return
      }
      if ("error" in result) {
        setConfirmDuplicate(null)
        setMessage({ kind: "error", text: result.error })
        return
      }
      setEditing(false)
      setConfirmDuplicate(null)
      setMessage(null)
      router.refresh()
    })
  }

  if (!editing) {
    return (
      <li>
        {author.firstName} {author.lastName}
        {author.isCorresponding && <span className="text-muted-foreground"> (Corresponding)</span>}
        {author.institution && <span className="text-muted-foreground"> — {author.institution}</span>}
        {" · "}
        <span className="text-muted-foreground">{author.email}</span>{" "}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-[#003087] underline underline-offset-2"
        >
          Edit
        </button>
      </li>
    )
  }

  return (
    <li className="rounded-lg border p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`fn-${author.id}`} className="text-xs">
            First name
          </Label>
          <Input
            id={`fn-${author.id}`}
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value)
              setConfirmDuplicate(null)
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`ln-${author.id}`} className="text-xs">
            Last name
          </Label>
          <Input
            id={`ln-${author.id}`}
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value)
              setConfirmDuplicate(null)
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`em-${author.id}`} className="text-xs">
            Email
          </Label>
          <Input
            id={`em-${author.id}`}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setConfirmDuplicate(null)
            }}
          />
        </div>
      </div>

      {message && (
        <p className={`mt-2 text-xs ${message.kind === "error" ? "text-destructive" : "text-emerald-600"}`}>
          {message.text}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {confirmDuplicate ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => handleSave(true)}
          >
            Save anyway (shared with {confirmDuplicate.duplicateOf})
          </Button>
        ) : (
          <Button type="button" size="sm" disabled={pending} onClick={() => handleSave(false)}>
            Save
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={resetAndClose}>
          Cancel
        </Button>
      </div>
    </li>
  )
}
