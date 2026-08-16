"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Check, ListPlus, LoaderCircle, PackagePlus, Pencil, Search, Trash2, TriangleAlert, X } from "lucide-react";
import {
  deactivateEquipmentAction,
  registerEquipmentAction,
  updateEquipmentAction,
} from "@/app/(app)/cadastros/actions";
import { SubmitButton } from "@/components/submit-button";
import { equipmentStatusLabels } from "@/lib/equipment";
import {
  initialActionState,
  type ActionState,
  type Campus,
  type EquipmentAsset,
  type EquipmentCategory,
  type EquipmentModel,
} from "@/lib/types";

type RegistrationMode = "single" | "batch";

export function EquipmentRegistry({
  equipment,
  categories,
  models,
  campuses,
}: {
  equipment: EquipmentAsset[];
  categories: EquipmentCategory[];
  models: EquipmentModel[];
  campuses: Campus[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<RegistrationMode>("single");
  const [query, setQuery] = useState("");
  const [serials, setSerials] = useState("");
  const [state, setState] = useState<ActionState>(initialActionState);
  const [editingAsset, setEditingAsset] = useState<EquipmentAsset | null>(null);
  const [assetPendingRemoval, setAssetPendingRemoval] = useState<EquipmentAsset | null>(null);

  const filteredEquipment = useMemo(() => {
    const normalized = query.toLocaleLowerCase("pt-BR").trim();
    if (!normalized) return equipment;
    return equipment.filter((asset) =>
      [
        asset.serial_number,
        asset.model.name,
        asset.model.category?.name,
        asset.current_campus?.name,
        asset.current_sector?.name,
        asset.current_requester?.full_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalized),
    );
  }, [equipment, query]);

  const serialCount = serials
    .split(/[\r\n,;]+/)
    .map((serial) => serial.trim())
    .filter(Boolean).length;

  async function submit(formData: FormData) {
    const result = await registerEquipmentAction(initialActionState, formData);
    setState(result);
    if (result.status === "success") {
      formRef.current?.reset();
      setSerials("");
      router.refresh();
    }
  }

  return (
    <>
      <section className="equipment-registry">
      <header className="equipment-registry-header">
        <span className="registry-icon"><Boxes size={20} aria-hidden="true" /></span>
        <div>
          <h2>Equipamentos</h2>
          <p>O nome e a categoria sao compartilhados; cada unidade possui um serial unico.</p>
        </div>
        <span className="count-badge">{equipment.length}</span>
      </header>

      <div className="equipment-registry-content">
        <div className="equipment-form-column">
          <div className="segmented-control equipment-mode" aria-label="Modo de cadastro">
            <button type="button" aria-pressed={mode === "single"} onClick={() => setMode("single")}>
              <PackagePlus size={17} aria-hidden="true" /> Individual
            </button>
            <button type="button" aria-pressed={mode === "batch"} onClick={() => setMode("batch")}>
              <ListPlus size={17} aria-hidden="true" /> Em lote
            </button>
          </div>

          <form ref={formRef} action={submit} className="equipment-form form-stack">
            <div className="field">
              <label htmlFor={`equipment-model-${mode}`}>Nome do equipamento</label>
              <input
                id={`equipment-model-${mode}`}
                name="modelName"
                list="equipment-model-options"
                placeholder="Ex.: Tablet Samsung Galaxy Tab A9"
                aria-invalid={Boolean(state.fieldErrors?.modelName)}
                required
              />
              <datalist id="equipment-model-options">
                {models.map((model) => <option key={model.id} value={model.name} />)}
              </datalist>
              <FieldError value={state.fieldErrors?.modelName?.[0]} />
            </div>

            <div className="form-grid compact-form-grid">
              <div className="field">
                <label htmlFor={`equipment-category-${mode}`}>Categoria <span className="optional-label">Opcional</span></label>
                <input
                  id={`equipment-category-${mode}`}
                  name="categoryName"
                  list="equipment-category-options"
                  placeholder="Ex.: Tablet"
                  aria-invalid={Boolean(state.fieldErrors?.categoryName)}
                />
                <datalist id="equipment-category-options">
                  {categories.map((category) => <option key={category.id} value={category.name} />)}
                </datalist>
                <span className="field-help">Categorias novas sao criadas automaticamente.</span>
              </div>

              <div className="field">
                <label htmlFor={`equipment-campus-${mode}`}>Campus inicial <span className="optional-label">Opcional</span></label>
                <select id={`equipment-campus-${mode}`} name="initialCampusId" defaultValue="">
                  <option value="">Nao informado</option>
                  {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor={`equipment-serials-${mode}`}>
                {mode === "single" ? "Numero de serial" : "Numeros de serial"}
              </label>
              {mode === "single" ? (
                <input
                  id={`equipment-serials-${mode}`}
                  name="serials"
                  value={serials}
                  onChange={(event) => setSerials(event.target.value.toUpperCase())}
                  placeholder="Ex.: SN-A9-001"
                  aria-invalid={Boolean(state.fieldErrors?.serials)}
                  required
                />
              ) : (
                <textarea
                  id={`equipment-serials-${mode}`}
                  name="serials"
                  value={serials}
                  onChange={(event) => setSerials(event.target.value.toUpperCase())}
                  rows={7}
                  placeholder={"SN-A9-001\nSN-A9-002\nSN-A9-003"}
                  aria-invalid={Boolean(state.fieldErrors?.serials)}
                  required
                />
              )}
              <span className="field-help">
                {mode === "batch" ? `${serialCount} ${serialCount === 1 ? "serial identificado" : "seriais identificados"}. Use um por linha.` : "Letras, numeros e separadores comuns sao aceitos."}
              </span>
              <FieldError value={state.fieldErrors?.serials?.[0]} />
            </div>

            <div className="field">
              <label htmlFor={`equipment-notes-${mode}`}>Observacoes <span className="optional-label">Opcional</span></label>
              <textarea id={`equipment-notes-${mode}`} name="notes" rows={3} placeholder="Informacoes comuns a estes equipamentos." />
            </div>

            {state.message ? (
              <p className={`form-message form-message-${state.status}`} role="status">{state.message}</p>
            ) : null}

            <SubmitButton pendingLabel={mode === "batch" ? "Cadastrando lote" : "Cadastrando equipamento"}>
              {mode === "batch" ? <ListPlus size={18} aria-hidden="true" /> : <PackagePlus size={18} aria-hidden="true" />}
              {mode === "batch" ? "Cadastrar lote" : "Cadastrar equipamento"}
            </SubmitButton>
          </form>
        </div>

        <div className="equipment-list-column">
          <div className="equipment-list-toolbar">
            <div className="search-control">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar serial, nome, categoria ou local"
                aria-label="Buscar equipamentos"
              />
            </div>
          </div>

          <div className="equipment-table" role="table" aria-label="Equipamentos cadastrados">
            <div className="equipment-table-head" role="row">
              <span role="columnheader">Serial</span>
              <span role="columnheader">Equipamento</span>
              <span role="columnheader">Categoria</span>
              <span role="columnheader">Situacao</span>
              <span role="columnheader">Local</span>
              <span role="columnheader" aria-label="Acoes" />
            </div>
            <div className="equipment-table-body" role="rowgroup">
              {filteredEquipment.length ? filteredEquipment.map((asset) => (
                <div className="equipment-table-row" role="row" key={asset.id}>
                  <strong role="cell" data-label="Serial">{asset.serial_number}</strong>
                  <span role="cell" data-label="Equipamento">{asset.model.name}</span>
                  <span role="cell" data-label="Categoria">
                    <span className={`category-badge ${asset.model.category ? "" : "category-badge-empty"}`}>
                      {asset.model.category?.name ?? "Sem categoria"}
                    </span>
                  </span>
                  <span role="cell" data-label="Situacao">
                    <span className={`equipment-status status-${asset.status}`}>{equipmentStatusLabels[asset.status]}</span>
                  </span>
                  <span role="cell" data-label="Local">{equipmentLocation(asset)}</span>
                  <span className="equipment-row-actions" role="cell" data-label="Acoes">
                    <button className="icon-button icon-button-small" type="button" onClick={() => setEditingAsset(asset)} aria-label={`Editar ${asset.serial_number}`} title="Editar equipamento">
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button icon-button-small registry-remove-trigger"
                      type="button"
                      onClick={() => setAssetPendingRemoval(asset)}
                      disabled={!canDeactivateEquipment(asset)}
                      aria-label={canDeactivateEquipment(asset) ? `Remover ${asset.serial_number}` : "O equipamento precisa estar disponivel ou baixado para ser removido"}
                      title={canDeactivateEquipment(asset) ? "Remover equipamento" : "Disponibilize ou de baixa antes de remover"}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </span>
                </div>
              )) : (
                <p className="registry-empty">Nenhum equipamento encontrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      </section>

      {editingAsset ? <EquipmentEditDialog asset={editingAsset} models={models} onClose={() => setEditingAsset(null)} /> : null}
      {assetPendingRemoval ? <EquipmentRemovalDialog asset={assetPendingRemoval} onClose={() => setAssetPendingRemoval(null)} /> : null}
    </>
  );
}

function equipmentLocation(asset: EquipmentAsset) {
  return [asset.current_campus?.name, asset.current_sector?.name].filter(Boolean).join(" / ") || "Nao informado";
}

function FieldError({ value }: { value?: string }) {
  return value ? <span className="field-error">{value}</span> : null;
}

function canDeactivateEquipment(asset: EquipmentAsset) {
  return asset.status === "available" || asset.status === "retired";
}

function EquipmentEditDialog({ asset, models, onClose }: { asset: EquipmentAsset; models: EquipmentModel[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [state, setState] = useState<ActionState>(initialActionState);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  async function submit(formData: FormData) {
    setIsPending(true);
    const result = await updateEquipmentAction(initialActionState, formData);
    setState(result);
    setIsPending(false);

    if (result.status === "success") {
      dialogRef.current?.close();
      router.refresh();
    }
  }

  return (
    <dialog className="dialog registry-dialog" ref={dialogRef} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget && !isPending) dialogRef.current?.close(); }}>
      <form className="dialog-panel" action={submit}>
        <input type="hidden" name="assetId" value={asset.id} />
        <EquipmentDialogHeader title="Editar equipamento" description={`Serial atual: ${asset.serial_number}`} onClose={() => dialogRef.current?.close()} disabled={isPending} />
        <div className="dialog-body form-stack">
          <div className="field">
            <label htmlFor={`asset-model-${asset.id}`}>Nome do equipamento</label>
            <select id={`asset-model-${asset.id}`} name="modelId" defaultValue={asset.model.id} required aria-invalid={Boolean(state.fieldErrors?.modelId)}>
              {models.map((model) => <option key={model.id} value={model.id}>{model.name}{model.category ? ` - ${model.category.name}` : ""}</option>)}
            </select>
            <FieldError value={state.fieldErrors?.modelId?.[0]} />
          </div>
          <div className="field">
            <label htmlFor={`asset-serial-${asset.id}`}>Numero de serial</label>
            <input id={`asset-serial-${asset.id}`} name="serialNumber" defaultValue={asset.serial_number} maxLength={100} required aria-invalid={Boolean(state.fieldErrors?.serialNumber)} />
            <FieldError value={state.fieldErrors?.serialNumber?.[0]} />
          </div>
          <div className="field">
            <label htmlFor={`asset-notes-${asset.id}`}>Observacoes <span className="optional-label">Opcional</span></label>
            <textarea id={`asset-notes-${asset.id}`} name="notes" rows={4} defaultValue={asset.notes ?? ""} maxLength={2000} />
            <span className="field-help">Situacao e local sao atualizados pelas movimentacoes.</span>
          </div>
          {state.message ? <p className={`form-message form-message-${state.status}`} role="status">{state.message}</p> : null}
        </div>
        <EquipmentDialogFooter onClose={() => dialogRef.current?.close()} isPending={isPending} />
      </form>
    </dialog>
  );
}

function EquipmentRemovalDialog({ asset, onClose }: { asset: EquipmentAsset; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [state, setState] = useState<ActionState>(initialActionState);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  async function submit(formData: FormData) {
    setIsPending(true);
    const result = await deactivateEquipmentAction(initialActionState, formData);
    setState(result);
    setIsPending(false);

    if (result.status === "success") {
      dialogRef.current?.close();
      router.refresh();
    }
  }

  return (
    <dialog className="dialog registry-delete-dialog" ref={dialogRef} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget && !isPending) dialogRef.current?.close(); }}>
      <form className="dialog-panel" action={submit}>
        <input type="hidden" name="assetId" value={asset.id} />
        <EquipmentDialogHeader title="Remover equipamento" description={`${asset.model.name} - ${asset.serial_number}`} onClose={() => dialogRef.current?.close()} disabled={isPending} />
        <div className="dialog-body registry-delete-body">
          <span className="registry-delete-icon" aria-hidden="true"><TriangleAlert size={22} /></span>
          <div>
            <h3>Remover este equipamento do inventario ativo?</h3>
            <p>As movimentacoes anteriores permanecem preservadas no historico.</p>
          </div>
          {state.status === "error" ? <p className="form-message form-message-error" role="alert">{state.message}</p> : null}
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

function EquipmentDialogHeader({ title, description, onClose, disabled }: { title: string; description: string; onClose: () => void; disabled: boolean }) {
  return (
    <div className="dialog-header">
      <div><span className="eyebrow">Inventario</span><h2>{title}</h2><p>{description}</p></div>
      <button className="icon-button" type="button" onClick={onClose} disabled={disabled} aria-label="Fechar" title="Fechar"><X size={20} aria-hidden="true" /></button>
    </div>
  );
}

function EquipmentDialogFooter({ onClose, isPending }: { onClose: () => void; isPending: boolean }) {
  return (
    <div className="dialog-footer">
      <button className="button button-secondary" type="button" disabled={isPending} onClick={onClose}>Cancelar</button>
      <button className="button button-primary" type="submit" disabled={isPending}>
        {isPending ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
        {isPending ? "Salvando" : "Salvar alteracoes"}
      </button>
    </div>
  );
}
