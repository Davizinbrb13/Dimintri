import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CrmBoard } from "@/components/crm-board";
import { createClient } from "@/lib/supabase/server";
import type { Campus, Profile, Sector, Ticket } from "@/lib/types";

export const metadata: Metadata = {
  title: "Painel de chamados",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", userId)
    .single();

  if (profileError || !profileData) {
    throw new Error("Perfil do tecnico nao encontrado.");
  }

  const profile = profileData as Profile;
  let ticketsQuery = supabase
    .from("tickets")
    .select(
      "id, created_at, updated_at, reported_error, diagnosis, solution, resolved, status, notes, resolved_at, technician_id, campus:campuses(id, name), requester:requesters(id, registration, full_name), sector:sectors(id, name), technician:profiles!tickets_technician_id_fkey(id, full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (profile.role !== "admin") {
    ticketsQuery = ticketsQuery.eq("technician_id", userId);
  }

  const [ticketsResult, campusesResult, sectorsResult] = await Promise.all([
    ticketsQuery,
    supabase
      .from("campuses")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("sectors")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .limit(300),
  ]);

  if (ticketsResult.error || campusesResult.error || sectorsResult.error) {
    throw new Error("Nao foi possivel carregar os dados do painel.");
  }

  return (
    <CrmBoard
      profile={profile}
      tickets={(ticketsResult.data ?? []) as unknown as Ticket[]}
      campuses={(campusesResult.data ?? []) as Campus[]}
      sectors={(sectorsResult.data ?? []) as Sector[]}
    />
  );
}
