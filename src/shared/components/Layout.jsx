import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthUser } from '../../features/auth/selectors/authSelectors';
import RightSidebar from './RightSidebar';

export default function Layout({ onLogout }) {
  const isAuthed = useSelector(selectIsAuthenticated);
  const user = useSelector(selectAuthUser);
  const { pathname } = useLocation();

  return (
    <div
      style={{
        height: "100vh",               // tam ekran
        display: "grid",
        gridTemplateRows: "56px 1fr",  // header sabit, altı esnek
        background: "var(--gradient)",
        overflow: "hidden",            // body scroll'u engelle
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          backdropFilter: "saturate(180%) blur(6px)",
          color: "var(--text)",
          fontFamily: "var(--font)",
          fontSize: "var(--font-2xl)",
        }}
      >
        <div style={{ fontWeight: 700 }}>RainBotAryana</div>
        {/* ... nav ve kullanıcı kısmı sizdeki gibi */}
      </header>

      {/* SADECE burası scroll yapacak */}
      <main
        style={{
          padding: 16,
          paddingRight: "calc(16px + var(--sidebar-w, 260px))",
          transition: "padding-right .25s ease",
          overflow: "hidden",     // içteki scroller dışında taşmayı kes
        }}
      >
        {/* Kart: %100 yükseklik + içinde ayrı scroller */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            height: "100%",            // minHeight yerine height:%100
            boxShadow: "var(--shadow-md)",
            padding: 16,
            color: "var(--text)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* İç scroller: başlığın altı sadece burada scroll olur */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overscrollBehavior: "contain", // iOS/trackpad bounce azaltır
            }}
          >
            <Outlet />
          </div>
        </div>
      </main>

      <RightSidebar onLogout={onLogout} collapsedDefault={false} />
    </div>
  );
}
