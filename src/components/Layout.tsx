import { NavLink, Outlet, useLocation } from "react-router-dom";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/explore", label: "Explore" },
  { to: "/geography", label: "Geography" },
  { to: "/quality", label: "Data Quality" },
  { to: "/chat", label: "AI Agent" },
  { to: "/docs", label: "Wiki" },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-ink-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-950 text-saffron-400 font-display font-bold text-lg">
              IG
            </div>
            <div>
              <div className="font-display text-lg font-semibold text-ink-950 leading-tight group-hover:text-saffron-600 transition">
                Indian Govt Org Chart
              </div>
              <div className="text-xs text-ink-500 hidden sm:block">
                Open government data for India
              </div>
            </div>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/" || item.to === "/docs"}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-ink-950 text-white"
                      : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <nav className="md:hidden flex overflow-x-auto gap-1 px-4 pb-2 scrollbar-hide">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/" || item.to === "/docs"}
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-ink-950 text-white"
                    : "bg-ink-100 text-ink-600"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet key={location.pathname} />
      </main>

      <footer className="border-t border-ink-200/80 bg-white mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-500">
          <p>
            Data: ODC-By · Code: MIT · Official contacts only
          </p>
          <a
            href="https://github.com/Djay96/indian-govt-org-chart"
            target="_blank"
            rel="noreferrer"
            className="hover:text-saffron-600 transition"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
