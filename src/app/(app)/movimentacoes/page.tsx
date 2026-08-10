import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MovementManager } from "@/components/movement-manager";
import { createClient } from "@/lib/supabase/server";
import type {
  Campus,
  EquipmentAsset,
  EquipmentCategory,
  EquipmentModel,
  EquipmentMovement,
  Profile,
  Sector,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Movimentacoes de equipamentos",
};

export default async function MovementsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const [profileResult, movementsResult, equipmentResult, categoriesResult, modelsResult, campusesResult, sectorsResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role").eq("id", userId).single(),
    supabase
      .from("equipment_movements")
      .select(
        "id, created_at, movement_type, notes, requester:requesters!equipment_movements_requester_id_fkey(id, registration, full_name), technician:profiles!equipment_movements_technician_id_fkey(id, full_name), destination_campus:campuses!equipment_movements_destination_campus_id_fkey(id, name), destination_sector:sectors!equipment_movements_destination_sector_id_fkey(id, name), items:equipment_movement_items(id, previous_status, asset:equipment_assets!inner(id, serial_number, model:equipment_models!inner(id, name, category:equipment_categories(id, name))), origin_requester:requesters!equipment_movement_items_origin_requester_id_fkey(id, registration, full_name), origin_campus:campuses!equipment_movement_items_origin_campus_id_fkey(id, name), origin_sector:sectors!equipment_movement_items_origin_sector_id_fkey(id, name))",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("equipment_assets")
      .select(
        "id, serial_number, status, notes, created_at, model:equipment_models!inner(id, name, category:equipment_categories(id, name)), current_requester:requesters(id, registration, full_name), current_campus:campuses(id, name), current_sector:sectors(id, name)",
      )
      .order("serial_number")
      .limit(1000),
    supabase.from("equipment_categories").select("id, name").eq("is_active", true).order("name"),
    supabase.from("equipment_models").select("id, name, category:equipment_categories(id, name)").eq("is_active", true).order("name"),
    supabase.from("campuses").select("id, name, slug").eq("is_active", true).order("sort_order"),
    supabase.from("sectors").select("id, name").eq("is_active", true).order("name").limit(300),
  ]);

  if (
    profileResult.error ||
    movementsResult.error ||
    equipmentResult.error ||
    categoriesResult.error ||
    modelsResult.error ||
    campusesResult.error ||
    sectorsResult.error
  ) {
    throw new Error("Nao foi possivel carregar as movimentacoes de equipamentos.");
  }

  return (
    <MovementManager
      profile={profileResult.data as Profile}
      movements={(movementsResult.data ?? []) as unknown as EquipmentMovement[]}
      equipment={(equipmentResult.data ?? []) as unknown as EquipmentAsset[]}
      categories={(categoriesResult.data ?? []) as EquipmentCategory[]}
      models={(modelsResult.data ?? []) as unknown as EquipmentModel[]}
      campuses={(campusesResult.data ?? []) as Campus[]}
      sectors={(sectorsResult.data ?? []) as Sector[]}
    />
  );
}
