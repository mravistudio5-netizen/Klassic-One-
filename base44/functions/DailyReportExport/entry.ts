import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const SHEET_TITLE = "Klassic Ops Daily Reports";
const HEADERS = ["Date", "Store", "Manager", "Tasks Total", "Tasks Done", "On-Time", "Checklist %"];

// Returns the bounds of the current IST calendar day as UTC ISO strings + the YYYY-MM-DD label.
function istDayBounds() {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const y = istNow.getUTCFullYear();
  const m = istNow.getUTCMonth();
  const d = istNow.getUTCDate();
  const start = new Date(Date.UTC(y, m, d) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d + 1) - IST_OFFSET_MS);
  const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { start: start.toISOString(), end: end.toISOString(), dateStr };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;
    const { start, end, dateStr } = istDayBounds();

    const { accessToken } = await b.connectors.getConnection("googlesheets");

    const dueRange = { $gte: start, $lt: end };

    // Tasks due today (bounded) — derive names/store from the records themselves.
    const taskRes = await b.entities.Task.filter(
      { due_date: dueRange, assigned_to_id: { $ne: "" } },
      { limit: 500, fields: ["assigned_to_id", "assigned_to_name", "store_name", "status", "on_time"] }
    );
    const taskMap = {};
    for (const t of (taskRes.items || [])) {
      const id = t.assigned_to_id;
      if (!taskMap[id]) taskMap[id] = { name: t.assigned_to_name || "—", store: t.store_name || "", total: 0, done: 0, onTime: 0 };
      const e = taskMap[id];
      e.total++;
      if (["Done", "Approved"].includes(t.status)) e.done++;
      if (t.on_time) e.onTime++;
      if (!e.store && t.store_name) e.store = t.store_name;
    }

    // Checklist entries for today (bounded) — manager_name + store come from the record.
    const chkRes = await b.entities.ChecklistEntry.filter(
      { date: dateStr },
      { limit: 500, fields: ["manager_id", "manager_name", "store_id", "completed_pct"] }
    );
    const chkMap = {};
    for (const c of (chkRes.items || [])) {
      const id = c.manager_id;
      if (!id) continue;
      // keep the highest completion % if a manager has multiple checklists
      const pct = Math.round(c.completed_pct || 0);
      if (!chkMap[id] || pct > chkMap[id].pct) {
        chkMap[id] = { name: c.manager_name || "—", store: c.store_id || "", pct };
      }
    }

    const managerIds = Array.from(new Set([...Object.keys(taskMap), ...Object.keys(chkMap)]));
    const rows = managerIds.map((id) => {
      const t = taskMap[id] || {};
      const c = chkMap[id] || {};
      return [
        dateStr,
        t.store || c.store || "",
        t.name || c.name || "—",
        t.total || 0,
        t.done || 0,
        t.onTime || 0,
        c.pct != null ? `${c.pct}%` : "",
      ];
    });

    // Find an existing sheet created by this app, else create it.
    let sheetId;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='" + SHEET_TITLE + "' and trashed=false")}&fields=files(id,name)&pageSize=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      sheetId = searchData.files[0].id;
    } else {
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ properties: { title: SHEET_TITLE } }),
      });
      const createData = await createRes.json();
      sheetId = createData.spreadsheetId;
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:G1?valueInputOption=RAW`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [HEADERS] }),
      });
    }

    if (rows.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: rows }),
      });
    }

    return Response.json({ ok: true, date: dateStr, managers: rows.length, sheetId, sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}