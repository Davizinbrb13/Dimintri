import { redirect } from "next/navigation";
import { AuthForms } from "@/components/auth-forms";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return <AuthForms />;
}
