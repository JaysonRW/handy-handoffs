export type Role = "MASTER_ADMIN" | "CARETAKER" | "CLEANER" | "RESIDENT";

export type TaskStatus = "NEW" | "DOING" | "DONE";
export type Priority = "P1" | "P2" | "P3" | null;

export type ProblemCategory =
  | "Plumbing"
  | "Electrical"
  | "HVAC"
  | "Structural"
  | "Appliance"
  | "Lighting"
  | "Other";

export type ComplaintCategory =
  | "Cleaning"
  | "Noise"
  | "Waste"
  | "Pest"
  | "Common Area"
  | "Safety"
  | "Other";

export type ResidentRequestType = "ISSUE" | "GARBAGE_BAG";

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  taskId: string;
  actorId: string;
  type:
    | "created"
    | "status_changed"
    | "priority_set"
    | "assigned"
    | "reassigned"
    | "comment"
    | "photo_added"
    | "reopened"
    | "accepted"
    | "synced";
  message: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export type TaskAttachmentKind = "PRIMARY" | "EXTRA" | "BEFORE" | "AFTER";

export interface Task {
  id: string;
  title: string;
  description: string;
  photo?: string; // data URL
  photoPath?: string;
  extraPhotos?: string[];
  beforePhoto?: string;
  afterPhoto?: string;
  beforePhotoPath?: string;
  afterPhotoPath?: string;
  blockId: string;
  flatId: string;
  problemCategory?: ProblemCategory;
  complaintCategory?: ComplaintCategory;
  status: TaskStatus;
  priority: Priority;
  createdById: string;
  reporterType?: "USER" | "RESIDENT";
  reporterName?: string;
  residentRequestType?: ResidentRequestType;
  garbageBagQuantity?: number;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  /** offline-first: false until synced to "server" */
  synced: boolean;
  syncedAt?: string;
}
