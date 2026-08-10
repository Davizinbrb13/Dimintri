"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Building, Search, UserPlus } from "lucide-react";
import {
  createRequesterAction,
  createSectorAction,
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
    </main>
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
