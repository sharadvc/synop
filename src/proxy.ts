import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

/**
 * Access control for a deployed instance.
 *
 * Layers, in order:
 *  1. HTTP Basic Auth — active ONLY when SYNOP_ACCESS_USER + SYNOP_ACCESS_PASSWORD
 *     are both set (i.e. a public deploy). This keeps the server-side AI keys
 *     (GROQ/OpenRouter/YouTube) and the library private: every page and API
 *     route requires the credentials, so nobody can mine the keys or read
 *     another instance's data. When unset (localhost / self-hosted) the app
 *     stays open — true to Synop's BYOK, no-account-by-default design.
 *  2. Clerk — dormant unless CLERK_SECRET_KEY is configured.
 */
const isProtected = createRouteMatcher(['/dashboard(.*)', '/playlist(.*)', '/summary(.*)']);

const clerk = clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth.protect();
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const user = process.env.SYNOP_ACCESS_USER;
  const pass = process.env.SYNOP_ACCESS_PASSWORD;

  if (user && pass) {
    const expected = 'Basic ' + btoa(`${user}:${pass}`);
    if (req.headers.get('authorization') !== expected) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Synop", charset="UTF-8"' },
      });
    }
  }

  if (!process.env.CLERK_SECRET_KEY) return NextResponse.next();
  return clerk(req, event);
}

export const config = {
  matcher: ['/((?!_next/static/|_next/image/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)'],
};