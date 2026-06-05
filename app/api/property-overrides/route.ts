import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STORAGE_KEY_PREFIX = "agentdesk:property-overrides:";

function hashAddress(address: string): string {
  return createHash("sha256")
    .update(address.toLowerCase().trim())
    .digest("hex");
}

function readFromStorage(addressHash: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${addressHash}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeToStorage(addressHash: string, overrides: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${addressHash}`,
      JSON.stringify(overrides)
    );
  } catch {
    // ignore quota errors
  }
}

function deleteFromStorage(addressHash: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${addressHash}`);
  } catch {
    // ignore
  }
}

export async function POST(req: NextRequest) {
  console.log("[property-overrides POST] Request received (localStorage-only mode)");

  let body: unknown;
  try {
    body = await req.json();
    console.log("[property-overrides POST] Request body parsed:", JSON.stringify(body));
  } catch (err) {
    console.error("[property-overrides POST] JSON parse failed:", err);
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const bodyObj = (body ?? {}) as {
    address?: unknown;
    overrides?: unknown;
  };

  const address =
    typeof bodyObj.address === "string" ? bodyObj.address.trim() : "";
  const overrides =
    bodyObj.overrides && typeof bodyObj.overrides === "object"
      ? bodyObj.overrides
      : {};

  if (!address) {
    console.error("[property-overrides POST] Missing address");
    return NextResponse.json(
      { ok: false, error: "missing_address" },
      { status: 400 }
    );
  }

  console.log("[property-overrides POST] Address:", address);
  console.log("[property-overrides POST] Overrides:", JSON.stringify(overrides));

  const addressHash = hashAddress(address);
  console.log("[property-overrides POST] Address hash:", addressHash);

  const data = {
    address,
    addressHash,
    overrides,
    updatedAt: new Date().toISOString(),
  };

  console.log("[property-overrides POST] Save successful (localStorage):", JSON.stringify(data));
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  console.log("[property-overrides DELETE] Request received (localStorage-only mode)");

  const address = req.nextUrl.searchParams.get("address");
  if (!address?.trim()) {
    console.error("[property-overrides DELETE] Missing address");
    return NextResponse.json(
      { ok: false, error: "missing_address" },
      { status: 400 }
    );
  }

  console.log("[property-overrides DELETE] Address:", address);

  const addressHash = hashAddress(address);
  console.log("[property-overrides DELETE] Address hash:", addressHash);

  const data = {
    address,
    addressHash,
    deletedAt: new Date().toISOString(),
  };

  console.log("[property-overrides DELETE] Delete successful (localStorage):", JSON.stringify(data));
  return NextResponse.json({ ok: true, data });
}
