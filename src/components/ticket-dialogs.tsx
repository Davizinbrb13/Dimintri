"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Hash,
  Save,
  X,
} from "lucide-react";
import {
  createTicketAction,
  updateTicketAction,
} from "@/app/(app)/dashboard/actions";
import { RequesterLookup } from "@/components/requester-lookup";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { initialActionState, type ActionState, type Campus, type Sector, type Ticket } from "@/lib/types";

export function NewTicketDialog({
  dialogRef,
  campuses,
  sectors,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  campuses: Campus[];
  sectors: Sector[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<ActionState>(initialActionState);
  const [resolved, setResolved] = useState(false);

  async function submit(formData: FormData) {
    const result = await createTicketAction(initialActionState, formData);
    setState(result);

    if (result.status === "success") {
      formRef.current?.reset();
      setResolved(false);
      dialogRef.current?.close();
      router.refresh();
    }
  }

  return (
    <dialog
      className="dialog dialog-wide"
      ref={dialogRef}
      onClose={() => {
        setState(initialActionState);
        setResolved(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <form ref={formRef} action={submit} className="dialog-panel">
        <DialogHeader
          eyebrow="Novo registro"
          title="Abrir chamado"
          description="Registre a ocorrencia e os dados do solicitante."
          onClose={() => dialogRef.current?.close()}
        />

        <div className="automatic-fields" aria-label="Campos automaticos">
          <span><Hash size={15} /> ID automatico</span>
          <span><CalendarClock size={15} /> Data e hora automaticas</span>
        </div>

        <div className="dialog-body form-grid">
          <div className="field">
            <label htmlFor="campusId">Campus</label>
            <div className="input-with-icon">
              <Building2 size={18} aria-hidden="true" />
              <select
                id="campusId"
                name="campusId"
                defaultValue=""
                aria-invalid={Boolean(state.fieldErrors?.campusId)}
                required
              >
                <option value="" disabled>Selecione</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>{campus.name}</option>
                ))}
              </select>
            </div>
            <FieldError value={state.fieldErrors?.campusId?.[0]} />
          </div>

          <RequesterLookup error={state.fieldErrors?.requesterRegistration?.[0]} />

          <div className="field form-span-2">
            <label htmlFor="sectorName">Setor da ocorrencia</label>
            <input
              id="sectorName"
              name="sectorName"
              list="sector-options"
              placeholder="Selecione ou digite um novo setor"
              aria-invalid={Boolean(state.fieldErrors?.sectorName)}
              required
            />
            <datalist id="sector-options">
              {sectors.map((sector) => <option key={sector.id} value={sector.name} />)}
            </datalist>
            <span className="field-help">Um setor novo sera cadastrado automaticamente.</span>
            <FieldError value={state.fieldErrors?.sectorName?.[0]} />
          </div>

          <div className="field form-span-2">
            <label htmlFor="reportedError">Erro informado pelo usuario</label>
            <textarea
              id="reportedError"
              name="reportedError"
              rows={4}
              placeholder="Descreva o que foi relatado, mensagens exibidas e quando o erro acontece."
              aria-invalid={Boolean(state.fieldErrors?.reportedError)}
              required
            />
            <FieldError value={state.fieldErrors?.reportedError?.[0]} />
          </div>

          <div className="field form-span-2">
            <label htmlFor="diagnosis">Diagnostico do tecnico</label>
            <textarea
              id="diagnosis"
              name="diagnosis"
              rows={3}
              placeholder="Pode ser preenchido agora ou durante o atendimento."
              aria-invalid={Boolean(state.fieldErrors?.diagnosis)}
            />
            <FieldError value={state.fieldErrors?.diagnosis?.[0]} />
          </div>

          <div className="field form-span-2">
            <label htmlFor="notes">Observacao</label>
            <textarea id="notes" name="notes" rows={3} placeholder="Informacoes adicionais, pecas ou proximos passos." />
          </div>

          <label className="switch-row form-span-2">
            <span>
              <strong>Chamado solucionado</strong>
              <small>Ao selecionar, informe a solucao aplicada.</small>
            </span>
            <input
              type="checkbox"
              name="resolved"
              checked={resolved}
              onChange={(event) => setResolved(event.target.checked)}
            />
            <span className="switch" aria-hidden="true" />
          </label>

          {resolved ? (
            <div className="field form-span-2">
              <label htmlFor="solution">Solucao aplicada</label>
              <textarea
                id="solution"
                name="solution"
                rows={4}
                placeholder="Descreva o que foi feito para solucionar o chamado."
                aria-invalid={Boolean(state.fieldErrors?.solution)}
                required
              />
              <FieldError value={state.fieldErrors?.solution?.[0]} />
            </div>
          ) : null}

          {state.message && state.status === "error" ? (
            <p className="form-message form-message-error form-span-2" role="alert">
              {state.message}
            </p>
          ) : null}
        </div>

        <div className="dialog-footer">
          <button className="button button-secondary" type="button" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <SubmitButton pendingLabel="Criando chamado">
            <ClipboardCheck size={18} aria-hidden="true" />
            Criar chamado
          </SubmitButton>
        </div>
      </form>
    </dialog>
  );
}

export function EditTicketDialog({
  ticket,
  onClose,
}: {
  ticket: Ticket;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<ActionState>(initialActionState);
  const [resolved, setResolved] = useState(ticket.resolved);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function submit(formData: FormData) {
    const result = await updateTicketAction(initialActionState, formData);
    setState(result);
    if (result.status === "success") {
      dialogRef.current?.close();
      router.refresh();
    }
  }

  return (
    <dialog
      className="dialog"
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <form action={submit} className="dialog-panel">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <input type="hidden" name="currentStatus" value={ticket.status} />
        <DialogHeader
          eyebrow={`Chamado #${ticket.id}`}
          title={ticket.requester.full_name}
          description={`${ticket.requester.registration} · ${ticket.sector.name}`}
          onClose={() => dialogRef.current?.close()}
        />

        <div className="ticket-summary-strip">
          <span><Building2 size={15} /> {ticket.campus.name}</span>
          <span><CalendarClock size={15} /> {formatDateTime(ticket.created_at)}</span>
        </div>

        <div className="dialog-body form-stack">
          <section className="reported-error-block">
            <span>Erro informado</span>
            <p>{ticket.reported_error}</p>
          </section>

          <div className="field">
            <label htmlFor={`diagnosis-${ticket.id}`}>Diagnostico do tecnico</label>
            <textarea
              id={`diagnosis-${ticket.id}`}
              name="diagnosis"
              rows={5}
              defaultValue={ticket.diagnosis ?? ""}
              placeholder="Registre a causa identificada e a solucao aplicada."
              aria-invalid={Boolean(state.fieldErrors?.diagnosis)}
            />
            <FieldError value={state.fieldErrors?.diagnosis?.[0]} />
          </div>

          <div className="field">
            <label htmlFor={`notes-${ticket.id}`}>Observacao</label>
            <textarea
              id={`notes-${ticket.id}`}
              name="notes"
              rows={3}
              defaultValue={ticket.notes ?? ""}
              placeholder="Pecas, retornos ou proximos passos."
            />
          </div>

          <label className="switch-row">
            <span>
              <strong>Solucionado</strong>
              <small>O card sera movido para a coluna de concluidos.</small>
            </span>
            <input
              type="checkbox"
              name="resolved"
              checked={resolved}
              onChange={(event) => setResolved(event.target.checked)}
            />
            <span className="switch" aria-hidden="true" />
          </label>

          {resolved ? (
            <div className="field">
              <label htmlFor={`solution-${ticket.id}`}>Solucao aplicada</label>
              <textarea
                id={`solution-${ticket.id}`}
                name="solution"
                rows={4}
                defaultValue={ticket.solution ?? ""}
                placeholder="Descreva o que foi feito para solucionar o chamado."
                aria-invalid={Boolean(state.fieldErrors?.solution)}
                required
              />
              <FieldError value={state.fieldErrors?.solution?.[0]} />
            </div>
          ) : (
            <input type="hidden" name="solution" value={ticket.solution ?? ""} />
          )}

          {state.message && state.status === "error" ? (
            <p className="form-message form-message-error" role="alert">{state.message}</p>
          ) : null}
        </div>

        <div className="dialog-footer">
          <button className="button button-secondary" type="button" onClick={() => dialogRef.current?.close()}>
            Cancelar
          </button>
          <SubmitButton pendingLabel="Salvando alteracoes">
            <Save size={18} aria-hidden="true" />
            Salvar alteracoes
          </SubmitButton>
        </div>
      </form>
    </dialog>
  );
}

export function ResolveTicketDialog({
  ticket,
  onClose,
  onResolve,
}: {
  ticket: Ticket;
  onClose: () => void;
  onResolve: (solution: string) => Promise<ActionState>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<ActionState>(initialActionState);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function submit(formData: FormData) {
    const solution = String(formData.get("solution") ?? "").trim();
    if (!solution) {
      setState({ status: "error", message: "Informe a solucao aplicada." });
      return;
    }

    setIsPending(true);
    const result = await onResolve(solution);
    setIsPending(false);
    setState(result);

    if (result.status === "success") {
      dialogRef.current?.close();
    }
  }

  return (
    <dialog
      className="dialog"
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) dialogRef.current?.close();
      }}
    >
      <form action={submit} className="dialog-panel">
        <DialogHeader
          eyebrow={`Concluir chamado #${ticket.id}`}
          title="Registrar solucao"
          description="Descreva a solucao aplicada antes de concluir o atendimento."
          onClose={() => {
            if (!isPending) dialogRef.current?.close();
          }}
        />

        <div className="ticket-summary-strip">
          <span><Building2 size={15} /> {ticket.campus.name}</span>
          <span>{ticket.requester.full_name}</span>
        </div>

        <div className="dialog-body form-stack">
          <div className="field">
            <label htmlFor={`resolve-solution-${ticket.id}`}>Solucao aplicada</label>
            <textarea
              id={`resolve-solution-${ticket.id}`}
              name="solution"
              rows={6}
              defaultValue={ticket.solution ?? ""}
              placeholder="Descreva o procedimento realizado e o resultado obtido."
              autoFocus
              required
            />
          </div>

          {state.status === "error" ? (
            <p className="form-message form-message-error" role="alert">{state.message}</p>
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
          <button className="button button-primary" type="submit" disabled={isPending}>
            <CheckCircle2 size={18} aria-hidden="true" />
            {isPending ? "Concluindo chamado" : "Concluir chamado"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function DialogHeader({
  eyebrow,
  title,
  description,
  onClose,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="dialog-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar" title="Fechar">
        <X size={20} />
      </button>
    </div>
  );
}

function FieldError({ value }: { value?: string }) {
  return value ? <span className="field-error">{value}</span> : null;
}
