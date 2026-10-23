import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "../api/axios";
import { setLogin, fetchCurrentUser } from "../store/authSlice";

const unwrap = (res) => (res.data?.data !== undefined ? res.data.data : res.data);
const errMsg = (e) => e?.response?.data?.message || e?.message || "Something went wrong";
const isStaffRole = (role) => role === "ADMIN" || role === "MODERATOR";

// Logins, stores the JWT, loads the profile and updates Redux state
async function signIn(email, password, remember, dispatch) {
  const res = await api.post("/auth/login", { email, password });
  const token = res.data?.token;
  if (!token) throw new Error("Login succeeded but no token was returned.");
  
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  (remember ? localStorage : sessionStorage).setItem("token", token);

  const me = unwrap(await api.get("/auth/me"));
  
  dispatch(setLogin({ token, user: me }));
  return me;
}

function Logo() {
  return (
    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 text-2xl font-bold text-white shadow-lg shadow-indigo-200">
      CM
    </span>
  );
}

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-100 to-indigo-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/70">
        <div className="mb-6 text-center">
          <Logo />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {children}
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, type = "text", ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-800">{label}</span>
      <span className="relative block">
        <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          {...props}
          type={isPassword && show ? "text" : type}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </span>
    </label>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;
  return <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{message}</p>;
}

const submitBtn =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

export function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const me = await signIn(form.email.trim(), form.password, remember, dispatch);
      navigate(isStaffRole(me?.role) ? "/moderation" : "/ideas", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotBusy(true);
    setForgotMsg(null);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail.trim() });
      setForgotMsg({ ok: true, text: "If that email has an account, a reset link is on its way. It expires in 30 minutes." });
    } catch (err) {
      setForgotMsg({ ok: false, text: err.response?.status === 429 ? "Too many attempts. Please wait a few minutes and try again." : errMsg(err) });
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <Shell
      title="Welcome back"
      subtitle="Sign in to your CrowdMind account"
      footer={<>Don't have an account? <Link to="/register" className="font-medium text-indigo-600 hover:underline">Sign up</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBox message={error} />
        <Field
          label="Email address"
          icon={Mail}
          type="email"
          required
          autoComplete="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Field
          label="Password"
          icon={Lock}
          type="password"
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => { setForgotMsg(null); setForgotEmail(form.email); setForgotOpen(true); }}
            className="font-medium text-indigo-600 hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <button type="submit" disabled={busy} className={submitBtn}>
          {busy ? "Signing in..." : <>Sign In <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setForgotOpen(false)}
        >
          <form
            onSubmit={handleForgot}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Reset your password</h2>
              <button type="button" onClick={() => setForgotOpen(false)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500">Enter your email and we'll send you a link to choose a new password.</p>
            {forgotMsg && (
              <p className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm ${forgotMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {forgotMsg.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                {forgotMsg.text}
              </p>
            )}
            <Field
              label="Email address"
              icon={Mail}
              type="email"
              required
              placeholder="Enter your email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            <button type="submit" disabled={forgotBusy} className={submitBtn}>
              {forgotBusy ? "Sending..." : "Send reset link"}
            </button>
          </form>
        </div>
      )}
    </Shell>
  );
}

export function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const bytes = new TextEncoder().encode(form.password).length;
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (bytes > 72) return setError("Password is too long (72 bytes maximum).");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (!terms) return setError("Please accept the Terms of Service and Privacy Policy.");

    setBusy(true);
    try {
      await api.post("/auth/register", {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      await signIn(form.email.trim(), form.password, true, dispatch);
      navigate("/ideas", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title="Join CrowdMind"
      subtitle="Create your account and start collaborating"
      footer={<>Already have an account? <Link to="/login" className="font-medium text-indigo-600 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBox message={error} />
        <Field label="Full name" icon={User} required maxLength={100} autoComplete="name" placeholder="Enter your full name" value={form.fullName} onChange={set("fullName")} />
        <Field label="Email address" icon={Mail} type="email" required autoComplete="email" placeholder="Enter your email" value={form.email} onChange={set("email")} />
        <Field label="Password" icon={Lock} type="password" required autoComplete="new-password" placeholder="Create a strong password" value={form.password} onChange={set("password")} />
        <Field label="Confirm password" icon={Lock} type="password" required autoComplete="new-password" placeholder="Confirm your password" value={form.confirm} onChange={set("confirm")} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
          />
          <span>
            I agree to the <a href="#" className="font-medium text-indigo-600 hover:underline">Terms of Service</a> and{" "}
            <a href="#" className="font-medium text-indigo-600 hover:underline">Privacy Policy</a>
          </span>
        </label>
        <button type="submit" disabled={busy} className={submitBtn}>
          {busy ? "Creating account..." : <>Create Account <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </Shell>
  );
}

export default Login;