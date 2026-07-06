import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
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

export type TaskSnapshot = {
  tasks: Task[];
  comments: Comment[];
  activity: ActivityEntry[];
};

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    photo: row.photo_path ?? undefined,
    blockId: row.block_id,
    flatId: row.flat_id,
    problemCategory: row.problem_category ?? undefined,
    complaintCategory: row.complaint_category ?? undefined,
    status: row.status,
    priority: row.priority,
    createdById: row.created_by_id,
    reporterType: row.reporter_type ?? undefined,
    reporterName: row.reporter_name ?? undefined,
    assigneeId: row.assignee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: true,
    syncedAt: row.synced_at ?? row.updated_at,
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
  if (!isSupabaseConfigured) return null;

  const supabase = getSupabaseBrowserClient();

  const [tasksResult, commentsResult, activityResult] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id,title,description,photo_path,block_id,flat_id,problem_category,complaint_category,status,priority,created_by_id,reporter_type,reporter_name,assignee_id,synced_at,created_at,updated_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("task_comments")
      .select("id,task_id,author_id,text,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("task_activity")
      .select("id,task_id,actor_id,type,message,meta,created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  if (commentsResult.error) throw commentsResult.error;
  if (activityResult.error) throw activityResult.error;

  const tasks = (tasksResult.data ?? []) as TaskRow[];
  const comments = (commentsResult.data ?? []) as CommentRow[];
  const activity = (activityResult.data ?? []) as ActivityRow[];

  if (tasks.length === 0 && comments.length === 0 && activity.length === 0) {
    return null;
  }

  return {
    tasks: tasks.map(mapTask),
    comments: comments.map(mapComment),
    activity: activity.map(mapActivity),
  };
}
