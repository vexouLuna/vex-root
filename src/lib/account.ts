// The /account page's small rules, kept out of the component so they can be tested.

/** vex-auth's sign-in that makes Twitch ask again (force_verify) and replaces the stored token. */
export function reconnectUrl(authBase: string, returnTo: string): string {
  return `${authBase}/login?${new URLSearchParams({ return: returnTo, force: '1' })}`
}

/** "12 March 2026", for "Member since". */
export function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
