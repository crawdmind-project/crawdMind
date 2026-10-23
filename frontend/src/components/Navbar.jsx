import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchCurrentUser, setLogout } from "../store/authSlice";
import api from "../api/axios";
import NotificationsDropdown from "./Notifications";
import {
  Lightbulb,
  Trophy,
  ShieldAlert,
  Users,
  Search,
  Plus,
  User,
  LogOut,
  ChevronDown,
  LogIn,
  UserPlus,
} from "lucide-react";

function initials(name = "User") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ name }) {
  return (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-sm font-medium text-indigo-600 shadow-2xs">
      {initials(name)}
    </span>
  );
}

export default function Navbar({ onOpenNewIdeaModal }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(fetchCurrentUser());
    }
  }, [isAuthenticated, user, dispatch, location.pathname]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout").catch(() => {});
    } finally {
      dispatch(setLogout());
      navigate("/login", { replace: true });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/ideas?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isStaff = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const isAdmin = user?.role === "ADMIN";

  const navLinks = [
    { label: "Ideas", path: "/ideas", icon: Lightbulb },
    { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
    ...(isStaff ? [{ label: "Moderation", path: "/moderation", icon: ShieldAlert }] : []),
    ...(isAdmin ? [{ label: "Users", path: "/admin/users", icon: Users }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 rounded-xl focus:outline-none">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-sm font-medium text-white shadow-md shadow-indigo-500/20">
              CM
            </span>
            <span className="text-base font-medium tracking-tight text-slate-900 hidden sm:inline">
              CrowdMind
            </span>
          </Link>

          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1.5">
              {navLinks.map(({ label, path, icon: Icon }) => {
                const active = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                      active
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {isAuthenticated && (
          <form onSubmit={handleSearchSubmit} className="relative hidden lg:block w-64 xl:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ideas..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs"
            />
          </form>
        )}

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <button
                type="button"
                onClick={onOpenNewIdeaModal || (() => navigate("/ideas"))}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">New Idea</span>
              </button>

              <NotificationsDropdown />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 cursor-pointer"
                >
                  <Avatar name={user.fullName} />
                  <div className="hidden md:flex flex-col text-left leading-tight">
                    <span className="text-sm font-medium text-slate-900 truncate max-w-[110px]">
                      {user.fullName}
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="size-4 text-slate-400 hidden md:block" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-100 bg-white py-2 shadow-xl z-50 text-sm">
                    <div className="px-4 py-2.5 border-b border-slate-100 md:hidden">
                      <p className="font-medium text-slate-900">{user.fullName}</p>
                      <p className="text-xs text-indigo-600 font-semibold uppercase">{user.role}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      <User className="size-4 text-indigo-600" />
                      Profile Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-red-600 hover:bg-red-50 font-medium transition-colors cursor-pointer border-t border-slate-100"
                    >
                      <LogOut className="size-4 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
              >
                <LogIn className="size-4 text-indigo-600" />
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
              >
                <UserPlus className="size-4" />
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}