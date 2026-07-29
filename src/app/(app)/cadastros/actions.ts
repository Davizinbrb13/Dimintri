"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const requesterSchema = z.object({
  registration: z.string().trim().min(1, "Informe a matricula.").max(40),
  fullName: z.string().trim().min(2, "Informe o nome completo.").max(160),
});

const sectorSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do setor.").max(120),
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
