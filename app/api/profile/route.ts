import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().trim().max(80).optional().or(z.literal("")),
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
      // Not signed in — the context still has localStorage as its source of
      // truth, so we don't treat this as a hard error.
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid profile data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, brokerage, phone, email, location, logoUrl } = parsed.data;

    const { error: upsertError } = await supabase
      .from("agent_profiles")
      .upsert(
        {
          id: user.id,
          name: name || "",
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
      console.error("[profile/route] Upsert error:", upsertError);
      return NextResponse.json(
        { ok: false, error: "Failed to save profile" },
        { status: 500 }
      );
    }

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

    const { data: profile, error: fetchError } = await supabase
      .from("agent_profiles")
      .select("name, brokerage, phone, email, location, logo_url")
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
      return NextResponse.json({ ok: true, profile: null });
    }

    return NextResponse.json({
      ok: true,
      profile: {
        name: profile.name || "",
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
