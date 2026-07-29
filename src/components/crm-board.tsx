"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleDot,
  Clock3,
  Filter,
  GripVertical,
  Inbox,
  Plus,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import { moveTicketAction } from "@/app/(app)/dashboard/actions";
import { EditTicketDialog, NewTicketDialog, ResolveTicketDialog } from "@/components/ticket-dialogs";
import { formatDateTime, initials } from "@/lib/format";
import type { Campus, Profile, Sector, Ticket, TicketStatus } from "@/lib/types";

type BoardScope = "team" | "mine";
type LaneId = TicketStatus;
type MoveNotice = { tone: "success" | "error"; message: string };

const lanes: Array<{
  id: LaneId;
  label: string;
  description: string;
  icon: typeof CircleDot;
}> = [
  { id: "new", label: "Novos", description: "Aguardando diagnostico", icon: CircleDot },
  { id: "progress", label: "Em atendimento", description: "Diagnostico em andamento", icon: Wrench },
  { id: "resolved", label: "Solucionados", description: "Atendimentos concluidos", icon: CheckCircle2 },
];

export function CrmBoard({
  profile,
  tickets,
  campuses,
  sectors,
}: {
  profile: Profile;
  tickets: Ticket[];
  campuses: Campus[];
  sectors: Sector[];
}) {
  const router = useRouter();
  const newDialogRef = useRef<HTMLDialogElement>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resolutionTicket, setResolutionTicket] = useState<Ticket | null>(null);
  const [boardTickets, setBoardTickets] = useState(tickets);
  const [query, setQuery] = useState("");
  const [campusId, setCampusId] = useState("all");
  const [scope, setScope] = useState<BoardScope>(profile.role === "admin" ? "team" : "mine");
  const [draggedTicketId, setDraggedTicketId] = useState<number | null>(null);
  const [dropLane, setDropLane] = useState<LaneId | null>(null);
  const [movingTicketId, setMovingTicketId] = useState<number | null>(null);
  const [moveNotice, setMoveNotice] = useState<MoveNotice | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );

  useEffect(() => {
    setBoardTickets(tickets);
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const normalizedQuery = normalize(query);
    return boardTickets.filter((ticket) => {
      const scopeMatches = scope === "team" || ticket.technician_id === profile.id;
      const campusMatches = campusId === "all" || String(ticket.campus.id) === campusId;
      const searchMatches =
        !normalizedQuery ||
        [
          String(ticket.id),
          ticket.requester.registration,
          ticket.requester.full_name,
          ticket.sector.name,
          ticket.reported_error,
          ticket.technician.full_name,
        ].some((value) => normalize(value).includes(normalizedQuery));

      return scopeMatches && campusMatches && searchMatches;
    });
  }, [boardTickets, campusId, profile.id, query, scope]);

  const grouped = useMemo(
    () => ({
      new: filteredTickets.filter((ticket) => ticket.status === "new"),
      progress: filteredTickets.filter((ticket) => ticket.status === "progress"),
      resolved: filteredTickets.filter((ticket) => ticket.status === "resolved"),
    }),
    [filteredTickets],
  );

  const openCount = grouped.new.length + grouped.progress.length;
  const resolvedRate = filteredTickets.length
    ? Math.round((grouped.resolved.length / filteredTickets.length) * 100)
    : 0;
  const draggedTicket = boardTickets.find((ticket) => ticket.id === draggedTicketId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setDraggedTicketId(Number(event.active.id));
    setMoveNotice(null);
  }

  function handleDragOver(event: DragOverEvent) {
    const nextStatus = String(event.over?.id ?? "");
    setDropLane(isLaneId(nextStatus) ? nextStatus : null);
  }

  function handleDragCancel() {
    setDraggedTicketId(null);
    setDropLane(null);
  }

  async function moveTicket(ticket: Ticket, nextStatus: LaneId, solution?: string) {
    const previousTicket = ticket;
    setMovingTicketId(ticket.id);
    setBoardTickets((current) => current.map((item) => (
      item.id === ticket.id
        ? {
            ...item,
            status: nextStatus,
            solution: nextStatus === "resolved" ? solution ?? item.solution : item.solution,
            resolved: nextStatus === "resolved",
            resolved_at: nextStatus === "resolved" ? new Date().toISOString() : null,
          }
        : item
    )));

    const result = await moveTicketAction(ticket.id, nextStatus, solution);
    if (result.status === "error") {
      setBoardTickets((current) => current.map((item) => (
        item.id === previousTicket.id ? previousTicket : item
      )));
      setMoveNotice({ tone: "error", message: result.message });
    } else {
      setMoveNotice({ tone: "success", message: result.message });
      router.refresh();
    }

    setMovingTicketId(null);
    return result;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const ticketId = Number(event.active.id);
    const nextStatusValue = String(event.over?.id ?? "");
    const ticket = boardTickets.find((item) => item.id === ticketId);
    setDraggedTicketId(null);
    setDropLane(null);

    if (!isLaneId(nextStatusValue)) return;
    const nextStatus = nextStatusValue;
    if (!ticket || ticket.status === nextStatus || movingTicketId !== null) return;

    if (nextStatus === "resolved") {
      setResolutionTicket(ticket);
      return;
    }

    await moveTicket(ticket, nextStatus);
  }

  return (
    <main className="workspace">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Gestao de chamados</p>
          <h1>Painel de demandas</h1>
          <p>Acompanhe o atendimento da entrada ate a solucao.</p>
        </div>
        <button className="button button-accent" type="button" onClick={() => newDialogRef.current?.showModal()}>
          <Plus size={18} aria-hidden="true" />
          Novo chamado
        </button>
      </div>

      <section className="metric-row" aria-label="Resumo dos chamados">
        <Metric icon={Inbox} label="Total no filtro" value={filteredTickets.length} tone="neutral" />
        <Metric icon={Clock3} label="Em aberto" value={openCount} tone="warning" />
        <Metric icon={Wrench} label="Em atendimento" value={grouped.progress.length} tone="info" />
        <Metric icon={CheckCircle2} label="Taxa de solucao" value={`${resolvedRate}%`} tone="success" />
      </section>

      <section className="board-toolbar" aria-label="Filtros do painel">
        <div className="search-control">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar ID, matricula, pessoa ou erro"
            aria-label="Buscar chamados"
          />
        </div>

        <div className="filter-control">
          <Filter size={17} aria-hidden="true" />
          <select value={campusId} onChange={(event) => setCampusId(event.target.value)} aria-label="Filtrar por campus">
            <option value="all">Todos os campi</option>
            {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
          </select>
        </div>

        {profile.role === "admin" ? (
          <div className="segmented-control segmented-compact" aria-label="Escopo dos chamados">
            <button type="button" aria-pressed={scope === "team"} onClick={() => setScope("team")}>
              <Users size={16} aria-hidden="true" /> Equipe
            </button>
            <button type="button" aria-pressed={scope === "mine"} onClick={() => setScope("mine")}>
              Meus
            </button>
          </div>
        ) : null}
      </section>

      {moveNotice ? (
        <p
          className={`board-notice board-notice-${moveNotice.tone}`}
          role={moveNotice.tone === "error" ? "alert" : "status"}
        >
          {moveNotice.message}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <section className="kanban-board" aria-label="Fluxo de chamados" aria-busy={movingTicketId !== null}>
          {lanes.map((lane) => (
            <BoardLane
              key={lane.id}
              lane={lane}
              tickets={grouped[lane.id]}
              isDropTarget={dropLane === lane.id}
              canDrag={movingTicketId === null}
              onSelect={setSelectedTicket}
            />
          ))}
        </section>
        <DragOverlay dropAnimation={null}>
          {draggedTicket ? (
            <div className="ticket-card ticket-card-overlay" aria-hidden="true">
              <TicketCardContent ticket={draggedTicket} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <NewTicketDialog dialogRef={newDialogRef} campuses={campuses} sectors={sectors} />
      {selectedTicket ? (
        <EditTicketDialog
          key={selectedTicket.id}
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      ) : null}
      {resolutionTicket ? (
        <ResolveTicketDialog
          key={resolutionTicket.id}
          ticket={resolutionTicket}
          onClose={() => setResolutionTicket(null)}
          onResolve={(solution) => moveTicket(resolutionTicket, "resolved", solution)}
        />
      ) : null}
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Inbox;
  label: string;
  value: number | string;
  tone: "neutral" | "warning" | "info" | "success";
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span className="metric-icon"><Icon size={19} aria-hidden="true" /></span>
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  );
}

function BoardLane({
  lane,
  tickets,
  isDropTarget,
  canDrag,
  onSelect,
}: {
  lane: (typeof lanes)[number];
  tickets: Ticket[];
  isDropTarget: boolean;
  canDrag: boolean;
  onSelect: (ticket: Ticket) => void;
}) {
  const Icon = lane.icon;
  const { setNodeRef } = useDroppable({ id: lane.id, disabled: !canDrag });
  return (
    <div
      ref={setNodeRef}
      className={`kanban-lane lane-${lane.id}${isDropTarget ? " lane-drop-target" : ""}`}
    >
      <header className="lane-header">
        <div><Icon size={18} aria-hidden="true" /><strong>{lane.label}</strong></div>
        <span>{tickets.length}</span>
        <small>{lane.description}</small>
      </header>

      <div className="lane-list">
        {tickets.length ? tickets.map((ticket) => (
          <DraggableTicketCard
            key={ticket.id}
            ticket={ticket}
            canDrag={canDrag}
            onSelect={onSelect}
          />
        )) : (
          <div className="lane-empty">
            <Inbox size={22} aria-hidden="true" />
            <span>Nenhum chamado nesta etapa</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableTicketCard({
  ticket,
  canDrag,
  onSelect,
}: {
  ticket: Ticket;
  canDrag: boolean;
  onSelect: (ticket: Ticket) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(ticket.id),
    disabled: !canDrag,
  });

  return (
    <button
      ref={setNodeRef}
      className={`ticket-card ticket-card-drag-ready${isDragging ? " ticket-card-dragging" : ""}`}
      type="button"
      onClick={() => onSelect(ticket)}
      aria-label={`Abrir chamado #${ticket.id}. Segure e arraste para mover entre as etapas.`}
      title="Clique para abrir. Segure e arraste para mover."
      {...listeners}
      {...attributes}
    >
      <TicketCardContent ticket={ticket} />
    </button>
  );
}

function TicketCardContent({ ticket }: { ticket: Ticket }) {
  return (
    <>
      <span className="ticket-card-topline">
        <span className="ticket-card-id">
          <GripVertical size={16} aria-hidden="true" />
          <strong>#{ticket.id}</strong>
        </span>
        <time dateTime={ticket.created_at}>{formatDateTime(ticket.created_at)}</time>
      </span>
      <span className="ticket-requester">{ticket.requester.full_name}</span>
      <span className="ticket-registration">Matricula {ticket.requester.registration}</span>
      <span className="ticket-error">{ticket.reported_error}</span>
      <span className="ticket-meta">
        <span>{ticket.campus.name}</span>
        <span>{ticket.sector.name}</span>
      </span>
      <span className="ticket-owner">
        <span className="avatar avatar-small" aria-hidden="true">{initials(ticket.technician.full_name)}</span>
        <span>{ticket.technician.full_name}</span>
      </span>
    </>
  );
}

function isLaneId(value: string): value is LaneId {
  return value === "new" || value === "progress" || value === "resolved";
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
