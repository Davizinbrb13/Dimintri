"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { MailPlus, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { inviteTeamMemberAction } from "@/app/(app)/equipe/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { initialActionState, type TeamMember } from "@/lib/types";

export function TeamManager({ members }: { members: TeamMember[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(inviteTeamMemberAction, initialActionState);

  useEffect(() => {
    if (state.status !== "success") return;
    formRef.current?.reset();
    router.refresh();
  }, [router, state.status]);

  return (
    <main className="workspace">
      <div className="page-heading-row compact-heading">
        <div>
          <p className="eyebrow">Controle de acesso</p>
          <h1>Equipe</h1>
          <p>Convide membros e acompanhe as contas autorizadas no NexusTI.</p>
        </div>
      </div>

      <section className="team-registry" aria-labelledby="team-title">
        <header className="team-registry-header">
          <span className="registry-icon"><MailPlus size={20} aria-hidden="true" /></span>
          <div>
            <h2 id="team-title">Novo convite</h2>
            <p>Cada pessoa define a propria senha pelo link recebido por e-mail.</p>
          </div>
        </header>

        <form className="team-invite-form" action={formAction} ref={formRef}>
          <div className="field">
            <label htmlFor="member-full-name">Nome completo</label>
            <input id="member-full-name" name="fullName" autoComplete="name" required />
            <FieldError value={state.fieldErrors?.fullName?.[0]} />
          </div>
          <div className="field">
            <label htmlFor="member-email">E-mail</label>
            <input id="member-email" name="email" type="email" autoComplete="email" required />
            <FieldError value={state.fieldErrors?.email?.[0]} />
          </div>
          <div className="field">
            <label htmlFor="member-role">Perfil de acesso</label>
            <select id="member-role" name="role" defaultValue="technician">
              <option value="technician">Tecnico de TI</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <SubmitButton className="button button-primary team-invite-button" pendingLabel="Enviando convite">
            <MailPlus size={18} aria-hidden="true" /> Enviar convite
          </SubmitButton>
          {state.message ? (
            <p className={`form-message form-message-${state.status}`} role="status">{state.message}</p>
          ) : null}
        </form>

        <div className="team-list" role="table" aria-label="Contas da equipe">
          <div className="team-list-head" role="row">
            <span role="columnheader">Pessoa</span>
            <span role="columnheader">E-mail</span>
            <span role="columnheader">Perfil</span>
            <span role="columnheader">Criada em</span>
          </div>
          <div role="rowgroup">
            {members.map((member) => (
              <div className="team-list-row" role="row" key={member.id}>
                <span className="team-member-name" role="cell" data-label="Pessoa">
                  <span className="avatar avatar-small" aria-hidden="true"><UserRound size={15} /></span>
                  <strong>{member.full_name}</strong>
                </span>
                <span role="cell" data-label="E-mail">{member.email ?? "Nao informado"}</span>
                <span role="cell" data-label="Perfil">
                  <span className={`team-role team-role-${member.role}`}>
                    {member.role === "admin" ? <ShieldCheck size={14} aria-hidden="true" /> : <UsersRound size={14} aria-hidden="true" />}
                    {member.role === "admin" ? "Administrador" : "Tecnico de TI"}
                  </span>
                </span>
                <span role="cell" data-label="Criada em">{formatDateTime(member.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function FieldError({ value }: { value?: string }) {
  return value ? <span className="field-error">{value}</span> : null;
}
