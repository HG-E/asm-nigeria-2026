import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// A plain GET form, same pattern as the search/filter forms elsewhere in
// admin -- no client JS needed. The two submit buttons each set their own
// "format" value, so one form serves both CSV and XLSX without a picker.
export function RegistrationExportForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Export</CardTitle>
      </CardHeader>
      <CardContent>
        <form method="get" action="/registration-desk/export" className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs" htmlFor="export-from">
              Registered from
            </label>
            <Input id="export-from" type="datetime-local" name="from" className="w-56" />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs" htmlFor="export-to">
              Registered to
            </label>
            <Input id="export-to" type="datetime-local" name="to" className="w-56" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="photos" value="1" className="size-4" />
            Include headshots
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="qr" value="1" className="size-4" />
            Include badge QR codes
          </label>
          <button
            type="submit"
            name="format"
            value="csv"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Download CSV
          </button>
          <button type="submit" name="format" value="xlsx" className={cn(buttonVariants({ size: "sm" }))}>
            Download XLSX
          </button>
        </form>
        <p className="text-muted-foreground mt-2 text-xs">
          Leave the date fields blank to export everyone. Times are West Africa Time (Nigeria). Headshots and QR
          codes embed directly in the spreadsheet, but only when downloading XLSX -- CSV can&apos;t hold an image.
          Each QR encodes that registrant&apos;s reference number for scanning at check-in and never expires.
        </p>
      </CardContent>
    </Card>
  )
}
