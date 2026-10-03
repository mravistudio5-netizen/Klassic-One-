import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { defaultMatrixForRole, modulesFromMatrix } from "@/lib/permissions";
import { clearPermissionsCache } from "@/hooks/usePermissions";
import PermissionMatrixEditor from "@/components/admin/PermissionMatrixEditor";

const ROLE_OPTIONS = ["admin", "mis", "manager", "tailoring_manager", "tailoring_operator"];

export default function UserInviteForm({ onInvited }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("manager");
  const [matrix, setMatrix] = useState(() => defaultMatrixForRole("manager"));
  const [showMatrix, setShowMatrix] = useState(false);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Load the role's existing matrix whenever role changes (fall back to defaults).
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingMatrix(true);
      try {
        const res = await base44.entities.RolePermission.filter({ role }, { limit: 1 });
        const rp = res.items?.[0];
        const m = rp?.matrix && Object.keys(rp.matrix).length ? rp.matrix : defaultMatrixForRole(role);
        if (alive) setMatrix(m);
      } catch (e) {
        if (alive) setMatrix(defaultMatrixForRole(role));
      } finally {
        if (alive) setLoadingMatrix(false);
      }
    })();
    return () => { alive = false; };
  }, [role]);

  const toggle = (modKey, action) => {
    setMatrix((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[modKey]) next[modKey] = {};
      next[modKey][action] = !next[modKey][action];
      return next;
    });
  };

  const saveMatrix = async () => {
    const modules = modulesFromMatrix(matrix) || [];
    const res = await base44.entities.RolePermission.filter({ role }, { limit: 1 });
    const existing = res.items?.[0];
    if (existing?.id) {
      await base44.entities.RolePermission.update(existing.id, { matrix, modules });
    } else {
      await base44.entities.RolePermission.create({ role, matrix, modules, can_assign_cross_department: false });
    }
    clearPermissionsCache();
  };

  const sendInvite = async () => {
    if (!email.trim()) { toast.error("Email required"); return; }
    setInviting(true);
    try {
      // Platform inviteUser only accepts built-in "user"/"admin", so invite with
      // a built-in role then set the real (custom) role on the created user.
      const builtinRole = role === "admin" ? "admin" : "user";
      await base44.users.inviteUser(email.trim(), builtinRole);
      await saveMatrix();
      if (role !== builtinRole) {
        const res = await base44.entities.User.list({ limit: 200 });
        const u = (res.items || []).find((x) => (x.email || "").toLowerCase() === email.trim().toLowerCase());
        if (u) await base44.entities.User.update(u.id, { role });
      }
      toast.success(`Invited ${email} as ${role}`);
      setEmail("");
      setShowMatrix(false);
      onInvited?.();
    } catch (e) {
      toast.error("Invite failed: " + (e.message || "error"));
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <UserPlus className="w-4 h-4" /> Invite User
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
        className="input"
      />
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input flex-1"
        >
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setShowMatrix((s) => !s)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100"
      >
        <span>Set permission matrix for this role</span>
        {showMatrix ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showMatrix && (
        loadingMatrix ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
        ) : (
          <PermissionMatrixEditor matrix={matrix} onToggle={toggle} disabled={inviting} />
        )
      )}

      <button
        onClick={sendInvite}
        disabled={inviting}
        className="w-full bg-slate-900 text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {inviting ? <><Loader2 className="w-4 h-4 animate-spin" /> Inviting...</> : <><UserPlus className="w-4 h-4" /> Send Invite</>}
      </button>
      <p className="text-[11px] text-slate-400 text-center">Only invited emails can access the app. The matrix above applies to everyone with this role.</p>
    </div>
  );
}