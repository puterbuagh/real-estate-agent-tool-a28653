// Authentication has been removed from this application.
// This middleware is intentionally a no-op pass-through to prevent
// Next.js MIDDLEWARE_INVOCATION_FAILED errors.
// Do not add session validation, auth checks, or request interception here.

import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};

export default middleware;
