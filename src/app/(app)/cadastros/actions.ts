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

const requesterIdSchema = z.object({
  requesterId: z.coerce.number().int().positive(),
});

const updateRequesterSchema = requesterSchema.extend({
  requesterId: z.coerce.number().int().positive(),
});

const sectorIdSchema = z.object({
  sectorId: z.coerce.number().int().positive(),
});

const updateSectorSchema = sectorSchema.extend({
  sectorId: z.coerce.number().int().positive(),
});

const serialNumberSchema = z
  .string()
  .trim()
  .min(2, "Informe o numero de serial.")
  .max(100, "Use no maximo 100 caracteres.")
  .refine(
    (value) => /^[A-Z0-9._/-]+$/i.test(value),
    "Use letras, numeros, ponto, hifen, barra ou sublinhado.",
  );

const updateEquipmentSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  modelId: z.coerce.number().int().positive("Selecione o equipamento."),
  serialNumber: serialNumberSchema,
  notes: optionalText(2000),
});

const equipmentIdSchema = z.object({
  assetId: z.coerce.number().int().positive(),
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

export async function updateRequesterAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateRequesterSchema.safeParse({
    requesterId: formData.get("requesterId"),
    registration: formData.get("registration"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { supabase, userId } = await getIdentity();
  if (!userId) return { status: "error", message: "Sua sessao expirou." };

  const { data, error } = await supabase
    .from("requesters")
    .update({
      registration: parsed.data.registration.toUpperCase(),
      full_name: parsed.data.fullName,
    })
    .eq("id", parsed.data.requesterId)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error?.code === "23505") {
    return { status: "error", message: "Esta matricula ja esta cadastrada." };
  }

  if (error || !data) {
    return { status: "error", message: "Solicitante nao encontrado ou sem permissao para edita-lo." };
  }

  revalidateRegistryPaths();
  return { status: "success", message: "Solicitante atualizado." };
}

export async function deactivateRequesterAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requesterIdSchema.safeParse({ requesterId: formData.get("requesterId") });
  if (!parsed.success) return invalidForm(parsed.error);

  const { supabase, userId } = await getIdentity();
  if (!userId) return { status: "error", message: "Sua sessao expirou." };

  const { data, error } = await supabase
    .from("requesters")
    .update({ is_active: false })
    .eq("id", parsed.data.requesterId)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { status: "error", message: "Solicitante nao encontrado ou sem permissao para remove-lo." };
  }

  revalidateRegistryPaths();
  return { status: "success", message: "Solicitante removido dos novos registros." };
}

export async function updateSectorAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateSectorSchema.safeParse({
    sectorId: formData.get("sectorId"),
    name: formData.get("name"),
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { supabase, userId } = await getIdentity();
  if (!userId) return { status: "error", message: "Sua sessao expirou." };

  const { data, error } = await supabase
    .from("sectors")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.sectorId)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error?.code === "23505") {
    return { status: "error", message: "Este setor ja esta cadastrado." };
  }

  if (error || !data) {
    return { status: "error", message: "Setor nao encontrado ou sem permissao para edita-lo." };
  }

  revalidateRegistryPaths();
  return { status: "success", message: "Setor atualizado." };
}

export async function deactivateSectorAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = sectorIdSchema.safeParse({ sectorId: formData.get("sectorId") });
  if (!parsed.success) return invalidForm(parsed.error);

  const { supabase, userId } = await getIdentity();
  if (!userId) return { status: "error", message: "Sua sessao expirou." };

  const { data, error } = await supabase
    .from("sectors")
    .update({ is_active: false })
    .eq("id", parsed.data.sectorId)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { status: "error", message: "Setor nao encontrado ou sem permissao para remove-lo." };
  }

  revalidateRegistryPaths();
  return { status: "success", message: "Setor removido dos novos registros." };
}

export async function updateEquipmentAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateEquipmentSchema.safeParse({
    assetId: formData.get("assetId"),
    modelId: formData.get("modelId"),
    serialNumber: formData.get("serialNumber"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { supabase, userId } = await getIdentity();
  if (!userId) return { status: "error", message: "Sua sessao expirou." };

  const { data, error } = await supabase
    .from("equipment_assets")
    .update({
      model_id: parsed.data.modelId,
      serial_number: parsed.data.serialNumber.toUpperCase(),
      notes: parsed.data.notes,
    })
    .eq("id", parsed.data.assetId)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error?.code === "23505") {
    return { status: "error", message: "Este numero de serial ja esta cadastrado." };
  }

  if (error || !data) {
    return { status: "error", message: "Equipamento nao encontrado ou sem permissao para edita-lo." };
  }

  revalidateRegistryPaths();
  return { status: "success", message: "Equipamento atualizado." };
}

export async function deactivateEquipmentAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = equipmentIdSchema.safeParse({ assetId: formData.get("assetId") });
  if (!parsed.success) return invalidForm(parsed.error);

  const { supabase, userId } = await getIdentity();
  if (!userId) return { status: "error", message: "Sua sessao expirou." };

  const { data, error } = await supabase
    .from("equipment_assets")
    .update({ is_active: false })
    .eq("id", parsed.data.assetId)
    .eq("is_active", true)
    .in("status", ["available", "retired"])
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      status: "error",
      message: "O equipamento precisa estar disponivel ou baixado, e voce precisa ter permissao para remove-lo.",
    };
  }

  revalidateRegistryPaths();
  return { status: "success", message: "Equipamento removido do inventario ativo." };
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

function invalidForm(error: z.ZodError): ActionState {
  return {
    status: "error",
    message: "Revise os campos destacados.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function revalidateRegistryPaths() {
  revalidatePath("/cadastros");
  revalidatePath("/dashboard");
  revalidatePath("/movimentacoes");
}
