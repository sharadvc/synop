import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

/**
 * Optional authentication.
 * When CLERK_SECRET_KEY is configured (i.e. the app is deployed), the app's
 * workspace routes require a signed-in user. Without Clerk keys (localhost /
 * self-hosted), middleware is a pass-through and the app stays open — true to
 * Synop's open-source, BYOK, no-account-by-default design.
 */
const isProtected = createRouteMatcher(['/dashboard(.*)', '/playlist(.*)', '/summary(.*)']);

const clerk = clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth.protect();
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.next();
  return clerk(req, event);
}

export const config = {
  matcher: ['/dashboard/:path*', '/playlist/:path*', '/summary/:path*'],
};
