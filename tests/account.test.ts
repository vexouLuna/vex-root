import { describe, expect, it } from 'vitest'
import { confirmsForget, memberSince, reconnectUrl } from '../src/lib/account'

describe('confirmsForget', () => {
  it('takes the login in any case, ignoring stray spaces', () => {
    expect(confirmsForget('Alice ', 'alice')).toBe(true)
    expect(confirmsForget('ALICE', 'alice')).toBe(true)
  })

  it('refuses anything else', () => {
    expect(confirmsForget('', 'alice')).toBe(false)
    expect(confirmsForget('alic', 'alice')).toBe(false)
    expect(confirmsForget('alice2', 'alice')).toBe(false)
  })
})

describe('reconnectUrl', () => {
  it('forces Twitch and comes back to the page', () => {
    const url = new URL(reconnectUrl('https://auth.vexoul.net', 'https://vexoul.net/account?x=1'))
    expect(url.origin + url.pathname).toBe('https://auth.vexoul.net/login')
    expect(url.searchParams.get('return')).toBe('https://vexoul.net/account?x=1')
    expect(url.searchParams.get('force')).toBe('1')
  })
})

describe('memberSince', () => {
  it('reads as a date', () => {
    expect(memberSince('2026-03-12T10:00:00+00:00')).toBe('12 March 2026')
  })
})
