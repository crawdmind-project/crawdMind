import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

/* ---------- Inline icons ---------- */
const svgBase = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const ArrowRightIcon = ({ className = "w-4 h-4" }) => (
  <svg {...svgBase} className={className}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const SparklesIcon = ({ className = "w-4 h-4" }) => (
  <svg {...svgBase} className={className}>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
  </svg>
);

const LightbulbIcon = ({ className = "w-6 h-6" }) => (
  <svg {...svgBase} className={className}>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);

const TrendingUpIcon = ({ className = "w-6 h-6" }) => (
  <svg {...svgBase} className={className}>
    <path d="m22 7-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </svg>
);

const CircleCheckIcon = ({ className = "w-6 h-6" }) => (
  <svg {...svgBase} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ShieldIcon = ({ className = "w-6 h-6" }) => (
  <svg {...svgBase} className={className}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);

const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg {...svgBase} className={className}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

/* ---------- Data (Static) ---------- */
const stats = [
  { value: "10K+", label: "Ideas Collected" },
  { value: "2.5K", label: "Active Users" },
  { value: "850", label: "Ideas Implemented" },
  { value: "95%", label: "User Satisfaction" },
];

const features = [
  {
    title: "Crowdsource Ideas",
    description:
      "Collect brilliant ideas from your entire community with rich descriptions and smart tagging.",
    Icon: LightbulbIcon,
  },
  {
    title: "Community Voting",
    description:
      "Let your community vote on the best ideas with upvotes, downvotes, and detailed discussions.",
    Icon: TrendingUpIcon,
  },
  {
    title: "Track Progress",
    description:
      "Follow ideas through their journey from review to planning to completion.",
    Icon: CircleCheckIcon,
  },
  {
    title: "Smart Moderation",
    description:
      "Built-in moderation tools and duplicate detection keep your platform clean and organized.",
    Icon: ShieldIcon,
  },
];

const steps = [
  {
    number: 1,
    title: "Collect Ideas",
    description:
      "Team members submit ideas with detailed descriptions and relevant tags. Our smart system helps organize and categorize submissions automatically.",
    circle: "bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 shadow-indigo-500/30",
  },
  {
    number: 2,
    title: "Vote & Discuss",
    description:
      "Community members vote on ideas and engage in meaningful discussions. The best ideas naturally rise to the top through democratic participation.",
    circle: "bg-gradient-to-br from-blue-600 to-teal-500 shadow-teal-500/30",
  },
  {
    number: 3,
    title: "Take Action",
    description:
      "Track ideas through implementation stages from planning to completion. Keep everyone informed with status updates and progress tracking.",
    circle: "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-600/30",
  },
];

const footerLinks = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Contact", to: "/contact" },
];

/* ---------- Shared logo ---------- */
function Logo({ dark = false }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500"
    >
      <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-xs font-bold text-white shadow-md shadow-indigo-500/20">
        CM
      </span>
      <span
        className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}
      >
        CrowdMind
      </span>
    </Link>
  );
}

/* ---------- Page ---------- */
export default function LandingPage() {
  const { isAuthenticated } = useSelector((state) => state.auth || {});
  
  const token = sessionStorage.getItem("token");
  const isLoggedIn = Boolean(isAuthenticated && token);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased">
      {/* ===== Navbar + Hero ===== */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-[#f8fafc]">
        {/* Blurred glow circles */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[15%] top-16 w-72 h-72 rounded-full bg-emerald-300/40 blur-3xl" />
          <div className="absolute right-[5%] -top-10 w-80 h-80 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="absolute left-[5%] bottom-5 w-60 h-60 rounded-full bg-sky-200/50 blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative z-10">
          <nav
            aria-label="Main"
            className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"
          >
            <Logo />
            {isLoggedIn ? (
              <Link
                to="/ideas"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-xl border border-indigo-200 bg-white/80 backdrop-blur-sm px-4 py-2 text-xs font-bold text-indigo-600 transition-all hover:bg-white hover:border-indigo-300 shadow-xs"
              >
                Sign In
              </Link>
            )}
          </nav>
        </header>

        {/* Hero */}
        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-12 text-center sm:pt-16">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/60 shadow-xs">
            <SparklesIcon className="w-3.5 h-3.5 text-indigo-600" />
            Trusted by innovative teams worldwide
          </p>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Turn Ideas Into{" "}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Reality
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-600">
            CrowdMind is the collaborative platform that helps teams and
            communities collect, prioritize, and implement the best ideas
            through democratic voting and smart workflows.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isLoggedIn ? (
              <Link
                to="/ideas"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:opacity-95"
              >
                Go to Dashboard
                <ArrowRightIcon />
              </Link>
            ) : (
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:opacity-95"
              >
                Get Started Free
                <ArrowRightIcon />
              </Link>
            )}
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-indigo-200 bg-white/90 px-6 py-3 text-sm font-semibold text-indigo-600 transition-all hover:bg-indigo-50/50 shadow-xs"
            >
              Watch Demo
            </a>
          </div>
        </section>

        {/* Metrics bar */}
        <section
          aria-label="CrowdMind in numbers"
          className="relative z-10 mx-auto max-w-6xl px-6 pb-16"
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 text-center md:grid-cols-4 border-t border-slate-200/60 pt-10">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse gap-1">
                <dt className="text-xs font-medium text-slate-500">{stat.label}</dt>
                <dd className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <main>
        {/* ===== Features ===== */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="bg-[#f8fafc] py-16 border-t border-slate-200/50"
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="features-heading"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
              >
                Everything You Need for Collaborative Innovation
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                From idea collection to implementation, CrowdMind provides all
                the tools your team needs to harness collective intelligence.
              </p>
            </div>

            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ title, description, Icon }) => (
                <li
                  key={title}
                  className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-xs hover:shadow-md transition-shadow"
                >
                  <span className="flex w-12 h-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Icon className="w-6 h-6" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== How it works ===== */}
        <section
          id="how-it-works"
          aria-labelledby="how-heading"
          className="scroll-mt-4 bg-[#f8fafc] pb-20 pt-8"
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="how-heading"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
              >
                How CrowdMind Works
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600">
                Simple, powerful workflow that turns chaos into clarity
              </p>
            </div>

            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {steps.map((step) => (
                <li
                  key={step.number}
                  className="flex flex-col items-center text-center"
                >
                  <span
                    className={`flex w-14 h-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-md ${step.circle}`}
                  >
                    {step.number}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="cta-heading"
          className="bg-gradient-to-r from-violet-600 via-[#4F46E5] to-[#2563EB]"
        >
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <h2
              id="cta-heading"
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white"
            >
              Ready to Unlock Your Team&rsquo;s Potential?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-indigo-100/90 leading-relaxed font-normal">
              Join thousands of teams already using CrowdMind to turn great
              ideas into reality. Start your free account today and see the
              difference collaborative innovation makes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isLoggedIn ? (
                <Link
                  to="/ideas"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all"
                >
                  Go to Dashboard
                  <ArrowRightIcon />
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all"
                >
                  Start Free Today
                  <ArrowRightIcon />
                </Link>
              )}
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-100/90">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-300" />
                No credit card required
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Logo dark />
            <nav aria-label="Footer">
              <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                {footerLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-xs text-slate-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <p className="mt-8 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
            &copy; 2026 CrowdMind. All rights reserved. Built for collaborative innovation.
          </p>
        </div>
      </footer>
    </div>
  );
}