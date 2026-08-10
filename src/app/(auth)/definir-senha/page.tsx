import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasswordUpdateForm } from "@/components/auth-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Criar senha",
};

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login?auth_error=invalid-link");
  }

  return <PasswordUpdateForm mode="invite" />;
}
