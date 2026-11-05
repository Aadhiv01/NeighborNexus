import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";

import axiosInstance from "../../api/axios-client";
import { formatBookingDate } from "../../utils/date";
import Header from "../Header/Header";
import { page, card, muted, heading, sectionTitle } from "../../styles/ui";

const fetchBookings = async () => {
  const { data } = await axiosInstance.get("/bookings");
  return data;
};

const severityFor = (status) => {
  if (status === "upcoming") return "success";
  if (status === "completed") return "info";
  return "danger";
};

const MemberBookings = () => {
  const queryClient = useQueryClient();

  const { data: bookings = [], isPending } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
  });

  const cancel = useMutation({
    mutationFn: (id) =>
      axiosInstance.delete(`/bookings/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });

  const sorted = [...bookings].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return (
    <div>
      <Header />
      <div style={page}>
        <h1 style={heading}>My bookings</h1>
        <p style={{ ...muted, marginTop: 0 }}>
          {bookings.length} total ·{" "}
          {bookings.filter((b) => b.status === "upcoming").length} upcoming
        </p>

        {isPending && <p style={muted}>Loading bookings…</p>}

        {!isPending && sorted.length === 0 && (
          <div style={{ ...card, marginTop: "1.5rem" }}>
            <p style={{ marginTop: 0 }}>You haven’t booked anything yet.</p>
            <Link to="/services" style={{ color: "#419D78" }}>
              Browse service providers →
            </Link>
          </div>
        )}

        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>
          {sorted.map((booking) => (
            <div
              key={booking._id}
              style={{
                ...card,
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ ...sectionTitle, marginBottom: "0.25rem" }}>
                  {booking.serviceName || "Service"}
                </h2>
                <p style={{ margin: 0 }}>
                  {booking.serviceProviderId?.name || "Provider"} ·{" "}
                  {formatBookingDate(booking.date)} ·{" "}
                  {booking.startTime}–{booking.endTime}
                </p>
                {booking.price > 0 && (
                  <p style={{ ...muted, margin: "0.25rem 0 0" }}>
                    ${booking.price}
                  </p>
                )}
              </div>

              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <Tag
                  value={booking.status}
                  severity={severityFor(booking.status)}
                />
                {booking.status === "upcoming" && (
                  <Button
                    label="Cancel"
                    severity="danger"
                    outlined
                    size="small"
                    loading={cancel.isPending && cancel.variables === booking._id}
                    onClick={() => cancel.mutate(booking._id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {cancel.isError && (
          <p style={{ color: "#f08a7c" }}>
            {cancel.error?.response?.data?.msg || "Could not cancel booking."}
          </p>
        )}
      </div>
    </div>
  );
};

export default MemberBookings;
