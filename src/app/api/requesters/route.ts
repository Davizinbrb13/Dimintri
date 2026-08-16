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

  const [registrationResult, nameResult] = await Promise.all([
    supabase
      .from("requesters")
      .select("id, registration, full_name")
      .eq("is_active", true)
      .ilike("registration", `${query}%`)
      .order("registration")
      .limit(8),
    supabase
      .from("requesters")
      .select("id, registration, full_name")
      .eq("is_active", true)
      .ilike("full_name", `%${query}%`)
      .order("full_name")
      .limit(8),
  ]);

  if (registrationResult.error || nameResult.error) {
    return NextResponse.json({ requesters: [] }, { status: 500 });
  }

  const requesters = [...registrationResult.data ?? [], ...nameResult.data ?? []]
    .filter((requester, index, values) =>
      values.findIndex((candidate) => candidate.id === requester.id) === index,
    )
    .slice(0, 8);

  return NextResponse.json({ requesters });
}
