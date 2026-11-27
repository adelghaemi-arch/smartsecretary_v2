import { motion } from "framer-motion";
import { AtSign, Bell, Building2, Check, GitBranch, Link2, ListChecks, Mail, Phone, Plus, Search, Star, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/AppStore";
import { useNav } from "../store/Nav";
import { Avatar, Badge, Button, Card, Empty, Field, Modal, inputCls } from "../components/ui";
import { formatDate, isoKey, localeDigits, parseISO } from "../lib/jalali";
import { cn } from "../utils/cn";
import type { Person } from "../lib/types";
import { lookupAccountByPhones } from "../lib/accounts";

const COLORS = ["from-brand-500 to-violet-600", "from-amber-500 to-orange-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-sky-500 to-cyan-600", "from-fuchsia-500 to-purple-600"];

export default function People() {
  const {
    t, lang, people, concepts, connectionRequests,
    addPerson, updatePerson, removePerson, addConnectionRequest, respondConnectionRequest, pushToast,
  } = useApp();
  const { target } = useNav();
  const [q, setQ] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [conceptFilter, setConceptFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>("");
  const [detail, setDetail] = useState<Person | null>(null);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    org: "",
    email: "",
    phones: [""] as string[],
    notes: "",
    tags: [] as string[],
  });

  useEffect(() => {
    if (target.page === "people" && target.personId) {
      const p = people.find((x) => x.id === target.personId);
      if (p) setDetail(p);
    }
  }, [target, people]);

  const detectedAccount = useMemo(() => lookupAccountByPhones(form.phones), [form.phones]);
  const incomingRequests = connectionRequests.filter((r) => r.direction === "inbound" && r.status === "incoming");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return people.filter((p) => {
      const okQ = !s || [p.name, p.nameEn, p.role, p.roleEn, p.org, p.email, p.notes ?? ""].some((x) => x.toLowerCase().includes(s));
      const okConcept = !conceptFilter || p.tags.includes(conceptFilter);
      return okQ && (!onlyFav || p.favorite) && okConcept;
    });
  }, [people, q, onlyFav, conceptFilter]);

  const emptyForm = {
    name: "",
    role: "",
    org: "",
    email: "",
    phones: [""] as string[],
    notes: "",
    tags: [] as string[],
  };

  const startCreate = () => {
    setEditingId("");
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (p: Person) => {
    setEditingId(p.id);
    setForm({
      name: lang === "fa" ? p.name : p.nameEn,
      role: lang === "fa" ? p.role : p.roleEn,
      org: p.org,
      email: p.email === "—" ? "" : p.email,
      phones: p.phones?.length ? p.phones : p.phone ? [p.phone] : [""],
      notes: p.notes ?? "",
      tags: [...p.tags],
    });
    setDetail(null);
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    const parts = form.name.trim().split(" ");
    const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
    const current = editingId ? people.find((p) => p.id === editingId) : undefined;
    const detectedId = detectedAccount?.accountId;
    const connectionStatus = detectedId
      ? current?.accountId === detectedId ? current.connectionStatus : "none"
      : undefined;
    if (editingId) {
      updatePerson(editingId, {
        name: form.name.trim(),
        nameEn: form.name.trim(),
        role: form.role || (lang === "fa" ? "همکار" : "Colleague"),
        roleEn: form.role || "Colleague",
        org: form.org || (lang === "fa" ? "سایر" : "Other"),
        email: form.email || "—",
        phones: form.phones.filter((x) => x.trim()),
        notes: form.notes || undefined,
        initials: initials || "؟",
        tags: form.tags,
        accountId: detectedId,
        connectionStatus,
      });
      pushToast(lang === "fa" ? "مخاطب به‌روزرسانی شد" : "Contact updated");
    } else {
      const id = addPerson({
        name: form.name.trim(),
        nameEn: form.name.trim(),
        role: form.role || (lang === "fa" ? "همکار" : "Colleague"),
        roleEn: form.role || "Colleague",
        org: form.org || (lang === "fa" ? "سایر" : "Other"),
        email: form.email || "—",
        phones: form.phones.filter((x) => x.trim()),
        notes: form.notes || undefined,
        avatarColor: COLORS[people.length % COLORS.length],
        initials: initials || "؟",
        tags: form.tags,
        favorite: false,
        lastContact: isoKey(new Date()),
        accountId: detectedId,
        connectionStatus,
      });
      pushToast(lang === "fa" ? "مخاطب جدید افزوده شد" : "Contact added");
      if (detectedId) {
        pushToast(lang === "fa" ? "اکانت این مخاطب از روی موبایل پیدا شد" : "Account detected from mobile", "info");
        setTimeout(() => {
          const p = people.find((x) => x.id === id);
          if (p) setDetail(p);
        }, 0);
      }
    }
    setForm(emptyForm);
    setEditingId("");
    setOpen(false);
  };

  const num = (v: number | string) => localeDigits(v, lang);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t("people_title")} <Badge tone="brand">{num(people.length)}</Badge>
        </h2>
        <div className="flex items-center gap-2">
          <Button onClick={() => setRequestsOpen(true)}>
            <Bell size={14} /> {lang === "fa" ? "درخواست‌ها" : "Requests"}
            {incomingRequests.length > 0 && <Badge tone="rose">{num(incomingRequests.length)}</Badge>}
          </Button>
          <Button variant="primary" onClick={startCreate}>
            <Plus size={15} /> {t("new_person")}
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-xl bg-slate-100/80 px-3 dark:bg-white/[0.05]">
            <Search size={15} className="text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_placeholder")} className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-slate-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setOnlyFav(!onlyFav)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition",
                onlyFav
                  ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-400",
              )}
            >
              <Star size={12} className={cn(onlyFav && "fill-white")} /> {t("favorites")}
            </button>
          </div>
        </div>
      </Card>

      {conceptFilter && (
        <Card className="flex items-center gap-2 p-3">
          <GitBranch size={15} className="text-brand-500" />
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            {t("filter_by_concept")}: <strong>{conceptFilter}</strong>
          </span>
          <button onClick={() => setConceptFilter("")} className="ml-auto text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p, i) => {
          const mainPhone = p.phones?.[0] ?? p.phone ?? "";
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="group relative rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:border-brand-300 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-brand-400/40"
            >
              <div className="flex items-start gap-3">
                <Avatar initials={p.initials} color={p.avatarColor} size={48} />
                <div className="min-w-0 flex-1">
                  <button onClick={() => setDetail(p)} className="min-w-0 text-start">
                    <div className="truncate text-[13.5px] font-extrabold text-slate-900 dark:text-white">{lang === "fa" ? p.name : p.nameEn}</div>
                    <div className="truncate text-[11.5px] font-semibold text-brand-600 dark:text-brand-400">{lang === "fa" ? p.role : p.roleEn}</div>
                  </button>
                  <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-slate-400">
                    <Building2 size={11} /> {p.org}
                  </div>
                </div>
              </div>

              <div className="relative mt-3 space-y-1.5 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-[11.5px] text-slate-500 transition hover:text-brand-600 dark:text-slate-400">
                  <Mail size={12} className="shrink-0" /> <span className="truncate">{p.email}</span>
                </a>
                {mainPhone && (
                  <a href={`tel:${mainPhone.replace(/\s/g, "")}`} dir="ltr" className="flex items-center gap-2 text-[11.5px] text-slate-500 transition hover:text-brand-600 dark:text-slate-400">
                    <Phone size={12} className="shrink-0" /> <span className="truncate">{mainPhone}</span>
                  </a>
                )}
                {(p.phones?.length ?? 0) > 1 && (
                  <div className="text-[10px] text-slate-400">+{num((p.phones?.length ?? 1) - 1)} {lang === "fa" ? "شماره دیگر" : "more phone(s)"}</div>
                )}
              </div>

              <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
                {p.tags.slice(0, 3).map((tg) => {
                  const c = concepts.find((x) => x.label === tg);
                  return (
                    <button
                      key={tg}
                      onClick={() => setConceptFilter(tg)}
                      className={cn(
                        "rounded-lg px-1.5 py-0.5 text-[10.5px] font-semibold transition",
                        c
                          ? "bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-400",
                      )}
                    >
                      {c ? `${c.emoji} ${tg}` : `#${tg}`}
                    </button>
                  );
                })}
                {p.tags.length > 3 && <span className="text-[10px] text-slate-400">+{num(p.tags.length - 3)}</span>}
              </div>

              <div className="absolute top-2 end-2 flex gap-0.5">
                <button
                  onClick={() => updatePerson(p.id, { favorite: !p.favorite })}
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 transition hover:bg-slate-100 dark:hover:bg-white/[0.07]"
                >
                  <Star size={14} className={cn(p.favorite && "fill-amber-400 text-amber-400")} />
                </button>
                <button
                  onClick={() => startEdit(p)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-brand-500"
                >
                  <ListChecks size={13} />
                </button>
                <button
                  onClick={() => removePerson(p.id)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {p.accountId && p.connectionStatus === "connected" && (
                <div className="absolute bottom-2 start-2 flex items-center gap-1 rounded-full bg-emerald-500/15 py-0.5 ps-2 pe-1 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Link2 size={9} /> {lang === "fa" ? "متصل" : "Connected"}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addConnectionRequest(p.id, "disconnect");
                      pushToast(
                        lang === "fa" ? `اتصال با ${p.name} قطع شد` : `Disconnected from ${p.nameEn}`,
                        "warn",
                      );
                    }}
                    title={lang === "fa" ? "قطع اتصال" : "Disconnect"}
                    className="grid h-4 w-4 place-items-center rounded-full text-emerald-600/70 transition hover:bg-emerald-500/25 hover:text-rose-600 dark:text-emerald-400/70"
                  >
                    <X size={9} />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && <Card><Empty icon={<UserRound size={22} />} text={t("no_results")} /></Card>}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingId("");
        }}
        title={editingId ? (lang === "fa" ? "ویرایش مخاطب" : "Edit contact") : t("new_person")}
      >
        <div className="space-y-3">
          <Field label={t("full_name")}>
            <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("role")}>
              <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t("org")}>
              <input value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label={t("email")}>
            <input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </Field>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t("phones")} <span className="text-[9px] text-slate-400">({lang === "fa" ? "چند شماره مجاز است" : "multiple allowed"})</span>
            </div>
            <div className="space-y-2">
              {form.phones.map((phone, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    dir="ltr"
                    value={phone}
                    onChange={(e) => {
                      const updated = [...form.phones];
                      updated[idx] = e.target.value;
                      setForm({ ...form, phones: updated });
                    }}
                    placeholder={lang === "fa" ? "شماره تلفن" : "Phone number"}
                    className={inputCls}
                  />
                  <button
                    onClick={() => setForm({ ...form, phones: form.phones.filter((_, i) => i !== idx) })}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:bg-white/[0.06] dark:hover:bg-rose-500/15"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setForm({ ...form, phones: [...form.phones, ""] })}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-white/15"
              >
                <Plus size={11} /> {lang === "fa" ? "افزودن شماره" : "Add phone"}
              </button>
            </div>
          </div>

          <Field label={t("notes")}>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder={lang === "fa" ? "یادداشت‌ها، توضیحات، ..." : "Notes, description, ..."}
              className={cn(inputCls, "resize-none")}
            />
          </Field>

          {form.phones.some((p) => p.trim()) && (
            <div className={cn(
              "flex items-center gap-3 rounded-xl border p-3",
              detectedAccount
                ? "border-emerald-300/60 bg-emerald-50/70 dark:border-emerald-400/25 dark:bg-emerald-500/10"
                : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]",
            )}>
              <span className={cn(
                "grid h-9 w-9 place-items-center rounded-xl",
                detectedAccount ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400 dark:bg-white/10",
              )}>
                {detectedAccount ? <Check size={16} /> : <Search size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn("text-[12px] font-bold", detectedAccount ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300")}>
                  {detectedAccount
                    ? (lang === "fa" ? "اکانت در سیستم پیدا شد" : "Account found in the system")
                    : (lang === "fa" ? "اکانتی با این موبایل پیدا نشد" : "No account found for this mobile")}
                </div>
                <div className="truncate text-[10.5px] text-slate-400">
                  {detectedAccount
                    ? (lang === "fa" ? detectedAccount.displayName : detectedAccount.displayNameEn)
                    : (lang === "fa" ? "در صورت ثبت‌نام آینده، منشی اطلاع می‌دهد." : "The secretary will notify you if they join later.")}
                </div>
              </div>
              {detectedAccount && <Link2 size={15} className="text-emerald-500" />}
            </div>
          )}

          <Field label={t("tags")}>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2 dark:border-white/10 dark:bg-white/[0.04]">
              {concepts.map((c) => {
                const on = form.tags.includes(c.label);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        tags: on ? form.tags.filter((x) => x !== c.label) : [...form.tags, c.label],
                      })
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition",
                      on
                        ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow"
                        : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.1]",
                    )}
                  >
                    {c.emoji} {lang === "fa" ? c.label : c.labelEn}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              onClick={() => {
                setOpen(false);
                setEditingId("");
              }}
            >
              {t("cancel")}
            </Button>
            <Button variant="primary" onClick={submit}>
              {editingId ? <ListChecks size={15} /> : <Plus size={15} />} {editingId ? t("save") : t("add")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={requestsOpen}
        onClose={() => setRequestsOpen(false)}
        title={lang === "fa" ? "درخواست‌های اتصال" : "Connection requests"}
      >
        <div className="space-y-3">
          {incomingRequests.length === 0 && (
            <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-[12px] text-slate-400 dark:bg-white/[0.04]">
              {lang === "fa" ? "درخواست جدیدی ندارید" : "No new requests"}
            </div>
          )}
          {incomingRequests.map((req) => {
            const p = people.find((x) => x.id === req.personId);
            if (!p) return null;
            return (
              <div key={req.id} className="rounded-2xl border border-slate-200/80 p-3 dark:border-white/[0.07]">
                <div className="flex items-center gap-3">
                  <Avatar initials={p.initials} color={p.avatarColor} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-extrabold text-slate-800 dark:text-white">{lang === "fa" ? p.name : p.nameEn}</div>
                    <div className="truncate text-[10.5px] text-slate-400">{req.message ?? (lang === "fa" ? "درخواست اتصال حساب" : "Account connection request")}</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => respondConnectionRequest(req.id, false)}
                  >
                    <X size={12} /> {lang === "fa" ? "رد" : "Decline"}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => respondConnectionRequest(req.id, true)}
                  >
                    <Check size={12} /> {lang === "fa" ? "تایید اتصال" : "Accept"}
                  </Button>
                </div>
              </div>
            );
          })}

          {connectionRequests.some((r) => r.direction === "outbound" && r.status === "requested") && (
            <div className="border-t border-slate-100 pt-3 dark:border-white/[0.06]">
              <div className="mb-2 text-[10.5px] font-bold text-slate-400">{lang === "fa" ? "در انتظار پاسخ" : "Awaiting response"}</div>
              {connectionRequests
                .filter((r) => r.direction === "outbound" && r.status === "requested")
                .map((req) => {
                  const p = people.find((x) => x.id === req.personId);
                  return p ? (
                    <div key={req.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
                      <Avatar initials={p.initials} color={p.avatarColor} size={26} />
                      <span className="flex-1 truncate text-[11.5px] font-semibold text-amber-700 dark:text-amber-300">{lang === "fa" ? p.name : p.nameEn}</span>
                      <span className="text-[10px] text-amber-600/70">{lang === "fa" ? "ارسال‌شده" : "Sent"}</span>
                      <button
                        onClick={() => respondConnectionRequest(req.id, true)}
                        className="rounded-lg border border-amber-300/70 px-2 py-1 text-[9.5px] font-bold text-amber-700 transition hover:bg-amber-100 dark:border-amber-400/25 dark:text-amber-300 dark:hover:bg-amber-500/15"
                        title={lang === "fa" ? "در نسخه واقعی، این تایید در اکانت مخاطب انجام می‌شود" : "In production, approval happens in the contact's account"}
                      >
                        {lang === "fa" ? "شبیه‌سازی تایید مخاطب" : "Simulate contact approval"}
                      </button>
                    </div>
                  ) : null;
                })}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? (lang === "fa" ? detail.name : detail.nameEn) : ""}>
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-500/10 to-violet-500/10 p-4">
              <Avatar initials={detail.initials} color={detail.avatarColor} size={60} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold text-slate-900 dark:text-white">{lang === "fa" ? detail.name : detail.nameEn}</div>
                <div className="text-[12px] font-semibold text-brand-600 dark:text-brand-400">{lang === "fa" ? detail.role : detail.roleEn}</div>
                <div className="mt-1 text-[11px] text-slate-400">{detail.org}</div>
              </div>
              <Button size="sm" onClick={() => startEdit(detail)}>
                <ListChecks size={13} /> {lang === "fa" ? "ویرایش" : "Edit"}
              </Button>
            </div>

            {detail.notes && (
              <div className="rounded-xl bg-slate-50 p-3 text-[12px] leading-6 text-slate-700 dark:bg-white/[0.04] dark:text-slate-300">
                {detail.notes}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
              <InfoBox icon={<AtSign size={12} />} label={t("email")} value={detail.email} href={detail.email !== "—" ? `mailto:${detail.email}` : undefined} />
              {detail.phones?.map((phone, idx) => (
                <InfoBox key={idx} icon={<Phone size={12} />} label={idx === 0 ? t("phone") : `${t("phone")} ${num(idx + 1)}`} value={phone} ltr href={`tel:${phone.replace(/\s/g, "")}`} />
              ))}
              {!detail.phones?.length && detail.phone && (
                <InfoBox icon={<Phone size={12} />} label={t("phone")} value={detail.phone} ltr href={`tel:${detail.phone.replace(/\s/g, "")}`} />
              )}
              <InfoBox icon={<Building2 size={12} />} label={t("org")} value={detail.org} />
              <InfoBox icon={<ListChecks size={12} />} label={t("last_contact")} value={formatDate(parseISO(detail.lastContact), lang, { short: true })} />
            </div>

            {detail.accountId && (
              <div className="rounded-xl border border-slate-200/80 p-3 dark:border-white/[0.07]">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <Link2 size={11} /> {lang === "fa" ? "اتصال اکانت" : "Account connection"}
                </div>
                {detail.connectionStatus === "connected" ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Link2 size={14} /> {lang === "fa" ? "متصل" : "Connected"}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        addConnectionRequest(detail.id, "disconnect");
                        setDetail({ ...detail, connectionStatus: "none" });
                        pushToast(
                          lang === "fa"
                            ? `اتصال با ${detail.name} قطع شد و به منشی او هم اطلاع داده شد`
                            : `Disconnected from ${detail.nameEn}; their secretary was notified`,
                          "warn",
                        );
                      }}
                      className="ml-auto text-rose-500 hover:text-rose-600"
                    >
                      {lang === "fa" ? "قطع اتصال" : "Disconnect"}
                    </Button>
                  </div>
                ) : detail.connectionStatus === "requested" ? (
                  <div className="rounded-lg bg-amber-500/15 px-3 py-2 text-[12px] font-semibold text-amber-600 dark:text-amber-400">
                    {lang === "fa" ? "درخواست ارسال شد — در انتظار تایید" : "Request sent — awaiting approval"}
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => {
                      addConnectionRequest(detail.id, "request");
                      setDetail({ ...detail, connectionStatus: "requested" });
                    }}
                    className="w-full"
                  >
                    <Link2 size={14} /> {lang === "fa" ? "درخواست اتصال" : "Request connection"}
                  </Button>
                )}
              </div>
            )}

            {detail.tags.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <GitBranch size={11} /> {t("concepts")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detail.tags.map((tg) => {
                    const c = concepts.find((x) => x.label === tg);
                    return (
                      <span
                        key={tg}
                        className={cn(
                          "rounded-lg px-2 py-1 text-[11px] font-semibold",
                          c
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                            : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400",
                        )}
                      >
                        {c ? `${c.emoji} ${tg}` : `#${tg}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoBox({ icon, label, value, ltr, href }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean; href?: string }) {
  const inner = (
    <>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
        {icon} {label}
      </div>
      <div dir={ltr ? "ltr" : undefined} className="truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </div>
    </>
  );
  if (href)
    return (
      <a href={href} className="block rounded-xl bg-slate-50 p-3 transition hover:bg-brand-50 dark:bg-white/[0.04] dark:hover:bg-brand-500/10">
        {inner}
      </a>
    );
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">{inner}</div>;
}
