"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import {
  requestPasswordResetAction,
  signInAction,
  updatePasswordAction,
} from "@/app/(auth)/login/actions";
import { BrandLogo } from "@/components/brand-logo";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/types";

export function AuthForms({ linkError = false }: { linkError?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState(signInAction, initialActionState);

  return (
    <AuthFrame
      eyebrow="Acesso restrito"
      title="Acesse o painel da equipe"
      description="Entre com o e-mail convidado e sua senha pessoal."
      footnote="Novos acessos sao liberados somente por convite administrativo."
    >
      <form className="form-stack" action={formAction}>
        <Field
          id="email"
          name="email"
          label="E-mail institucional"
          type="email"
          icon={<Mail size={18} aria-hidden="true" />}
          error={state.fieldErrors?.email?.[0]}
          autoComplete="email"
        />

        <PasswordField
          id="password"
          name="password"
          label="Senha"
          autoComplete="current-password"
          showPassword={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
          error={state.fieldErrors?.password?.[0]}
        />

        {linkError ? (
          <p className="form-message form-message-error" role="alert">
            O link de acesso expirou ou ja foi utilizado. Solicite um novo convite ou recupere sua senha.
          </p>
        ) : null}

        {state.message ? (
          <p className={`form-message form-message-${state.status}`} role="status">
            {state.message}
          </p>
        ) : null}

        <div className="auth-form-links">
          <Link href="/recuperar-senha">Esqueci minha senha</Link>
        </div>

        <SubmitButton className="button button-primary button-block" pendingLabel="Entrando">
          Entrar no NexusTI
        </SubmitButton>
      </form>
    </AuthFrame>
  );
}

export function PasswordRecoveryForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialActionState);

  return (
    <AuthFrame
      eyebrow="Recuperacao de acesso"
      title="Redefina sua senha"
      description="Informe o e-mail utilizado no convite de acesso."
      footnote="O link de recuperacao e individual e possui validade limitada."
    >
      <form className="form-stack" action={formAction}>
        <Field
          id="recovery-email"
          name="email"
          label="E-mail institucional"
          type="email"
          icon={<Mail size={18} aria-hidden="true" />}
          error={state.fieldErrors?.email?.[0]}
          autoComplete="email"
        />

        {state.message ? (
          <p className={`form-message form-message-${state.status}`} role="status">
            {state.message}
          </p>
        ) : null}

        <SubmitButton className="button button-primary button-block" pendingLabel="Enviando">
          <KeyRound size={18} aria-hidden="true" /> Enviar link de recuperacao
        </SubmitButton>

        <Link className="auth-back-link" href="/login">
          <ArrowLeft size={17} aria-hidden="true" /> Voltar para o login
        </Link>
      </form>
    </AuthFrame>
  );
}

export function PasswordUpdateForm({ mode }: { mode: "invite" | "recovery" }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState(updatePasswordAction, initialActionState);
  const isInvite = mode === "invite";

  return (
    <AuthFrame
      eyebrow={isInvite ? "Convite confirmado" : "Acesso recuperado"}
      title={isInvite ? "Crie sua senha" : "Defina uma nova senha"}
      description="Use uma senha exclusiva para o NexusTI."
      footnote="Sua senha e processada pelo Supabase Auth e nunca e salva pelo NexusTI."
    >
      <form className="form-stack" action={formAction}>
        <div className="password-guidance">
          <ShieldCheck size={19} aria-hidden="true" />
          <span>Use pelo menos 8 caracteres. Uma frase longa e exclusiva funciona bem.</span>
        </div>

        <PasswordField
          id="new-password"
          name="password"
          label="Nova senha"
          autoComplete="new-password"
          showPassword={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
          error={state.fieldErrors?.password?.[0]}
          minLength={8}
        />

        <PasswordField
          id="password-confirmation"
          name="passwordConfirmation"
          label="Confirmar nova senha"
          autoComplete="new-password"
          showPassword={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
          error={state.fieldErrors?.passwordConfirmation?.[0]}
          minLength={8}
        />

        {state.message ? (
          <p className={`form-message form-message-${state.status}`} role="alert">
            {state.message}
          </p>
        ) : null}

        <SubmitButton className="button button-primary button-block" pendingLabel="Protegendo conta">
          <ShieldCheck size={18} aria-hidden="true" /> Salvar senha e acessar
        </SubmitButton>
      </form>
    </AuthFrame>
  );
}

function AuthFrame({
  eyebrow,
  title,
  description,
  footnote,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  footnote: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand">
          <BrandLogo className="auth-logo" priority />
        </div>

        <div className="auth-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h1 id="auth-title">{title}</h1>
          <p>{description}</p>
        </div>

        {children}
        <p className="auth-footnote">{footnote}</p>
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
      {error ? <span className="field-error" id={`${id}-error`}>{error}</span> : null}
    </div>
  );
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  showPassword,
  onToggle,
  error,
  minLength,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  showPassword: boolean;
  onToggle: () => void;
  error?: string;
  minLength?: number;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-with-icon input-with-action">
        <LockKeyhole size={18} aria-hidden="true" />
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          minLength={minLength}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required
        />
        <button
          className="icon-button icon-button-small"
          type="button"
          onClick={onToggle}
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          title={showPassword ? "Ocultar senha" : "Mostrar senha"}
        >
          {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {error ? <span className="field-error" id={`${id}-error`}>{error}</span> : null}
    </div>
  );
}
