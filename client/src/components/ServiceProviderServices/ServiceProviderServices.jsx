import React, { useRef, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";

import Header from "../Header/Header";
import { page, card, muted, heading, sectionTitle } from "../../styles/ui";
import {
  useAddService,
  useDeleteService,
  useEditService,
  useFetchServices,
} from "../../hooks/useServices";


const BLANK = {
  name: "",
  category: "",
  description: "",
  price: 50,
  durationMinutes: 60,
};

const ServiceProviderServices = () => {
  const toast = useRef(null);
  const [draft, setDraft] = useState(BLANK);
  const [editing, setEditing] = useState(null);

  const { data: services = [], isPending } = useFetchServices();
  const addService = useAddService();
  const editService = useEditService();
  const deleteService = useDeleteService();

  const notify = (severity, summary, detail) =>
    toast.current?.show({ severity, summary, detail, life: 3000 });

  const fail = (err) =>
    notify("error", "Error", err?.response?.data?.msg || "Request failed");

  const valid =
    draft.name.trim() && draft.category.trim() && Number(draft.price) >= 0;

  const handleAdd = () => {
    if (!valid) {
      notify("error", "Missing fields", "Name, category and price are required.");
      return;
    }
    addService.mutate(draft, {
      onSuccess: () => {
        notify("success", "Added", `${draft.name} is now bookable.`);
        setDraft(BLANK);
      },
      onError: fail,
    });
  };

  const handleSaveEdit = () => {
    editService.mutate(editing, {
      onSuccess: () => {
        notify("success", "Saved", "Service updated.");
        setEditing(null);
      },
      onError: fail,
    });
  };

  const handleDelete = (service) => {
    // Deleting a service does not cancel bookings already made against it;
    // those keep the snapshot of name and price taken at booking time.
    if (!window.confirm(`Delete "${service.name}"?`)) return;
    deleteService.mutate(service, {
      onSuccess: () => notify("warn", "Deleted", `${service.name} removed.`),
      onError: fail,
    });
  };

  const actionBody = (row) => (
    <div style={{ display: "flex", gap: "0.35rem" }}>
      <Button
        icon="pi pi-pencil"
        rounded
        text
        aria-label={`Edit ${row.name}`}
        onClick={() => setEditing({ ...row })}
      />
      <Button
        icon="pi pi-trash"
        rounded
        text
        severity="danger"
        aria-label={`Delete ${row.name}`}
        onClick={() => handleDelete(row)}
      />
    </div>
  );

  const priceBody = (row) => `$${row.price}`;

  return (
    <div>
      <Header />
      <Toast ref={toast} />

      <div style={page}>
        <h1 style={heading}>Your services</h1>
        <p style={{ ...muted, marginTop: 0 }}>
          {services.length} listed · these are what members can book
        </p>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            marginTop: "1.25rem",
            maxWidth: 560,
          }}
        >
          <div style={{ ...card, color: "#f4f5f9" }}>
            <h2 style={{ ...sectionTitle }}>Add a service</h2>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <label style={labelStyle}>
                  Name
                  <InputText
                    style={{ width: "100%" }}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Drain cleaning"
                  />
                </label>

                <label style={labelStyle}>
                  Category
                  <InputText
                    style={{ width: "100%" }}
                    value={draft.category}
                    onChange={(e) =>
                      setDraft({ ...draft, category: e.target.value })
                    }
                    placeholder="Plumbing"
                  />
                </label>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <label style={{ ...labelStyle, flex: 1 }}>
                    Price ($)
                    <InputNumber
                      style={{ width: "100%" }}
                      value={draft.price}
                      onValueChange={(e) =>
                        setDraft({ ...draft, price: e.value ?? 0 })
                      }
                      min={0}
                      showButtons
                    />
                  </label>
                  <label style={{ ...labelStyle, flex: 1 }}>
                    Duration (min)
                    <InputNumber
                      style={{ width: "100%" }}
                      value={draft.durationMinutes}
                      onValueChange={(e) =>
                        setDraft({ ...draft, durationMinutes: e.value ?? 60 })
                      }
                      min={15}
                      step={15}
                      showButtons
                    />
                  </label>
                </div>

                <label style={labelStyle}>
                  Description
                  <InputTextarea
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                    rows={3}
                    style={{ width: "100%" }}
                  />
                </label>

                <Button
                  label={addService.isPending ? "Adding…" : "Add service"}
                  icon="pi pi-plus"
                  className="p-button-success"
                  disabled={addService.isPending}
                  onClick={handleAdd}
                />
              </div>
          </div>

        </div>

        <div style={{ marginTop: "1rem" }}>
            <Card title="Your services">
              <DataTable
                value={services}
                loading={isPending}
                dataKey="_id"
                responsiveLayout="scroll"
                emptyMessage="No services yet — add your first one."
              >
                <Column field="name" header="Service" sortable />
                <Column field="category" header="Category" sortable />
                <Column field="description" header="Description" />
                <Column field="durationMinutes" header="Minutes" sortable />
                <Column field="price" header="Price" body={priceBody} sortable />
                <Column header="" body={actionBody} style={{ width: "7em" }} />
              </DataTable>
            </Card>
        </div>
      </div>

      <Dialog
        header={`Edit ${editing?.name || "service"}`}
        visible={Boolean(editing)}
        onHide={() => setEditing(null)}
        style={{ width: "min(480px, 92vw)" }}
      >
        {editing && (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label style={labelStyle}>
              Name
              <InputText
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>
            <label style={labelStyle}>
              Category
              <InputText
                value={editing.category}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value })
                }
              />
            </label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <label style={{ ...labelStyle, flex: 1 }}>
                Price ($)
                <InputNumber
                  value={Number(editing.price)}
                  onValueChange={(e) =>
                    setEditing({ ...editing, price: e.value ?? 0 })
                  }
                  min={0}
                />
              </label>
              <label style={{ ...labelStyle, flex: 1 }}>
                Duration (min)
                <InputNumber
                  value={Number(editing.durationMinutes) || 60}
                  onValueChange={(e) =>
                    setEditing({ ...editing, durationMinutes: e.value ?? 60 })
                  }
                  min={15}
                  step={15}
                />
              </label>
            </div>
            <label style={labelStyle}>
              Description
              <InputTextarea
                value={editing.description || ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                rows={3}
              />
            </label>
            <Button
              label={editService.isPending ? "Saving…" : "Save changes"}
              className="p-button-success"
              disabled={editService.isPending}
              onClick={handleSaveEdit}
            />
          </div>
        )}
      </Dialog>
    </div>
  );
};

const labelStyle = {
  display: "grid",
  gap: "0.35rem",
  fontSize: "0.82rem",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#aeb4c8",
};

export default ServiceProviderServices;
