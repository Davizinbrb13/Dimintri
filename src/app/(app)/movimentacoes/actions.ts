"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max, `Use no maximo ${max} caracteres.`).nullable(),
  );

const movementSchema = z
  .object({
    movementType: z.enum(["delivery", "return", "transfer", "maintenance", "retirement"]),
    requesterRegistration: z.string().trim().min(1, "Informe a matricula."),
    assetIds: z.array(z.coerce.number().int().positive()).min(1, "Selecione um equipamento."),
    destinationCampusId: z.preprocess(
      (value) => (value === "" || value === null ? null : value),
      z.coerce.number().int().positive().nullable(),
    ),
    destinationSectorName: optionalText(120),
    notes: optionalText(2000),
  })
  .refine((data) => data.movementType === "retirement" || data.destinationCampusId !== null, {
    message: "Selecione o campus de destino.",
    path: ["destinationCampusId"],
  });

export async function createMovementAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = movementSchema.safeParse({
    movementType: formData.get("movementType"),
    requesterRegistration: formData.get("requesterRegistration"),
    assetIds: formData.getAll("assetIds"),
    destinationCampusId: formData.get("destinationCampusId"),
    destinationSectorName: formData.get("destinationSectorName"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return { status: "error", message: "Sua sessao expirou. Entre novamente." };
  }

  const [{ data: requester }, { data: profile }] = await Promise.all([
    supabase
      .from("requesters")
      .select("id")
      .eq("is_active", true)
      .ilike("registration", parsed.data.requesterRegistration.toUpperCase())
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", userId).single(),
  ]);

  if (!requester) {
    return {
      status: "error",
      message: "Matricula nao encontrada. Cadastre o solicitante antes da movimentacao.",
      fieldErrors: { requesterRegistration: ["Matricula nao cadastrada."] },
    };
  }

  if (parsed.data.movementType === "retirement" && profile?.role !== "admin") {
    return { status: "error", message: "Somente administradores podem dar baixa em equipamentos." };
  }

  const sectorId = parsed.data.destinationSectorName
    ? await findOrCreateSector(supabase, parsed.data.destinationSectorName, userId)
    : null;

  if (parsed.data.destinationSectorName && !sectorId) {
    return { status: "error", message: "Nao foi possivel localizar ou cadastrar o setor." };
  }

  const { data: movementId, error } = await supabase.rpc("create_equipment_movement", {
    p_movement_type: parsed.data.movementType,
    p_requester_id: requester.id,
    p_asset_ids: [...new Set(parsed.data.assetIds)],
    p_destination_campus_id: parsed.data.destinationCampusId,
    p_destination_sector_id: sectorId,
    p_notes: parsed.data.notes,
  });

  if (error || !movementId) {
    return { status: "error", message: movementErrorMessage(error?.message) };
  }

  revalidatePath("/movimentacoes");
  revalidatePath("/cadastros");

  return {
    status: "success",
    message: `Movimentacao #${movementId} registrada.`,
    movementId,
  };
}

async function findOrCreateSector(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  userId: string,
) {
  const normalizedName = name.trim();
  const { data: existing } = await supabase
    .from("sectors")
    .select("id")
    .eq("is_active", true)
    .ilike("name", normalizedName)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("sectors")
    .insert({ name: normalizedName, created_by: userId })
    .select("id")
    .single();

  if (!error && created) return created.id;

  if (error?.code === "23505") {
    const { data: concurrent } = await supabase
      .from("sectors")
      .select("id")
      .eq("is_active", true)
      .ilike("name", normalizedName)
      .single();
    return concurrent?.id ?? null;
  }

  return null;
}

function movementErrorMessage(message?: string) {
  if (message?.includes("Only available")) {
    return "Uma entrega possui equipamento que nao esta disponivel.";
  }
  if (message?.includes("assigned or maintenance")) {
    return "Uma devolucao possui equipamento que nao esta em uso ou manutencao.";
  }
  if (message?.includes("Retired equipment")) {
    return "Equipamentos baixados nao podem ser movimentados.";
  }
  if (message?.includes("Only administrators")) {
    return "Somente administradores podem dar baixa em equipamentos.";
  }
  return "Nao foi possivel registrar a movimentacao. Atualize a pagina e tente novamente.";
}
