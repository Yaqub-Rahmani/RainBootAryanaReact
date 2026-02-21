// import { useMemo, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { login, fetchMe } from "../../auth/actions/authActions";
// import { selectAuthStatus, selectAuthError } from "../../auth/selectors/authSelectors";
// import { useNavigate, useLocation, Link } from "react-router-dom";
// import Input from "../../../shared/components/Input";
// import Button from "../../../shared/components/Button";
// import "../styles/Login.css";
// import ilogo from "../../../assets/logo/ilogo.svg";
// import { Lock } from "lucide-react";

// export default function LoginPage() {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const location = useLocation();

//   const status = useSelector(selectAuthStatus);
//   const serverError = useSelector(selectAuthError);

//   const [form, setForm] = useState({ email: "", password: "" });
//   const [remember, setRemember] = useState(true);
//   const [showHelp, setShowHelp] = useState(false);

//   // client-side field errors (inputlara gitsin)
//   const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

//   const isLoading = status === "loading";
//   const canSubmit = form.email.trim() && form.password.trim() && !isLoading;

//   const toPath = useMemo(() => {
//     // ProtectedRoute state={{ from: location }} ise:
//     const fromState = location.state?.from;
//     // fromState bir Location objesi olabilir
//     if (fromState && typeof fromState === "object" && typeof fromState.pathname === "string") {
//       return fromState.pathname + (fromState.search || "") + (fromState.hash || "");
//     }
//     // bazen string olarak set edilmiş olabilir
//     if (typeof fromState === "string") return fromState;
//     return "/dashboard";
//   }, [location.state]);

//   const validate = () => {
//     const next = { email: "", password: "" };

//     if (!form.email.trim()) next.email = "ایمیل الزامی است.";
//     if (!form.password.trim()) next.password = "رمز عبور الزامی است.";

//     setFieldErrors(next);
//     return !next.email && !next.password;
//   };

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     if (!validate()) return;
//     if (!canSubmit) return;

//     const action = await dispatch(login(form));

//     if (login.fulfilled.match(action)) {
//       try {
//         localStorage.setItem("remember_me", JSON.stringify(!!remember));
//       } catch {}

//       if (!action.payload) {
//         await dispatch(fetchMe());
//       }

//       navigate(toPath, { replace: true });
//     } else {
//       // server error varsa: ikisini de invalid yap (yanlış şifre/email gibi)
//       if (serverError) {
//         setFieldErrors((p) => ({
//           ...p,
//           email: p.email || " ",
//           password: p.password || " ",
//         }));
//       }
//     }
//   };

//   const clearEmailError = () => setFieldErrors((p) => ({ ...p, email: "" }));
//   const clearPasswordError = () => setFieldErrors((p) => ({ ...p, password: "" }));

//   return (
//     <div className="login-bg">
//       <div className="login-card" dir="rtl">
//         {/* Left */}
//         <aside className="login-left" aria-hidden>
//           <div className="login-left__sticky">
//             <div />
//             <div>
//               <div className="avatar-circle">
//                 <img src={ilogo} alt="App logo" className="avatar-icon" />
//               </div>
//               <div className="brand-copy">
//                 <h3>RainBot</h3>
//                 <p>Akıllı market asistanınız</p>
//               </div>
//             </div>
//             <div />
//           </div>
//         </aside>

//         {/* Right */}
//         <section className="login-right">
//           <header className="login-header">
//             <h2 className="login-title">خوش آمدید</h2>
//             <p className="login-subtitle">وارد حساب کاربری خود شوید.</p>
//           </header>

//           <form className="login-form" onSubmit={onSubmit} noValidate>
//             <Input
//               type="email"
//               label="Email"
//               icon="Mail"
//               placeholder="email@example.com"
//               value={form.email}
//               onChange={(v) => {
//                 setForm((f) => ({ ...f, email: v }));
//                 clearEmailError();
//               }}
//               autoCapitalize="none"
//               required
//               invalid={!!fieldErrors.email || !!serverError}
//               // Input component'iniz destekliyorsa:
//               // helpText={fieldErrors.email || undefined}
//             />
//             {fieldErrors.email ? <p className="error-text">{fieldErrors.email}</p> : null}

//             <Input
//               type="password"
//               label="Password"
//               icon="Lock"
//               placeholder="••••••••"
//               value={form.password}
//               onChange={(v) => {
//                 setForm((f) => ({ ...f, password: v }));
//                 clearPasswordError();
//               }}
//               required
//               invalid={!!fieldErrors.password || !!serverError}
//             />
//             {fieldErrors.password ? <p className="error-text">{fieldErrors.password}</p> : null}

//             <div className="row-between">
//               <label className="remember">
//                 <input
//                   type="checkbox"
//                   checked={remember}
//                   onChange={(e) => setRemember(e.target.checked)}
//                 />
//                 <span>مرا به یاد بسپار</span>
//               </label>

//               <button
//                 type="button"
//                 className="link-forgot"
//                 onClick={() => setShowHelp((s) => !s)}
//               >
//                 رمز خود را فراموش کرده‌اید؟
//               </button>
//             </div>

//             {/* server error (form level) */}
//             {serverError ? <p className="error-text">{serverError}</p> : null}

//             {showHelp && (
//               <p className="muted">
//                 Şifre sıfırlama akışı henüz eklenmedi. Geçici olarak destekle
//                 iletişime geçin.
//               </p>
//             )}

//             <Button
//               type="submit"
//               fullWidth
//               loading={isLoading}
//               icon={Lock}
//               className="mt-2"
//               disabled={!canSubmit}
//             >
//               {isLoading ? "در برسی…" : "ورود به حساب"}
//             </Button>

//             <div className="signup-cta">
//               <span>آیا حساب ندارید?</span>{" "}
//               <Link to="/register" className="link">
//                 حساب جدید
//               </Link>
//             </div>
//           </form>
//         </section>
//       </div>
//     </div>
//   );
// }

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login, fetchMe } from "../../auth/actions/authActions";
import { selectAuthStatus, selectAuthError } from "../../auth/selectors/authSelectors";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import "../styles/Login.css";
import ilogo from "../../../assets/logo/ilogo.svg";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const status = useSelector(selectAuthStatus);
  const serverError = useSelector(selectAuthError);

  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // client-side field errors (inputlara gitsin)
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  const isLoading = status === "loading";
  const canSubmit = form.email.trim() && form.password.trim() && !isLoading;

  const toPath = useMemo(() => {
    const fromState = location.state?.from;
    if (fromState && typeof fromState === "object" && typeof fromState.pathname === "string") {
      return fromState.pathname + (fromState.search || "") + (fromState.hash || "");
    }
    if (typeof fromState === "string") return fromState;
    return "/dashboard";
  }, [location.state]);

  const validate = () => {
    const next = { email: "", password: "" };

    if (!form.email.trim()) next.email = "ایمیل الزامی است.";
    if (!form.password.trim()) next.password = "رمز عبور الزامی است.";

    setFieldErrors(next);
    return !next.email && !next.password;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!canSubmit) return;

    const action = await dispatch(login({ ...form, remember }));

    if (login.fulfilled.match(action)) {
      // login sonrası kullanıcı profilini çek (me endpoint varsa)
      try {
        await dispatch(fetchMe());
      } catch {}

      navigate(toPath, { replace: true });
      return;
    }

    // rejected: action.payload genelde string mesajdır (rejectWithValue)
    const msg = action.payload || action.error?.message;

    if (msg) {
      setFieldErrors((p) => ({
        ...p,
        email: p.email || " ",
        password: p.password || " ",
      }));
    }
  };

  const clearEmailError = () => setFieldErrors((p) => ({ ...p, email: "" }));
  const clearPasswordError = () => setFieldErrors((p) => ({ ...p, password: "" }));

  return (
    <div className="login-bg">
      <div className="login-card" dir="rtl">
        {/* Left */}
        <aside className="login-left" aria-hidden>
          <div className="login-left__sticky">
            <div />
            <div>
              <div className="avatar-circle">
                <img src={ilogo} alt="App logo" className="avatar-icon" />
              </div>
              <div className="brand-copy">
                <h3>RainBot</h3>
                <p>Akıllı market asistanınız</p>
              </div>
            </div>
            <div />
          </div>
        </aside>

        {/* Right */}
        <section className="login-right">
          <header className="login-header">
            <h2 className="login-title">خوش آمدید</h2>
            <p className="login-subtitle">وارد حساب کاربری خود شوید.</p>
          </header>

          <form className="login-form" onSubmit={onSubmit} noValidate>
            <Input
              type="email"
              label="Email"
              icon="Mail"
              placeholder="email@example.com"
              value={form.email}
              onChange={(v) => {
                setForm((f) => ({ ...f, email: v }));
                clearEmailError();
              }}
              autoCapitalize="none"
              required
              invalid={!!fieldErrors.email || !!serverError}
            />
            {fieldErrors.email ? <p className="error-text">{fieldErrors.email}</p> : null}

            <Input
              type="password"
              label="Password"
              icon="Lock"
              placeholder="••••••••"
              value={form.password}
              onChange={(v) => {
                setForm((f) => ({ ...f, password: v }));
                clearPasswordError();
              }}
              required
              invalid={!!fieldErrors.password || !!serverError}
            />
            {fieldErrors.password ? <p className="error-text">{fieldErrors.password}</p> : null}

            <div className="row-between">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>مرا به یاد بسپار</span>
              </label>

              <button
                type="button"
                className="link-forgot"
                onClick={() => setShowHelp((s) => !s)}
              >
                رمز خود را فراموش کرده‌اید؟
              </button>
            </div>

            {/* server error (form level) */}
            {serverError ? <p className="error-text">{serverError}</p> : null}

            {showHelp && (
              <p className="muted">
                Şifre sıfırlama akışı henüz eklenmedi. Geçici olarak destekle iletişime geçin.
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              icon={Lock}
              className="mt-2"
              disabled={!canSubmit}
            >
              {isLoading ? "در برسی…" : "ورود به حساب"}
            </Button>

            <div className="signup-cta">
              <span>آیا حساب ندارید?</span>{" "}
              <Link to="/register" className="link">
                حساب جدید
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
