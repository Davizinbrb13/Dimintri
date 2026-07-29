"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const emailSchema = z.email("Informe um e-mail valido.");

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Informe o nome completo.").max(120),
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
    if (error.code === "email_not_confirmed") {
      return {
        status: "error",
        message: "Seu e-mail ainda nao foi confirmado. Abra a mensagem enviada pelo Supabase ou reenvie a confirmacao abaixo.",
        requiresEmailConfirmation: true,
      };
    }

    return {
      status: "error",
      message:
        error.code === "invalid_credentials"
          ? "E-mail ou senha incorretos."
          : "Nao foi possivel entrar agora. Tente novamente em instantes.",
    };
  }

  redirect("/dashboard");
}

export async function signUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
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

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message.toLowerCase().includes("registered")
        ? "Este e-mail ja possui uma conta."
        : "Nao foi possivel criar a conta agora.",
    };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message: "Conta criada. Confira seu e-mail para confirmar o acesso.",
  };
}

export async function resendConfirmationAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Informe um e-mail valido para reenviar a confirmacao.",
    };
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return {
      status: "error",
      message:
        error.code === "over_email_send_rate_limit"
          ? "Muitos envios em pouco tempo. Aguarde um minuto e tente novamente."
          : "Nao foi possivel reenviar a confirmacao agora.",
    };
  }

  return {
    status: "success",
    message: "Confirmacao reenviada. Confira a caixa de entrada e o spam.",
  };
}
