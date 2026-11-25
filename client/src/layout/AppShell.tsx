import { Link, Outlet } from "react-router-dom";
import Header from "./Header";
import { useUser } from "../auth/UserContext";

export default function AppShell() {
  const { user } = useUser();
  const links =
    user?.type === "Service Provider"
      ? [
          { to: "/dashboard/serviceprovider/bookings", label: "Bookings" },
          { to: "/dashboard/serviceprovider/availability", label: "Availability" },
        ]
      : user
        ? [
            { to: "/services", label: "Find help" },
            { to: "/bookings", label: "My bookings" },
          ]
        : [
            { to: "/services", label: "Find help" },
            { to: "/signup", label: "Offer your services" },
          ];
  return (
    <div className="flex min-h-screen flex-col bg-bg font-body text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:rounded-ui focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink-soft">
          <p className="m-0">© {new Date().getFullYear()} NeighborNexus. Local help, booked in a minute.</p>
          <nav aria-label="Footer" className="flex gap-4">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-ink">{l.label}</Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
