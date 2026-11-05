import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";

import axiosInstance from "../../api/axios-client";
import { useUser } from "../../contexts/UserContext.jsx";
import { formatBookingDate } from "../../utils/date";
import Header from "../Header/Header";
import {
  page,
  card,
  muted,
  heading,
  sectionTitle,
  slotButton,
  grid,
} from "../../styles/ui";

const isoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
};

const fetchProvider = async ({ queryKey }) => {
  const [, userId] = queryKey;
  const { data } = await axiosInstance.get(`/serviceprovider/profile/${userId}`);
  return data;
};

const fetchSlots = async ({ queryKey }) => {
  const [, providerId, serviceId, date] = queryKey;
  const { data } = await axiosInstance.get("/bookings/slots", {
    params: { serviceProviderId: providerId, serviceId, date },
  });
  return data;
};

const ProviderDetail = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [serviceId, setServiceId] = useState(null);
  const [date, setDate] = useState(tomorrow);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmed, setConfirmed] = useState(null);

  const {
    data: provider,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["provider", providerId],
    queryFn: fetchProvider,
  });

  // Default to the first service once the provider loads.
  useEffect(() => {
    if (provider?.services?.length && !serviceId) {
      setServiceId(provider.services[0]._id);
    }
  }, [provider, serviceId]);

  // Clear a chosen slot whenever the inputs that produced it change.
  useEffect(() => {
    setSelectedSlot(null);
  }, [serviceId, date]);

  const dateStr = useMemo(() => isoDate(date), [date]);

  const {
    data: slotData,
    isPending: slotsPending,
    isFetching: slotsFetching,
  } = useQuery({
    queryKey: ["slots", provider?._id, serviceId, dateStr],
    queryFn: fetchSlots,
    enabled: Boolean(provider?._id && serviceId),
  });

  const book = useMutation({
    mutationFn: (payload) =>
      axiosInstance.post("/bookings", payload).then((r) => r.data),
    onSuccess: (booking) => {
      setConfirmed(booking);
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const selectedService = provider?.services?.find((s) => s._id === serviceId);

  const handleBook = () => {
    if (!selectedSlot) return;
    book.mutate({
      serviceProviderId: provider._id,
      serviceId,
      date: dateStr,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
    });
  };

  if (isPending) {
    return (
      <div>
        <Header />
        <div style={page}>
          <p style={muted}>Loading provider…</p>
        </div>
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div>
        <Header />
        <div style={page}>
          <p>Provider not found.</p>
          <Link to="/services" style={{ color: "#419D78" }}>
            Back to all providers
          </Link>
        </div>
      </div>
    );
  }

  const errorMessage =
    book.error?.response?.data?.msg || book.error?.message || null;

  return (
    <div>
      <Header />
      <div style={page}>
        <Link to="/services" style={{ color: "#419D78", fontSize: "0.9rem" }}>
          ← All providers
        </Link>

        <div style={{ ...card, marginTop: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1 style={heading}>{provider.name}</h1>
              <p style={{ ...muted, margin: "0.25rem 0" }}>
                {provider.location || "Location not set"} ·{" "}
                {provider.experience || 0} yrs experience
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#f5c451", fontSize: "1.1rem" }}>
                ★ {provider.rating || "—"}
              </div>
              {provider.availableForEmergency && (
                <div style={{ color: "#f08a7c", fontSize: "0.8rem" }}>
                  Emergency callouts
                </div>
              )}
            </div>
          </div>

          <p style={{ lineHeight: 1.6, marginBottom: 0 }}>
            {provider.bio || "No description yet."}
          </p>
        </div>

        {/* ── Booking ─────────────────────────────────────────── */}
        <div style={{ ...card, marginTop: "1rem" }}>
          <h2 style={sectionTitle}>Book a service</h2>

          {!provider.services?.length ? (
            <p style={muted}>This provider has no services listed yet.</p>
          ) : (
            <>
              <div style={grid(240)}>
                {provider.services.map((service) => {
                  const active = service._id === serviceId;
                  return (
                    <button
                      key={service._id}
                      type="button"
                      onClick={() => setServiceId(service._id)}
                      style={{
                        textAlign: "left",
                        padding: "0.9rem",
                        borderRadius: 10,
                        cursor: "pointer",
                        font: "inherit",
                        color: "#f4f5f9",
                        background: active
                          ? "rgba(65,157,120,0.18)"
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${
                          active ? "#419D78" : "rgba(255,255,255,0.12)"
                        }`,
                      }}
                      aria-pressed={active}
                    >
                      <div style={{ fontWeight: 600 }}>{service.name}</div>
                      <div style={{ ...muted, fontSize: "0.85rem" }}>
                        {service.category} · {service.durationMinutes || 60} min
                      </div>
                      <div style={{ marginTop: "0.5rem", fontWeight: 600 }}>
                        ${service.price}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "end",
                  marginTop: "1.25rem",
                  flexWrap: "wrap",
                }}
              >
                <label style={{ display: "grid", gap: "0.35rem" }}>
                  <span style={{ ...muted, fontSize: "0.82rem" }}>Date</span>
                  <input
                    type="date"
                    value={dateStr}
                    min={isoDate(new Date())}
                    onChange={(e) => {
                      const next = new Date(`${e.target.value}T00:00:00`);
                      if (!Number.isNaN(next.getTime())) setDate(next);
                    }}
                    style={{
                      padding: "0.55rem 0.7rem",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.08)",
                      color: "#f4f5f9",
                      font: "inherit",
                    }}
                  />
                </label>

                {selectedService && (
                  <div style={{ ...muted, fontSize: "0.85rem" }}>
                    {selectedService.name} · ${selectedService.price}
                  </div>
                )}
              </div>

              <div style={{ marginTop: "1.25rem" }}>
                {slotsPending || slotsFetching ? (
                  <p style={muted}>Checking availability…</p>
                ) : slotData?.slots?.length ? (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {slotData.slots.map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        style={slotButton(selectedSlot?.start === slot.start)}
                        aria-pressed={selectedSlot?.start === slot.start}
                      >
                        {slot.start} – {slot.end}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={muted}>
                    No open slots on this day. Try another date.
                  </p>
                )}
              </div>

              {confirmed ? (
                <div
                  style={{
                    marginTop: "1.25rem",
                    padding: "1rem",
                    borderRadius: 10,
                    border: "1px solid #419D78",
                    background: "rgba(65,157,120,0.15)",
                  }}
                  role="status"
                >
                  <strong>Booking confirmed.</strong>{" "}
                  {confirmed.serviceName} on{" "}
                  {formatBookingDate(confirmed.date)} at{" "}
                  {confirmed.startTime}.{" "}
                  <Link to="/bookings" style={{ color: "#7fd1ae" }}>
                    View my bookings
                  </Link>
                </div>
              ) : user ? (
                <div style={{ marginTop: "1.25rem" }}>
                  <Button
                    label={
                      selectedSlot
                        ? `Confirm ${selectedSlot.start} – ${selectedSlot.end}`
                        : "Select a time"
                    }
                    disabled={!selectedSlot || book.isPending}
                    onClick={handleBook}
                  />
                  {errorMessage && (
                    <p style={{ color: "#f08a7c", marginTop: "0.6rem" }}>
                      {errorMessage}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: "1.25rem" }}>
                  <p style={muted}>Sign in to book this provider.</p>
                  <Button
                    label="Sign in"
                    onClick={() => navigate("/login")}
                    outlined
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderDetail;
