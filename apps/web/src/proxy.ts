import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Refresh and verify the Supabase session before protected dispatcher pages
 * render. Next.js 16 runs Proxy on the Node.js runtime, which keeps the
 * Supabase authentication flow consistent locally and on Vercel.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
