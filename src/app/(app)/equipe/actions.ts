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

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return { status: "error", message: "Sua sessao expirou. Entre novamente." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { status: "error", message: "Somente administradores podem enviar convites." };
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
