import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../lib/api";
import { useLogin } from "../auth/useAuth";
import { Button } from "../ui/Button";
import { PasswordField, TextField } from "../ui/Fields";
import { ErrorNote } from "../ui/Feedback";
import { CheckIcon } from "../ui/Icons";
import AuthLayout from "./AuthLayout";

// Only in development: the accounts created by `npm run seed`.
const DEMOS = [
  { label: "Demo member", email: "alex@example.com" },
  { label: "Demo provider", email: "maya@example.com" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const busy = login.isPending || login.isSuccess;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    login.mutate({ email, password });
  };

  return (
    <AuthLayout
      title="Log in"
      heading="Welcome back."
      intro="Pick up where you left off: your bookings, your schedule, your neighbours."
      points={["See every upcoming booking in one place", "Rebook people you trust in a few taps", "Cancel any time, no phone call"]}
    >
      <h2 className="m-0 font-display text-3xl font-semibold">Log in</h2>
      <form onSubmit={submit} className="mt-6 space-y-5" noValidate={false}>
        <fieldset disabled={busy} className="min-w-0 space-y-5 border-0 p-0">
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </fieldset>
        {login.isError && <ErrorNote>{errorMessage(login.error)}</ErrorNote>}
        <Button type="submit" size="lg" className="w-full" loading={login.isPending} icon={login.isSuccess ? <CheckIcon /> : undefined}>
          {login.isPending ? "Signing in…" : login.isSuccess ? "Signed in" : "Log in"}
        </Button>
        <span role="status" className="sr-only">
          {login.isPending ? "Signing you in" : login.isSuccess ? "Signed in. Opening your dashboard." : ""}
        </span>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-5 rounded-ui bg-surface-2 p-3 text-sm">
          <p className="m-0 mb-2 text-ink-soft">Development shortcuts (after <code>npm run seed</code>):</p>
          <div className="flex flex-wrap gap-2">
            {DEMOS.map((d) => (
              <Button
                key={d.email}
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("password123");
                }}
              >
                {d.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <p className="mb-0 mt-6 text-center text-ink-soft">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-accent underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
