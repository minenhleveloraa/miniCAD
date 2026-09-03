import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only authenticated application pages need session refresh at this milestone.
  matcher: ["/dashboard/:path*"],
};
