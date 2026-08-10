"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, EquipmentAsset } from "@/lib/types";

const requesterSchema = z.object({
  registration: z.string().trim().min(1, "Informe a matricula.").max(40),
  fullName: z.string().trim().min(2, "Informe o nome completo.").max(160),
});

const sectorSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do setor.").max(120),
});

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max, `Use no maximo ${max} caracteres.`).nullable(),
  );

const optionalId = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce.number().int().positive().nullable(),
);

const equipmentSchema = z.object({
  modelName: z.string().trim().min(2, "Informe o nome do equipamento.").max(160),
  categoryName: optionalText(80),
  serials: z.string().trim().min(2, "Informe pelo menos um numero de serial."),
  initialCampusId: optionalId,
  notes: optionalText(2000),
});

async function getIdentity() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

export async function createRequesterAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requesterSchema.safeParse({
    registration: formData.get("registration"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, userId } = await getIdentity();
  if (!userId) {
    return { status: "error", message: "Sua sessao expirou." };
  }

  const { error } = await supabase.from("requesters").insert({
    registration: parsed.data.registration.toUpperCase(),
    full_name: parsed.data.fullName,
    created_by: userId,
  });

  if (error?.code === "23505") {
    return { status: "error", message: "Esta matricula ja esta cadastrada." };
  }

  if (error) {
    return { status: "error", message: "Nao foi possivel cadastrar o solicitante." };
  }

  revalidatePath("/cadastros");
  revalidatePath("/dashboard");
  return { status: "success", message: "Solicitante cadastrado." };
}

export async function createSectorAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = sectorSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise o nome do setor.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, userId } = await getIdentity();
  if (!userId) {
    return { status: "error", message: "Sua sessao expirou." };
  }

  const { error } = await supabase.from("sectors").insert({
    name: parsed.data.name,
    created_by: userId,
  });

  if (error?.code === "23505") {
    return { status: "error", message: "Este setor ja esta cadastrado." };
  }

  if (error) {
    return { status: "error", message: "Nao foi possivel cadastrar o setor." };
  }

  revalidatePath("/cadastros");
  revalidatePath("/dashboard");
  return { status: "success", message: "Setor cadastrado." };
}

export async function registerEquipmentAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = equipmentSchema.safeParse({
    modelName: formData.get("modelName"),
    categoryName: formData.get("categoryName"),
    serials: formData.get("serials"),
    initialCampusId: formData.get("initialCampusId"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const serials = parsed.data.serials
    .split(/[\r\n,;]+/)
    .map((serial) => serial.trim().toUpperCase())
    .filter(Boolean);

  if (serials.length > 200) {
    return {
      status: "error",
      message: "Cadastre no maximo 200 equipamentos por vez.",
      fieldErrors: { serials: ["Reduza a lista para ate 200 seriais."] },
    };
  }

  if (new Set(serials).size !== serials.length) {
    return {
      status: "error",
      message: "A lista possui numeros de serial repetidos.",
      fieldErrors: { serials: ["Remova os seriais duplicados da lista."] },
    };
  }

  if (serials.some((serial) => !/^[A-Z0-9._/-]{2,100}$/.test(serial))) {
    return {
      status: "error",
      message: "Um ou mais seriais possuem formato invalido.",
      fieldErrors: {
        serials: ["Use letras, numeros, ponto, hifen, barra ou sublinhado."],
      },
    };
  }

  const { supabase, userId } = await getIdentity();
  if (!userId) {
    return { status: "error", message: "Sua sessao expirou." };
  }

  const { data, error } = await supabase.rpc("register_equipment_assets", {
    p_model_name: parsed.data.modelName,
    p_serial_numbers: serials,
    p_category_name: parsed.data.categoryName,
    p_initial_campus_id: parsed.data.initialCampusId,
    p_notes: parsed.data.notes,
  });

  if (error) {
    const duplicate = error.code === "23505" || error.message.includes("already registered");
    return {
      status: "error",
      message: duplicate
        ? "Um dos numeros de serial ja esta cadastrado."
        : "Nao foi possivel cadastrar os equipamentos.",
      fieldErrors: duplicate ? { serials: ["Revise os seriais ja existentes."] } : undefined,
    };
  }

  const result = asRegistrationResult(data);
  if (!result) {
    return { status: "error", message: "O banco retornou um resultado inesperado." };
  }

  const { data: equipmentData } = await supabase
    .from("equipment_assets")
    .select(
      "id, serial_number, status, notes, created_at, model:equipment_models!inner(id, name, category:equipment_categories(id, name)), current_requester:requesters(id, registration, full_name), current_campus:campuses(id, name), current_sector:sectors(id, name)",
    )
    .eq("id", result.assetIds[0])
    .maybeSingle();

  revalidatePath("/cadastros");
  revalidatePath("/movimentacoes");

  return {
    status: "success",
    message:
      result.createdCount === 1
        ? "Equipamento cadastrado."
        : `${result.createdCount} equipamentos cadastrados.`,
    createdCount: result.createdCount,
    equipment: equipmentData as unknown as EquipmentAsset | undefined,
  };
}

function asRegistrationResult(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const assetIds = Array.isArray(record.asset_ids)
    ? record.asset_ids.filter((id): id is number => typeof id === "number")
    : [];
  const createdCount = record.created_count;

  if (!assetIds.length || typeof createdCount !== "number") return null;
  return { assetIds, createdCount };
}
