import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateProfileSchema = z.object({
  fullName: z.string().trim().max(80).optional().or(z.literal("")),
  brokerage: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(120)
    .email()
    .optional()
    .or(z.literal("")),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  logoUrl: z.string().max(2_500_000).optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[profile/route] POST received body:", {
      fullName: body.fullName,
      brokerage: body.brokerage,
      phone: body.phone,
      email: body.email,
      location: body.location,
      hasLogo: !!body.logoUrl,
    });

    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      console.error("[profile/route] Validation failed:", parsed.error.issues);
      return NextResponse.json(
        { ok: false, error: "Invalid profile data", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    console.log("[profile/route] Profile validated successfully (localStorage-only mode)");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profile/route] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  console.log("[profile/route] GET called (localStorage-only mode, returning null)");
  return NextResponse.json({ ok: true, profile: null });
}
