export const MODULES = [
  { key: "tasks", label: "Tasks" },
  { key: "myTasks", label: "My Tasks" },
  { key: "checklists", label: "Checklists" },
  { key: "sheets", label: "Sheets" },
  { key: "tailor", label: "Tailoring" },
  { key: "reports", label: "Reports" },
  { key: "admin", label: "Admin" },
];

export const ACTIONS = ["create", "read", "update", "delete", "export"];

const FULL = ACTIONS.slice();

const roleDefaults = {
  owner: "ALL",
  admin: "ALL",
  mis: { tasks: FULL, myTasks: ["read"], checklists: ["read", "export"], sheets: ["read"], reports: ["read", "export"], admin: ["read"] },
  manager: { tasks: ["create", "read", "update"], myTasks: ["read", "update"], checklists: ["read"], sheets: ["read"], tailor: ["create", "read", "update"], reports: ["read"] },
  tailoring_manager: { tailor: ["create", "read", "update", "delete"], myTasks: ["read", "update"] },
  tailoring_operator: { tailor: ["create", "read", "update"], myTasks: ["read", "update"] },
};

export function defaultMatrixForRole(role) {
  const d = roleDefaults[role] || roleDefaults.manager;
  const m = {};
  MODULES.forEach((mod) => {
    const acts = d === "ALL" ? FULL : (d[mod.key] || []);
    m[mod.key] = {};
    ACTIONS.forEach((a) => { m[mod.key][a] = acts.includes(a); });
  });
  return m;
}

export function migrateModules(modules = []) {
  const m = {};
  MODULES.forEach((mod) => {
    const on = modules.includes(mod.key);
    m[mod.key] = {};
    ACTIONS.forEach((a) => { m[mod.key][a] = on; });
  });
  return m;
}

export function can(matrix, moduleKey, action) {
  return !!(matrix && matrix[moduleKey] && matrix[moduleKey][action]);
}

export function modulesFromMatrix(matrix) {
  if (!matrix) return null;
  return MODULES.filter((m) => matrix[m.key] && matrix[m.key].read).map((m) => m.key);
}

export function emptyMatrix() {
  const m = {};
  MODULES.forEach((mod) => {
    m[mod.key] = {};
    ACTIONS.forEach((a) => { m[mod.key][a] = false; });
  });
  return m;
}