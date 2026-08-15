export type UserRole = "technician" | "admin";
export type TicketStatus = "new" | "progress" | "resolved";
export type EquipmentStatus = "available" | "assigned" | "maintenance" | "retired";
export type EquipmentMovementType =
  | "delivery"
  | "return"
  | "transfer"
  | "maintenance"
  | "retirement";

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
};

export type TeamMember = Profile & {
  created_at: string;
};

export type Campus = {
  id: number;
  name: string;
  slug: string;
};

export type Requester = {
  id: number;
  registration: string;
  full_name: string;
};

export type Sector = {
  id: number;
  name: string;
};

export type Ticket = {
  id: number;
  created_at: string;
  updated_at: string;
  reported_error: string;
  diagnosis: string | null;
  solution: string | null;
  resolved: boolean;
  status: TicketStatus;
  notes: string | null;
  resolved_at: string | null;
  technician_id: string;
  campus: Pick<Campus, "id" | "name">;
  requester: Requester;
  sector: Sector;
  technician: Pick<Profile, "id" | "full_name">;
};

export type EquipmentCategory = {
  id: number;
  name: string;
};

export type EquipmentModel = {
  id: number;
  name: string;
  category: EquipmentCategory | null;
};

export type EquipmentAsset = {
  id: number;
  serial_number: string;
  status: EquipmentStatus;
  notes: string | null;
  created_at: string;
  model: EquipmentModel;
  current_requester: Requester | null;
  current_campus: Pick<Campus, "id" | "name"> | null;
  current_sector: Sector | null;
};

export type EquipmentMovementItem = {
  id: number;
  previous_status: EquipmentStatus;
  asset: Pick<EquipmentAsset, "id" | "serial_number" | "model">;
  origin_requester: Requester | null;
  origin_campus: Pick<Campus, "id" | "name"> | null;
  origin_sector: Sector | null;
};

export type EquipmentMovement = {
  id: number;
  created_at: string;
  movement_type: EquipmentMovementType;
  notes: string | null;
  requester: Requester;
  technician: Pick<Profile, "id" | "full_name"> | null;
  destination_campus: Pick<Campus, "id" | "name"> | null;
  destination_sector: Sector | null;
  items: EquipmentMovementItem[];
};

export type ActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  ticketId?: number;
  movementId?: number;
  equipment?: EquipmentAsset;
  createdCount?: number;
};

export const initialActionState: ActionState = {
  status: "idle",
  message: "",
};
