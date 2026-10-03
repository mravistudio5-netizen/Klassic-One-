import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/i18n";
import {
  ArrowLeft, X, Bot, Plus, Calendar, Bell, BellRing,
  Clock, ChevronDown, Sparkles, Users, Video, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import UserAssignModal from "@/components/tasks/UserAssignModal";
import ChecklistBuilder from "@/components/tasks/ChecklistBuilder";
import AdvancedOptions from "@/components/tasks/AdvancedOptions";

const SHIFTS = ["None", "Morning", "Afternoon", "Opening", "Closing", "Nightly"];
const REMINDER_OPTIONS = [
  { label: "No reminder", value: 0 },
  { label: "15 min before", value: 15 },
  { label: "30 min before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "1 day before", value: 1440 },
];

function fmtLocal(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateTask() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { id: editId } = useParams();
  const isTemplateMode = new URLSearchParams(window.location.search).get("template") === "1";
  const [stores, setStores] = useState([]);
  const [managers, setManagers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [me, setMe] = useState(null);
  const [showDesc, setShowDesc] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [checklist, setChecklist] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", priority: "Medium", category: "General",
    store_id: "", assigned_to_id: "", assigned_to_name: "", location_tag: "",
    start_date: fmtLocal(new Date()),
    due_date: fmtLocal(new Date(Date.now() + 86400000)),
    shift: "None", repeat_type: "None", repeat_days: [],
    must_finish_before_opening: false, buzzer: false, validations: [],
    reminder_minutes: 0, geo_fence: false, highlight: false, template_name: "", required_proof_photos: 0,
    require_video_proof: false, require_geo_tag_proof: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const [user, storeRes] = await Promise.all([
          base44.auth.me(),
          base44.entities.Store.filter({ active: true }, { limit: 50 }),
        ]);
        setMe(user);
        setStores(storeRes.items || []);
        const userRes = await base44.entities.User.list({ limit: 100 });
        let assignable = (userRes.items || []).filter((u) => ["manager", "tailoring_manager", "tailoring_operator", "admin"].includes(u.role));
        if (user.role === "manager") {
          let cross = false;
          try {
            const pr = await base44.entities.RolePermission.filter({ role: user.role }, { limit: 1 });
            cross = !!pr.items?.[0]?.can_assign_cross_department;
          } catch {}
          if (!cross) assignable = assignable.filter((u) => (u.department || "") === (user.department || ""));
        }
        setManagers(assignable);
        const tplRes = await base44.entities.Task.filter({ template_name: { $exists: true, $ne: "" } }, { limit: 50, fields: ["title", "template_name"] });
        const seen = new Set();
        setTemplates((tplRes.items || []).filter((tp) => tp.id && tp.template_name && !seen.has(tp.template_name) && seen.add(tp.template_name)));
        const savedStore = localStorage.getItem("klassic_store");
        if (savedStore && savedStore !== "all" && (storeRes.items || []).some((s) => s.id === savedStore)) {
          set("store_id", savedStore);
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isTemplateMode && !editId) set("repeat_type", "Daily");
  }, [isTemplateMode, editId]);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const task = await base44.entities.Task.get(editId);
        setForm({
          title: task.title || "", description: task.description || "", priority: task.priority || "Medium", category: task.category || "General",
          store_id: task.store_id || "", assigned_to_id: task.assigned_to_id || "", assigned_to_name: task.assigned_to_name || "", location_tag: task.location_tag || "",
          start_date: task.start_date ? fmtLocal(task.start_date) : "", due_date: task.due_date ? fmtLocal(task.due_date) : "",
          shift: task.shift || "None", repeat_type: task.repeat_type || "None", repeat_days: task.repeat_days || [],
          must_finish_before_opening: !!task.must_finish_before_opening, buzzer: !!task.buzzer, validations: task.validations || [],
          reminder_minutes: task.reminder_minutes || 0, geo_fence: !!task.geo_fence, highlight: !!task.highlight, template_name: task.template_name || "",
          required_proof_photos: task.required_proof_photos || 0, require_video_proof: !!task.require_video_proof, require_geo_tag_proof: !!task.require_geo_tag_proof,
          repeat_interval_months: task.repeat_interval_months,
        });
        setChecklist(task.checklist || []);
        setSubtasks(task.subtasks || []);
        setShowDesc(!!task.description);
      } catch (e) { toast.error("Could not load task"); }
    })();
  }, [editId]);

  const applyTemplate = async (tplName) => {
    if (!tplName) { set("template_name", ""); return; }
    try {
      const res = await base44.entities.Task.filter({ template_name: tplName }, { limit: 1 });
      const tpl = res.items?.[0];
      if (!tpl) return;
      setForm((f) => ({
        ...f,
        title: tpl.title || f.title,
        description: tpl.description || f.description,
        priority: tpl.priority || f.priority,
        category: tpl.category || f.category,
        validations: tpl.validations || [],
        buzzer: tpl.buzzer ?? f.buzzer,
        geo_fence: tpl.geo_fence ?? f.geo_fence,
        repeat_type: tpl.repeat_type || "None",
        shift: tpl.shift || "None",
        template_name: tplName,
      }));
      setChecklist(tpl.checklist || []);
      setSubtasks(tpl.subtasks || []);
      toast.success("Template applied");
    } catch (e) { toast.error("Could not load template"); }
  };

  const saveAsTemplate = async () => {
    if (!form.title.trim()) { toast.error("Enter a task name first"); return; }
    const name = window.prompt("Template name", form.title);
    if (!name) return;
    set("template_name", name);
    toast.success("Template name set — it will be saved with this task");
  };

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Task name required"); return; }
    if (!form.store_id) { toast.error("Store required"); return; }
    if (isTemplateMode && !form.template_name?.trim()) { toast.error("Template name required"); return; }
    try {
      const store = stores.find((s) => s.id === form.store_id);
      const start = form.start_date ? new Date(form.start_date).toISOString() : null;
      const due = form.due_date ? new Date(form.due_date).toISOString() : null;
      const isRecurring = form.repeat_type !== "None";
      const payload = {
        ...form,
        store_name: store?.name,
        start_date: start,
        due_date: due,
        checklist,
        subtasks,
        recurring: isRecurring,
        active: isRecurring || isTemplateMode,
        template_name: isRecurring ? (form.template_name?.trim() || form.title.trim()) : form.template_name,
      };
      if (editId) {
        await base44.entities.Task.update(editId, payload);
        await base44.entities.AuditLog.create({
          module: "Tasks", action: "Task Updated",
          entity_id: editId, entity_name: form.title, actor_id: me.id, actor_name: me.full_name, store_id: form.store_id,
        });
        toast.success("Updated");
        navigate(-1);
      } else {
        await base44.entities.Task.create({ ...payload, created_by_id: me.id, created_by_name: me.full_name });
        await base44.entities.AuditLog.create({
          module: "Tasks", action: isTemplateMode ? "Template Created" : "Task Created",
          entity_name: form.title, actor_id: me.id, actor_name: me.full_name, store_id: form.store_id,
          details: `Due ${due ? new Date(due).toLocaleString() : "—"}${form.assigned_to_name ? ` · Assigned ${form.assigned_to_name}` : ""}`,
        });
        toast.success(isTemplateMode ? "Template created" : "Task created");
        navigate(isTemplateMode ? "/task-admin" : "/tasks");
      }
    } catch (e) { toast.error("Failed: " + (e.message || "error")); }
  };

  const selectedStore = stores.find((s) => s.id === form.store_id);
  const assignedUser = managers.find((m) => m.id === form.assigned_to_id);

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-green-50 border-b border-green-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 text-slate-600"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="font-bold text-slate-900">{editId ? "Edit Task" : isTemplateMode ? "Create Template" : "Create Task"}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowTemplate((v) => !v)} className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-full px-3 py-1.5">
                Use Template <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showTemplate && (
                <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg w-48 max-h-60 overflow-y-auto z-30">
                  {templates.length === 0 && <p className="text-xs text-slate-400 px-3 py-2">No saved templates</p>}
                  {templates.map((tp) => (
                    <button key={tp.id} onClick={() => { applyTemplate(tp.template_name); setShowTemplate(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 truncate">
                      {tp.template_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Task Name */}
        <Field label="Task Name*">
          <div className="relative">
            <Bot className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Enter task name" className="input pl-9" />
          </div>
        </Field>

        {(isTemplateMode || (editId && !!form.template_name)) && (
          <Field label="Template Name*">
            <input value={form.template_name} onChange={(e) => set("template_name", e.target.value)} placeholder="e.g. Morning Shift Checklist" className="input" />
          </Field>
        )}

        {/* Description */}
        {!showDesc ? (
          <button onClick={() => setShowDesc(true)} className="text-sm font-semibold text-green-700 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Description (optional)
          </button>
        ) : (
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="input min-h-[80px]" placeholder="Enter description" />
          </Field>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date & time">
            <DateInput value={form.start_date} onChange={(v) => set("start_date", v)} />
          </Field>
          <Field label="End date & time">
            <DateInput value={form.due_date} onChange={(v) => set("due_date", v)} />
          </Field>
        </div>

        {/* Buzzer */}
        <div className="flex items-start justify-between bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              {form.buzzer ? <BellRing className="w-4 h-4 text-green-700" /> : <Bell className="w-4 h-4 text-slate-400" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Buzzer</p>
              <p className="text-[11px] text-slate-400 leading-tight max-w-[200px]">Sends full screen alerts to user when a task is assigned to them</p>
            </div>
          </div>
          <button onClick={() => set("buzzer", !form.buzzer)} className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${form.buzzer ? "bg-green-600" : "bg-slate-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.buzzer ? "translate-x-4" : ""}`} />
          </button>
        </div>

        {/* Required Proof Photos */}
        <Field label="Required Proof Photos">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => set("required_proof_photos", n)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${form.required_proof_photos === n ? "border-green-600 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600"}`}
              >
                {n === 0 ? "Optional" : n}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Optional = no compulsory photos. Assignee must upload this many photos before they can submit.</p>
        </Field>

        <ProofToggle icon={Video} label="Video Proof" desc="Require a video upload to complete the task." value={form.require_video_proof} onChange={(v) => set("require_video_proof", v)} />
        <ProofToggle icon={MapPin} label="Geo Tag Photo Proof" desc="Require a geo-tagged photo to complete the task." value={form.require_geo_tag_proof} onChange={(v) => set("require_geo_tag_proof", v)} />

        {/* Assign User */}
        <Field label="Assign User*">
          <button onClick={() => setShowAssign(true)} className="input text-left flex items-center justify-between">
            <span className={assignedUser ? "text-slate-800" : "text-slate-400"}>{assignedUser ? assignedUser.full_name : "Select User"}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </button>
        </Field>

        {/* Store + Location */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Store">
            <select value={form.store_id} onChange={(e) => set("store_id", e.target.value)} className="input">
              <option value="">Select store</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          {selectedStore && (
            <Field label="Location">
              <select value={form.location_tag} onChange={(e) => set("location_tag", e.target.value)} className="input">
                <option value="">None</option>
                {(selectedStore.locations || []).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <ActionBtn icon={Clock} label="Repeat" active={form.repeat_type !== "None"} onClick={() => setShowRepeat(true)} />
          <ActionBtn icon={Bell} label="Reminder" active={!!form.reminder_minutes} onClick={() => setShowReminder(true)} />
        </div>

        {/* Checklist */}
        <ChecklistBuilder items={checklist} setItems={setChecklist} />

        {/* Sub-tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-800">Sub Tasks</span>
            <button onClick={() => setSubtasks([...subtasks, { title: "", done: false }])} className="text-xs font-semibold text-green-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Sub Task
            </button>
          </div>
          <div className="space-y-2">
            {subtasks.map((st, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={st.title}
                  onChange={(e) => setSubtasks(subtasks.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                  placeholder="Sub task title"
                  className="input flex-1"
                />
                <button onClick={() => setSubtasks(subtasks.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Shift + before opening */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <Field label="Shift Template">
            <select value={form.shift} onChange={(e) => set("shift", e.target.value)} className="input">
              {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-xs text-slate-600 pb-3">
            <input type="checkbox" checked={form.must_finish_before_opening} onChange={(e) => set("must_finish_before_opening", e.target.checked)} className="w-4 h-4" />
            Before opening (10 AM)
          </label>
        </div>

        {/* Advanced options */}
        <AdvancedOptions form={form} set={set} onSaveTemplate={saveAsTemplate} />
      </div>

      {/* Footer */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 px-4 py-3 flex gap-3 z-40">
        <button onClick={() => navigate(-1)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200">Cancel</button>
        <button onClick={submit} className="flex-[1.5] py-3 rounded-xl text-sm font-semibold text-white bg-green-700 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" /> {editId ? "Update" : isTemplateMode ? "Save Template" : "Create"}
        </button>
      </div>

      {/* Modals */}
      <UserAssignModal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        users={managers}
        selectedId={form.assigned_to_id}
        onAssign={(u) => setForm((f) => ({ ...f, assigned_to_id: u?.id || "", assigned_to_name: u?.full_name || "" }))}
      />
      <RepeatModal open={showRepeat} onClose={() => setShowRepeat(false)} form={form} set={set} />
      <ReminderModal open={showReminder} onClose={() => setShowReminder(false)} value={form.reminder_minutes} onChange={(v) => set("reminder_minutes", v)} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function DateInput({ value, onChange }) {
  return (
    <div className="relative">
      <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className="input pr-9" />
      <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function ActionBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border ${active ? "border-green-600 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600"}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function ProofToggle({ icon: Icon, label, desc, value, onChange }) {
  return (
    <div className="flex items-start justify-between bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-green-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-[11px] text-slate-400 leading-tight max-w-[200px]">{desc}</p>
        </div>
      </div>
      <button onClick={() => onChange(!value)} className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-green-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${value ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}

function RepeatModal({ open, onClose, form, set }) {
  if (!open) return null;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const toggleDay = (d) => {
    const cur = form.repeat_days || [];
    set("repeat_days", cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Repeat</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["None", "Daily", "Weekdays", "Weekly", "Monthly", "Every N Months"].map((r) => (
            <button key={r} onClick={() => { set("repeat_type", r); set("recurring", r !== "None"); }} className={`px-3 py-2 rounded-xl text-xs font-semibold ${form.repeat_type === r ? "bg-green-700 text-white" : "bg-slate-100 text-slate-600"}`}>{r}</button>
          ))}
        </div>
        {form.repeat_type === "Weekly" && (
          <div className="flex gap-1.5 flex-wrap">
            {days.map((d) => (
              <button key={d} onClick={() => toggleDay(d)} className={`w-9 h-9 rounded-lg text-xs font-semibold ${(form.repeat_days || []).includes(d) ? "bg-green-700 text-white" : "bg-slate-100 text-slate-500"}`}>{d}</button>
            ))}
          </div>
        )}
        {form.repeat_type === "Every N Months" && (
          <input type="number" min={1} value={form.repeat_interval_months || ""} onChange={(e) => set("repeat_interval_months", Number(e.target.value))} placeholder="Interval (months)" className="input" />
        )}
        <button onClick={onClose} className="w-full bg-green-700 text-white text-sm font-semibold py-3 rounded-xl">Done</button>
      </div>
    </div>
  );
}

function ReminderModal({ open, onClose, value, onChange }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Reminder</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {REMINDER_OPTIONS.map((r) => (
          <button key={r.value} onClick={() => { onChange(r.value); onClose(); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${value === r.value ? "bg-green-50 text-green-700 border border-green-600" : "text-slate-600 hover:bg-slate-50"}`}>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}