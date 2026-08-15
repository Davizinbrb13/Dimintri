"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Boxes,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Hash,
  MapPin,
  PackageCheck,
  PackagePlus,
  Plus,
  Search,
  Send,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { registerEquipmentAction } from "@/app/(app)/cadastros/actions";
import { createMovementAction } from "@/app/(app)/movimentacoes/actions";
import { RequesterLookup } from "@/components/requester-lookup";
import { SubmitButton } from "@/components/submit-button";
import {
  canMoveEquipment,
  equipmentStatusLabels,
  movementTypeDescriptions,
  movementTypeLabels,
  movementTypes,
} from "@/lib/equipment";
import { formatDateTime } from "@/lib/format";
import {
  initialActionState,
  type ActionState,
  type Campus,
  type EquipmentAsset,
  type EquipmentCategory,
  type EquipmentModel,
  type EquipmentMovement,
  type EquipmentMovementType,
  type Profile,
  type Sector,
} from "@/lib/types";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
});

export function MovementManager({
  profile,
  movements,
  equipment,
  categories,
  models,
  campuses,
  sectors,
}: {
  profile: Profile;
  movements: EquipmentMovement[];
  equipment: EquipmentAsset[];
  categories: EquipmentCategory[];
  models: EquipmentModel[];
  campuses: Campus[];
  sectors: Sector[];
}) {
  const newDialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | EquipmentMovementType>("all");
  const [selectedMovement, setSelectedMovement] = useState<EquipmentMovement | null>(null);

  const filteredMovements = useMemo(() => {
    const normalized = query.toLocaleLowerCase("pt-BR").trim();
    return movements.filter((movement) => {
      if (typeFilter !== "all" && movement.movement_type !== typeFilter) return false;
      if (!normalized) return true;
      const searchable = [
        movement.id,
        movement.requester.registration,
        movement.requester.full_name,
        movement.technician?.full_name,
        movement.destination_campus?.name,
        movement.destination_sector?.name,
        ...movement.items.flatMap((item) => [item.asset.serial_number, item.asset.model.name, item.asset.model.category?.name]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return searchable.includes(normalized);
    });
  }, [movements, query, typeFilter]);

  const today = dateKeyFormatter.format(new Date());
  const movementsToday = movements.filter((movement) =>
    dateKeyFormatter.format(new Date(movement.created_at)) === today,
  ).length;

  return (
    <main className="workspace">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Controle patrimonial</p>
          <h1>Movimentacoes</h1>
          <p>Acompanhe entregas, devolucoes, transferencias e manutencoes.</p>
        </div>
        <button className="button button-accent" type="button" onClick={() => newDialogRef.current?.showModal()}>
          <Plus size={19} aria-hidden="true" /> Nova movimentacao
        </button>
      </div>

      <section className="metric-row movement-metrics" aria-label="Resumo dos equipamentos">
        <Metric icon={<ArrowLeftRight size={19} />} label="Movimentacoes" value={movements.length} />
        <Metric icon={<CalendarClock size={19} />} label="Registradas hoje" value={movementsToday} tone="warning" />
        <Metric icon={<Boxes size={19} />} label="Disponiveis" value={equipment.filter((asset) => asset.status === "available").length} tone="info" />
        <Metric icon={<PackageCheck size={19} />} label="Em uso" value={equipment.filter((asset) => asset.status === "assigned").length} tone="success" />
      </section>

      <div className="board-toolbar movement-toolbar">
        <div className="search-control">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar ID, serial, equipamento ou solicitante"
            aria-label="Buscar movimentacoes"
          />
        </div>
        <div className="filter-control">
          <ArrowLeftRight size={18} aria-hidden="true" />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} aria-label="Filtrar por tipo">
            <option value="all">Todos os tipos</option>
            {movementTypes.map((type) => <option key={type} value={type}>{movementTypeLabels[type]}</option>)}
          </select>
        </div>
      </div>

      <MovementList movements={filteredMovements} onOpen={setSelectedMovement} />

      <NewMovementDialog
        dialogRef={newDialogRef}
        profile={profile}
        equipment={equipment}
        categories={categories}
        models={models}
        campuses={campuses}
        sectors={sectors}
      />

      {selectedMovement ? <MovementDetailsDialog movement={selectedMovement} onClose={() => setSelectedMovement(null)} /> : null}
    </main>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "warning" | "info" | "success" }) {
  return (
    <div className={`metric ${tone ? `metric-${tone}` : ""}`}>
      <span className="metric-icon" aria-hidden="true">{icon}</span>
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  );
}

function MovementList({ movements, onOpen }: { movements: EquipmentMovement[]; onOpen: (movement: EquipmentMovement) => void }) {
  if (!movements.length) {
    return (
      <div className="movement-empty">
        <ArrowLeftRight size={30} aria-hidden="true" />
        <strong>Nenhuma movimentacao encontrada</strong>
        <span>Os registros aparecerao aqui assim que forem criados.</span>
      </div>
    );
  }

  return (
    <div className="movement-list">
      <div className="movement-list-head" aria-hidden="true">
        <span>ID</span><span>Data e hora</span><span>Tipo</span><span>Solicitante</span><span>Equipamentos</span><span>Destino</span><span>Tecnico</span><span />
      </div>
      <div className="movement-list-body">
        {movements.map((movement) => (
          <button className="movement-list-row" type="button" key={movement.id} onClick={() => onOpen(movement)}>
            <strong data-label="ID">#{movement.id}</strong>
            <span data-label="Data e hora">{formatDateTime(movement.created_at)}</span>
            <span data-label="Tipo"><MovementTypeBadge type={movement.movement_type} /></span>
            <span className="movement-requester" data-label="Solicitante"><strong>{movement.requester.full_name}</strong><small>{movement.requester.registration}</small></span>
            <span className="movement-equipment-summary" data-label="Equipamentos">{equipmentSummary(movement)}</span>
            <span data-label="Destino">{movementDestination(movement)}</span>
            <span data-label="Tecnico">{movementTechnicianName(movement)}</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

function NewMovementDialog({
  dialogRef,
  profile,
  equipment,
  categories,
  models,
  campuses,
  sectors,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  profile: Profile;
  equipment: EquipmentAsset[];
  categories: EquipmentCategory[];
  models: EquipmentModel[];
  campuses: Campus[];
  sectors: Sector[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const quickEquipmentRef = useRef<HTMLDetailsElement>(null);
  const [state, setState] = useState<ActionState>(initialActionState);
  const [movementType, setMovementType] = useState<EquipmentMovementType>("delivery");
  const [assetQuery, setAssetQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState(equipment);
  const [quickState, setQuickState] = useState<ActionState>(initialActionState);
  const [quickPending, setQuickPending] = useState(false);
  const [quickFields, setQuickFields] = useState({ modelName: "", categoryName: "", serial: "", campusId: "" });

  useEffect(() => setAvailableEquipment(equipment), [equipment]);

  const visibleEquipment = useMemo(() => {
    const normalized = assetQuery.toLocaleLowerCase("pt-BR").trim();
    return availableEquipment.filter((asset) =>
      !normalized || `${asset.serial_number} ${asset.model.name} ${asset.model.category?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalized),
    );
  }, [assetQuery, availableEquipment]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hasRegisteredEquipment = availableEquipment.length > 0;

  function reset() {
    setState(initialActionState);
    setMovementType("delivery");
    setAssetQuery("");
    setSelectedIds([]);
    setQuickState(initialActionState);
    setQuickFields({ modelName: "", categoryName: "", serial: "", campusId: "" });
    formRef.current?.reset();
  }

  async function submit(formData: FormData) {
    const result = await createMovementAction(initialActionState, formData);
    setState(result);
    if (result.status === "success") {
      dialogRef.current?.close();
      router.refresh();
    }
  }

  async function quickRegister() {
    const formData = new FormData();
    formData.set("modelName", quickFields.modelName);
    formData.set("categoryName", quickFields.categoryName);
    formData.set("serials", quickFields.serial);
    formData.set("initialCampusId", quickFields.campusId);
    formData.set("notes", "");
    setQuickPending(true);
    const result = await registerEquipmentAction(initialActionState, formData);
    setQuickPending(false);
    setQuickState(result);
    if (result.status === "success" && result.equipment) {
      setAvailableEquipment((current) => [result.equipment!, ...current]);
      setSelectedIds((current) => [...current, result.equipment!.id]);
      setQuickFields({ modelName: "", categoryName: "", serial: "", campusId: "" });
    }
  }

  function revealQuickRegistration() {
    if (!quickEquipmentRef.current) return;
    quickEquipmentRef.current.open = true;
    quickEquipmentRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <dialog
      className="dialog dialog-wide movement-dialog"
      ref={dialogRef}
      onClose={reset}
      onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}
    >
      <form ref={formRef} action={submit} className="dialog-panel">
        <DialogHeader eyebrow="Novo registro" title="Nova movimentacao" description="Selecione o tipo, o solicitante e um ou mais equipamentos." onClose={() => dialogRef.current?.close()} />
        <div className="automatic-fields" aria-label="Campos automaticos">
          <span><Hash size={15} /> ID automatico</span>
          <span><CalendarClock size={15} /> Data e hora automaticas</span>
          <span><UserRound size={15} /> {profile.full_name}</span>
        </div>

        <div className="dialog-body form-stack">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="movementType">Tipo da movimentacao</label>
              <select
                id="movementType"
                name="movementType"
                value={movementType}
                onChange={(event) => {
                  setMovementType(event.target.value as EquipmentMovementType);
                  setSelectedIds([]);
                }}
              >
                {movementTypes.map((type) => (
                  <option key={type} value={type} disabled={type === "retirement" && profile.role !== "admin"}>
                    {movementTypeLabels[type]}
                  </option>
                ))}
              </select>
              <span className="field-help">{movementTypeDescriptions[movementType]}</span>
            </div>
            <RequesterLookup error={state.fieldErrors?.requesterRegistration?.[0]} />
          </div>

          {movementType !== "retirement" ? (
            <div className="form-grid">
              <div className="field">
                <label htmlFor="destinationCampusId">Campus de destino</label>
                <select id="destinationCampusId" name="destinationCampusId" defaultValue="" aria-invalid={Boolean(state.fieldErrors?.destinationCampusId)} required>
                  <option value="" disabled>Selecione</option>
                  {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                </select>
                <FieldError value={state.fieldErrors?.destinationCampusId?.[0]} />
              </div>
              <div className="field">
                <label htmlFor="destinationSectorName">Setor de destino <span className="optional-label">Opcional</span></label>
                <input id="destinationSectorName" name="destinationSectorName" list="movement-sector-options" placeholder="Selecione ou digite um setor" />
                <datalist id="movement-sector-options">
                  {sectors.map((sector) => <option key={sector.id} value={sector.name} />)}
                </datalist>
              </div>
            </div>
          ) : (
            <input type="hidden" name="destinationCampusId" value="" />
          )}

          <section className={`equipment-picker ${hasRegisteredEquipment ? "" : "equipment-picker-empty"}`} aria-labelledby="equipment-picker-title">
            <header>
              <div><strong id="equipment-picker-title">Equipamentos</strong><span>Selecione as unidades pelo serial.</span></div>
              <span className="selection-count">{selectedIds.length} selecionado{selectedIds.length === 1 ? "" : "s"}</span>
            </header>
            <div className="equipment-picker-search input-with-icon">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={assetQuery}
                onChange={(event) => setAssetQuery(event.target.value)}
                placeholder={hasRegisteredEquipment ? "Buscar por serial, nome ou categoria" : "Nenhum equipamento cadastrado"}
                aria-label="Buscar equipamentos para movimentar"
                disabled={!hasRegisteredEquipment}
              />
            </div>
            <div className="equipment-picker-list">
              {!hasRegisteredEquipment ? (
                <div className="equipment-picker-empty-state">
                  <Boxes size={23} aria-hidden="true" />
                  <div>
                    <strong>Nenhum equipamento cadastrado</strong>
                    <span>Cadastre a primeira unidade para inclui-la nesta movimentacao.</span>
                  </div>
                  {movementType !== "return" ? (
                    <button className="button button-secondary" type="button" onClick={revealQuickRegistration}>
                      <PackagePlus size={17} aria-hidden="true" /> Cadastrar primeiro equipamento
                    </button>
                  ) : null}
                </div>
              ) : visibleEquipment.length ? visibleEquipment.map((asset) => {
                const compatible = canMoveEquipment(asset.status, movementType);
                const checked = selectedIdSet.has(asset.id);
                return (
                  <label className={`equipment-option ${compatible ? "" : "equipment-option-disabled"}`} key={asset.id}>
                    <input
                      type="checkbox"
                      name="assetIds"
                      value={asset.id}
                      checked={checked}
                      disabled={!compatible}
                      onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, asset.id] : current.filter((id) => id !== asset.id))}
                    />
                    <span className="equipment-checkbox" aria-hidden="true"><CircleCheck size={17} /></span>
                    <span><strong>{asset.serial_number}</strong><small>{asset.model.name}</small></span>
                    <span className={`equipment-status status-${asset.status}`}>{equipmentStatusLabels[asset.status]}</span>
                  </label>
                );
              }) : (
                <div className="equipment-picker-empty-state">
                  <Search size={22} aria-hidden="true" />
                  <div><strong>Nenhum resultado</strong><span>Tente buscar por outro nome, serial ou categoria.</span></div>
                  <button className="button button-secondary" type="button" onClick={() => setAssetQuery("")}>Limpar busca</button>
                </div>
              )}
            </div>
            <FieldError value={state.fieldErrors?.assetIds?.[0]} />
          </section>

          {movementType !== "return" ? (
            <details className="quick-equipment" ref={quickEquipmentRef}>
              <summary><PackagePlus size={18} aria-hidden="true" /> Equipamento ainda nao cadastrado</summary>
              <div className="quick-equipment-body">
                <p>Cadastre uma unidade agora. O novo equipamento sera selecionado automaticamente.</p>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="quickModelName">Nome do equipamento</label>
                  <input id="quickModelName" list="quick-model-options" value={quickFields.modelName} onChange={(event) => setQuickFields((current) => ({ ...current, modelName: event.target.value }))} placeholder="Ex.: Notebook Dell Latitude" />
                  <datalist id="quick-model-options">{models.map((model) => <option key={model.id} value={model.name} />)}</datalist>
                </div>
                <div className="field">
                  <label htmlFor="quickSerial">Numero de serial</label>
                  <input id="quickSerial" value={quickFields.serial} onChange={(event) => setQuickFields((current) => ({ ...current, serial: event.target.value.toUpperCase() }))} placeholder="Ex.: DL-2026-001" />
                </div>
                <div className="field">
                  <label htmlFor="quickCategory">Categoria <span className="optional-label">Opcional</span></label>
                  <input id="quickCategory" list="quick-category-options" value={quickFields.categoryName} onChange={(event) => setQuickFields((current) => ({ ...current, categoryName: event.target.value }))} placeholder="Ex.: Notebook" />
                  <datalist id="quick-category-options">{categories.map((category) => <option key={category.id} value={category.name} />)}</datalist>
                </div>
                <div className="field">
                  <label htmlFor="quickCampus">Campus inicial <span className="optional-label">Opcional</span></label>
                  <select id="quickCampus" value={quickFields.campusId} onChange={(event) => setQuickFields((current) => ({ ...current, campusId: event.target.value }))}>
                    <option value="">Nao informado</option>
                    {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                  </select>
                </div>
              </div>
              {quickState.message ? <p className={`form-message form-message-${quickState.status}`} role="status">{quickState.message}</p> : null}
              <button className="button button-secondary" type="button" disabled={quickPending} onClick={quickRegister}>
                <PackagePlus size={18} aria-hidden="true" /> {quickPending ? "Cadastrando" : "Cadastrar e selecionar"}
              </button>
              </div>
            </details>
          ) : null}

          <div className="field">
            <label htmlFor="movementNotes">Observacoes <span className="optional-label">Opcional</span></label>
            <textarea id="movementNotes" name="notes" rows={4} placeholder="Motivo, referencia ou informacoes adicionais sobre a movimentacao." />
          </div>

          {state.status === "error" ? <p className="form-message form-message-error" role="alert">{state.message}</p> : null}
        </div>

        <div className="dialog-footer">
          <button className="button button-secondary" type="button" onClick={() => dialogRef.current?.close()}>Cancelar</button>
          <SubmitButton pendingLabel="Registrando movimentacao">
            <Send size={18} aria-hidden="true" /> Registrar movimentacao
          </SubmitButton>
        </div>
      </form>
    </dialog>
  );
}

function MovementDetailsDialog({ movement, onClose }: { movement: EquipmentMovement; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, []);

  return (
    <dialog className="dialog dialog-wide" ref={dialogRef} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
      <div className="dialog-panel">
        <DialogHeader eyebrow={`Movimentacao #${movement.id}`} title={movementTypeLabels[movement.movement_type]} description={`${movement.requester.full_name} - ${movement.requester.registration}`} onClose={() => dialogRef.current?.close()} />
        <div className="ticket-summary-strip">
          <span><CalendarClock size={15} /> {formatDateTime(movement.created_at)}</span>
          <span><UserRound size={15} /> {movementTechnicianName(movement)}</span>
          <span><MapPin size={15} /> {movementDestination(movement)}</span>
        </div>
        <div className="dialog-body form-stack">
          <section className="movement-detail-section">
            <h3>Equipamentos movimentados</h3>
            <div className="movement-detail-items">
              {movement.items.map((item) => (
                <article key={item.id}>
                  <span className="movement-detail-icon"><Boxes size={18} aria-hidden="true" /></span>
                  <div><strong>{item.asset.model.name}</strong><span>Serial {item.asset.serial_number}</span></div>
                  <span className="category-badge">{item.asset.model.category?.name ?? "Sem categoria"}</span>
                  <small>{movementOrigin(item)} <ChevronRight size={13} aria-hidden="true" /> {movementDestination(movement)}</small>
                </article>
              ))}
            </div>
          </section>
          {movement.notes ? (
            <section className="reported-error-block"><span>Observacoes</span><p>{movement.notes}</p></section>
          ) : null}
        </div>
        <div className="dialog-footer">
          <button className="button button-primary" type="button" onClick={() => dialogRef.current?.close()}>Fechar</button>
        </div>
      </div>
    </dialog>
  );
}

function DialogHeader({ eyebrow, title, description, onClose }: { eyebrow: string; title: string; description: string; onClose: () => void }) {
  return (
    <div className="dialog-header">
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
      <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar" title="Fechar"><X size={20} /></button>
    </div>
  );
}

function MovementTypeBadge({ type }: { type: EquipmentMovementType }) {
  const Icon = type === "maintenance" ? Wrench : type === "delivery" ? Send : ArrowLeftRight;
  return <span className={`movement-type movement-type-${type}`}><Icon size={14} aria-hidden="true" />{movementTypeLabels[type]}</span>;
}

function movementDestination(movement: EquipmentMovement) {
  if (movement.movement_type === "retirement") return "Baixa do inventario";
  return [movement.destination_campus?.name, movement.destination_sector?.name].filter(Boolean).join(" / ") || "Nao informado";
}

function movementTechnicianName(movement: EquipmentMovement) {
  return movement.technician?.full_name ?? "Tecnico indisponivel";
}

function movementOrigin(item: EquipmentMovement["items"][number]) {
  return [item.origin_campus?.name, item.origin_sector?.name, item.origin_requester?.full_name].filter(Boolean).join(" / ") || "Origem nao informada";
}

function equipmentSummary(movement: EquipmentMovement) {
  const first = movement.items[0];
  if (!first) return "Nenhum equipamento";
  if (movement.items.length === 1) return `${first.asset.model.name} - ${first.asset.serial_number}`;
  return `${first.asset.model.name} e mais ${movement.items.length - 1}`;
}

function FieldError({ value }: { value?: string }) {
  return value ? <span className="field-error">{value}</span> : null;
}
