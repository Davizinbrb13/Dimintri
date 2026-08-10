import type { Metadata } from "next";
import { RegistryManager } from "@/components/registry-manager";
import { createClient } from "@/lib/supabase/server";
import type {
  Campus,
  EquipmentAsset,
  EquipmentCategory,
  EquipmentModel,
  Requester,
  Sector,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Cadastros auxiliares",
};

export default async function RegistriesPage() {
  const supabase = await createClient();
  const [requestersResult, sectorsResult, categoriesResult, modelsResult, equipmentResult, campusesResult] = await Promise.all([
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
    supabase
      .from("equipment_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("equipment_models")
      .select("id, name, category:equipment_categories(id, name)")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("equipment_assets")
      .select(
        "id, serial_number, status, notes, created_at, model:equipment_models!inner(id, name, category:equipment_categories(id, name)), current_requester:requesters(id, registration, full_name), current_campus:campuses(id, name), current_sector:sectors(id, name)",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("campuses")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (
    requestersResult.error ||
    sectorsResult.error ||
    categoriesResult.error ||
    modelsResult.error ||
    equipmentResult.error ||
    campusesResult.error
  ) {
    throw new Error("Nao foi possivel carregar os cadastros auxiliares.");
  }

  return (
    <RegistryManager
      requesters={(requestersResult.data ?? []) as Requester[]}
      sectors={(sectorsResult.data ?? []) as Sector[]}
      categories={(categoriesResult.data ?? []) as EquipmentCategory[]}
      models={(modelsResult.data ?? []) as unknown as EquipmentModel[]}
      equipment={(equipmentResult.data ?? []) as unknown as EquipmentAsset[]}
      campuses={(campusesResult.data ?? []) as Campus[]}
    />
  );
}
