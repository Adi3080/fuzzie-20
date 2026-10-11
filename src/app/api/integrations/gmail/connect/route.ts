import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI
  if (!clientId || !redirectUri) return NextResponse.json({ error: 'Set GOOGLE_CLIENT_ID and GOOGLE_GMAIL_REDIRECT_URI first.' }, { status: 503 })
  const state = crypto.randomUUID()
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'https://www.googleapis.com/auth/calendar.events', access_type: 'offline', prompt: 'consent', state }).toString()
  const response = NextResponse.redirect(url)
  response.cookies.set('gmail_oauth_state', state, { httpOnly: true, secure: request.url.startsWith('https://'), sameSite: 'lax', path: '/', maxAge: 600 })
  return response
}
