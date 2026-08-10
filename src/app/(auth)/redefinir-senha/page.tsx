import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasswordUpdateForm } from "@/components/auth-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login?auth_error=invalid-link");
  }

  return <PasswordUpdateForm mode="recovery" />;
}
