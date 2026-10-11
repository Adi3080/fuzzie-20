import { clerkMiddleware } from '@clerk/nextjs/server'

const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/api/clerk-webhook',
  '/api/drive-activity/notification',
  '/api/payment/success',
]

const ignoredRoutes = [
  '/api/auth/callback/discord',
  '/api/auth/callback/notion',
  '/api/auth/callback/slack',
  '/api/flow',
  '/api/cron/wait',
]

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname

  // Ignore routes that should completely bypass Clerk auth
  if (ignoredRoutes.includes(pathname)) {
    return
  }

  // Allow public routes without authentication
  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  ) {
    return
  }

  // Protect everything else
  await auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}