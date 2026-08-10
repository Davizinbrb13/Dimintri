"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Check,
  LoaderCircle,
  MailPlus,
  Pencil,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  inviteTeamMemberAction,
  revokeTeamMemberAction,
  updateTeamMemberNameAction,
} from "@/app/(app)/equipe/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { initialActionState, type TeamMember } from "@/lib/types";

export function TeamManager({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberPendingDeletion, setMemberPendingDeletion] = useState<TeamMember | null>(null);
  const [removedMemberIds, setRemovedMemberIds] = useState<Set<string>>(() => new Set());
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  const [updateMessage, setUpdateMessage] = useState("");
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
            <span role="columnheader" aria-label="Acoes" />
          </div>
          {updateMessage ? <p className="team-update-status" role="status">{updateMessage}</p> : null}
          <div role="rowgroup">
            {members.filter((member) => !removedMemberIds.has(member.id)).map((member) => {
              const displayedMember = {
                ...member,
                full_name: nameOverrides[member.id] ?? member.full_name,
              };

              return editingMemberId === member.id ? (
                <TeamMemberEditRow
                  key={member.id}
                  member={displayedMember}
                  onCancel={() => setEditingMemberId(null)}
                  onSaved={(fullName) => {
                    setNameOverrides((current) => ({ ...current, [member.id]: fullName }));
                    setEditingMemberId(null);
                    setUpdateMessage(`Nome de ${fullName} atualizado.`);
                    router.refresh();
                  }}
                />
              ) : (
                <TeamMemberViewRow
                  key={member.id}
                  member={displayedMember}
                  isCurrentUser={member.id === currentUserId}
                  onEdit={() => {
                    setUpdateMessage("");
                    setEditingMemberId(member.id);
                  }}
                  onDelete={() => {
                    setUpdateMessage("");
                    setMemberPendingDeletion(displayedMember);
                  }}
                />
              );
            })}
          </div>
        </div>
      </section>

      {memberPendingDeletion ? (
        <DeleteTeamMemberDialog
          member={memberPendingDeletion}
          onClose={() => setMemberPendingDeletion(null)}
          onDeleted={(message) => {
            setRemovedMemberIds((current) => new Set(current).add(memberPendingDeletion.id));
            setMemberPendingDeletion(null);
            setUpdateMessage(message);
            router.refresh();
          }}
        />
      ) : null}
    </main>
  );
}

function FieldError({ value }: { value?: string }) {
  return value ? <span className="field-error">{value}</span> : null;
}

function TeamMemberViewRow({
  member,
  isCurrentUser,
  onEdit,
  onDelete,
}: {
  member: TeamMember;
  isCurrentUser: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="team-list-row" role="row">
      <span className="team-member-name" role="cell" data-label="Pessoa">
        <span className="avatar avatar-small" aria-hidden="true"><UserRound size={15} /></span>
        <strong>{member.full_name}</strong>
      </span>
      <TeamMemberStaticCells member={member} />
      <span className="team-row-actions" role="cell" data-label="Acoes">
        <button
          className="icon-button icon-button-small"
          type="button"
          onClick={onEdit}
          aria-label={`Editar nome de ${member.full_name}`}
          title="Editar nome"
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button icon-button-small team-delete-trigger"
          type="button"
          onClick={onDelete}
          disabled={isCurrentUser}
          aria-label={isCurrentUser ? "Nao e possivel excluir a propria conta" : `Excluir conta de ${member.full_name}`}
          title={isCurrentUser ? "Sua conta nao pode ser excluida aqui" : "Excluir conta"}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

function TeamMemberEditRow({
  member,
  onCancel,
  onSaved,
}: {
  member: TeamMember;
  onCancel: () => void;
  onSaved: (fullName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState(updateTeamMemberNameAction, initialActionState);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    if (state.status !== "success" || !inputRef.current) return;
    onSaved(inputRef.current.value.trim().replace(/\s+/g, " "));
  }, [onSaved, state.status]);

  const fieldError = state.fieldErrors?.fullName?.[0];

  return (
    <form className="team-list-row team-list-row-editing" role="row" action={formAction}>
      <input type="hidden" name="memberId" value={member.id} />
      <span className="team-member-name team-member-name-editing" role="cell" data-label="Pessoa">
        <span className="avatar avatar-small" aria-hidden="true"><UserRound size={15} /></span>
        <span className="team-name-field">
          <input
            ref={inputRef}
            name="fullName"
            defaultValue={member.full_name}
            minLength={2}
            maxLength={120}
            required
            aria-label={`Nome de ${member.full_name}`}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? `member-name-error-${member.id}` : undefined}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              onCancel();
            }}
          />
          {fieldError ? <span id={`member-name-error-${member.id}`} className="field-error">{fieldError}</span> : null}
          {state.status === "error" && !fieldError ? <span className="field-error">{state.message}</span> : null}
        </span>
      </span>
      <TeamMemberStaticCells member={member} />
      <span className="team-row-actions" role="cell" data-label="Acoes">
        <NameEditorActions onCancel={onCancel} />
      </span>
    </form>
  );
}

function TeamMemberStaticCells({ member }: { member: TeamMember }) {
  return (
    <>
      <span role="cell" data-label="E-mail">{member.email ?? "Nao informado"}</span>
      <span role="cell" data-label="Perfil">
        <span className={`team-role team-role-${member.role}`}>
          {member.role === "admin" ? <ShieldCheck size={14} aria-hidden="true" /> : <UsersRound size={14} aria-hidden="true" />}
          {member.role === "admin" ? "Administrador" : "Tecnico de TI"}
        </span>
      </span>
      <span role="cell" data-label="Criada em">{formatDateTime(member.created_at)}</span>
    </>
  );
}

function NameEditorActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        className="icon-button icon-button-small team-name-save"
        type="submit"
        disabled={pending}
        aria-label="Salvar nome"
        title="Salvar nome"
      >
        {pending ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
      </button>
      <button
        className="icon-button icon-button-small"
        type="button"
        onClick={onCancel}
        disabled={pending}
        aria-label="Cancelar edicao"
        title="Cancelar"
      >
        <X size={17} aria-hidden="true" />
      </button>
    </>
  );
}

function DeleteTeamMemberDialog({
  member,
  onClose,
  onDeleted,
}: {
  member: TeamMember;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState(initialActionState);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function submit(formData: FormData) {
    setIsPending(true);
    const result = await revokeTeamMemberAction(initialActionState, formData);
    setState(result);
    setIsPending(false);

    if (result.status === "success") {
      dialogRef.current?.close();
      onDeleted(result.message);
    }
  }

  return (
    <dialog
      className="dialog team-delete-dialog"
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) dialogRef.current?.close();
      }}
    >
      <form action={submit} className="dialog-panel">
        <input type="hidden" name="memberId" value={member.id} />
        <div className="dialog-header">
          <div>
            <span className="eyebrow">Controle de acesso</span>
            <h2>Excluir conta</h2>
            <p>{member.full_name}</p>
          </div>
          <button
            className="icon-button"
            type="button"
            disabled={isPending}
            onClick={() => dialogRef.current?.close()}
            aria-label="Fechar"
            title="Fechar"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="dialog-body team-delete-body">
          <span className="team-delete-icon" aria-hidden="true">
            <TriangleAlert size={22} />
          </span>
          <div>
            <h3>Remover o acesso de {member.full_name}?</h3>
            <p>A conta nao podera mais entrar no NexusTI. Chamados e movimentacoes permanecerao no historico.</p>
            <small>{member.email ?? "E-mail nao informado"}</small>
          </div>
          {state.status === "error" ? (
            <p className="form-message form-message-error team-delete-error" role="alert">{state.message}</p>
          ) : null}
        </div>

        <div className="dialog-footer">
          <button
            className="button button-secondary"
            type="button"
            disabled={isPending}
            onClick={() => dialogRef.current?.close()}
          >
            Cancelar
          </button>
          <button className="button button-danger" type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}
            {isPending ? "Excluindo conta" : "Excluir conta"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
