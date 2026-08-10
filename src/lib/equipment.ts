import type { EquipmentMovementType, EquipmentStatus } from "@/lib/types";

export const equipmentStatusLabels: Record<EquipmentStatus, string> = {
  available: "Disponivel",
  assigned: "Em uso",
  maintenance: "Em manutencao",
  retired: "Baixado",
};

export const movementTypeLabels: Record<EquipmentMovementType, string> = {
  delivery: "Entrega",
  return: "Devolucao",
  transfer: "Transferencia",
  maintenance: "Manutencao",
  retirement: "Baixa",
};

export const movementTypeDescriptions: Record<EquipmentMovementType, string> = {
  delivery: "Entrega equipamentos disponiveis ao solicitante.",
  return: "Devolve equipamentos em uso ou manutencao ao estoque.",
  transfer: "Altera a localizacao sem mudar o responsavel atual.",
  maintenance: "Reserva os equipamentos para atendimento tecnico.",
  retirement: "Retira os equipamentos definitivamente do inventario ativo.",
};

export const movementTypes = Object.keys(movementTypeLabels) as EquipmentMovementType[];

export function canMoveEquipment(status: EquipmentStatus, type: EquipmentMovementType) {
  if (status === "retired") return false;
  if (type === "delivery") return status === "available";
  if (type === "return") return status === "assigned" || status === "maintenance";
  return true;
}
