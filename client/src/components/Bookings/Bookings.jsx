import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";

import axiosInstance from "../../api/axios-client";
import { formatBookingDate } from "../../utils/date";
import Header from "../Header/Header";
import { page, muted, heading } from "../../styles/ui";

const STATUS_OPTIONS = [
  { label: "All statuses", value: null },
  { label: "Upcoming", value: "upcoming" },
  { label: "Completed", value: "completed" },
  { label: "Canceled", value: "canceled" },
];

const fetchBookings = async () => {
  const { data } = await axiosInstance.get("/serviceprovider/bookings");
  return data;
};

const severityFor = (status) =>
  status === "completed" ? "success" : status === "canceled" ? "danger" : "info";

const Bookings = () => {
  const navigate = useNavigate();
  const toast = useRef(null);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState(null);
  const [globalFilter, setGlobalFilter] = useState("");

  const { data: bookings = [], isPending } = useQuery({
    queryKey: ["providerBookings"],
    queryFn: fetchBookings,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }) =>
      axiosInstance
        .put(`/serviceprovider/bookings/${id}`, { status })
        .then((r) => r.data),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["providerBookings"] });
      queryClient.invalidateQueries({ queryKey: ["providerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast.current?.show({
        severity: "success",
        summary: "Booking updated",
        detail: `Marked ${booking.serviceName || "booking"} as ${booking.status}.`,
        life: 3000,
      });
    },
    onError: (err) => {
      toast.current?.show({
        severity: "error",
        summary: "Update failed",
        detail: err?.response?.data?.msg || "Could not update the booking.",
        life: 4000,
      });
    },
  });

  const rows = useMemo(
    () =>
      bookings
        .filter((b) => !statusFilter || b.status === statusFilter)
        .map((b) => ({
          ...b,
          customer: b.user?.name || "Member",
          dateLabel: formatBookingDate(b.date),
          timeLabel: `${b.startTime}–${b.endTime}`,
        })),
    [bookings, statusFilter]
  );

  const statusBody = (row) => (
    <Tag value={row.status} severity={severityFor(row.status)} />
  );

  const actionsBody = (row) => {
    if (row.status !== "upcoming") return <span style={{ opacity: 0.5 }}>—</span>;
    return (
      <div style={{ display: "flex", gap: "0.35rem" }}>
        <Button
          label="Complete"
          icon="pi pi-check"
          size="small"
          severity="success"
          outlined
          onClick={() => setStatus.mutate({ id: row._id, status: "completed" })}
        />
        <Button
          label="Cancel"
          icon="pi pi-times"
          size="small"
          severity="danger"
          outlined
          onClick={() => setStatus.mutate({ id: row._id, status: "canceled" })}
        />
      </div>
    );
  };

  const header = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search member or service"
          aria-label="Search bookings"
        />
        <Dropdown
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatusFilter(e.value)}
          placeholder="Filter by status"
        />
      </div>
    </div>
  );

  const expansion = (row) => (
    <div style={{ padding: "0.5rem 0" }}>
      <div>
        <strong>Member:</strong> {row.user?.name || "—"}{" "}
        {row.user?.email ? `· ${row.user.email}` : ""}
      </div>
      <div>
        <strong>Service:</strong> {row.serviceName || "—"}
        {row.price != null ? ` · $${row.price}` : ""}
      </div>
      <div>
        <strong>When:</strong> {row.dateLabel} · {row.timeLabel}
      </div>
    </div>
  );

  return (
    <div>
      <Header />
      <Toast ref={toast} />
      <div style={page}>
        <h1 style={heading}>Bookings</h1>
        <p style={{ ...muted, marginTop: 0 }}>
          {rows.length} of {bookings.length} bookings
        </p>
        <div style={{ marginTop: "1.25rem" }}>
        <Card title="Manage bookings">
          <DataTable
            value={rows}
            dataKey="_id"
            paginator
            rows={10}
            loading={isPending}
            header={header}
            globalFilter={globalFilter}
            globalFilterFields={["customer", "serviceName", "status"]}
            emptyMessage="No bookings yet."
            responsiveLayout="scroll"
            rowExpansionTemplate={expansion}
          >
            <Column expander style={{ width: "3em" }} />
            <Column field="dateLabel" header="Date" sortable />
            <Column field="timeLabel" header="Time" />
            <Column field="serviceName" header="Service" sortable />
            <Column field="customer" header="Member" sortable />
            <Column field="status" header="Status" body={statusBody} sortable />
            <Column header="" body={actionsBody} style={{ width: "12em" }} />
          </DataTable>
        </Card>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Button
            label="Back to dashboard"
            icon="pi pi-arrow-left"
            className="p-button-secondary"
            onClick={() => navigate("/dashboard/serviceprovider")}
          />
        </div>
      </div>
    </div>
  );
};

export default Bookings;
