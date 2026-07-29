"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "button button-primary",
  pendingLabel = "Salvando",
  formAction,
  formNoValidate,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  formAction?: (formData: FormData) => void;
  formNoValidate?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      formAction={formAction}
      formNoValidate={formNoValidate}
    >
      {pending ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
