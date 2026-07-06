import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Loader2, X } from "lucide-react";
import { BLOCKS } from "@/features/blocks/data";
import type { Task } from "@/features/tasks/types";
import { useTasksStore } from "@/features/tasks/store";
import { useSyncStore } from "@/features/sync/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getUser } from "@/features/users/data";

async function fileToDataUrl(file: File, maxDim = 1200): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  // downscale
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("img"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 200_000) return dataUrl;
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.78);
}

export function TaskForm({
  creatorId,
  redirectTo,
  mode = "staff",
  onCreated,
}: {
  creatorId: string;
  redirectTo?: string;
  mode?: "staff" | "admin" | "resident";
  onCreated?: (task: Task) => void;
}) {
  const navigate = useNavigate();
  const create = useTasksStore((s) => s.createTask);
  const online = useSyncStore((s) => s.online);
  const patchDebug = useSyncStore((s) => s.patchDebug);
  const pushDebugEvent = useSyncStore((s) => s.pushDebugEvent);
  const user = getUser(creatorId);
  const isResidentPortal = mode === "resident";

  const [photo, setPhoto] = useState<string | null>(null);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [blockId, setBlockId] = useState("");
  const [flatId, setFlatId] = useState("");
  const [desc, setDesc] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const block = BLOCKS.find((b) => b.id === blockId);
  const flats = block?.flats ?? [];
  const canSubmit = !!(
    blockId &&
    flatId &&
    desc.trim() &&
    (!isResidentPortal || reporterName.trim())
  );

  async function onPhoto(file: File | null) {
    if (!file) return;
    setBusyPhoto(true);
    try {
      const d = await fileToDataUrl(file);
      setPhoto(d);
    } finally {
      setBusyPhoto(false);
    }
  }

  function submit() {
    if (!canSubmit) return;
    // #region debug-point A:submit-entry
    patchDebug({
      lastPush: {
        at: new Date().toISOString(),
        trigger: "submit",
        status: "started",
        pendingCount: useTasksStore.getState().tasks.filter((task) => !task.synced).length,
        message: "[DEBUG] Task form submit started",
      },
    });
    pushDebugEvent({
      scope: "submit",
      status: "info",
      message: `[DEBUG] Submit started mode=${mode} online=${online} hasPhoto=${Boolean(photo)} configured=${isSupabaseConfigured}`,
    });
    // #endregion
    const generatedTitle = buildTaskTitle(desc.trim(), blockId, flatId);
    const t = create(
      {
        title: generatedTitle,
        description: desc.trim(),
        photo: photo ?? undefined,
        blockId,
        flatId,
        createdById: creatorId,
        reporterType: isResidentPortal ? "RESIDENT" : "USER",
        reporterName: isResidentPortal ? reporterName.trim() : undefined,
      },
      creatorId,
    );
    // #region debug-point E:submit-created-local
    patchDebug({
      lastPush: {
        at: new Date().toISOString(),
        trigger: "submit",
        status: "success",
        pendingCount: useTasksStore.getState().tasks.filter((task) => !task.synced).length,
        syncedCount: t.synced ? 1 : 0,
        message: `[DEBUG] Task created locally with synced=${t.synced}`,
      },
    });
    pushDebugEvent({
      scope: "submit",
      status: t.synced ? "success" : "skipped",
      message: `[DEBUG] Local task created id=${t.id} synced=${t.synced} photo=${Boolean(t.photo)}`,
    });
    // #endregion
    if (onCreated) {
      onCreated(t);
      return;
    }
    if (redirectTo) {
      navigate({ to: redirectTo.replace("{id}", t.id) as any });
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      {!online && (
        <div className="surface-card border-accent/40 bg-accent/5 p-3 text-sm text-accent-foreground">
          {isResidentPortal
            ? "Você está offline. O registro será salvo localmente e enviado quando a conexão voltar."
            : "You're offline. The task will be saved locally and synced automatically when you're back online."}
        </div>
      )}

      {isResidentPortal && (
        <Section title="Resident name" required hint="Used so the admin knows who reported the issue.">
          <input
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            maxLength={80}
            placeholder="Resident name"
            className="w-full bg-surface-2 border border-border rounded-md px-3 py-2.5 text-sm focus-ring"
          />
        </Section>
      )}

      <Section title="Photo" hint="Optional, but helpful for triage.">
        {photo ? (
          <div className="relative">
            <img src={photo} alt="" className="w-full h-56 object-cover rounded-lg border border-border" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="absolute top-2 right-2 size-8 grid place-items-center rounded-full bg-background/80 backdrop-blur border border-border hover:bg-destructive hover:text-destructive-foreground focus-ring"
              aria-label="Remove photo"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <label className="surface-card flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground border-dashed cursor-pointer hover:border-primary/50 hover:text-foreground focus-within:border-primary">
            {busyPhoto ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
            <span className="text-sm font-medium">Take or upload a photo</span>
            <span className="text-xs">JPG / PNG · optional · auto-resized</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </Section>

      <Section title="Location" required>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={blockId}
            onChange={(e) => { setBlockId(e.target.value); setFlatId(""); }}
            className="bg-surface-2 border border-border rounded-md px-3 py-2.5 text-sm focus-ring"
          >
            <option value="">Block…</option>
            {BLOCKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select
            value={flatId}
            onChange={(e) => setFlatId(e.target.value)}
            disabled={!block}
            className="bg-surface-2 border border-border rounded-md px-3 py-2.5 text-sm focus-ring disabled:opacity-40"
          >
            <option value="">Flat…</option>
            {flats.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
      </Section>

      <Section title="Description" required>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Describe the issue and where it is happening."
          className="w-full bg-surface-2 border border-border rounded-md px-3 py-2.5 text-sm focus-ring resize-none"
        />
      </Section>

      <div className="flex items-center justify-between gap-3 pt-2">
        {isResidentPortal ? (
          <div className="text-xs text-muted-foreground">
            Public resident portal
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Reporting as <span className="text-foreground font-medium">{user?.name}</span>
          </div>
        )}
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-lg shadow-primary/20 disabled:opacity-40 disabled:shadow-none hover:bg-primary/90 focus-ring"
        >
          {isResidentPortal
            ? online
              ? "Send report"
              : "Save offline report"
            : online
              ? "Submit task"
              : "Save offline"}
        </button>
      </div>
    </div>
  );
}

function buildTaskTitle(description: string, blockId: string, flatId: string) {
  const normalized = description.replace(/\s+/g, " ").trim();
  const preview = normalized.length > 60 ? `${normalized.slice(0, 57).trimEnd()}...` : normalized;
  const block = BLOCKS.find((item) => item.id === blockId);
  const flat = block?.flats.find((item) => item.id === flatId);
  const location = [block?.name, flat?.label ? `Flat ${flat.label}` : null].filter(Boolean).join(" · ");

  return location ? `${location} · ${preview}` : preview;
}

function Section({ title, required, hint, children }: { title: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">
          {title} {required && <span className="text-primary">*</span>}
        </h2>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
