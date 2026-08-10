import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamManager } from "@/components/team-manager";
import { createClient } from "@/lib/supabase/server";
import type { TeamMember } from "@/lib/types";

export const metadata: Metadata = {
  title: "Equipe",
};

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (currentProfileError || currentProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: members, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .is("access_revoked_at", null)
    .order("created_at");

  if (error) {
    throw new Error("Nao foi possivel carregar a equipe.");
  }

  return <TeamManager members={(members ?? []) as TeamMember[]} currentUserId={userId} />;
}
