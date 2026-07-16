import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  SUPABASE_STORAGE_BUCKET,
  supabaseEnvStatus,
} from "@/lib/supabase/client";
import { useSyncStore } from "@/features/sync/store";
import { nanoid } from "@/lib/id";
import type { ActivityEntry, Comment, Task } from "./types";

type TaskRow = {
  id: string;
  title: string;
  description: string;
  photo_path: string | null;
  block_id: string;
  flat_id: string;
  problem_category: Task["problemCategory"] | null;
  complaint_category: Task["complaintCategory"] | null;
  status: Task["status"];
  priority: Exclude<Task["priority"], null> | null;
  created_by_id: string;
  reporter_type: Task["reporterType"] | null;
  reporter_name: string | null;
  resident_request_type?: Task["residentRequestType"] | null;
  garbage_bag_quantity?: number | null;
  assignee_id: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};

type CommentRow = {
  id: string;
  task_id: string;
  author_id: string;
  text: string;
  created_at: string;
};

type ActivityRow = {
  id: string;
  task_id: string;
  actor_id: string;
  type: ActivityEntry["type"];
  message: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

type AttachmentRow = {
  id: string;
  task_id: string;
  uploaded_by_id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  kind: "PRIMARY" | "EXTRA";
  created_at: string;
};

export type TaskSnapshot = {
  tasks: Task[];
  comments: Comment[];
  activity: ActivityEntry[];
};

const TASKS_BASE_SELECT =
  "id,title,description,photo_path,block_id,flat_id,problem_category,complaint_category,status,priority,created_by_id,reporter_type,reporter_name,assignee_id,synced_at,created_at,updated_at";
const TASKS_EXTENDED_SELECT = `${TASKS_BASE_SELECT},resident_request_type,garbage_bag_quantity`;

function isMissingResidentRequestColumnsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("resident_request_type") ||
    message.includes("garbage_bag_quantity") ||
    message.includes("Could not find the") ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

function mapTask(row: TaskRow): Task {
  const supabase = getSupabaseBrowserClient();
  const publicPhotoUrl = row.photo_path
    ? supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(row.photo_path).data.publicUrl
    : undefined;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    photo: publicPhotoUrl,
    photoPath: row.photo_path ?? undefined,
    blockId: row.block_id,
    flatId: row.flat_id,
    problemCategory: row.problem_category ?? undefined,
    complaintCategory: row.complaint_category ?? undefined,
    status: row.status,
    priority: row.priority,
    createdById: row.created_by_id,
    reporterType: row.reporter_type ?? undefined,
    reporterName: row.reporter_name ?? undefined,
    residentRequestType: row.resident_request_type ?? undefined,
    garbageBagQuantity: row.garbage_bag_quantity ?? undefined,
    assigneeId: row.assignee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: true,
    syncedAt: row.synced_at ?? row.updated_at,
  };
}

function getPublicStorageUrl(storagePath: string) {
  return getSupabaseBrowserClient()
    .storage
    .from(SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(storagePath).data.publicUrl;
}

function mergeSnapshotAttachments(tasks: Task[], attachments: AttachmentRow[]) {
  const attachmentsByTask = new Map<string, string[]>();

  for (const attachment of attachments) {
    if (attachment.kind !== "EXTRA") continue;
    const current = attachmentsByTask.get(attachment.task_id) ?? [];
    current.push(getPublicStorageUrl(attachment.storage_path));
    attachmentsByTask.set(attachment.task_id, current);
  }

  return tasks.map((task) => ({
    ...task,
    extraPhotos: attachmentsByTask.get(task.id) ?? [],
  }));
}

function taskToRow(task: Task, photoPath: string | null): TaskRow {
  const row: TaskRow = {
    id: task.id,
    title: task.title,
    description: task.description,
    photo_path: photoPath,
    block_id: task.blockId,
    flat_id: task.flatId,
    problem_category: task.problemCategory ?? null,
    complaint_category: task.complaintCategory ?? null,
    status: task.status,
    priority: task.priority,
    created_by_id: task.createdById,
    reporter_type: task.reporterType ?? null,
    reporter_name: task.reporterName ?? null,
    assignee_id: task.assigneeId,
    synced_at: task.syncedAt ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };

  if (task.residentRequestType) {
    row.resident_request_type = task.residentRequestType;
  }

  if (typeof task.garbageBagQuantity === "number") {
    row.garbage_bag_quantity = task.garbageBagQuantity;
  }

  return row;
}

async function fetchTasksResult(supabase: ReturnType<typeof getSupabaseBrowserClient>) {
  const extendedResult = await supabase
    .from("tasks")
    .select(TASKS_EXTENDED_SELECT)
    .order("created_at", { ascending: false });

  if (!extendedResult.error) {
    return extendedResult;
  }

  if (!isMissingResidentRequestColumnsError(extendedResult.error)) {
    return extendedResult;
  }

  useSyncStore.getState().pushDebugEvent({
    scope: "supabase",
    status: "warning",
    message: "[DEBUG] tasks table still missing resident request columns; using fallback snapshot query",
  });

  return supabase
    .from("tasks")
    .select(TASKS_BASE_SELECT)
    .order("created_at", { ascending: false });
}

function commentToRow(comment: Comment): CommentRow {
  return {
    id: comment.id,
    task_id: comment.taskId,
    author_id: comment.authorId,
    text: comment.text,
    created_at: comment.createdAt,
  };
}

function activityToRow(entry: ActivityEntry): ActivityRow {
  return {
    id: entry.id,
    task_id: entry.taskId,
    actor_id: entry.actorId,
    type: entry.type,
    message: entry.message,
    meta: entry.meta ?? null,
    created_at: entry.createdAt,
  };
}

function getFileExtensionFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/);
  if (!match) return "jpg";
  const subtype = match[1].toLowerCase();
  if (subtype === "jpeg") return "jpg";
  if (subtype === "svg+xml") return "svg";
  return subtype;
}

function getContentTypeFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  return match?.[1] ?? "image/jpeg";
}

function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(",", 2);
  if (!header || !base64 || !header.includes(";base64")) {
    throw new Error("A foto local da task esta em um formato invalido.");
  }

  const contentType = getContentTypeFromDataUrl(dataUrl);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: contentType });
}

async function uploadTaskPhoto(task: Task): Promise<string | null> {
  if (!task.photo) return task.photoPath ?? null;

  if (!task.photo.startsWith("data:")) {
    return task.photoPath ?? null;
  }

  const extension = getFileExtensionFromDataUrl(task.photo);
  const filePath = `tasks/${task.id}/primary-${task.updatedAt.replace(/[:.]/g, "-")}.${extension}`;
  const supabase = getSupabaseBrowserClient();
  const blob = dataUrlToBlob(task.photo);

  const uploadResult = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(filePath, blob, {
      cacheControl: "3600",
      contentType: blob.type,
      upsert: true,
    });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  return filePath;
}

async function uploadExtraPhotos(task: Task): Promise<AttachmentRow[]> {
  const draftPhotos = (task.extraPhotos ?? []).filter((photo) => photo.startsWith("data:"));
  if (draftPhotos.length === 0) return [];

  const supabase = getSupabaseBrowserClient();
  const uploaded: AttachmentRow[] = [];

  for (let index = 0; index < draftPhotos.length; index += 1) {
    const photo = draftPhotos[index]!;
    const extension = getFileExtensionFromDataUrl(photo);
    const filePath = `tasks/${task.id}/extra-${task.updatedAt.replace(/[:.]/g, "-")}-${index}.${extension}`;
    const blob = dataUrlToBlob(photo);

    const uploadResult = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(filePath, blob, {
        cacheControl: "3600",
        contentType: blob.type,
        upsert: true,
      });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    uploaded.push({
      id: nanoid(),
      task_id: task.id,
      uploaded_by_id: task.createdById,
      storage_path: filePath,
      file_name: `extra-${index + 1}.${extension}`,
      mime_type: blob.type,
      kind: "EXTRA",
      created_at: new Date().toISOString(),
    });
  }

  return uploaded;
}

export async function upsertTaskBundleToSupabase(input: {
  task: Task;
  comments: Comment[];
  activity: ActivityEntry[];
}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase nao esta configurado neste build.");
  }

  const supabase = getSupabaseBrowserClient();
  const photoPath = await uploadTaskPhoto(input.task);
  const extraAttachments = await uploadExtraPhotos(input.task);
  const taskRow = taskToRow(
    {
      ...input.task,
      photoPath: photoPath ?? input.task.photoPath,
      syncedAt: new Date().toISOString(),
    },
    photoPath ?? input.task.photoPath ?? null,
  );

  const taskResult = await supabase.from("tasks").upsert(taskRow).select("id").single();
  if (taskResult.error) {
    if (
      input.task.residentRequestType === "GARBAGE_BAG" &&
      isMissingResidentRequestColumnsError(taskResult.error)
    ) {
      throw new Error(
        "O banco Supabase ainda nao possui as colunas resident_request_type e garbage_bag_quantity. Aplique a migration antes de sincronizar pedidos de Garbage bag.",
      );
    }
    throw taskResult.error;
  }

  if (input.comments.length > 0) {
    const commentsResult = await supabase
      .from("task_comments")
      .upsert(input.comments.map(commentToRow));
    if (commentsResult.error) {
      throw commentsResult.error;
    }
  }

  if (input.activity.length > 0) {
    const activityResult = await supabase
      .from("task_activity")
      .upsert(input.activity.map(activityToRow));
    if (activityResult.error) {
      throw activityResult.error;
    }
  }

  if (extraAttachments.length > 0) {
    const attachmentsResult = await supabase
      .from("task_attachments")
      .upsert(extraAttachments);
    if (attachmentsResult.error) {
      throw attachmentsResult.error;
    }
  }

  return {
    taskId: input.task.id,
    photoPath: photoPath ?? input.task.photoPath ?? null,
  };
}

function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorId: row.author_id,
    text: row.text,
    createdAt: row.created_at,
  };
}

function mapActivity(row: ActivityRow): ActivityEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    actorId: row.actor_id,
    type: row.type,
    message: row.message,
    meta: row.meta ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchTaskSnapshotFromSupabase(): Promise<TaskSnapshot | null> {
  // #region debug-point B:supabase-config
  useSyncStore.getState().patchDebug({
    supabaseConfigured: isSupabaseConfigured,
    hasSupabaseUrl: supabaseEnvStatus.hasSupabaseUrl,
    hasSupabasePublishableKey: supabaseEnvStatus.hasSupabasePublishableKey,
    lastHydrate: {
      at: new Date().toISOString(),
      status: "started",
      message: "[DEBUG] Starting Supabase snapshot fetch",
    },
  });
  useSyncStore.getState().pushDebugEvent({
    scope: "supabase",
    status: "info",
    message: `[DEBUG] fetchTaskSnapshotFromSupabase started; configured=${isSupabaseConfigured}`,
  });
  // #endregion

  if (!isSupabaseConfigured) {
    // #region debug-point B:supabase-config-skipped
    useSyncStore.getState().patchDebug({
      lastHydrate: {
        at: new Date().toISOString(),
        status: "skipped",
        message: "[DEBUG] Supabase snapshot skipped because env vars are missing",
      },
    });
    useSyncStore.getState().pushDebugEvent({
      scope: "supabase",
      status: "skipped",
      message: "[DEBUG] Snapshot skipped: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY missing",
    });
    // #endregion
    return null;
  }

  const supabase = getSupabaseBrowserClient();
  try {
    const [tasksResult, commentsResult, activityResult, attachmentsResult] = await Promise.all([
      fetchTasksResult(supabase),
      supabase
        .from("task_comments")
        .select("id,task_id,author_id,text,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("task_activity")
        .select("id,task_id,actor_id,type,message,meta,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("task_attachments")
        .select("id,task_id,uploaded_by_id,storage_path,file_name,mime_type,kind,created_at")
        .order("created_at", { ascending: true }),
    ]);

    if (tasksResult.error) throw tasksResult.error;
    if (commentsResult.error) throw commentsResult.error;
    if (activityResult.error) throw activityResult.error;
    if (attachmentsResult.error) throw attachmentsResult.error;

    const tasks = (tasksResult.data ?? []) as TaskRow[];
    const comments = (commentsResult.data ?? []) as CommentRow[];
    const activity = (activityResult.data ?? []) as ActivityRow[];
    const attachments = (attachmentsResult.data ?? []) as AttachmentRow[];

    // #region debug-point C:snapshot-result
    useSyncStore.getState().patchDebug({
      lastHydrate: {
        at: new Date().toISOString(),
        status: tasks.length === 0 && comments.length === 0 && activity.length === 0 ? "skipped" : "success",
        taskCount: tasks.length,
        commentCount: comments.length,
        activityCount: activity.length,
        message:
          tasks.length === 0 && comments.length === 0 && activity.length === 0
            ? "[DEBUG] Snapshot returned empty payload"
            : "[DEBUG] Snapshot fetched successfully",
      },
    });
    useSyncStore.getState().pushDebugEvent({
      scope: "supabase",
      status: tasks.length === 0 && comments.length === 0 && activity.length === 0 ? "skipped" : "success",
      message: `[DEBUG] Snapshot counts tasks=${tasks.length} comments=${comments.length} activity=${activity.length}`,
    });
    // #endregion

    if (tasks.length === 0 && comments.length === 0 && activity.length === 0) {
      return null;
    }

    return {
      tasks: mergeSnapshotAttachments(tasks.map(mapTask), attachments),
      comments: comments.map(mapComment),
      activity: activity.map(mapActivity),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // #region debug-point C:snapshot-error
    useSyncStore.getState().patchDebug({
      lastHydrate: {
        at: new Date().toISOString(),
        status: "error",
        message,
      },
    });
    useSyncStore.getState().pushDebugEvent({
      scope: "supabase",
      status: "error",
      message: `[DEBUG] Snapshot fetch failed: ${message}`,
    });
    // #endregion
    throw error;
  }
}
