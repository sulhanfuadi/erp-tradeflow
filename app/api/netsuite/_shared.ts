import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";

export function isForbiddenRole(role: string | null | undefined): boolean {
  return role === "client" || role === "supplier";
}

export async function requireNetSuiteSession(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, defaultRateLimits.standard);
  if (rateLimitResponse) {
    return { errorResponse: rateLimitResponse };
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return {
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (isForbiddenRole(session.role)) {
    return {
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session };
}
