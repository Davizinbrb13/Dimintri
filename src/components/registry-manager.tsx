"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building, Check, LoaderCircle, Pencil, Search, Trash2, TriangleAlert, UserPlus, X } from "lucide-react";
import {
  createRequesterAction,
  createSectorAction,
  deactivateRequesterAction,
  deactivateSectorAction,
  updateRequesterAction,
  updateSectorAction,
} from "@/app/(app)/cadastros/actions";
import { SubmitButton } from "@/components/submit-button";
import { EquipmentRegistry } from "@/components/equipment-registry";
import {
  initialActionState,
  type ActionState,
  type Campus,
  type EquipmentAsset,
  type EquipmentCategory,
  type EquipmentModel,
  type Requester,
  type Sector,
} from "@/lib/types";

type RegistryRemoval =
  | { kind: "requester"; record: Requester }
  | { kind: "sector"; record: Sector };

export function RegistryManager({
  requesters,
  sectors,
  categories,
  models,
  equipment,
  campuses,
}: {
  requesters: Requester[];
  sectors: Sector[];
  categories: EquipmentCategory[];
  models: EquipmentModel[];
  equipment: EquipmentAsset[];
  campuses: Campus[];
}) {
  const [query, setQuery] = useState("");
  const [editingRequester, setEditingRequester] = useState<Requester | null>(null);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<RegistryRemoval | null>(null);
  const normalized = query.toLocaleLowerCase("pt-BR").trim();
  const filteredRequesters = useMemo(
    () =>
      requesters.filter((item) =>
        `${item.registration} ${item.full_name}`.toLocaleLowerCase("pt-BR").includes(normalized),
      ),
    [normalized, requesters],
  );
  const filteredSectors = useMemo(
    () => sectors.filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(normalized)),
    [normalized, sectors],
  );

  return (
    <main className="workspace">
      <div className="page-heading-row compact-heading">
        <div>
          <p className="eyebrow">Base de apoio</p>
          <h1>Cadastros auxiliares</h1>
          <p>Mantenha os dados usados nos chamados e no inventario de equipamentos.</p>
        </div>
      </div>

      <div className="registry-toolbar">
        <div className="search-control">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar matricula, nome ou setor"
            aria-label="Buscar cadastros"
          />
        </div>
      </div>

      <section className="registry-grid">
        <RegistryPanel
          title="Solicitantes"
          description="A matricula identifica e preenche o nome no chamado."
          count={filteredRequesters.length}
          icon={<UserPlus size={20} aria-hidden="true" />}
          form={<RequesterForm />}
        >
          <div className="registry-list" role="list">
            {filteredRequesters.length ? filteredRequesters.map((requester) => (
              <div className="registry-row" key={requester.id} role="listitem">
                <strong>{requester.registration}</strong>
                <span>{requester.full_name}</span>
                <RegistryRowActions
                  label={requester.full_name}
                  onEdit={() => setEditingRequester(requester)}
                  onRemove={() => setPendingRemoval({ kind: "requester", record: requester })}
                />
              </div>
            )) : <EmptyRegistry />}
          </div>
        </RegistryPanel>

        <RegistryPanel
          title="Setores"
          description="Setores novos tambem podem nascer diretamente no chamado."
          count={filteredSectors.length}
          icon={<Building size={20} aria-hidden="true" />}
          form={<SectorForm />}
        >
          <div className="registry-list registry-list-single" role="list">
            {filteredSectors.length ? filteredSectors.map((sector) => (
              <div className="registry-row" key={sector.id} role="listitem">
                <span>{sector.name}</span>
                <small>#{sector.id}</small>
                <RegistryRowActions
                  label={sector.name}
                  onEdit={() => setEditingSector(sector)}
                  onRemove={() => setPendingRemoval({ kind: "sector", record: sector })}
                />
              </div>
            )) : <EmptyRegistry />}
          </div>
        </RegistryPanel>
      </section>

      <EquipmentRegistry
        equipment={equipment}
        categories={categories}
        models={models}
        campuses={campuses}
      />

      {editingRequester ? <RequesterEditDialog requester={editingRequester} onClose={() => setEditingRequester(null)} /> : null}
      {editingSector ? <SectorEditDialog sector={editingSector} onClose={() => setEditingSector(null)} /> : null}
      {pendingRemoval ? <RegistryRemovalDialog removal={pendingRemoval} onClose={() => setPendingRemoval(null)} /> : null}
    </main>
  );
}

function RegistryRowActions({ label, onEdit, onRemove }: { label: string; onEdit: () => void; onRemove: () => void }) {
  return (
    <span className="registry-row-actions">
      <button className="icon-button icon-button-small" type="button" onClick={onEdit} aria-label={`Editar ${label}`} title="Editar">
        <Pencil size={16} aria-hidden="true" />
      </button>
      <button className="icon-button icon-button-small registry-remove-trigger" type="button" onClick={onRemove} aria-label={`Remover ${label}`} title="Remover">
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </span>
  );
}

function RegistryPanel({
  title,
  description,
  count,
  icon,
  form,
  children,
}: {
  title: string;
  description: string;
  count: number;
  icon: React.ReactNode;
  form: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="registry-panel">
      <header>
        <span className="registry-icon">{icon}</span>
        <div><h2>{title}</h2><p>{description}</p></div>
        <span className="count-badge">{count}</span>
      </header>
      {form}
      {children}
    </div>
  );
}

function RequesterForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<ActionState>(initialActionState);

  async function submit(formData: FormData) {
    const result = await createRequesterAction(initialActionState, formData);
    setState(result);
    if (result.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }

  return (
    <form className="registry-form requester-form" action={submit} ref={formRef}>
      <div className="field">
        <label htmlFor="registration">Matricula</label>
        <input id="registration" name="registration" placeholder="Ex.: 20260001" required />
        <FieldError value={state.fieldErrors?.registration?.[0]} />
      </div>
      <div className="field">
        <label htmlFor="fullName">Nome completo</label>
        <input id="fullName" name="fullName" placeholder="Nome do solicitante" required />
        <FieldError value={state.fieldErrors?.fullName?.[0]} />
      </div>
      <SubmitButton className="button button-primary button-icon" pendingLabel="Cadastrando">
        <UserPlus size={18} aria-hidden="true" />
        <span>Cadastrar</span>
      </SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

function SectorForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<ActionState>(initialActionState);

  async function submit(formData: FormData) {
    const result = await createSectorAction(initialActionState, formData);
    setState(result);
    if (result.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }

  return (
    <form className="registry-form sector-form" action={submit} ref={formRef}>
      <div className="field">
        <label htmlFor="sector-name">Nome do setor</label>
        <input id="sector-name" name="name" placeholder="Ex.: Secretaria Academica" required />
        <FieldError value={state.fieldErrors?.name?.[0]} />
      </div>
      <SubmitButton className="button button-primary" pendingLabel="Cadastrando">
        <Building size={18} aria-hidden="true" />
        Cadastrar setor
      </SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

function FieldError({ value }: { value?: string }) {
  return value ? <span className="field-error">{value}</span> : null;
}

function ActionMessage({ state }: { state: ActionState }) {
  return state.message ? (
    <p className={`form-message form-message-${state.status}`} role="status">{state.message}</p>
  ) : null;
}

function EmptyRegistry() {
  return <p className="registry-empty">Nenhum cadastro encontrado.</p>;
}

function RequesterEditDialog({ requester, onClose }: { requester: Requester; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [state, setState] = useState<ActionState>(initialActionState);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  async function submit(formData: FormData) {
    setIsPending(true);
    const result = await updateRequesterAction(initialActionState, formData);
    setState(result);
    setIsPending(false);

    if (result.status === "success") {
      dialogRef.current?.close();
      router.refresh();
    }
  }

  return (
    <dialog className="dialog registry-dialog" ref={dialogRef} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget && !isPending) dialogRef.current?.close(); }}>
      <form action={submit} className="dialog-panel">
        <input type="hidden" name="requesterId" value={requester.id} />
        <DialogHeader eyebrow="Cadastro auxiliar" title="Editar solicitante" description="Altere os dados usados nos novos chamados e movimentacoes." onClose={() => dialogRef.current?.close()} disabled={isPending} />
        <div className="dialog-body form-stack">
          <div className="field">
            <label htmlFor={`requester-registration-${requester.id}`}>Matricula</label>
            <input id={`requester-registration-${requester.id}`} name="registration" defaultValue={requester.registration} maxLength={40} required aria-invalid={Boolean(state.fieldErrors?.registration)} />
            <FieldError value={state.fieldErrors?.registration?.[0]} />
          </div>
          <div className="field">
            <label htmlFor={`requester-name-${requester.id}`}>Nome completo</label>
            <input id={`requester-name-${requester.id}`} name="fullName" defaultValue={requester.full_name} maxLength={160} required aria-invalid={Boolean(state.fieldErrors?.fullName)} />
            <FieldError value={state.fieldErrors?.fullName?.[0]} />
          </div>
          <ActionMessage state={state} />
        </div>
        <DialogFooter onClose={() => dialogRef.current?.close()} isPending={isPending} submitLabel="Salvar alteracoes" />
      </form>
    </dialog>
  );
}

function SectorEditDialog({ sector, onClose }: { sector: Sector; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [state, setState] = useState<ActionState>(initialActionState);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  async function submit(formData: FormData) {
    setIsPending(true);
    const result = await updateSectorAction(initialActionState, formData);
    setState(result);
    setIsPending(false);

    if (result.status === "success") {
      dialogRef.current?.close();
      router.refresh();
    }
  }

  return (
    <dialog className="dialog registry-dialog" ref={dialogRef} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget && !isPending) dialogRef.current?.close(); }}>
      <form action={submit} className="dialog-panel">
        <input type="hidden" name="sectorId" value={sector.id} />
        <DialogHeader eyebrow="Cadastro auxiliar" title="Editar setor" description="A alteracao vale para os novos registros." onClose={() => dialogRef.current?.close()} disabled={isPending} />
        <div className="dialog-body form-stack">
          <div className="field">
            <label htmlFor={`sector-name-${sector.id}`}>Nome do setor</label>
            <input id={`sector-name-${sector.id}`} name="name" defaultValue={sector.name} maxLength={120} required aria-invalid={Boolean(state.fieldErrors?.name)} />
            <FieldError value={state.fieldErrors?.name?.[0]} />
          </div>
          <ActionMessage state={state} />
        </div>
        <DialogFooter onClose={() => dialogRef.current?.close()} isPending={isPending} submitLabel="Salvar alteracoes" />
      </form>
    </dialog>
  );
}

function RegistryRemovalDialog({ removal, onClose }: { removal: RegistryRemoval; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [state, setState] = useState<ActionState>(initialActionState);
  const [isPending, setIsPending] = useState(false);
  const isRequester = removal.kind === "requester";
  const name = isRequester ? removal.record.full_name : removal.record.name;
  const idField = isRequester ? "requesterId" : "sectorId";

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  async function submit(formData: FormData) {
    setIsPending(true);
    const result = isRequester
      ? await deactivateRequesterAction(initialActionState, formData)
      : await deactivateSectorAction(initialActionState, formData);
    setState(result);
    setIsPending(false);

    if (result.status === "success") {
      dialogRef.current?.close();
      router.refresh();
    }
  }

  return (
    <dialog className="dialog registry-delete-dialog" ref={dialogRef} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget && !isPending) dialogRef.current?.close(); }}>
      <form action={submit} className="dialog-panel">
        <input type="hidden" name={idField} value={removal.record.id} />
        <DialogHeader eyebrow="Cadastro auxiliar" title={`Remover ${isRequester ? "solicitante" : "setor"}`} description={name} onClose={() => dialogRef.current?.close()} disabled={isPending} />
        <div className="dialog-body registry-delete-body">
          <span className="registry-delete-icon" aria-hidden="true"><TriangleAlert size={22} /></span>
          <div>
            <h3>Remover {name} dos novos registros?</h3>
            <p>Os historicos de chamados e movimentacoes permanecem preservados.</p>
          </div>
          {state.status === "error" ? <ActionMessage state={state} /> : null}
        </div>
        <div className="dialog-footer">
          <button className="button button-secondary" type="button" disabled={isPending} onClick={() => dialogRef.current?.close()}>Cancelar</button>
          <button className="button button-danger" type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}
            {isPending ? "Removendo" : "Remover"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function DialogHeader({ eyebrow, title, description, onClose, disabled }: { eyebrow: string; title: string; description: string; onClose: () => void; disabled: boolean }) {
  return (
    <div className="dialog-header">
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
      <button className="icon-button" type="button" onClick={onClose} disabled={disabled} aria-label="Fechar" title="Fechar"><X size={20} aria-hidden="true" /></button>
    </div>
  );
}

function DialogFooter({ onClose, isPending, submitLabel }: { onClose: () => void; isPending: boolean; submitLabel: string }) {
  return (
    <div className="dialog-footer">
      <button className="button button-secondary" type="button" onClick={onClose} disabled={isPending}>Cancelar</button>
      <button className="button button-primary" type="submit" disabled={isPending}>
        {isPending ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
        {isPending ? "Salvando" : submitLabel}
      </button>
    </div>
  );
}
