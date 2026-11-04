import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock3,
  Trash2,
  X,
  Phone,
  Mail,
  MessageCircle,
  Users,
  CalendarDays,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getLeads,
} from "../services/api";

const TYPES = ["CALL", "EMAIL", "WHATSAPP", "MEETING", "OTHER"];
const STATUSES = ["PENDING", "COMPLETED", "CANCELLED"];

const blankForm = {
  title: "",
  description: "",
  follow_up_type: "CALL",
  status: "PENDING",
  due_at: "",
  lead: "",
  customer: "",
};

function dateLabel(value) {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : date.toLocaleString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function typeIcon(type) {
  if (type === "CALL") return Phone;
  if (type === "EMAIL") return Mail;
  if (type === "WHATSAPP") return MessageCircle;
  if (type === "MEETING") return Users;
  return CalendarDays;
}

function statusStyle(status) {
  if (status === "COMPLETED")
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (status === "CANCELLED")
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

function errorText(error) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(
        ([key, value]) =>
          `${key}: ${
            Array.isArray(value)
              ? value.join(", ")
              : typeof value === "string"
                ? value
                : JSON.stringify(value)
          }`,
      )
      .join("  ");
  }

  return error?.message || "Something went wrong. Please try again.";
}

function toLocalInputValue(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

export default function FollowUps({ onChanged, refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [selectedLead, setSelectedLead] = useState(null);
  const [expandedLeadId, setExpandedLeadId] = useState(null);

  function getLeadForItem(item) {
    const linkedLead = item?.lead;
    const leadId =
      linkedLead && typeof linkedLead === "object"
        ? linkedLead.id
        : linkedLead;

    return (
      leads.find((entry) => String(entry.id) === String(leadId)) ||
      (linkedLead && typeof linkedLead === "object" ? linkedLead : null)
    );
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [followUpData, leadData] = await Promise.all([
        getFollowUps({ ordering: "due_at" }),
        getLeads(),
      ]);

      setItems(
        Array.isArray(followUpData)
          ? followUpData
          : followUpData?.results || [],
      );

      setLeads(Array.isArray(leadData) ? leadData : leadData?.results || []);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return items
      .filter((item) => {
        const matchesStatus =
          statusFilter === "ALL" || item.status === statusFilter;

        const linkedLead = item.lead;
        const leadId =
          linkedLead && typeof linkedLead === "object"
            ? linkedLead.id
            : linkedLead;

        const lead =
          leads.find((entry) => String(entry.id) === String(leadId)) ||
          (linkedLead && typeof linkedLead === "object" ? linkedLead : null);

        const customerId =
          item.customer && typeof item.customer === "object"
            ? item.customer.id
            : item.customer;

        const text = [
          item.title,
          item.description,
          lead?.name,
          lead?.company,
          customerId ? `Customer ${customerId}` : "",
          item.follow_up_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesStatus && (!search || text.includes(search));
      })
      .sort(
        (a, b) =>
          new Date(a.due_at || 0) - new Date(b.due_at || 0),
      );
  }, [items, leads, query, statusFilter]);

  // Group all visible reminders by lead.
  const groupedFollowUps = useMemo(() => {
    const groups = new Map();

    filtered.forEach((item) => {
      const lead = getLeadForItem(item);

      const customerId =
        item.customer && typeof item.customer === "object"
          ? item.customer.id
          : item.customer;

      const groupId = lead?.id
        ? `lead-${lead.id}`
        : customerId
          ? `customer-${customerId}`
          : `followup-${item.id}`;

      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          lead,
          name:
            lead?.name ||
            (customerId ? `Customer #${customerId}` : "Lead not available"),
          items: [],
        });
      }

      groups.get(groupId).items.push(item);
    });

    return Array.from(groups.values());
  }, [filtered, leads]);

  const counts = {
    total: items.length,
    pending: items.filter((item) => item.status === "PENDING").length,
    completed: items.filter((item) => item.status === "COMPLETED").length,
    cancelled: items.filter((item) => item.status === "CANCELLED").length,
    overdue: items.filter(
      (item) =>
        item.status === "PENDING" &&
        item.due_at &&
        new Date(item.due_at) < new Date(),
    ).length,
  };

  function startCreate() {
    setEditing(null);
    setForm({
      ...blankForm,
      due_at: toLocalInputValue(),
    });
    setShowForm(true);
    setError("");
  }

  function startEdit(item) {
    const linkedLead = item.lead;
    const leadId =
      linkedLead && typeof linkedLead === "object"
        ? linkedLead.id
        : linkedLead;

    setEditing(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      follow_up_type: item.follow_up_type || "CALL",
      status: item.status || "PENDING",
      due_at: toLocalInputValue(item.due_at),
      lead: leadId ? String(leadId) : "",
      customer: item.customer
        ? String(
            typeof item.customer === "object"
              ? item.customer.id
              : item.customer,
          )
        : "",
    });

    setShowForm(true);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.lead) {
      setError(
        "Please select a lead. Customer-only follow-ups can be added through the API for now.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        follow_up_type: form.follow_up_type,
        status: form.status,
        due_at: new Date(form.due_at).toISOString(),
        lead: Number(form.lead),
        customer: null,
      };

      if (editing) {
        await updateFollowUp(editing.id, payload);
      } else {
        await createFollowUp(payload);
      }

      setShowForm(false);
      setEditing(null);
      await loadData();
      onChanged?.();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function markCompleted(item) {
    try {
      setError("");
      await updateFollowUp(item.id, { status: "COMPLETED" });
      await loadData();
      onChanged?.();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`))
      return;

    try {
      setError("");
      await deleteFollowUp(item.id);
      await loadData();
      onChanged?.();
    } catch (err) {
      setError(errorText(err));
    }
  }

  function toggleLead(groupId) {
    setExpandedLeadId((current) => (current === groupId ? null : groupId));
  }

  return (
    <div className="space-y-6">
      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total follow-ups",
            value: counts.total,
            icon: CalendarClock,
            color: "text-violet-300 bg-violet-400/10",
          },
          {
            label: "Pending",
            value: counts.pending,
            icon: Clock3,
            color: "text-amber-300 bg-amber-400/10",
          },
          {
            label: "Completed",
            value: counts.completed,
            icon: CheckCircle2,
            color: "text-emerald-300 bg-emerald-400/10",
          },
          {
            label: "Overdue",
            value: counts.overdue,
            icon: AlertCircle,
            color: "text-rose-300 bg-rose-400/10",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/[0.07] bg-[#0e1320] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{stat.label}</p>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.color}`}
                >
                  <Icon size={17} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {stat.value}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Live data from your workspace
              </p>
            </div>
          );
        })}
      </section>

      {/* FOLLOW-UP CENTER */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e1320]">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Follow-up center
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Keep every lead conversation moving at the right time.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-400"
            >
              <Plus size={15} />
              New follow-up
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-xs leading-5 text-rose-200">
            {error}
          </div>
        )}

        {/* SEARCH AND FILTER TABS */}
        <div className="space-y-4 border-b border-white/[0.07] p-5">
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search follow-ups or leads..."
              className="w-full rounded-xl border border-white/10 bg-[#090d16] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">
              Reminder All
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Manage and track all your follow-up reminders lead-wise.
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              {
                value: "ALL",
                label: "All",
                count: counts.total,
                active: "border-violet-400/40 bg-violet-500/15 text-violet-200",
                inactive: "text-slate-400",
              },
              {
                value: "PENDING",
                label: "Pending",
                count: counts.pending,
                active: "border-amber-400/30 bg-amber-400/10 text-amber-300",
                inactive: "text-slate-400",
              },
              {
                value: "COMPLETED",
                label: "Completed",
                count: counts.completed,
                active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
                inactive: "text-slate-400",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                count: counts.cancelled,
                active: "border-rose-400/30 bg-rose-400/10 text-rose-300",
                inactive: "text-slate-400",
              },
            ].map((tab) => {
              const isActive = statusFilter === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold transition-all ${
                    isActive
                      ? tab.active
                      : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.06] " +
                        tab.inactive
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      isActive
                        ? "bg-white/10"
                        : "bg-white/[0.06] text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LEAD-WISE ACCORDION */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Loading follow-ups...
          </div>
        ) : groupedFollowUps.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarClock size={30} className="mx-auto text-slate-600" />
            <p className="mt-3 text-sm font-medium text-white">
              No follow-ups found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Create a follow-up to stay on top of your next conversation.
            </p>
            <button
              type="button"
              onClick={startCreate}
              className="mt-4 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-400"
            >
              Create follow-up
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {groupedFollowUps.map((group) => {
              const isExpanded = expandedLeadId === group.id;

              const pendingCount = group.items.filter(
                (item) => item.status === "PENDING",
              ).length;

              const completedCount = group.items.filter(
                (item) => item.status === "COMPLETED",
              ).length;

              const cancelledCount = group.items.filter(
                (item) => item.status === "CANCELLED",
              ).length;

              return (
                <div key={group.id} className="transition hover:bg-white/[0.015]">
                  {/* LEAD HEADER */}
                  <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.08] text-violet-300">
                        <Users size={19} />
                      </div>

                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (group.lead?.id) setSelectedLead(group.lead);
                          }}
                          disabled={!group.lead?.id}
                          className="truncate text-left text-base font-bold text-white transition hover:text-violet-300 hover:underline underline-offset-4 disabled:cursor-default disabled:hover:text-white disabled:hover:no-underline"
                          title="View lead profile"
                        >
                          {group.name}
                        </button>

                        <p className="mt-1 text-xs text-slate-500">
                          {group.items.length} reminder
                          {group.items.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-2.5 py-1.5 text-[10px] font-semibold text-amber-300">
                        Pending: {pendingCount}
                      </span>

                      <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1.5 text-[10px] font-semibold text-emerald-300">
                        Completed: {completedCount}
                      </span>

                      <span className="rounded-lg border border-rose-400/20 bg-rose-400/[0.07] px-2.5 py-1.5 text-[10px] font-semibold text-rose-300">
                        Cancelled: {cancelledCount}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleLead(group.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.07] px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-400/15"
                      >
                        {isExpanded ? "Hide reminders" : "View reminders"}
                        {isExpanded ? (
                          <ChevronDown size={15} />
                        ) : (
                          <ChevronRight size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* REMINDERS */}
                  {isExpanded && (
                    <div className="space-y-3 border-t border-white/[0.06] bg-[#090d16]/60 p-4 sm:p-5">
                      {group.items.map((item) => {
                        const Icon = typeIcon(item.follow_up_type);

                        const overdue =
                          item.status === "PENDING" &&
                          item.due_at &&
                          new Date(item.due_at) < new Date();

                        const dueDate = item.due_at
                          ? new Date(item.due_at)
                          : null;

                        const validDueDate =
                          dueDate && !Number.isNaN(dueDate.getTime());

                        const typeLabel = (
                          item.follow_up_type || "OTHER"
                        ).replace("_", " ");

                        return (
                          <article
                            key={item.id}
                            className="flex flex-col gap-4 rounded-xl border border-white/[0.07] bg-[#111725] p-4 transition hover:border-violet-400/20 sm:flex-row sm:items-start"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.08] text-violet-300">
                              <Icon size={17} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-white">
                                  {item.title || "Follow-up"}
                                </p>

                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyle(item.status)}`}
                                >
                                  {item.status}
                                </span>

                                {overdue && (
                                  <span className="rounded-full bg-rose-400/10 px-2.5 py-1 text-[10px] font-semibold text-rose-300">
                                    OVERDUE
                                  </span>
                                )}
                              </div>

                              <p className="mt-1.5 text-xs font-medium text-violet-200">
                                {typeLabel}
                              </p>

                              {item.description && (
                                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">
                                  {item.description}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarDays
                                    size={14}
                                    className="text-slate-500"
                                  />
                                  <span className="text-slate-500">
                                    Due date:
                                  </span>
                                  <strong className="font-medium text-slate-200">
                                    {validDueDate
                                      ? dueDate.toLocaleDateString([], {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "No date"}
                                  </strong>
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <Clock3
                                    size={14}
                                    className="text-slate-500"
                                  />
                                  <span className="text-slate-500">Time:</span>
                                  <strong className="font-medium text-slate-200">
                                    {validDueDate
                                      ? dueDate.toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "—"}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                              >
                                Edit
                              </button>

                              {item.status === "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() => markCompleted(item)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-400/10"
                                >
                                  <CheckCircle2 size={13} />
                                  Complete
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => removeItem(item)}
                                aria-label={`Delete ${item.title}`}
                                className="rounded-lg border border-rose-400/20 p-2 text-rose-300 hover:bg-rose-400/10"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* LEAD DETAILS POPUP */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedLead(null);
            }
          }}
        >
          <section className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#111725] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-violet-300">
                  Lead Profile
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  {selectedLead.name || "Lead Details"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedLead.company || "Individual"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
                aria-label="Close lead details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["Email", selectedLead.email],
                ["Phone", selectedLead.phone],
                ["Company", selectedLead.company],
                ["Source", selectedLead.source],
                [
                  "Status",
                  selectedLead.pipelineStatus || selectedLead.status,
                ],
                ["Priority", selectedLead.priority],
                [
                  "Deal Value",
                  selectedLead.estimated_value != null
                    ? `₹${selectedLead.estimated_value}`
                    : "—",
                ],
                [
                  "Created",
                  selectedLead.created_at
                    ? dateLabel(selectedLead.created_at)
                    : "—",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                >
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className="mt-1 break-words text-xs text-slate-200">
                    {value || "Not provided"}
                  </p>
                </div>
              ))}

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:col-span-2">
                <p className="text-[10px] text-slate-500">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-300">
                  {selectedLead.notes || "No notes added."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLead(null)}
              className="mt-5 w-full rounded-xl bg-violet-500 py-3 text-xs font-semibold text-white hover:bg-violet-400"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="my-6 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0e1320] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editing ? "Edit follow-up" : "Create follow-up"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Schedule the next touchpoint for a lead.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
                aria-label="Close form"
              >
                <X size={17} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <label className="text-xs text-slate-400 sm:col-span-2">
                Title *
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="e.g. Call about quotation"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-3 text-sm text-white outline-none focus:border-violet-400/50"
                />
              </label>

              <label className="text-xs text-slate-400">
                Lead *
                <select
                  required
                  value={form.lead}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lead: e.target.value,
                      customer: "",
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-3 text-sm text-white outline-none focus:border-violet-400/50"
                >
                  <option value="">Select a lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name}
                      {lead.company ? ` — ${lead.company}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-400">
                Type
                <select
                  value={form.follow_up_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      follow_up_type: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-3 text-sm text-white outline-none focus:border-violet-400/50"
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-400">
                Due date & time *
                <input
                  required
                  type="datetime-local"
                  value={form.due_at}
                  onChange={(e) =>
                    setForm({ ...form, due_at: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-3 text-sm text-white outline-none focus:border-violet-400/50"
                />
              </label>

              <label className="text-xs text-slate-400">
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-3 text-sm text-white outline-none focus:border-violet-400/50"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-400 sm:col-span-2">
                Notes
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  placeholder="Context, next steps, or discussion notes..."
                  className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#090d16] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.07] p-5">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                disabled={saving}
                type="submit"
                className="rounded-xl bg-violet-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Create follow-up"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}