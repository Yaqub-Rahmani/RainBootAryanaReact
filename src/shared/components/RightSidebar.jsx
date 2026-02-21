import { useMemo, useEffect, useLayoutEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home, Store, Users, BadgePercent, Building2, Receipt, UsersRound,
  Settings, LogOut, ChevronLeft, ChevronRight,
  NotebookPen,
  Shield
} from "lucide-react";
import { selectAuthUser, selectIsAuthenticated } from "../../features/auth/selectors/authSelectors";
import Button from "./Button";

/**
 * RightSidebar (RTL)
 * - Yalnızca tıklanan buton aktif (exclusive)
 * - Dark mode’da global stilleri kesin olarak override eder (scoped <style> + !important)
 * - Toggle ve kullanıcı bilgisi yer değiştirdi
 */

const LS_KEY = "sidebar:collapsed";

export default function RightSidebar({ onLogout, collapsedDefault = false }) {
  const isAuthed = useSelector(selectIsAuthenticated);
  const user = useSelector(selectAuthUser);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [selectedKey, setSelectedKey] = useState(pathname);
  useEffect(() => { setSelectedKey(pathname); }, [pathname]);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved === null ? collapsedDefault : saved === "true";
    } catch {
      return collapsedDefault;
    }
  });

  // ilk genişlik ataması (flicker’ı önle)
  useLayoutEffect(() => {
    const w = collapsed ? "72px" : "260px";
    document.body.style.setProperty("--sidebar-w", w);
    return () => document.body.style.removeProperty("--sidebar-w");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const w = collapsed ? "72px" : "260px";
    document.body.style.setProperty("--sidebar-w", w);
    try { localStorage.setItem(LS_KEY, String(collapsed)); } catch {}
  }, [collapsed]);

  const items = useMemo(
    () => [
      { to: "/",            label: "صفحه اصلی",    icon: Home },
      { to: "/shops",       label: "دوکان ها",      icon: Store },
      { to: "/contracts",   label: "قرار داد ها",        icon: NotebookPen },
      { to: "/owners",      label: "مالکین",        icon: Users },
      { to: "/franchisees", label: "صاحبان امتیاز", icon: BadgePercent },
      { to: "/tenants",     label: "مستأجران", icon: Building2 },
      { to: "/expenses",    label: "مصارف",         icon: Receipt },
      { to: "/admins", label: "ادمین ها", icon: Shield },
      { to: "/employees",   label: "کارمندان",      icon: UsersRound },
      // { to: '/employees', label: 'کارمندان', icon: UsersRound },
      { to: "/settings",    label: "تنظیمات",       icon: Settings },
    ],
    []
  );

  function handleToggle() { setCollapsed(v => !v); }
  function handleToggleKey(e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggle(); }
  }

  return (
    <aside
      id="right-sidebar"
      dir="rtl"
      aria-label="نوار کناری راست"
      style={{
        position: "fixed",
        top: 56,
        right: 0,
        height: "calc(100vh - 56px)",
        width: "var(--sidebar-w)",
        transition: "width .25s ease",
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        zIndex: 30,
        color: "var(--text)",
        fontFamily: "var(--font-farsi), var(--font)",
        overflow: "hidden",
      }}
    >
      {/* SCOPED OVERRIDES: karanlık modda yalnızca seçili buton yeşil kalsın */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            #right-sidebar nav .nav-btn {
              background: transparent !important;
              color: var(--text) !important;
              box-shadow: none !important;
              outline: none !important;
            }
            #right-sidebar nav .nav-btn[data-selected="true"] {
              background: var(--accent) !important;
              color: var(--accent-contrast) !important;
            }
            #right-sidebar nav .nav-btn:hover {
              background: var(--surface-muted) !important;
            }
            #right-sidebar nav .nav-btn[data-selected="true"]:hover {
              background: var(--accent) !important; /* seçiliyken hover rengi değişmesin */
            }
          `.trim()
        }}
      />

      {/* Üst bar: Kullanıcı (solda) + Toggle (sağda) */}
      <div
        style={{
          padding: "6px 8px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 48,
        }}
      >
        {/* Kullanıcı durumu */}
        {!collapsed && isAuthed && (
          <div aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              aria-label="وضعیت: فعال"
              title="فعال"
              style={{
                width: 15, height: 15, borderRadius: 999,
                background: "var(--secondary, #FE893C)",
                boxShadow: "0 0 0 2px var(--surface)",
              }}
            />
            <div style={{ fontWeight: 700, color: "var(--text)" }}>
              {`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "آنلاین"}
            </div>
          </div>
        )}

        {/* Toggle */}

        <Button
          ariaLabel={collapsed ? "گسترش نوار کناری" : "جمع کردن نوار کناری"}
          aria-expanded={!collapsed}
          title={collapsed ? "گسترش" : "جمع کردن"}
          onClick={handleToggle}
          onKeyDown={handleToggleKey}
          icon={collapsed ? ChevronLeft : ChevronRight }
          iconOnly={true}
          className={`transition-transform duration-150 ease-out`}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        />


      </div>

      {/* Nav */}
      <nav aria-label="ناوبری" style={{ padding: "8px", overflowY: "auto" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {items.map(({ to, label, icon: Icon }) => {
            const selected = selectedKey === to;
            return (
              <li key={to} style={{ background: "transparent" }}>
                <button
                  type="button"
                  role="link"
                  data-selected={selected ? "true" : "false"}
                  className="nav-btn"
                  onClick={() => { setSelectedKey(to); navigate(to); }}
                  title={collapsed ? label : undefined}
                  style={{
                    all: "unset",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    padding: "10px 12px",
                    minHeight: 44,
                    borderRadius: "var(--radius-md)",
                    // temel renkleri inline veriyoruz; nihai görünümü scoped CSS garanti ediyor
                    background: selected ? "var(--accent)" : "transparent",
                    color: selected ? "var(--accent-contrast)" : "var(--text)",
                    fontSize: "var(--font-base)",
                    fontWeight: selected ? 700 : 500,
                    transition: "background .15s ease, color .15s ease, transform .05s ease",
                    outline: "none",
                    boxShadow: "none",
                  }}
                >
                  <span style={{ width: 24, display: "inline-flex", justifyContent: "center" }}>
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  {!collapsed && <span aria-hidden={collapsed}>{label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      {isAuthed && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "8px" }}>
          <button
            type="button"
            onClick={onLogout}
            aria-label="خروج از حساب"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "10px 12px",
              minHeight: 44,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              color: "var(--text)",
              fontSize: "var(--font-base)",
              outline: "none",
              boxShadow: "none",
            }}
          >
            <LogOut size={20} />
            {!collapsed && <span>خروج</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
