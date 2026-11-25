import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, qk } from "../../lib/api";
import { useThemeSettings } from "../../theme/themeStore";
import Page from "../../layout/Page";
import { Segmented } from "../../ui/Display";
import { Button } from "../../ui/Button";
import { useToast } from "../../ui/Feedback";
import { EditorialConcept, LiveBoardConcept, StreetConcept } from "./concepts";

type Concept = "editorial" | "board" | "street";
const KEY = "nn-landing";

const load = (): Concept => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "editorial" || v === "board" || v === "street") return v;
  } catch { /* storage blocked */ }
  return "editorial";
};

/** Temporary page for choosing the landing page. Delete it, and its route, once one is chosen. */
export default function LandingLab() {
  const [concept, setConcept] = useState<Concept>(load);
  const [settings] = useThemeSettings();
  const toast = useToast();
  const { data = [], isPending } = useQuery({ queryKey: qk.providerList({}), queryFn: () => api.providers() });

  const pick = (c: Concept) => {
    setConcept(c);
    try { localStorage.setItem(KEY, c); } catch { /* ignore */ }
  };
  const copy = async () => {
    const text = `NeighborNexus landing pick: concept=${concept}, palette=${settings.palette}, type=${settings.type}, mode=${settings.mode}, corners=${settings.radius}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ tone: "success", title: "Copied", detail: text });
    } catch {
      window.prompt("Copy this:", text);
    }
  };

  const props = { providers: data, loading: isPending };
  return (
    <>
      <div className="sticky top-[57px] z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3 px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Landing lab (temporary)</span>
          <Segmented<Concept>
            legend="Landing concept"
            value={concept}
            onChange={pick}
            options={[
              { value: "editorial", label: "A · Editorial" },
              { value: "board", label: "B · Live board" },
              { value: "street", label: "C · The street" },
            ]}
          />
          <Link to="/lab" className="text-sm font-semibold text-accent hover:underline">Change colours and type</Link>
          <Button size="sm" className="ml-auto" onClick={copy}>Copy my pick</Button>
        </div>
      </div>
      <Page title="Landing lab" wide>
        {concept === "editorial" && <EditorialConcept {...props} />}
        {concept === "board" && <LiveBoardConcept {...props} />}
        {concept === "street" && <StreetConcept {...props} />}
      </Page>
    </>
  );
}
