import { useEffect, useState } from 'react'
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  IndianRupee,
  Send,
  CheckCircle2,
  Clock3,
} from 'lucide-react'
import {
  getQuotations,
  createQuotation,
  updateQuotation,
  deleteQuotation,
} from '../services/api'

const initialForm = {
  title: '',
  description: '',
  amount: '',
  currency: 'INR',
  status: 'DRAFT',
  valid_until: '',
}

const pretty = (value) =>
  String(value || 'DRAFT')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

const money = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0))
  } catch {
    return `${currency} ${Number(amount || 0).toLocaleString('en-IN')}`
  }
}

const formatDate = (value) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function Quotations({ refreshKey = 0 }) {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const result = await getQuotations()
      setItems(
        Array.isArray(result)
          ? result
          : result?.results || result?.data || []
      )
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          e?.message ||
          'Could not load quotations.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [refreshKey])

  const filtered = items.filter((quotation) =>
    [
      quotation.quote_number,
      quotation.title,
      quotation.description,
      quotation.status,
    ].some((value) =>
      String(value || '').toLowerCase().includes(query.toLowerCase())
    )
  )

  const totalValue = items.reduce(
    (sum, quotation) => sum + Number(quotation.amount || 0),
    0
  )

  const drafts = items.filter((quotation) => quotation.status === 'DRAFT').length
  const sent = items.filter((quotation) => quotation.status === 'SENT').length

  function openCreate() {
    setEditing(null)
    setForm({ ...initialForm })
    setError('')
    setNotice('')
    setModal(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      title: item.title || '',
      description: item.description || '',
      amount: item.amount ?? '',
      currency: item.currency || 'INR',
      status: item.status || 'DRAFT',
      valid_until: item.valid_until || '',
    })
    setError('')
    setNotice('')
    setModal(true)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        valid_until: form.valid_until || null,
      }

      if (editing) {
        await updateQuotation(editing.id, payload)
      } else {
        await createQuotation(payload)
      }

      setModal(false)
      setNotice(
        editing
          ? 'Quotation updated successfully.'
          : 'Quotation created successfully.'
      )

      await load()
    } catch (e) {
      const data = e?.response?.data

      setError(
        typeof data === 'object' && data !== null
          ? Object.entries(data)
              .map(([key, value]) =>
                `${key}: ${Array.isArray(value) ? value.join(', ') : value}`
              )
              .join(' | ')
          : data || e?.message || 'Could not save quotation.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function remove(item) {
    if (
      !window.confirm(
        `Delete quotation "${item.quote_number || item.title}"?`
      )
    ) {
      return
    }

    setError('')

    try {
      await deleteQuotation(item.id)
      setNotice('Quotation deleted successfully.')
      await load()
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          e?.message ||
          'Could not delete quotation.'
      )
    }
  }

  const stats = [
    {
      label: 'Total quotations',
      value: items.length,
      icon: FileText,
      note: 'All created quotations',
      color: 'bg-violet-500/15 text-violet-300',
    },
    {
      label: 'Total quoted value',
      value: money(totalValue),
      icon: IndianRupee,
      note: 'Combined quotation amount',
      color: 'bg-cyan-500/15 text-cyan-300',
    },
    {
      label: 'Awaiting action',
      value: drafts,
      icon: Clock3,
      note: 'Draft quotations',
      color: 'bg-amber-500/15 text-amber-300',
    },
    {
      label: 'Sent to clients',
      value: sent,
      icon: Send,
      note: 'Awaiting client response',
      color: 'bg-emerald-500/15 text-emerald-300',
    },
  ]

  return (
    <div className="space-y-6 pb-8 text-slate-100">
      {/* Page actions — page title is already provided by App.jsx */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 active:scale-[0.98]"
        >
          <Plus size={17} />
          New quotation
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
            className="rounded-md p-1 transition hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && !modal && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
            className="rounded-md p-1 transition hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, note, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/30"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm text-slate-400">{label}</span>
              <span className={`rounded-xl p-2 ${color}`}>
                <Icon size={18} />
              </span>
            </div>

            <div className="mt-4 break-words text-2xl font-bold tracking-tight">
              {value}
            </div>

            <p className="mt-1 text-xs text-slate-500">{note}</p>
          </div>
        ))}
      </div>

      {/* Quotations table */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-semibold text-slate-100">All quotations</h2>
            <p className="mt-1 text-xs text-slate-500">
              {filtered.length} quotation{filtered.length === 1 ? '' : 's'} found
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 focus-within:border-violet-400/50 sm:w-64">
              <Search size={16} className="shrink-0 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search quotations..."
                aria-label="Search quotations"
                className="min-w-0 w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-600"
              />
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              aria-label="Refresh quotations"
              title="Refresh quotations"
              className="rounded-xl border border-white/10 px-3 text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin' : ''}
              />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Quotation</th>
                <th className="px-5 py-4 font-medium">Amount</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Valid until</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    <RefreshCw
                      className="mx-auto mb-3 animate-spin"
                      size={20}
                    />
                    Loading quotations...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                      <FileText size={22} />
                    </div>
                    <p className="font-medium text-slate-300">
                      {query
                        ? 'No matching quotations'
                        : 'No quotations yet'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {query
                        ? 'Try another search term.'
                        : 'Create your first quotation to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-100">
                        {item.title || 'Untitled quotation'}
                      </div>
                      <div className="mt-1 max-w-md truncate text-xs text-slate-500">
                        {item.quote_number || `QT-${item.id}`}
                        {item.description ? ` · ${item.description}` : ''}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-200">
                      {money(item.amount, item.currency)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          item.status === 'ACCEPTED'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            : item.status === 'REJECTED' ||
                                item.status === 'EXPIRED'
                              ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                              : item.status === 'SENT'
                                ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
                                : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {pretty(item.status)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                      {formatDate(item.valid_until)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          title="Edit quotation"
                          aria-label={`Edit ${item.title || 'quotation'}`}
                          className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-violet-400/30 hover:text-violet-300"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => remove(item)}
                          title="Delete quotation"
                          aria-label={`Delete ${item.title || 'quotation'}`}
                          className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-rose-400/30 hover:text-rose-300"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create / edit modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setModal(false)
            }
          }}
        >
          <form
            onSubmit={save}
            className="my-auto w-full max-w-xl space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-black/40 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {editing ? 'Edit quotation' : 'Create quotation'}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter the proposal details below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModal(false)}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm sm:col-span-2">
                <span className="text-slate-300">Quotation title *</span>
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="e.g. Website development proposal"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 outline-none transition focus:border-violet-400/60"
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="text-slate-300">Amount *</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value })
                  }
                  placeholder="25000"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 outline-none transition focus:border-violet-400/60"
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="text-slate-300">Currency</span>
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none transition focus:border-violet-400/60"
                >
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — Pound Sterling</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="text-slate-300">Status</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none transition focus:border-violet-400/60"
                >
                  {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map(
                    (status) => (
                      <option key={status} value={status}>
                        {pretty(status)}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="text-slate-300">Valid until</span>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) =>
                    setForm({ ...form, valid_until: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none transition focus:border-violet-400/60"
                />
              </label>

              <label className="space-y-1.5 text-sm sm:col-span-2">
                <span className="text-slate-300">Description</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Scope, deliverables, and terms..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 outline-none transition focus:border-violet-400/60"
                />
              </label>
            </div>

            {error && (
              <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                {saving
                  ? 'Saving...'
                  : editing
                    ? 'Save changes'
                    : 'Create quotation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
