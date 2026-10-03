import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { defaultMatrixForRole, migrateModules, modulesFromMatrix, can as canFn } from "@/lib/permissions";

let cache = null;

export function usePermissions() {
  const [state, setState] = useState(cache || { matrix: null, modules: null, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (cache) { setState(cache); return; }
      try {
        const me = await base44.auth.me();
        const role = me.role === "admin" ? "owner" : me.role;
        const res = await base44.entities.RolePermission.filter({ role: me.role }, { limit: 1 });
        const rp = res.items?.[0];
        let matrix;
        if (rp?.matrix && Object.keys(rp.matrix).length) matrix = rp.matrix;
        else if (rp?.modules?.length) matrix = migrateModules(rp.modules);
        else matrix = defaultMatrixForRole(role);
        const modules = modulesFromMatrix(matrix) || [];
        const obj = { matrix, modules, loading: false };
        cache = obj;
        if (alive) setState(obj);
      } catch (e) {
        if (alive) setState({ matrix: null, modules: null, loading: false });
      }
    })();
    return () => { alive = false; };
  }, []);

  const can = (moduleKey, action) => canFn(state.matrix, moduleKey, action);
  return { ...state, can };
}

export function clearPermissionsCache() { cache = null; }