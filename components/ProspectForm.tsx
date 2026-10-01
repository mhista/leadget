"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProspect, updateProspect } from "@/lib/actions";
import { SIZES, type Prospect, type ProspectInput } from "@/lib/types";
import { PLAYBOOKS, playbook } from "@/lib/industries";
import { CitySelect, CountrySelect } from "@/components/PlacePicker";
import { Field, btn, inputCls, selectCls } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";

const blank: ProspectInput = {
  name: "", industry: "real-estate", website: "", email: "", phone: "", contact_name: "", contact_role: "",
  city: "", country: "", size: "", linkedin: "", notes: "", deal_value: null,
};

/** Add a prospect, or edit one when `prospect` is passed. */
export function ProspectFormModal({ open, onClose, prospect }: { open: boolean; onClose: () => void; prospect?: Prospect }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<ProspectInput>(prospect ?? blank);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const set = <K extends keyof ProspectInput>(k: K, v: ProspectInput[K]) => setF((x) => ({ ...x, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      if (prospect) {
        const res = await updateProspect(prospect.id, f as Partial<Prospect>);
        if (!res.ok) return setError(res.error);
        toast("Saved.");
        onClose();
        router.refresh();
      } else {
        const res = await createProspect({ ...f, deal_value: f.deal_value ?? playbook(f.industry).typical_deal });
        if (!res.ok) return setError(res.error);
        toast(`${f.name} added.`);
        onClose();
        setF(blank);
        router.push(`/prospects/${res.data.id}`);
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={prospect ? "Edit prospect" : "Add a prospect"} description={prospect ? undefined : "Only the name is required. Add a website and Leadget can audit it."} wide>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name *"><input autoFocus className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} required /></Field>
          <Field label="Industry">
            <select className={selectCls} value={f.industry} onChange={(e) => set("industry", e.target.value)}>
              {PLAYBOOKS.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
            </select>
          </Field>
          <Field label="Website" hint="Leave empty if they don't have one — that's a pitch in itself.">
            <input className={inputCls} value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="acme.com" />
          </Field>
          <Field label="Size">
            <select className={selectCls} value={f.size} onChange={(e) => set("size", e.target.value as any)}>
              <option value="">Unknown</option>
              {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="rounded-lg border border-line bg-sunken p-4">
          <p className="mono mb-3">Who to talk to</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact name"><input className={inputCls} value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Ada Okafor" /></Field>
            <Field label="Role"><input className={inputCls} value={f.contact_role} onChange={(e) => set("contact_role", e.target.value)} placeholder="Owner, Managing Partner…" /></Field>
            <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone / WhatsApp" hint="Include the country code, e.g. +234…"><input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="LinkedIn" className="sm:col-span-2"><input className={inputCls} value={f.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Country">
            <CountrySelect value={f.country ?? ""} onChange={(c) => setF((x) => ({ ...x, country: c?.name ?? "", city: c?.name === x.country ? x.city : "" }))} />
          </Field>
          <Field label="City or area">
            <CitySelect country={f.country ?? ""} value={f.city ?? ""} onChange={(v) => set("city", v)} />
          </Field>
          <Field label="Deal value" hint={`Typical: ${playbook(f.industry).typical_deal.toLocaleString()}`}>
            <input type="number" min={0} className={inputCls} value={f.deal_value ?? ""} onChange={(e) => set("deal_value", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
        </div>

        <Field label="Notes"><textarea rows={3} className={inputCls} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="How you found them, who referred you, anything useful for the pitch" /></Field>

        {error && <p className="text-[12.5px] text-danger" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} className={btn("ghost")}>Cancel</button>
          <button className={btn("primary")} disabled={saving || !f.name.trim()}>{saving && <Spinner />}{prospect ? "Save changes" : "Add prospect"}</button>
        </div>
      </form>
    </Modal>
  );
}
