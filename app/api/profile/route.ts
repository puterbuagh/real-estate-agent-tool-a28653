import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
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
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[profile/route] User not authenticated, skipping Supabase save");
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    const { fullName, brokerage, phone, email, location, logoUrl } = parsed.data;

    console.log("[profile/route] Upserting to agent_profiles:", {
      userId: user.id,
      fullName: fullName || "",
      brokerage: brokerage || null,
      phone: phone || null,
      email: email || user.email || null,
      location: location || null,
      hasLogo: !!logoUrl,
    });

    const { error: upsertError } = await supabase
      .from("agent_profiles")
      .upsert(
        {
          id: user.id,
          full_name: fullName || "",
          brokerage: brokerage || null,
          phone: phone || null,
          email: email || user.email || null,
          location: location || null,
          logo_url: logoUrl || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("[profile/route] Upsert error:", {
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
      });
      return NextResponse.json(
        { ok: false, error: "Failed to save profile", details: upsertError.message },
        { status: 500 }
      );
    }

    console.log("[profile/route] Profile saved successfully for user:", user.id);
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
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[profile/route] GET fetching for user:", user.id);

    const { data: profile, error: fetchError } = await supabase
      .from("agent_profiles")
      .select("full_name, brokerage, phone, email, location, logo_url")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("[profile/route] Fetch error:", fetchError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    if (!profile) {
      console.log("[profile/route] No profile found for user:", user.id);
      return NextResponse.json({ ok: true, profile: null });
    }

    console.log("[profile/route] Profile fetched:", {
      fullName: profile.full_name,
      brokerage: profile.brokerage,
      phone: profile.phone,
      email: profile.email,
      location: profile.location,
      hasLogo: !!profile.logo_url,
    });

    return NextResponse.json({
      ok: true,
      profile: {
        fullName: profile.full_name || "",
        brokerage: profile.brokerage || "",
        phone: profile.phone || "",
        email: profile.email || "",
        location: profile.location || "",
        logoUrl: profile.logo_url || "",
      },
    });
  } catch (err) {
    console.error("[profile/route] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
