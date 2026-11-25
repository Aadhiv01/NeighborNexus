import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../lib/api";
import type { UserType } from "../lib/types";
import { useSignup } from "../auth/useAuth";
import { Button } from "../ui/Button";
import { PasswordField, TextField } from "../ui/Fields";
import { ErrorNote } from "../ui/Feedback";
import AuthLayout from "./AuthLayout";

const ROLES: { value: UserType; title: string; text: string }[] = [
  { value: "Community Member", title: "I need help", text: "Find and book trusted people nearby." },
  { value: "Service Provider", title: "I offer services", text: "List what you do and take bookings." },
];

export default function Signup() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    type: "Community Member" as UserType,
  });
  const [confirm, setConfirm] = useState("");
  const signup = useSignup();

  const mismatch = confirm.length > 0 && form.password !== confirm;
  const set = (field: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== confirm) return;
    signup.mutate(form);
  };

  return (
    <AuthLayout
      title="Sign up"
      heading="Join your neighbourhood."
      intro="Whether you need a hand or you are the hand, it takes a minute to get started."
      points={["Free to join, no card needed", "Members see real openings before they book", "Providers set their own hours and prices"]}
    >
      <h2 className="m-0 font-display text-3xl font-semibold">Create your account</h2>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">I am joining as</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ROLES.map((r) => (
              <label key={r.value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={r.value}
                  checked={form.type === r.value}
                  onChange={() => set("type")(r.value)}
                  className="peer sr-only"
                />
                <span className="block h-full rounded-card border border-line bg-bg p-4 transition-colors hover:border-ink-soft peer-checked:border-accent peer-checked:bg-accent-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                  <span className="block font-semibold">{r.title}</span>
                  <span className="block text-sm text-ink-soft">{r.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField label="First name" autoComplete="given-name" required value={form.firstName} onChange={(e) => set("firstName")(e.target.value)} />
          <TextField label="Last name" autoComplete="family-name" required value={form.lastName} onChange={(e) => set("lastName")(e.target.value)} />
        </div>
        <TextField label="Email address" type="email" autoComplete="email" required value={form.email} onChange={(e) => set("email")(e.target.value)} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <PasswordField
            label="Password"
            autoComplete="new-password"
            required
            minLength={8}
            hint="At least 8 characters."
            value={form.password}
            onChange={(e) => set("password")(e.target.value)}
          />
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            required
            error={mismatch ? "Passwords do not match" : null}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {signup.isError && <ErrorNote>{errorMessage(signup.error)}</ErrorNote>}
        <Button type="submit" size="lg" className="w-full" loading={signup.isPending} disabled={mismatch}>
          Create account
        </Button>
      </form>
      <p className="mb-0 mt-6 text-center text-ink-soft">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-accent underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
