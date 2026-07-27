import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useBusiness } from "../context/BusinessContext";
import { signOutUser, useAuth } from "../context/AuthContext";
import {
  BoxIcon,
  DotsIcon,
  GearIcon,
  HomeIcon,
  PlusIcon,
  ReceiptIcon,
  UsersIcon,
  WalletIcon,
  WrenchIcon,
} from "./icons";

const FAB_ROUTES = new Set(["/", "/invoices", "/customers", "/jobs", "/items", "/expenses"]);

export function Shell() {
  const { business, modules, noun } = useBusiness();
  const { user } = useAuth();
  const { pathname } = useLocation();

  const tabs = [
    { to: "/", label: "Home", icon: HomeIcon, end: true },
    { to: "/invoices", label: "Sales", icon: ReceiptIcon, end: false },
    ...(modules.jobs ? [{ to: "/jobs", label: "Jobs", icon: WrenchIcon, end: false }] : []),
    { to: "/customers", label: "Customers", icon: UsersIcon, end: false },
    { to: "/more", label: "More", icon: DotsIcon, end: false },
  ];

  const sideNav = [
    { to: "/", label: "Home", icon: HomeIcon, end: true },
    { to: "/invoices", label: "Sales & receipts", icon: ReceiptIcon, end: false },
    ...(modules.jobs ? [{ to: "/jobs", label: "Jobs", icon: WrenchIcon, end: false }] : []),
    { to: "/customers", label: "Customers", icon: UsersIcon, end: false },
    { to: "/items", label: noun, icon: BoxIcon, end: false },
    { to: "/expenses", label: "Expenses", icon: WalletIcon, end: false },
    { to: "/settings", label: "Settings", icon: GearIcon, end: false },
  ];

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-card lg:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <img src="/icon.svg" alt="" width={34} height={34} />
          <div className="min-w-0">
            <p className="truncate font-display text-[17px] font-bold leading-tight">
              {business.name}
            </p>
            <p className="small-caps-label">Counterbook</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {sideNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-medium ${
                  isActive
                    ? "bg-brand-tint text-brand-deep"
                    : "text-ink-soft hover:bg-paper hover:text-ink"
                }`
              }
            >
              <Icon width={20} height={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-5 py-4">
          <p className="truncate text-[13px] text-ink-faint">{user?.email}</p>
          <button
            onClick={signOutUser}
            className="mt-1 text-[13px] font-semibold text-ink-soft hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-5 lg:px-8 lg:pb-16 lg:pt-8">
        <Outlet />
      </main>

      {/* New sale FAB */}
      {FAB_ROUTES.has(pathname) && (
        <Link
          to="/invoices/new"
          className="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-brand px-5 font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-deep lg:bottom-10 lg:right-10"
        >
          <PlusIcon width={20} height={20} />
          New sale
        </Link>
      )}

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-2xl">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  isActive ? "text-brand-deep" : "text-ink-faint"
                }`
              }
            >
              <Icon width={22} height={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
