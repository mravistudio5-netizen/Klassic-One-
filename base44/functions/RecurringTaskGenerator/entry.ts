import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// IST = UTC+5:30
function istNow() {
  return new Date(Date.now() + (5.5 * 60 * 60 * 1000));
}
function istDateStr(d) {
  return d.toISOString().slice(0, 10);
}
function istDateTime(dateStr, time) {
  return new Date(`${dateStr}T${time}:00+05:30`).toISOString();
}
function shiftTimes(shift) {
  switch (shift) {
    case "Morning": return { start: "09:00", due: "12:00" };
    case "Afternoon": return { start: "13:00", due: "17:00" };
    case "Opening": return { start: "10:00", due: "12:00" };
    case "Closing": return { start: "18:00", due: "21:00" };
    case "Nightly": return { start: "20:00", due: "23:59" };
    default: return { start: "10:00", due: "23:59" };
  }
}
function matchesToday(tpl, istNowDate) {
  const rt = tpl.repeat_type || "None";
  if (rt === "None") return false;
  if (rt === "Daily") return true;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayName = dayNames[istNowDate.getUTCDay()];
  if (rt === "Weekdays") return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(todayName);
  if (rt === "Weekly") return (tpl.repeat_days || []).includes(todayName);
  if (rt === "Monthly") {
    const startDay = tpl.start_date ? new Date(tpl.start_date).getUTCDate() : 1;
    return istNowDate.getUTCDate() === startDay;
  }
  if (rt === "Every N Months") {
    const n = tpl.repeat_interval_months || 1;
    const start = tpl.start_date ? new Date(tpl.start_date) : null;
    if (!start) return false;
    const monthsDiff = (istNowDate.getUTCFullYear() - start.getUTCFullYear()) * 12 + (istNowDate.getUTCMonth() - start.getUTCMonth());
    return monthsDiff >= 0 && monthsDiff % n === 0 && istNowDate.getUTCDate() === start.getUTCDate();
  }
  return false;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const now = istNow();
    const todayStr = istDateStr(now);

    const [existingRes, templatesRes] = await Promise.all([
      svc.entities.Task.filter({ generated_for_date: todayStr, source_template_id: { $exists: true, $ne: "" } }, { limit: 500, fields: ["source_template_id"] }),
      svc.entities.Task.filter({ template_name: { $exists: true, $ne: "" }, active: true }, { limit: 200 }),
    ]);

    const doneIds = new Set((existingRes.items || []).map((t) => t.source_template_id));
    const toCreate = [];
    for (const tpl of (templatesRes.items || [])) {
      if (doneIds.has(tpl.id)) continue;
      if (!matchesToday(tpl, now)) continue;
      const { start, due } = shiftTimes(tpl.shift);
      toCreate.push({
        title: tpl.title,
        description: tpl.description,
        priority: tpl.priority || "Medium",
        category: tpl.category || "General",
        store_id: tpl.store_id,
        store_name: tpl.store_name,
        assigned_to_id: tpl.assigned_to_id || "",
        assigned_to_name: tpl.assigned_to_name || "",
        location_tag: tpl.location_tag || "",
        start_date: istDateTime(todayStr, start),
        due_date: istDateTime(todayStr, due),
        must_finish_before_opening: !!tpl.must_finish_before_opening,
        buzzer: !!tpl.buzzer,
        validations: tpl.validations || [],
        required_proof_photos: tpl.required_proof_photos || 0,
        require_video_proof: !!tpl.require_video_proof,
        require_geo_tag_proof: !!tpl.require_geo_tag_proof,
        checklist: (tpl.checklist || []).map((c) => ({ ...c, done: false })),
        subtasks: (tpl.subtasks || []).map((s) => ({ ...s, done: false })),
        status: "Pending",
        recurring: true,
        repeat_type: tpl.repeat_type || "None",
        shift: tpl.shift || "None",
        template_name: tpl.template_name,
        source_template_id: tpl.id,
        generated_for_date: todayStr,
        reminder_minutes: tpl.reminder_minutes || 0,
        geo_fence: !!tpl.geo_fence,
      });
    }

    let created = 0;
    if (toCreate.length) {
      await svc.entities.Task.bulkCreate(toCreate);
      created = toCreate.length;
    }
    return Response.json({ ok: true, active_templates: (templatesRes.items || []).length, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}