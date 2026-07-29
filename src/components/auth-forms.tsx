"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, Send, UserRound } from "lucide-react";
import {
  resendConfirmationAction,
  signInAction,
  signUpAction,
} from "@/app/(auth)/login/actions";
import { initialActionState } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";

export function AuthForms() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [signInState, signInFormAction] = useActionState(signInAction, initialActionState);
  const [signUpState, signUpFormAction] = useActionState(signUpAction, initialActionState);
  const [resendState, resendFormAction] = useActionState(
    resendConfirmationAction,
    initialActionState,
  );
  const state = mode === "login" ? signInState : signUpState;

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand">
          <Image
            src="/brand/univassouras-horizontal.png"
            alt="Univassouras"
            width={310}
            height={84}
            priority
          />
          <span className="auth-product">DIMI</span>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">Demandas de Tecnologia da Informacao</p>
          <h1 id="auth-title">Acesse o painel da equipe</h1>
          <p>Organize solicitacoes, diagnosticos e solucoes em um unico fluxo.</p>
        </div>

        <div className="segmented-control" aria-label="Tipo de acesso">
          <button
            type="button"
            aria-pressed={mode === "login"}
            onClick={() => setMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => setMode("signup")}
          >
            Criar conta
          </button>
        </div>

        <form
          className="form-stack"
          action={mode === "login" ? signInFormAction : signUpFormAction}
        >
          {mode === "signup" ? (
            <Field
              id="fullName"
              name="fullName"
              label="Nome completo"
              icon={<UserRound size={18} aria-hidden="true" />}
              error={state.fieldErrors?.fullName?.[0]}
              autoComplete="name"
            />
          ) : null}

          <Field
            id="email"
            name="email"
            label="E-mail institucional"
            type="email"
            icon={<Mail size={18} aria-hidden="true" />}
            error={state.fieldErrors?.email?.[0]}
            autoComplete="email"
          />

          <div className="field">
            <label htmlFor="password">Senha</label>
            <div className="input-with-icon input-with-action">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                aria-invalid={Boolean(state.fieldErrors?.password)}
                aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
                required
              />
              <button
                className="icon-button icon-button-small"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {state.fieldErrors?.password?.[0] ? (
              <span className="field-error" id="password-error">
                {state.fieldErrors.password[0]}
              </span>
            ) : null}
          </div>

          {state.message ? (
            <p className={`form-message form-message-${state.status}`} role="status">
              {state.message}
            </p>
          ) : null}

          <SubmitButton className="button button-primary button-block">
            {mode === "login" ? "Entrar no DIMI" : "Criar minha conta"}
          </SubmitButton>

          {mode === "login" && signInState.requiresEmailConfirmation ? (
            <div className="form-stack form-stack-compact">
              <SubmitButton
                className="button button-secondary button-block"
                pendingLabel="Reenviando"
                formAction={resendFormAction}
                formNoValidate
              >
                <Send size={18} aria-hidden="true" />
                Reenviar confirmacao
              </SubmitButton>
              {resendState.message ? (
                <p
                  className={`form-message form-message-${resendState.status}`}
                  role="status"
                >
                  {resendState.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </form>

        <p className="auth-footnote">
          O primeiro cadastro recebe permissao administrativa. Os seguintes entram como tecnicos.
        </p>
      </section>
    </main>
  );
}

type FieldProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  icon: React.ReactNode;
  error?: string;
  autoComplete?: string;
};

function Field({ id, name, label, type = "text", icon, error, autoComplete }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-with-icon">
        {icon}
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required
        />
      </div>
      {error ? (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
