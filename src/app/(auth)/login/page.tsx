import { redirect } from "next/navigation";
import { AuthForms } from "@/components/auth-forms";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  return <AuthForms linkError={params.auth_error === "invalid-link"} />;
}
