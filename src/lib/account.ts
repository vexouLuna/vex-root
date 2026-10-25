// The /account page's small rules, kept out of the component so they can be tested.

/** Whether what was typed confirms "Forget me": the Twitch login, in any case (vex-auth checks it too). */
export function confirmsForget(typed: string, login: string): boolean {
  return typed.trim().toLowerCase() === login.toLowerCase()
}

/** vex-auth's sign-in that makes Twitch ask again (force_verify) and replaces the stored token. */
export function reconnectUrl(authBase: string, returnTo: string): string {
  return `${authBase}/login?${new URLSearchParams({ return: returnTo, force: '1' })}`
}

/** "12 March 2026", for "Member since". */
export function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
