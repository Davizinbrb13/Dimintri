import type { Metadata } from "next";
import { RegistryManager } from "@/components/registry-manager";
import { createClient } from "@/lib/supabase/server";
import type { Requester, Sector } from "@/lib/types";

export const metadata: Metadata = {
  title: "Cadastros auxiliares",
};

export default async function RegistriesPage() {
  const supabase = await createClient();
  const [requestersResult, sectorsResult] = await Promise.all([
    supabase
      .from("requesters")
      .select("id, registration, full_name")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("sectors")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .limit(300),
  ]);

  if (requestersResult.error || sectorsResult.error) {
    throw new Error("Nao foi possivel carregar os cadastros auxiliares.");
  }

  return (
    <RegistryManager
      requesters={(requestersResult.data ?? []) as Requester[]}
      sectors={(sectorsResult.data ?? []) as Sector[]}
    />
  );
}
