import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, qk } from "../../lib/api";
import { money } from "../../lib/date";
import type { Service, ServiceInput } from "../../lib/types";
import Page from "../../layout/Page";
import { Badge, Card, PageHeader } from "../../ui/Display";
import { Button } from "../../ui/Button";
import { TextArea, TextField } from "../../ui/Fields";
import { ConfirmDialog, FormDialog } from "../../ui/Dialogs";
import { EmptyState, ErrorNote, Skeleton, useToast } from "../../ui/Feedback";
import { PencilIcon, PlusIcon, TrashIcon } from "../../ui/Icons";

const SUGGESTED = ["Plumbing", "Electrical", "Cleaning", "Handyman", "Gardening", "Painting", "Moving"];

interface FormState { name: string; category: string; description: string; price: string; durationMinutes: string }
const blank: FormState = { name: "", category: "", description: "", price: "50", durationMinutes: "60" };
const fromService = (s: Service): FormState => ({
  name: s.name,
  category: s.category,
  description: s.description ?? "",
  price: String(s.price),
  durationMinutes: String(s.durationMinutes ?? 60),
});

function ServiceForm({
  initial, saving, error, submitLabel, categories, onSubmit, onCancel,
}: {
  initial: FormState;
  saving: boolean;
  error: string | null;
  submitLabel: string;
  categories: string[];
  onSubmit: (input: ServiceInput) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const set = (k: keyof FormState) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const price = Number(f.price);
    const duration = Number(f.durationMinutes);
    if (!f.name.trim() || !f.category.trim()) return setProblem("Add a name and a category.");
    if (!(price >= 0)) return setProblem("Price must be zero or more.");
    if (!(duration >= 15)) return setProblem("Duration must be at least 15 minutes.");
    setProblem(null);
    onSubmit({ name: f.name.trim(), category: f.category.trim(), description: f.description.trim(), price, durationMinutes: duration });
  };

  const options = [...new Set([...SUGGESTED, ...categories])];

  return (
    <form onSubmit={submit} className="space-y-4">
      <TextField label="Name" placeholder="Drain cleaning" required autoFocus value={f.name} onChange={(e) => set("name")(e.target.value)} />
      <div>
        <TextField label="Category" placeholder="Plumbing" required list="service-categories" value={f.category} onChange={(e) => set("category")(e.target.value)} />
        <datalist id="service-categories">{options.map((o) => <option key={o} value={o} />)}</datalist>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Price ($)" type="number" inputMode="decimal" min={0} step="1" required value={f.price} onChange={(e) => set("price")(e.target.value)} />
        <TextField label="Duration (min)" type="number" inputMode="numeric" min={15} step={15} required value={f.durationMinutes} onChange={(e) => set("durationMinutes")(e.target.value)} />
      </div>
      <TextArea label="Description" rows={3} hint="Optional. What’s included, what to expect." value={f.description} onChange={(e) => set("description")(e.target.value)} />
      {(problem || error) && <ErrorNote>{problem || error}</ErrorNote>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export default function ProviderServices() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Service | null>(null);

  const { data: services = [], isPending } = useQuery({ queryKey: qk.services, queryFn: api.services });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.services });
    queryClient.invalidateQueries({ queryKey: qk.providerProfile });
    queryClient.invalidateQueries({ queryKey: qk.providers });
  };

  const save = useMutation({
    mutationFn: (input: ServiceInput) =>
      editing && editing !== "new" ? api.editService(editing._id, input) : api.addService(input),
    onSuccess: (s) => {
      refresh();
      toast({ tone: "success", title: editing === "new" ? "Service added" : "Service updated", detail: `${s.name} is up to date.` });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: (s: Service) => api.deleteService(s._id),
    onSuccess: (_, s) => {
      refresh();
      toast({ tone: "success", title: "Service deleted", detail: `${s.name} was removed. Existing bookings keep their price and name.` });
      setToDelete(null);
    },
    onError: (err) => {
      toast({ tone: "error", title: "Couldn’t delete", detail: errorMessage(err) });
      setToDelete(null);
    },
  });

  return (
    <Page title="My services">
      <PageHeader
        eyebrow="Services"
        title="My services"
        subtitle={`${services.length} listed. These are what members can book.`}
        actions={<Button icon={<PlusIcon width={18} height={18} />} onClick={() => { save.reset(); setEditing("new"); }}>Add a service</Button>}
      />

      {isPending && <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-36 rounded-card" />)}</div>}

      {!isPending && services.length === 0 && (
        <EmptyState title="No services yet" action={<Button onClick={() => setEditing("new")}>Add your first service</Button>}>
          Add what you offer, with a price and how long it takes, and members can start booking you.
        </EmptyState>
      )}

      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
        {services.map((s) => (
          <li key={s._id}>
            <Card className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="m-0 font-display text-xl font-semibold">{s.name}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <Badge tone="accent">{s.category}</Badge>
                    <Badge>{s.durationMinutes ?? 60} min</Badge>
                  </div>
                </div>
                <p className="m-0 font-display text-2xl font-bold tabular-nums">{money(s.price)}</p>
              </div>
              <p className="mb-0 mt-3 flex-1 leading-relaxed text-ink-soft">{s.description || "No description."}</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" size="sm" icon={<PencilIcon width={16} height={16} />} aria-label={`Edit ${s.name}`} onClick={() => { save.reset(); setEditing(s); }}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" icon={<TrashIcon width={16} height={16} />} aria-label={`Delete ${s.name}`} onClick={() => setToDelete(s)}>
                  Delete
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <FormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === "new" ? "Add a service" : "Edit service"}
        description="Members see this when they book you."
      >
        {editing && (
          <ServiceForm
            key={editing === "new" ? "new" : editing._id}
            initial={editing === "new" ? blank : fromService(editing)}
            saving={save.isPending}
            error={save.isError ? errorMessage(save.error) : null}
            submitLabel={editing === "new" ? "Add service" : "Save changes"}
            categories={services.map((s) => s.category)}
            onSubmit={(input) => save.mutate(input)}
            onCancel={() => setEditing(null)}
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        description="Members won’t be able to book it any more. Bookings already made keep the name and price they were booked at."
        confirmLabel="Delete service"
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </Page>
  );
}
