import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useUser } from "../auth/UserContext";
import { dashboardFor, useLogout } from "../auth/useAuth";
import { Button, LinkButton } from "../ui/Button";
import { Logo, MenuIcon, XIcon } from "../ui/Icons";
import { Monogram } from "../ui/Display";
import type { User } from "../lib/types";
import { useNotifications } from "../lib/useNotifications";

interface NavItem { to: string; label: string; end?: boolean; badge?: number }

function navFor(user: User | null): NavItem[] {
  if (!user) return [{ to: "/services", label: "Find help" }];
  if (user.type === "Service Provider") {
    return [
      { to: "/dashboard/serviceprovider", label: "Dashboard", end: true },
      { to: "/dashboard/serviceprovider/bookings", label: "Bookings" },
      { to: "/dashboard/serviceprovider/services", label: "My services" },
      { to: "/dashboard/serviceprovider/availability", label: "Availability" },
      { to: "/dashboard/serviceprovider/profile", label: "Profile" },
      { to: "/notifications", label: "Updates" },
    ];
  }
  return [
    { to: "/dashboard/member", label: "Dashboard" },
    { to: "/services", label: "Find help" },
    { to: "/bookings", label: "My bookings" },
    { to: "/notifications", label: "Updates" },
  ];
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex h-9 items-center rounded-ui px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
    isActive ? "bg-accent-soft text-ink" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
  }`;

function NavLabel({ item }: { item: NavItem }) {
  return (
    <>
      {item.label}
      {item.badge ? (
        <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-accent-ink" aria-hidden>
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      ) : null}
      {item.badge ? <span className="sr-only"> ({item.badge} unread)</span> : null}
    </>
  );
}

export default function Header() {
  const { user, isLoading } = useUser();
  const { logout, pending: loggingOut } = useLogout();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const unread = useNotifications().data?.unread ?? 0;
  // While a stored session is being checked, show nothing user-specific. Showing the signed-out
  // links for a moment and then swapping them is a visible flicker on every page load.
  const items = (isLoading ? [] : navFor(user)).map((i) => (i.to === "/notifications" ? { ...i, badge: unread } : i));

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur" style={{ viewTransitionName: "site-header" }}>
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-3">
        <Link
          to={user ? dashboardFor(user) : "/"}
          viewTransition
          className="mr-2 flex h-9 items-center gap-2.5 rounded-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Logo />
          <span className="font-display text-xl font-bold tracking-tight">NeighborNexus</span>
        </Link>

        <nav aria-label="Main" className="ml-2 hidden flex-1 items-center gap-1 md:flex">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={linkClass} viewTransition>
              <NavLabel item={i} />
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {isLoading ? (
            <span className="block h-9 w-44" aria-hidden />
          ) : user ? (
            <>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Monogram name={user.name} size={32} />
                <span className="max-w-[10rem] truncate">{user.name.split(" ")[0]}</span>
              </span>
              <Button variant="secondary" size="sm" loading={loggingOut} onClick={logout}>{loggingOut ? "Logging out…" : "Log out"}</Button>
            </>
          ) : (
            <>
              <LinkButton to="/login" variant="secondary" size="sm">Log in</LinkButton>
              <LinkButton to="/signup" size="sm">Sign up</LinkButton>
            </>
          )}
        </div>

        <button
          className="ml-auto grid h-10 w-10 place-items-center rounded-ui border border-line md:hidden focus-visible:outline-2 focus-visible:outline-accent"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-line bg-bg px-5 pb-4 md:hidden">
          <nav aria-label="Main" className="flex flex-col gap-1 py-3">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={linkClass} viewTransition>
                {i.label}
              </NavLink>
            ))}
          </nav>
          {isLoading ? null : user ? (
            <Button variant="secondary" className="w-full" loading={loggingOut} onClick={logout}>
              {loggingOut ? "Logging out…" : `Log out (${user.name.split(" ")[0]})`}
            </Button>
          ) : (
            <div className="flex gap-2">
              <LinkButton to="/login" variant="secondary" className="flex-1">Log in</LinkButton>
              <LinkButton to="/signup" className="flex-1">Sign up</LinkButton>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
