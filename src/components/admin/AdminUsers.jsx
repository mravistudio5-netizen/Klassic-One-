import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import UserInviteForm from "@/components/admin/UserInviteForm";

const ROLE_OPTIONS = ["admin", "mis", "manager", "tailoring_manager", "tailoring_operator"];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await base44.entities.User.list({ limit: 100 });
      setUsers(res.items || []);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    try {
      await base44.entities.User.update(id, { role });
      toast.success("Role updated");
      load();
    } catch (e) {
      toast.error("Update failed");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
  }

  return (
    <div className="space-y-4">
      <UserInviteForm onInvited={load} />

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{u.full_name || u.email}</p>
              <p className="text-xs text-slate-500 truncate">{u.email}</p>
            </div>
            <select
              value={u.role || "user"}
              onChange={(e) => changeRole(u.id, e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
            >
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}