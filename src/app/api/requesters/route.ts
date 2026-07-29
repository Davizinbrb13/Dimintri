import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    return NextResponse.json({ requesters: [] }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "")
    .trim()
    .replace(/[%_]/g, "")
    .slice(0, 40);

  if (!query) {
    return NextResponse.json({ requesters: [] });
  }

  const { data, error } = await supabase
    .from("requesters")
    .select("id, registration, full_name")
    .ilike("registration", `${query}%`)
    .order("registration")
    .limit(8);

  if (error) {
    return NextResponse.json({ requesters: [] }, { status: 500 });
  }

  return NextResponse.json({ requesters: data });
}
