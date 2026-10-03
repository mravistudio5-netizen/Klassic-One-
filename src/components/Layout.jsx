import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/i18n";
import { Home as HomeIcon, CheckSquare, FileSpreadsheet, Scissors, BarChart3, LogOut, Store as StoreIcon, Globe, ShieldCheck, ListChecks } from "lucide-react";
import { migrateModules, defaultMatrixForRole, modulesFromMatrix, can as canFn } from "@/lib/permissions";

const roleNav = {
  owner: ["home", "tasks", "checklists", "sheets", "tailor", "reports", "admin"],
  mis: ["home", "tasks", "checklists", "reports"],
  manager: ["home", "myTasks", "checklists", "sheets", "tailor"],
  tailoring_manager: ["home", "tailor"],
  tailoring_operator: ["home", "tailor"],
};

export default function Layout() {
  const { t, lang, setLang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [activeStoreId, setActiveStoreId] = useState(localStorage.getItem("klassic_store") || "all");
  const [loading, setLoading] = useState(true);
  const [perm, setPerm] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const res = await base44.entities.Store.filter({}, { limit: 100 });
        setStores(res.items || []);
        try {
          const pr = await base44.entities.RolePermission.filter({ role: me.role }, { limit: 1 });
          setPerm(pr.items?.[0] || null);
        } catch (e) { /* permissions optional */ }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setStore = (id) => {
    setActiveStoreId(id);
    localStorage.setItem("klassic_store", id);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  const role = user?.role === "admin" ? "owner" : (user?.role || "manager");
  const fallbackModules = (roleNav[role] || roleNav.manager).filter((k) => k !== "home");
  const matrix = perm?.matrix && Object.keys(perm.matrix).length ? perm.matrix : (perm?.modules?.length ? migrateModules(perm.modules) : defaultMatrixForRole(role));
  const matrixModules = modulesFromMatrix(matrix);
  const modules = matrixModules?.length ? matrixModules : fallbackModules;
  const can = (m, a) => canFn(matrix, m, a);
  const navItems = ["home", ...modules];

  const navConfig = {
    home: { icon: HomeIcon, label: t("home"), path: "/" },
    tasks: { icon: CheckSquare, label: t("tasks"), path: "/tasks" },
    myTasks: { icon: CheckSquare, label: t("myTasks"), path: "/my-tasks" },
    sheets: { icon: FileSpreadsheet, label: t("sheets"), path: "/sheets" },
    tailor: { icon: Scissors, label: t("tailor"), path: "/tailor" },
    reports: { icon: BarChart3, label: t("reports"), path: "/reports" },
    checklists: { icon: ListChecks, label: t("checklists"), path: "/checklists" },
    admin: { icon: ShieldCheck, label: "Admin", path: "/admin" },
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const showStoreSwitcher = (role === "owner" || role === "mis" || role === "admin") && stores.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-30">
        <div className="px-5 py-4 border-b border-slate-100">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">{t("appName")}</h1>
          <p className="text-[11px] text-slate-500 -mt-0.5">
            {user?.full_name || user?.email} · {role === "owner" ? "Owner" : role}
          </p>
        </div>

        {showStoreSwitcher && (
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 mb-2">
              <StoreIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("allStores")}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
              <button
                onClick={() => setStore("all")}
                className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium ${activeStoreId === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {t("allStores")}
              </button>
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStore(s.id)}
                  className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium ${activeStoreId === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1 no-scrollbar">
          {navItems.map((key) => {
            const item = navConfig[key];
            const active = location.pathname === item.path;
            return (
              <Link
                key={key}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === "en" ? "EN" : "हि"}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 px-2.5 py-1.5">
            <LogOut className="w-4 h-4" />
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">{t("appName")}</h1>
            <p className="text-[11px] text-slate-500 -mt-0.5">
              {user?.full_name || user?.email} · {role === "owner" ? "Owner" : role}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "en" ? "EN" : "हि"}
            </button>
            <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        {showStoreSwitcher && (
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <StoreIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => setStore("all")}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium ${activeStoreId === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {t("allStores")}
            </button>
            {stores.map((s) => (
              <button
                key={s.id}
                onClick={() => setStore(s.id)}
                className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium ${activeStoreId === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="md:ml-64">
        <div className="max-w-md md:max-w-5xl mx-auto px-4 md:px-8 py-4 pb-24 md:pb-10">
          <Outlet context={{ user, stores, activeStoreId, setStore, modules, can }} />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 z-30">
        <div className="flex justify-around items-center h-16">
          {navItems.map((key) => {
            const item = navConfig[key];
            const active = location.pathname === item.path;
            return (
              <Link
                key={key}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${active ? "text-slate-900" : "text-slate-400"}`}
              >
                <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}