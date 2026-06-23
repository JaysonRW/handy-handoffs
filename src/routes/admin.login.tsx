import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/features/auth/store";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin sign in · PMTMS" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const login = useAdminAuth((s) => s.login);
  const [u, setU] = useState("admin");
  const [p, setP] = useState("admin");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (login(u, p)) navigate({ to: "/admin" });
    else setErr("Invalid credentials. Try admin / admin.");
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back</Link>
        <form onSubmit={submit} className="surface-card mt-4 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="size-10 grid place-items-center rounded-md bg-primary/15 text-primary"><ShieldCheck className="size-5" /></div>
            <div>
              <h1 className="text-lg font-bold">Master Admin sign in</h1>
              <p className="text-xs text-muted-foreground">Demo credentials are pre-filled.</p>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Username</span>
            <input value={u} onChange={(e) => setU(e.target.value)} className="bg-surface-2 border border-border rounded-md px-3 py-2.5 text-sm focus-ring" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Password</span>
            <input type="password" value={p} onChange={(e) => setP(e.target.value)} className="bg-surface-2 border border-border rounded-md px-3 py-2.5 text-sm focus-ring" />
          </label>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button type="submit" className="rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 focus-ring">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
