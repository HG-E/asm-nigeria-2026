// generateLink()'s own `action_link` points at Supabase's hosted verify
// endpoint, which authenticates via tokens in the URL fragment -- fine for a
// page like /login that renders regardless of auth state, but broken for a
// page like /reset-password that checks auth server-side and redirects away
// before any client-side JS gets a chance to read the fragment (confirmed:
// following a raw recovery action_link bounced straight back to
// /forgot-password instead of showing the reset form).
//
// This app already has its own callback route, app/auth/confirm/route.ts,
// built for exactly this: it verifies the token server-side and sets a real
// cookie-based session before redirecting, so a server component checking
// auth afterward sees it correctly. generateLink() returns the hashed_token
// and verification_type this route expects -- build a link to it instead of
// using action_link, for every type of auth email this app sends itself.
export function buildConfirmLink(
  origin: string,
  hashedToken: string,
  verificationType: string,
  next: string
): string {
  const url = new URL("/auth/confirm", origin)
  url.searchParams.set("token_hash", hashedToken)
  url.searchParams.set("type", verificationType)
  url.searchParams.set("next", next)
  return url.toString()
}
