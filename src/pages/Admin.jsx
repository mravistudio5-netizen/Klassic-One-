import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useLang } from "@/lib/i18n";
import { ShieldCheck } from "lucide-react";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminStores from "@/components/admin/AdminStores";
import AdminAudit from "@/components/admin/AdminAudit";
import AdminSOPs from "@/components/admin/AdminSOPs";
import AdminDepartments from "@/components/admin/AdminDepartments";
import AdminRoles from "@/components/admin/AdminRoles";
import AdminTeam from "@/components/admin/AdminTeam";

export default function Admin() {
  const { t } = useLang();
  const { user, stores, activeStoreId } = useOutletContext();
  const [tab, setTab] = useState("users");

  if (user?.role !== "admin") {
    return (
      <div className="p-8 text-center text-slate-400">
        <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Admins only.</p>
      </div>
    );
  }

  const tabs = [
    { key: "users", label: "Users" },
    { key: "team", label: "Team" },
    { key: "departments", label: "Departments" },
    { key: "roles", label: "Roles" },
    { key: "stores", label: "Stores" },
    { key: "sops", label: "SOPs" },
    { key: "audit", label: "Audit Log" },
  ];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Admin</h2>
        <p className="text-sm text-slate-500">Manage users, stores & activity</p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`text-xs px-4 py-2 rounded-full font-medium ${tab === tb.key ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "users" && <AdminUsers />}
      {tab === "team" && <AdminTeam />}
      {tab === "departments" && <AdminDepartments stores={stores} />}
      {tab === "roles" && <AdminRoles />}
      {tab === "stores" && <AdminStores stores={stores} activeStoreId={activeStoreId} />}
      {tab === "audit" && <AdminAudit />}
      {tab === "sops" && <AdminSOPs stores={stores} user={user} />}
    </div>
  );
}