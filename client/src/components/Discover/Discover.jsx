import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";

import axiosInstance from "../../api/axios-client";
import Header from "../Header/Header";
import { page, cardHover, muted, heading, grid } from "../../styles/ui";

const fetchProviders = async () => {
  const { data } = await axiosInstance.get("/serviceprovider");
  return data;
};

const priceFrom = (provider) => {
  const prices = (provider.services || []).map((s) => s.price);
  return prices.length ? Math.min(...prices) : null;
};

const Discover = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(null);
  const [location, setLocation] = useState("");

  const { data: providers = [], isPending } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  const categories = useMemo(() => {
    const set = new Set();
    providers.forEach((p) =>
      (p.services || []).forEach((s) => set.add(s.category))
    );
    return [...set].sort();
  }, [providers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const loc = location.trim().toLowerCase();

    return providers.filter((p) => {
      if (category && !(p.services || []).some((s) => s.category === category)) {
        return false;
      }
      if (loc && !(p.location || "").toLowerCase().includes(loc)) return false;
      if (!q) return true;

      const haystack = [
        p.name,
        p.bio,
        p.location,
        ...(p.services || []).map((s) => `${s.name} ${s.category}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [providers, query, category, location]);

  return (
    <div>
      <Header />
      <div style={page}>
        <h1 style={heading}>Find a local service provider</h1>
        <p style={{ ...muted, marginTop: 0 }}>
          {providers.length} providers in your community
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            margin: "1.5rem 0",
          }}
        >
          <span className="p-input-icon-left" style={{ flex: "1 1 220px" }}>
            <i className="pi pi-search" />
            <InputText
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services or names"
              style={{ width: "100%" }}
              aria-label="Search providers"
            />
          </span>

          <Dropdown
            value={category}
            options={categories}
            onChange={(e) => setCategory(e.value)}
            placeholder="All categories"
            showClear
            style={{ minWidth: 190 }}
            aria-label="Filter by category"
          />

          <InputText
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            style={{ minWidth: 170 }}
            aria-label="Filter by location"
          />
        </div>

        {isPending && <p style={muted}>Loading providers…</p>}

        {!isPending && filtered.length === 0 && (
          <p style={muted}>No providers match those filters.</p>
        )}

        <div style={grid()}>
          {filtered.map((provider) => {
            const from = priceFrom(provider);
            return (
              <article
                key={provider._id}
                style={cardHover}
                onClick={() => navigate(`/services/${provider.userId}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate(`/services/${provider.userId}`);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View ${provider.name}`}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    alignItems: "baseline",
                  }}
                >
                  <h2 style={{ ...heading, fontSize: "1.15rem" }}>
                    {provider.name}
                  </h2>
                  <span style={{ color: "#f5c451", fontSize: "0.9rem" }}>
                    ★ {provider.rating || "—"}
                  </span>
                </div>

                <p style={{ ...muted, margin: "0.25rem 0 0.75rem" }}>
                  {(provider.services || [])
                    .map((s) => s.category)
                    .filter((c, i, arr) => arr.indexOf(c) === i)
                    .join(" · ") || "No services listed"}
                </p>

                <p style={{ margin: "0 0 0.9rem", lineHeight: 1.5 }}>
                  {provider.bio || "No description yet."}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.88rem",
                  }}
                >
                  <span style={muted}>{provider.location || "—"}</span>
                  <span style={{ fontWeight: 600 }}>
                    {from != null ? `From $${from}` : "Price on request"}
                  </span>
                </div>

                {provider.availableForEmergency && (
                  <p
                    style={{
                      margin: "0.75rem 0 0",
                      fontSize: "0.78rem",
                      color: "#f08a7c",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Emergency callouts
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Discover;
