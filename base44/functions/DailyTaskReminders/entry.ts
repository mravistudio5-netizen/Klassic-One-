import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const res = await b.entities.Task.filter(
      { status: { $nin: ["Done", "Approved", "Cancelled"] }, due_date: { $lte: endOfToday.toISOString() } },
      { limit: 500, fields: ["assigned_to_id", "assigned_to_name", "due_date", "status", "title"] }
    );

    const byUser = {};
    for (const t of (res.items || [])) {
      if (!t.assigned_to_id) continue;
      if (!byUser[t.assigned_to_id]) byUser[t.assigned_to_id] = { name: t.assigned_to_name || "User", due: 0, overdue: 0 };
      const isOverdue = t.due_date && new Date(t.due_date) < now;
      if (isOverdue) byUser[t.assigned_to_id].overdue++;
      else byUser[t.assigned_to_id].due++;
    }

    let sent = 0;
    for (const [uid, info] of Object.entries(byUser)) {
      const title = info.overdue > 0 ? `${info.overdue} overdue task(s)` : `${info.due} task(s) due today`;
      const content = `You have ${info.due} task(s) due today${info.overdue ? ` and ${info.overdue} overdue` : ""}. Open the app to view them.`;
      try {
        await b.integrations.Core.SendPushNotification({ user_id: uid, title, content, action_label: "View Tasks", action_url: "/my-tasks" });
        sent++;
      } catch (e) {
        // push credentials may not be configured yet — skip this user
      }
    }
    return Response.json({ ok: true, users: Object.keys(byUser).length, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}