"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, TicketStatus } from "@/lib/types";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max, `Use no maximo ${max} caracteres.`).nullable(),
  );

const createTicketSchema = z
  .object({
    campusId: z.coerce.number().int().positive("Selecione o campus."),
    requesterRegistration: z.string().trim().min(1, "Informe a matricula."),
    sectorName: z.string().trim().min(2, "Informe o setor.").max(120),
    reportedError: z.string().trim().min(5, "Descreva o erro com mais detalhes.").max(4000),
    diagnosis: optionalText(4000),
    solution: optionalText(4000),
    resolved: z.boolean(),
    notes: optionalText(4000),
  })
  .refine((data) => !data.resolved || Boolean(data.solution), {
    message: "Informe a solucao aplicada antes de marcar como solucionado.",
    path: ["solution"],
  });

const updateTicketSchema = z
  .object({
    ticketId: z.coerce.number().int().positive(),
    currentStatus: z.enum(["new", "progress", "resolved"]),
    diagnosis: optionalText(4000),
    solution: optionalText(4000),
    resolved: z.boolean(),
    notes: optionalText(4000),
  })
  .refine((data) => !data.resolved || Boolean(data.solution), {
    message: "Informe a solucao aplicada antes de concluir o chamado.",
    path: ["solution"],
  });

const moveTicketSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
  status: z.enum(["new", "progress", "resolved"]),
  solution: optionalText(4000),
}).refine((data) => data.status !== "resolved" || Boolean(data.solution), {
  message: "Informe a solucao aplicada antes de concluir o chamado.",
  path: ["solution"],
});

async function authenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    return { supabase, userId: null };
  }

  return { supabase, userId };
}

export async function createTicketAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createTicketSchema.safeParse({
    campusId: formData.get("campusId"),
    requesterRegistration: formData.get("requesterRegistration"),
    sectorName: formData.get("sectorName"),
    reportedError: formData.get("reportedError"),
    diagnosis: formData.get("diagnosis"),
    solution: formData.get("solution"),
    resolved: formData.get("resolved") === "on",
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return invalidForm(parsed.error);
  }

  const { supabase, userId } = await authenticatedUser();
  if (!userId) {
    return { status: "error", message: "Sua sessao expirou. Entre novamente." };
  }

  const registration = parsed.data.requesterRegistration.toUpperCase();
  const [{ data: campus }, { data: requester, error: requesterError }] = await Promise.all([
    supabase
      .from("campuses")
      .select("id")
      .eq("id", parsed.data.campusId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("requesters")
      .select("id")
      .ilike("registration", registration)
      .maybeSingle(),
  ]);

  if (!campus) {
    return { status: "error", message: "O campus selecionado nao esta disponivel." };
  }

  if (requesterError || !requester) {
    return {
      status: "error",
      message: "Matricula nao encontrada. Cadastre o solicitante antes de abrir o chamado.",
      fieldErrors: { requesterRegistration: ["Matricula nao cadastrada."] },
    };
  }

  const sectorResult = await findOrCreateSector(
    supabase,
    parsed.data.sectorName,
    userId,
  );

  if (!sectorResult.id) {
    return { status: "error", message: sectorResult.message };
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      campus_id: parsed.data.campusId,
      requester_id: requester.id,
      sector_id: sectorResult.id,
      reported_error: parsed.data.reportedError,
      diagnosis: parsed.data.diagnosis,
      solution: parsed.data.solution,
      resolved: parsed.data.resolved,
      status: parsed.data.resolved ? "resolved" : "new",
      notes: parsed.data.notes,
      technician_id: userId,
    })
    .select("id")
    .single();

  if (error || !ticket) {
    return { status: "error", message: "Nao foi possivel salvar o chamado." };
  }

  revalidatePath("/dashboard");
  return {
    status: "success",
    message: `Chamado #${ticket.id} criado com sucesso.`,
    ticketId: ticket.id,
  };
}

export async function updateTicketAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateTicketSchema.safeParse({
    ticketId: formData.get("ticketId"),
    currentStatus: formData.get("currentStatus"),
    diagnosis: formData.get("diagnosis"),
    solution: formData.get("solution"),
    resolved: formData.get("resolved") === "on",
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return invalidForm(parsed.error);
  }

  const { supabase, userId } = await authenticatedUser();
  if (!userId) {
    return { status: "error", message: "Sua sessao expirou. Entre novamente." };
  }

  const { data, error } = await supabase
    .from("tickets")
    .update({
      diagnosis: parsed.data.diagnosis,
      solution: parsed.data.solution,
      resolved: parsed.data.resolved,
      status: parsed.data.resolved
        ? "resolved"
        : parsed.data.currentStatus === "resolved"
          ? "progress"
          : parsed.data.currentStatus,
      notes: parsed.data.notes,
    })
    .eq("id", parsed.data.ticketId)
    .select("id")
    .single();

  if (error || !data) {
    return {
      status: "error",
      message: "O chamado nao foi atualizado. Verifique suas permissoes.",
    };
  }

  revalidatePath("/dashboard");
  return {
    status: "success",
    message: `Chamado #${data.id} atualizado.`,
    ticketId: data.id,
  };
}

export async function moveTicketAction(
  ticketId: number,
  status: TicketStatus,
  solution?: string,
): Promise<ActionState> {
  const parsed = moveTicketSchema.safeParse({ ticketId, status, solution: solution ?? null });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "A etapa selecionada nao e valida.",
    };
  }

  const { supabase, userId } = await authenticatedUser();
  if (!userId) {
    return { status: "error", message: "Sua sessao expirou. Entre novamente." };
  }

  const { data: ticket, error: lookupError } = await supabase
    .from("tickets")
    .select("id")
    .eq("id", parsed.data.ticketId)
    .single();

  if (lookupError || !ticket) {
    return {
      status: "error",
      message: "Chamado nao encontrado ou sem permissao para altera-lo.",
    };
  }

  const { data, error } = await supabase
    .from("tickets")
    .update({
      status: parsed.data.status,
      resolved: parsed.data.status === "resolved",
      ...(parsed.data.status === "resolved" ? { solution: parsed.data.solution } : {}),
    })
    .eq("id", parsed.data.ticketId)
    .select("id")
    .single();

  if (error || !data) {
    return {
      status: "error",
      message: "Nao foi possivel mover o chamado. Tente novamente.",
    };
  }

  revalidatePath("/dashboard");
  return {
    status: "success",
    message: `Chamado #${data.id} movido com sucesso.`,
    ticketId: data.id,
  };
}

function invalidForm(error: z.ZodError): ActionState {
  return {
    status: "error",
    message: "Revise os campos destacados.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

async function findOrCreateSector(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  userId: string,
): Promise<{ id: number | null; message: string }> {
  const normalizedName = name.trim();
  const { data: existing, error: lookupError } = await supabase
    .from("sectors")
    .select("id")
    .ilike("name", normalizedName)
    .maybeSingle();

  if (lookupError) {
    return { id: null, message: "Nao foi possivel consultar os setores." };
  }

  if (existing) {
    return { id: existing.id, message: "" };
  }

  const { data: created, error: insertError } = await supabase
    .from("sectors")
    .insert({ name: normalizedName, created_by: userId })
    .select("id")
    .single();

  if (!insertError && created) {
    return { id: created.id, message: "" };
  }

  if (insertError?.code === "23505") {
    const { data: concurrent } = await supabase
      .from("sectors")
      .select("id")
      .ilike("name", normalizedName)
      .single();

    return concurrent
      ? { id: concurrent.id, message: "" }
      : { id: null, message: "Nao foi possivel localizar o setor." };
  }

  return { id: null, message: "Nao foi possivel cadastrar o setor." };
}
