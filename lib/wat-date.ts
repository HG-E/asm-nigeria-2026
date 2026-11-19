// <input type="datetime-local"> sends a bare "YYYY-MM-DDTHH:mm" with no
// timezone, and a bare "YYYY-MM-DD" when only a date was filled in. Nigeria
// doesn't observe DST, so a fixed +01:00 offset is always the correct way to
// read that value as West Africa Time before comparing against a timestamptz
// column.
export function watDateTimeToUtcIso(raw: string | null, endOfDay: boolean): string | null {
  if (!raw) return null
  let value = raw.length === 10 ? `${raw}T${endOfDay ? "23:59:59" : "00:00:00"}` : raw
  if (value.length === 16) value += ":00" // datetime-local with no seconds component
  return `${value}+01:00`
}
