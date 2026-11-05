import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { Tag } from "primereact/tag";

import axiosInstance from "../../api/axios-client";
import Header from "../Header/Header";
import { page, card, muted, heading, sectionTitle } from "../../styles/ui";

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const fetchProfile = async () => {
  const { data } = await axiosInstance.get("/serviceprovider/profile");
  return data;
};

const summaryOf = (availability = []) =>
  DAY_ORDER.map((day) => {
    const entry = availability.find((a) => a.day === day);
    if (!entry?.slots?.length) return null;
    return `${day.slice(0, 3)} ${entry.slots
      .map((s) => `${s.start}–${s.end}`)
      .join(", ")}`;
  }).filter(Boolean);

const ServiceProviderProfile = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);

  const { data: profile, isPending } = useQuery({
    queryKey: ["providerProfile"],
    queryFn: fetchProfile,
  });

  useEffect(() => {
    if (profile && !editing) {
      setForm({
        name: profile.name || "",
        bio: profile.bio || "",
        location: profile.location || "",
        experience: profile.experience ?? 0,
        phone: profile.contactInfo?.phone || "",
        email: profile.contactInfo?.email || "",
        availableForEmergency: Boolean(profile.availableForEmergency),
      });
    }
  }, [profile, editing]);

  const save = useMutation({
    mutationFn: (values) =>
      axiosInstance
        .put(`/serviceprovider/profile/${profile.userId}`, {
          name: values.name,
          bio: values.bio,
          location: values.location,
          experience: values.experience,
          availableForEmergency: values.availableForEmergency,
          contactInfo: { phone: values.phone, email: values.email },
        })
        .then((r) => r.data),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["providerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
    onError: (err) =>
      setError(err?.response?.data?.msg || "Could not save your profile."),
  });

  if (isPending || !form) {
    return (
      <div>
        <Header />
        <div style={page}>
          <p style={muted}>Loading profile…</p>
        </div>
      </div>
    );
  }

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  const hours = summaryOf(profile.availability);
  const reviews = profile.reviews || [];

  return (
    <div>
      <Header />
      <div style={page}>
        <div
          style={{
            ...card,
            display: "flex",
            gap: "1.25rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <img
            src={profile.profilePicture}
            alt=""
            width={72}
            height={72}
            style={{ borderRadius: 14, background: "#1f2233" }}
          />
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ ...heading, marginBottom: "0.2rem" }}>
              {profile.name}
            </h1>
            <p style={{ ...muted, margin: 0 }}>
              {profile.location || "No location set"} · {profile.experience || 0}{" "}
              yrs experience
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#f5c451", fontSize: "1.1rem" }}>
              ★ {Number(profile.rating || 0).toFixed(1)}
            </div>
            <div style={{ ...muted, fontSize: "0.8rem" }}>
              {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {/* ── Editable details ─────────────────────────────── */}
        <div style={{ ...card, marginTop: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ ...sectionTitle, margin: 0 }}>Profile details</h2>
            {editing ? (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button
                  label={save.isPending ? "Saving…" : "Save"}
                  size="small"
                  disabled={save.isPending}
                  onClick={() => save.mutate(form)}
                />
                <Button
                  label="Cancel"
                  size="small"
                  text
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                />
              </div>
            ) : (
              <Button
                label="Edit"
                icon="pi pi-pencil"
                size="small"
                outlined
                onClick={() => setEditing(true)}
              />
            )}
          </div>

          {error && (
            <p style={{ color: "#f08a7c", marginBottom: 0 }}>{error}</p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "0.9rem",
              marginTop: "1rem",
            }}
          >
            <Field label="Name">
              {editing ? (
                <InputText
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                />
              ) : (
                profile.name
              )}
            </Field>

            <Field label="Location">
              {editing ? (
                <InputText
                  value={form.location}
                  onChange={(e) => set("location")(e.target.value)}
                />
              ) : (
                profile.location || "—"
              )}
            </Field>

            <Field label="Years of experience">
              {editing ? (
                <InputNumber
                  value={form.experience}
                  onValueChange={(e) => set("experience")(e.value ?? 0)}
                  min={0}
                />
              ) : (
                profile.experience || 0
              )}
            </Field>

            <Field label="Phone">
              {editing ? (
                <InputText
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                />
              ) : (
                profile.contactInfo?.phone || "—"
              )}
            </Field>

            <Field label="Contact email">
              {editing ? (
                <InputText
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                />
              ) : (
                profile.contactInfo?.email || "—"
              )}
            </Field>

            <Field label="Emergency callouts">
              {editing ? (
                <InputSwitch
                  checked={form.availableForEmergency}
                  onChange={(e) => set("availableForEmergency")(e.value)}
                />
              ) : profile.availableForEmergency ? (
                <Tag value="Available" severity="warning" />
              ) : (
                "Not offered"
              )}
            </Field>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <div style={{ ...muted, fontSize: "0.82rem", marginBottom: 4 }}>
              Bio
            </div>
            {editing ? (
              <InputTextarea
                value={form.bio}
                onChange={(e) => set("bio")(e.target.value)}
                rows={4}
                style={{ width: "100%" }}
              />
            ) : (
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                {profile.bio || "No bio yet."}
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <div style={card}>
            <h2 style={{ ...sectionTitle, marginTop: 0 }}>Weekly hours</h2>
            {hours.length ? (
              <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.8 }}>
                {hours.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p style={{ ...muted, margin: 0 }}>
                No availability set — members can’t book you yet.
              </p>
            )}
          </div>

          <div style={card}>
            <h2 style={{ ...sectionTitle, marginTop: 0 }}>Services</h2>
            {(profile.services || []).length ? (
              <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.8 }}>
                {profile.services.map((s) => (
                  <li key={s._id}>
                    {s.name} · {s.category} · ${s.price} ·{" "}
                    {s.durationMinutes || 60} min
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ ...muted, margin: 0 }}>No services added yet.</p>
            )}
          </div>
        </div>

        <div style={{ ...card, marginTop: "1rem" }}>
          <h2 style={{ ...sectionTitle, marginTop: 0 }}>Reviews</h2>
          {reviews.length ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {reviews.map((review) => (
                <div
                  key={review._id}
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    paddingTop: "0.6rem",
                  }}
                >
                  <div style={{ color: "#f5c451" }}>
                    {"★".repeat(review.rating)}
                    <span style={{ color: "#4b5068" }}>
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0" }}>{review.comment}</p>
                  <span style={{ ...muted, fontSize: "0.8rem" }}>
                    {review.customer?.name || "Member"} ·{" "}
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ ...muted, margin: 0 }}>No reviews yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div style={{ display: "grid", gap: "0.3rem" }}>
    <span style={{ ...muted, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {label}
    </span>
    <span>{children}</span>
  </div>
);

export default ServiceProviderProfile;
