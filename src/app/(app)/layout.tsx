import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", claimsData.claims.sub)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<div className="app-shell-skeleton" />}>
      <AppShell profile={profile as Profile}>{children}</AppShell>
    </Suspense>
  );
}
