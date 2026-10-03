import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/i18n";
import { FileSpreadsheet, Star, ExternalLink, Plus, Search, X, Trash2, Archive } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

const categoryColors = {
  Stock: "bg-blue-100 text-blue-700",
  Purchase: "bg-purple-100 text-purple-700",
  Staff: "bg-green-100 text-green-700",
  Accounts: "bg-amber-100 text-amber-700",
  Reports: "bg-indigo-100 text-indigo-700",
  Other: "bg-slate-100 text-slate-600",
};

const sensitivityColors = { Low: "bg-slate-100 text-slate-600", Medium: "bg-amber-100 text-amber-700", High: "bg-red-100 text-red-700" };

export default function MySheets() {
  const { t } = useLang();
  const [me, setMe] = useState(null);
  const [access, setAccess] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const user = await base44.auth.me();
      setMe(user);
      const role = user.role === "admin" ? "owner" : user.role;
      if (role === "owner") {
        // owner manages library - handled in SheetLibrary, but show all access for oversight
        const res = await base44.entities.SheetAccess.filter({ active: true }, { limit: 200 });
        setAccess(res.items || []);
      } else {
        const res = await base44.entities.SheetAccess.filter({ manager_id: user.id, active: true }, { limit: 200 });
        setAccess(res.items || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // manager view
  if (me && (me.role !== "owner" && me.role !== "admin")) {
    const cats = [...new Set(access.map((a) => a.sheet_name && a).map((a) => a.category).filter(Boolean))];
    const favs = access.filter((a) => a.favourite);
    const filtered = access.filter((a) => {
      if (filter !== "all" && !a.category) return false;
      if (filter !== "all" && a.category !== filter) return false;
      if (search && !a.sheet_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0));

    const toggleFav = async (a) => {
      await base44.entities.SheetAccess.update(a.id, { favourite: !a.favourite });
      load();
    };

    const openSheet = async (a) => {
      try {
        await base44.entities.AuditLog.create({
          module: "Sheets", action: "Sheet Opened",
          entity_id: a.sheet_id, entity_name: a.sheet_name,
          actor_id: me.id, actor_name: me.full_name, store_id: a.store_id,
        });
      } catch (e) { console.error(e); }
      window.open(a.link, "_blank");
    };

    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">{t("mySheets")}</h2>
        <SearchBar value={search} onChange={setSearch} />
        {loading ? <div className="text-center text-slate-400 text-sm py-8">Loading...</div> : (
          <>
            {favs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {t("addToFavourites")}</p>
                <div className="space-y-2">
                  {favs.map((a) => <SheetCard key={a.id} a={a} onOpen={() => openSheet(a)} onFav={() => toggleFav(a)} />)}
                </div>
              </div>
            )}
            {sorted.filter((a) => !a.favourite).length > 0 && (
              <div className="space-y-2">
                {sorted.filter((a) => !a.favourite).map((a) => <SheetCard key={a.id} a={a} onOpen={() => openSheet(a)} onFav={() => toggleFav(a)} />)}
              </div>
            )}
            {access.length === 0 && <div className="text-center py-12 text-slate-400"><FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No sheets assigned to you</p></div>}
          </>
        )}
      </div>
    );
  }

  // owner view -> redirect to library management
  return <SheetLibrary />;
}

function SheetCard({ a, onOpen, onFav }) {
  const { t } = useLang();
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
            <h3 className="font-semibold text-slate-900 text-sm truncate">{a.sheet_name}</h3>
          </div>
          {a.purpose && <p className="text-xs text-slate-500 mt-0.5">{a.purpose}</p>}
        </div>
        <button onClick={onFav} className="p-1">
          <Star className={`w-4 h-4 ${a.favourite ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
        </button>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {a.category && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[a.category]}`}>{a.category}</span>}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.access_level === "Edit" ? "bg-green-100 text-green-700" : a.access_level === "Comment" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{a.access_level}</span>
      </div>
      <button onClick={onOpen} className="w-full mt-3 bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2">
        <ExternalLink className="w-4 h-4" /> {t("openSheet")}
      </button>
    </div>
  );
}

/* ============ SHEET LIBRARY (owner) ============ */
export function SheetLibrary() {
  const { t } = useLang();
  const { can } = usePermissions();
  const [sheets, setSheets] = useState([]);
  const [managers, setManagers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", link: "", purpose: "", category: "Other", sensitivity: "Low", notes: "", store_id: "", all_stores: true });

  const load = useCallback(async () => {
    try {
      const res = await base44.entities.SheetLibrary.filter({ archived: { $ne: true } }, { sort: "-created_date", limit: 200 });
      setSheets(res.items || []);
      const userRes = await base44.entities.User.list({ limit: 100 });
      setManagers((userRes.items || []).filter((u) => ["manager"].includes(u.role)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addSheet = async () => {
    if (!form.name.trim() || !form.link.trim()) { toast.error("Name and link required"); return; }
    if (!form.link.includes("docs.google.com/spreadsheets")) { toast.error("Must be a Google Sheets link"); return; }
    try {
      await base44.entities.SheetLibrary.create({ ...form, archived: false });
      await base44.entities.AuditLog.create({ module: "Sheets", action: "Sheet Added", entity_name: form.name, actor_id: (await base44.auth.me()).id });
      toast.success("Sheet added");
      setForm({ name: "", link: "", purpose: "", category: "Other", sensitivity: "Low", notes: "", store_id: "", all_stores: true });
      setShowForm(false);
      load();
    } catch (e) { toast.error("Failed"); }
  };

  const archive = async (s) => {
    await base44.entities.SheetLibrary.update(s.id, { archived: true });
    await base44.entities.SheetAccess.updateMany({ sheet_id: s.id }, { $set: { active: false } });
    toast.success("Archived");
    load();
  };

  const remove = async (s) => {
    if (!window.confirm("Delete this sheet? Access removed for all managers.")) return;
    await base44.entities.SheetAccess.deleteMany({ sheet_id: s.id });
    await base44.entities.SheetLibrary.delete(s.id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t("sheetLibrary")}</h2>
        <div className="flex gap-2">
          {can("sheets", "create") && <button onClick={() => setShowAssign(true)} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-sm font-semibold px-3 py-2 rounded-xl">{t("assignAccess")}</button>}
          {can("sheets", "create") && <button onClick={() => setShowForm(true)} className="flex items-center gap-1 bg-slate-900 text-white text-sm font-semibold px-3 py-2 rounded-xl"><Plus className="w-4 h-4" /> {t("addSheet")}</button>}
        </div>
      </div>

      {loading ? <div className="text-center text-slate-400 text-sm py-8">Loading...</div> : (
        <>
          {sheets.length === 0 && <div className="text-center py-12 text-slate-400"><FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No sheets yet</p></div>}
          {sheets.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">{s.name}</h3>
                  {s.purpose && <p className="text-xs text-slate-500 mt-0.5">{s.purpose}</p>}
                  <a href={s.link} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 truncate block mt-1">{s.link}</a>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[s.category]}`}>{s.category}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sensitivityColors[s.sensitivity]}`}>{t("sensitivity")}: {s.sensitivity}</span>
              </div>
              <div className="flex gap-2 mt-3">
                {can("sheets", "update") && <button onClick={() => archive(s)} className="flex-1 text-xs font-semibold text-slate-600 bg-slate-100 py-2 rounded-lg flex items-center justify-center gap-1"><Archive className="w-3.5 h-3.5" /> Archive</button>}
                {can("sheets", "delete") && <button onClick={() => remove(s)} className="flex-1 text-xs font-semibold text-red-600 bg-red-50 py-2 rounded-lg flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
              </div>
            </div>
          ))}
        </>
      )}

      {showForm && (
        <Modal title={t("addSheet")} onClose={() => setShowForm(false)}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sheet name" className="input" />
          <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Google Sheets link" className="input" />
          <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Purpose" className="input" />
          <div className="flex gap-2">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input flex-1">
              {["Stock", "Purchase", "Staff", "Accounts", "Reports", "Other"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={form.sensitivity} onChange={(e) => setForm({ ...form, sensitivity: e.target.value })} className="input flex-1">
              {["Low", "Medium", "High"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="input min-h-[60px]" />
          <button onClick={addSheet} className="w-full bg-slate-900 text-white text-sm font-semibold py-3.5 rounded-xl">{t("save")}</button>
        </Modal>
      )}

      {showAssign && (
        <Modal title={t("assignAccess")} onClose={() => setShowAssign(false)}>
          <AssignForm sheets={sheets} managers={managers} onDone={() => { setShowAssign(false); load(); }} />
        </Modal>
      )}
    </div>
  );
}

function AssignForm({ sheets, managers, onDone }) {
  const [sheetId, setSheetId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [level, setLevel] = useState("View");
  const [expiry, setExpiry] = useState("");

  const assign = async () => {
    if (!sheetId || !managerId) { toast.error("Select sheet and manager"); return; }
    const sheet = sheets.find((s) => s.id === sheetId);
    const manager = managers.find((m) => m.id === managerId);
    try {
      const me = await base44.auth.me();
      await base44.entities.SheetAccess.create({
        sheet_id: sheetId, sheet_name: sheet.name, manager_id: managerId, manager_name: manager.full_name,
        manager_email: manager.google_email, access_level: level, store_id: sheet.store_id,
        expiry_date: expiry || undefined, active: true,
      });
      await base44.entities.AuditLog.create({ module: "Sheets", action: "Access Granted", entity_id: sheetId, entity_name: sheet.name, actor_id: me.id, actor_name: me.full_name, details: `→ ${manager.full_name} (${level})` });
      toast.success("Access granted");
      onDone();
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="space-y-3">
      <select value={sheetId} onChange={(e) => setSheetId(e.target.value)} className="input">
        <option value="">Select sheet</option>
        {sheets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="input">
        <option value="">Select manager</option>
        {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name} {m.manager_id ? `(${m.manager_id})` : ""}</option>)}
      </select>
      <div className="flex gap-2">
        {["View", "Comment", "Edit"].map((l) => (
          <button key={l} onClick={() => setLevel(l)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${level === l ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{l}</button>
        ))}
      </div>
      <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="input" />
      <button onClick={assign} className="w-full bg-slate-900 text-white text-sm font-semibold py-3.5 rounded-xl">Grant Access</button>
    </div>
  );
}

function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search sheets" className="input pl-9" />
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}