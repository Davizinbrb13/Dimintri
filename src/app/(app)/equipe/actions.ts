"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, UserRole } from "@/lib/types";

const inviteSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome completo.").max(120),
  email: z.email("Informe um e-mail valido.").transform((value) => value.toLowerCase()),
  role: z.enum(["technician", "admin"]),
});

const updateNameSchema = z.object({
  memberId: z.uuid("Membro invalido."),
  fullName: z
    .string()
    .trim()
    .min(2, "Informe pelo menos 2 caracteres.")
    .max(120, "Use no maximo 120 caracteres.")
    .transform((value) => value.replace(/\s+/g, " ")),
});

const revokeMemberSchema = z.object({
  memberId: z.uuid("Membro invalido."),
});

async function getAdminContext() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return {
      error: "Sua sessao expirou. Entre novamente.",
      supabase: null,
      userId: null,
    } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      error: "Somente administradores podem alterar a equipe.",
      supabase: null,
      userId: null,
    } as const;
  }

  return { error: null, supabase, userId } as const;
}

export async function inviteTeamMemberAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = inviteSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const context = await getAdminContext();

  if (context.error) {
    return { status: "error", message: context.error };
  }

  let admin;

  try {
    admin = createAdminClient();
  } catch {
    return {
      status: "error",
      message: "A chave administrativa do Supabase ainda nao foi configurada no servidor.",
    };
  }

  const { fullName, email, role } = parsed.data;
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/definir-senha`,
  });

  if (inviteError || !inviteData.user) {
    return {
      status: "error",
      message: inviteError?.message.toLowerCase().includes("registered")
        ? "Este e-mail ja possui uma conta."
        : "Nao foi possivel enviar o convite agora.",
    };
  }

  const invitedUserId = inviteData.user.id;
  const { error: metadataError } = await admin.auth.admin.updateUserById(invitedUserId, {
    app_metadata: { role },
    user_metadata: { full_name: fullName },
  });
  const { error: invitedProfileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, email, role: role as UserRole })
    .eq("id", invitedUserId);

  if (metadataError || invitedProfileError) {
    await admin.auth.admin.deleteUser(invitedUserId);
    return {
      status: "error",
      message: "O convite nao pode ser finalizado e foi cancelado. Tente novamente.",
    };
  }

  revalidatePath("/equipe");

  return {
    status: "success",
    message: `Convite enviado para ${email}.`,
  };
}

export async function updateTeamMemberNameAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateNameSchema.safeParse({
    memberId: formData.get("memberId"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise o nome informado.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const context = await getAdminContext();

  if (context.error) {
    return { status: "error", message: context.error };
  }

  const { memberId, fullName } = parsed.data;
  const { data: updatedProfile, error } = await context.supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", memberId)
    .is("access_revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updatedProfile) {
    return { status: "error", message: "Nao foi possivel atualizar o nome." };
  }

  revalidatePath("/equipe");

  return { status: "success", message: "Nome atualizado." };
}

export async function revokeTeamMemberAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = revokeMemberSchema.safeParse({
    memberId: formData.get("memberId"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Conta invalida." };
  }

  const context = await getAdminContext();

  if (context.error) {
    return { status: "error", message: context.error };
  }

  const { memberId } = parsed.data;

  if (memberId === context.userId) {
    return { status: "error", message: "Voce nao pode excluir a propria conta." };
  }

  let admin;

  try {
    admin = createAdminClient();
  } catch {
    return {
      status: "error",
      message: "A chave administrativa do Supabase ainda nao foi configurada no servidor.",
    };
  }

  const { data: targetProfile, error: targetError } = await admin
    .from("profiles")
    .select("id, role, access_revoked_at")
    .eq("id", memberId)
    .maybeSingle();

  if (targetError || !targetProfile || targetProfile.access_revoked_at) {
    return { status: "error", message: "Esta conta nao esta mais ativa." };
  }

  if (targetProfile.role === "admin") {
    const { count, error: countError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .is("access_revoked_at", null);

    if (countError) {
      return { status: "error", message: "Nao foi possivel validar os administradores ativos." };
    }

    if ((count ?? 0) <= 1) {
      return { status: "error", message: "O ultimo administrador nao pode ser excluido." };
    }
  }

  const revokedAt = new Date().toISOString();
  const { data: revokedProfile, error: revokeError } = await admin
    .from("profiles")
    .update({ access_revoked_at: revokedAt, access_revoked_by: context.userId })
    .eq("id", memberId)
    .is("access_revoked_at", null)
    .select("id")
    .maybeSingle();

  if (revokeError || !revokedProfile) {
    return { status: "error", message: "Nao foi possivel revogar o acesso desta conta." };
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(memberId, true);

  if (deleteError) {
    await admin
      .from("profiles")
      .update({ access_revoked_at: null, access_revoked_by: null })
      .eq("id", memberId)
      .eq("access_revoked_at", revokedAt);

    return { status: "error", message: "O acesso nao foi removido. Tente novamente." };
  }

  revalidatePath("/equipe");

  return {
    status: "success",
    message: "Conta excluida. Chamados e movimentacoes foram preservados.",
  };
}
