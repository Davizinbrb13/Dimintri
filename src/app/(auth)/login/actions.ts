"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import type { ActionState } from "@/lib/types";

const emailSchema = z.email("Informe um e-mail valido.");

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

const passwordSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .max(72, "A senha deve ter no maximo 72 caracteres.");

const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: "As senhas informadas nao coincidem.",
    path: ["passwordConfirmation"],
  });

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      status: "error",
      message: "E-mail ou senha incorretos.",
    };
  }

  redirect("/dashboard");
}

export async function requestPasswordResetAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise o e-mail informado.",
      fieldErrors: { email: parsed.error.issues.map((issue) => issue.message) },
    };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/redefinir-senha`,
  });

  return {
    status: "success",
    message: "Se o e-mail estiver cadastrado, enviaremos as instrucoes de recuperacao.",
  };
}

export async function updatePasswordAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
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

  if (claimsError || !claimsData?.claims?.sub) {
    return {
      status: "error",
      message: "Este link expirou. Solicite um novo convite ou uma nova recuperacao de senha.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return {
      status: "error",
      message: "Nao foi possivel definir a senha. Tente novamente ou solicite um novo link.",
    };
  }

  await supabase.auth.signOut({ scope: "others" });
  redirect("/dashboard");
}
