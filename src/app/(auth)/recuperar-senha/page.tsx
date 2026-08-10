import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasswordRecoveryForm } from "@/components/auth-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default async function PasswordRecoveryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return <PasswordRecoveryForm />;
}
