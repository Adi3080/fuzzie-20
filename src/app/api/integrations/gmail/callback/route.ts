import { NextResponse } from 'next/server'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character)

export async function GET(request: Request) {
  const url = new URL(request.url)
  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')
  const expectedState = request.headers.get('cookie')?.match(/(?:^|; )gmail_oauth_state=([^;]+)/)?.[1]
  const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI
  if (!state || !code || !expectedState || state !== expectedState || !redirectUri) return NextResponse.json({ error: 'The Google Calendar authorization session expired or was invalid. Start again.' }, { status: 400 })
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: redirectUri, grant_type: 'authorization_code' }), cache: 'no-store' })
  const payload = await response.json() as { refresh_token?: string; error_description?: string }
  if (!response.ok || !payload.refresh_token) return NextResponse.json({ error: payload.error_description || 'Google did not return a refresh token. Revoke this app in Google Account permissions, then connect again.' }, { status: 400 })
  const html = `<!doctype html><title>Google Calendar connected</title><main style="font-family:system-ui;max-width:720px;margin:3rem auto"><h1>Google Calendar authorization complete</h1><p>Copy this value into <code>GMAIL_REFRESH_TOKEN</code> in your server environment, then restart the app. It is shown only on this page.</p><pre style="white-space:pre-wrap;word-break:break-all;padding:1rem;background:#111;color:#d8ffd8;border-radius:8px">${escapeHtml(payload.refresh_token)}</pre><p>Do not share this token or commit it to Git.</p></main>`
  const result = new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  result.cookies.set('gmail_oauth_state', '', { path: '/', maxAge: 0 })
  return result
}
