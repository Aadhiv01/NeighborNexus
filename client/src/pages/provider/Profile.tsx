import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, qk } from "../../lib/api";
import { formatTime, money } from "../../lib/date";
import type { DayAvailability, Provider } from "../../lib/types";
import Page from "../../layout/Page";
import { Badge, Card, Monogram, PageHeader, Rating, SectionTitle } from "../../ui/Display";
import { Button, LinkButton } from "../../ui/Button";
import { SwitchField, TextArea, TextField } from "../../ui/Fields";
import { ErrorNote, PageLoading, useToast } from "../../ui/Feedback";
import { PencilIcon } from "../../ui/Icons";

const ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const hoursOf = (availability: DayAvailability[] = []) =>
  ORDER.flatMap((day) => {
    const entry = availability.find((a) => a.day === day);
    if (!entry?.slots?.length) return [];
    return [{ day: day[0].toUpperCase() + day.slice(1), text: entry.slots.map((s) => `${formatTime(s.start)} to ${formatTime(s.end)}`).join(", ") }];
  });

interface Form {
  name: string;
  bio: string;
  location: string;
  experience: string;
  phone: string;
  email: string;
  availableForEmergency: boolean;
}

const toForm = (p: Provider): Form => ({
  name: p.name || "",
  bio: p.bio || "",
  location: p.location || "",
  experience: String(p.experience ?? 0),
  phone: p.contactInfo?.phone || "",
  email: p.contactInfo?.email || "",
  availableForEmergency: Boolean(p.availableForEmergency),
});

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">{label}</dt>
      <dd className="m-0 mt-1 text-base">{children}</dd>
    </div>
  );
}

export default function ProviderProfile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState(false);

  const { data: profile, isPending } = useQuery({ queryKey: qk.providerProfile, queryFn: api.myProfile });

  useEffect(() => {
    if (profile && !editing) setForm(toForm(profile));
  }, [profile, editing]);

  const save = useMutation({
    mutationFn: (v: Form) =>
      api.updateProfile(profile!.userId, {
        name: v.name,
        bio: v.bio,
        location: v.location,
        experience: Number(v.experience) || 0,
        availableForEmergency: v.availableForEmergency,
        contactInfo: { phone: v.phone, email: v.email },
      }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: qk.providerProfile });
      queryClient.invalidateQueries({ queryKey: qk.providers });
      toast({ tone: "success", title: "Profile saved" });
    },
  });

  const setLocation = useMutation({
    mutationFn: async (mode: "here" | "clear") => {
      if (mode === "clear") return api.updateProfile(profile!.userId, { geo: null });
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Your browser can’t share a location."));
        navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("We couldn’t get your location. Allow location access for this site and try again.")), { timeout: 10000 });
      });
      return api.updateProfile(profile!.userId, { geo: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
    },
    onSuccess: (_, mode) => {
      queryClient.invalidateQueries({ queryKey: qk.providerProfile });
      queryClient.invalidateQueries({ queryKey: qk.providers });
      toast({ tone: "success", title: mode === "clear" ? "Map location removed" : "Map location saved" });
    },
    onError: (err) => toast({ tone: "error", title: "Couldn’t update your location", detail: err instanceof Error && !("response" in err) ? err.message : errorMessage(err) }),
  });

  if (isPending || !form || !profile) return <PageLoading label="Loading profile" />;

  const set = (k: keyof Form) => (v: string | boolean) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const hours = hoursOf(profile.availability);
  const reviews = profile.reviews ?? [];

  return (
    <Page title="Profile">
      <PageHeader
        eyebrow="Profile"
        title="Your profile"
        subtitle="This is what members see before they book you."
        actions={profile.userId && <LinkButton to={`/services/${profile.userId}`} variant="secondary">View public page</LinkButton>}
      />

      <Card className="flex flex-wrap items-center gap-5 p-6">
        <Monogram name={profile.name} size={72} />
        <div className="min-w-[14rem] flex-1">
          <h2 className="m-0 font-display text-3xl font-bold leading-tight">{profile.name}</h2>
          <p className="m-0 mt-1 text-ink-soft">
            {profile.location || "No area set"} · {profile.experience || 0} years experience
          </p>
        </div>
        <Rating value={profile.rating} count={reviews.length || undefined} />
      </Card>

      <Card className="mt-6 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 font-display text-2xl font-semibold">Details</h2>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setEditing(false); save.reset(); }}>Cancel</Button>
              <Button loading={save.isPending} onClick={() => save.mutate(form)}>Save changes</Button>
            </div>
          ) : (
            <Button variant="secondary" icon={<PencilIcon width={16} height={16} />} onClick={() => setEditing(true)}>Edit</Button>
          )}
        </div>

        {save.isError && <div className="mb-4"><ErrorNote>{errorMessage(save.error, "Could not save your profile.")}</ErrorNote></div>}

        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField label="Name" required value={form.name} onChange={(e) => set("name")(e.target.value)} />
            <TextField label="Area" placeholder="Neighbourhood or city" value={form.location} onChange={(e) => set("location")(e.target.value)} />
            <TextField label="Years of experience" type="number" min={0} value={form.experience} onChange={(e) => set("experience")(e.target.value)} />
            <TextField label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
            <TextField label="Contact email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
            <div className="flex items-center">
              <SwitchField label="Emergency call-outs" hint="Show an emergency badge on your listing." checked={form.availableForEmergency} onChange={set("availableForEmergency")} />
            </div>
            <TextArea className="md:col-span-2" label="Bio" rows={4} value={form.bio} onChange={(e) => set("bio")(e.target.value)} />
            <button type="submit" className="sr-only">Save changes</button>
          </form>
        ) : (
          <>
            <dl className="m-0 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Name">{profile.name}</Fact>
              <Fact label="Area">{profile.location || "—"}</Fact>
              <Fact label="Experience">{profile.experience || 0} years</Fact>
              <Fact label="Phone">{profile.contactInfo?.phone || "—"}</Fact>
              <Fact label="Contact email">{profile.contactInfo?.email || "—"}</Fact>
              <Fact label="Emergency call-outs">{profile.availableForEmergency ? <Badge tone="warn">Available</Badge> : "Not offered"}</Fact>
            </dl>
            <div className="mt-6">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Bio</p>
              <p className="mb-0 mt-1 max-w-3xl leading-relaxed">{profile.bio || "No bio yet."}</p>
            </div>
          </>
        )}
      </Card>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="max-w-xl">
          <h2 className="m-0 font-display text-2xl font-semibold">Map location</h2>
          <p className="mb-0 mt-1 text-ink-soft">
            {profile.geo
              ? "Shown on the map and used for “near me” searches."
              : "Not set, so you won’t appear on the map or in “near me” searches."}{" "}
            It is rounded to about 1 km, so your exact address is never published.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={profile.geo ? "secondary" : "primary"}
            loading={setLocation.isPending && setLocation.variables === "here"}
            onClick={() => setLocation.mutate("here")}
          >
            {profile.geo ? "Update from my location" : "Use my current location"}
          </Button>
          {profile.geo && (
            <Button variant="ghost" loading={setLocation.isPending && setLocation.variables === "clear"} onClick={() => setLocation.mutate("clear")}>
              Remove
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-6">
          <SectionTitle>Weekly hours</SectionTitle>
          {hours.length ? (
            <dl className="m-0 space-y-2">
              {hours.map((h) => (
                <div key={h.day} className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
                  <dt className="font-semibold">{h.day}</dt>
                  <dd className="m-0 text-right tabular-nums text-ink-soft">{h.text}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="m-0 text-ink-soft">No hours set, so members can’t book you yet.</p>
          )}
          <LinkButton to="/dashboard/serviceprovider/availability" variant="ghost" size="sm" className="mt-3">Edit hours</LinkButton>
        </Card>

        <Card className="p-6">
          <SectionTitle>Services</SectionTitle>
          {profile.services.length ? (
            <ul className="m-0 list-none space-y-2 p-0">
              {profile.services.map((s) => (
                <li key={s._id} className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
                  <span>
                    <span className="block font-semibold">{s.name}</span>
                    <span className="block text-sm text-ink-soft">{s.category} · {s.durationMinutes || 60} min</span>
                  </span>
                  <span className="font-semibold tabular-nums">{money(s.price)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-ink-soft">No services added yet.</p>
          )}
          <LinkButton to="/dashboard/serviceprovider/services" variant="ghost" size="sm" className="mt-3">Manage services</LinkButton>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <SectionTitle>Reviews</SectionTitle>
        {reviews.length ? (
          <ul className="m-0 grid list-none gap-4 p-0">
            {reviews.map((r) => (
              <li key={r._id} className="border-t border-line pt-4 first:border-0 first:pt-0">
                <Rating value={r.rating} />
                <p className="mb-1 mt-2 leading-relaxed">{r.comment}</p>
                <p className="m-0 text-sm text-ink-soft">
                  {r.customer?.name || "Member"} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-ink-soft">No reviews yet.</p>
        )}
      </Card>
    </Page>
  );
}
