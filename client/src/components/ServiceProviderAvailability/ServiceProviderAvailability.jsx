import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";

import axiosInstance from "../../api/axios-client";
import Header from "../Header/Header";
import { page, card, muted, heading, sectionTitle } from "../../styles/ui";

/**
 * Availability is a recurring weekly *template*, not a calendar of dates.
 * Each day maps to a list of open ranges; booking slots are derived on the
 * server by subtracting existing bookings from these ranges.
 */
const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const fetchAvailability = async () => {
  const { data } = await axiosInstance.get("/serviceprovider/availability");
  return data;
};

const emptyWeek = () =>
  Object.fromEntries(DAYS.map((day) => [day, []]));

const draftFromServer = (availability = []) =>
  Object.fromEntries(
    DAYS.map((day) => [
      day,
      (availability.find((a) => a.day === day)?.slots || []).map((s) => ({
        start: s.start,
        end: s.end,
      })),
    ])
  );

/** Returns an error string, or null when the week is valid. */
const validateWeek = (week) => {
  for (const day of DAYS) {
    const slots = week[day] || [];
    const sorted = [...slots].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    for (let i = 0; i < sorted.length; i += 1) {
      const { start, end } = sorted[i];
      if (!start || !end) return `${DAY_LABELS[day]}: pick a start and end time.`;
      if (toMinutes(end) <= toMinutes(start)) {
        return `${DAY_LABELS[day]}: ${start}–${end} ends before it starts.`;
      }
      if (i > 0) {
        const prev = sorted[i - 1];
        if (toMinutes(start) < toMinutes(prev.end)) {
          return `${DAY_LABELS[day]}: ${prev.start}–${prev.end} overlaps ${start}–${end}.`;
        }
      }
    }
  }
  return null;
};

const ServiceProviderAvailability = () => {
  const queryClient = useQueryClient();
  const [week, setWeek] = useState(emptyWeek);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);

  const { data, isPending } = useQuery({
    queryKey: ["availability"],
    queryFn: fetchAvailability,
  });

  // Seed the editor from the server whenever we're not holding unsaved edits.
  useEffect(() => {
    if (data && !dirty) setWeek(draftFromServer(data));
  }, [data, dirty]);

  const update = (day, slots) => {
    setWeek((prev) => ({ ...prev, [day]: slots }));
    setDirty(true);
    setError(null);
  };

  const addSlot = (day) => {
    const slots = week[day] || [];
    const last = slots[slots.length - 1];
    update(day, [...slots, { start: last?.end || "09:00", end: "17:00" }]);
  };

  const removeSlot = (day, index) =>
    update(
      day,
      (week[day] || []).filter((_, i) => i !== index)
    );

  const setSlot = (day, index, field, value) =>
    update(
      day,
      (week[day] || []).map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      )
    );

  const save = useMutation({
    mutationFn: async (draft) => {
      const invalid = validateWeek(draft);
      if (invalid) throw new Error(invalid);

      // One request per day: the API replaces that day's whole slot list.
      for (const day of DAYS) {
        await axiosInstance.post("/serviceprovider/availability", {
          day,
          slots: draft[day] || [],
        });
      }
      return true;
    },
    onSuccess: () => {
      setDirty(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (err) => {
      setError(err?.response?.data?.msg || err.message || "Could not save.");
    },
  });

  const totalSlots = DAYS.reduce((n, day) => n + (week[day] || []).length, 0);

  return (
    <div>
      <Header />
      <div style={page}>
        <h1 style={heading}>Weekly availability</h1>
        <p style={{ ...muted, marginTop: 0 }}>
          Members can only book inside these hours. Empty days are unbookable.
        </p>

        {isPending && <p style={muted}>Loading availability…</p>}

        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.25rem" }}>
          {DAYS.map((day) => {
            const slots = week[day] || [];
            return (
              <div key={day} style={{ ...card, padding: "1rem 1.25rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{DAY_LABELS[day]}</div>
                    <div style={{ ...muted, fontSize: "0.82rem" }}>
                      {slots.length
                        ? `${slots.length} window${slots.length === 1 ? "" : "s"}`
                        : "Unavailable"}
                    </div>
                  </div>
                  <Button
                    label="Add hours"
                    icon="pi pi-plus"
                    size="small"
                    outlined
                    onClick={() => addSlot(day)}
                  />
                </div>

                {slots.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gap: "0.5rem",
                      marginTop: "0.85rem",
                    }}
                  >
                    {slots.map((slot, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) =>
                            setSlot(day, index, "start", e.target.value)
                          }
                          aria-label={`${DAY_LABELS[day]} start time`}
                          style={timeStyle}
                        />
                        <span style={muted}>to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) =>
                            setSlot(day, index, "end", e.target.value)
                          }
                          aria-label={`${DAY_LABELS[day]} end time`}
                          style={timeStyle}
                        />
                        <Button
                          icon="pi pi-trash"
                          severity="danger"
                          text
                          size="small"
                          aria-label={`Remove ${DAY_LABELS[day]} window`}
                          onClick={() => removeSlot(day, index)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "sticky",
            bottom: "1rem",
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            padding: "0.9rem 1.1rem",
            marginTop: "1rem",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(24, 26, 41, 0.92)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            flexWrap: "wrap",
          }}
        >
          <Button
            label={save.isPending ? "Saving…" : "Save availability"}
            icon="pi pi-check"
            disabled={save.isPending || !dirty}
            onClick={() => save.mutate(week)}
          />
          <span style={{ ...muted, fontSize: "0.85rem" }}>
            {totalSlots} window{totalSlots === 1 ? "" : "s"} per week
            {dirty ? " · unsaved changes" : ""}
          </span>
          {error && <span style={{ color: "#f08a7c" }}>{error}</span>}
        </div>
      </div>
    </div>
  );
};

const timeStyle = {
  padding: "0.4rem 0.55rem",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "#f4f5f9",
  font: "inherit",
};

export default ServiceProviderAvailability;
