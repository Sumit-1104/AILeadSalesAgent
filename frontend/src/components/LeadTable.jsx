import { useMemo, useState } from 'react'
import {
  Plus, Search, X, Eye, Pencil, Trash2, RefreshCw,
  ChevronDown, Users, Mail, Phone, Building2, Flame,
} from 'lucide-react'
import {
  createLead,
  updateLead,
  deleteLead,
  scoreLead,
  qualifyLead,
} from '../services/api'

const SOURCES = [
  'WEBSITE', 'WHATSAPP', 'INSTAGRAM', 'PHONE',
  'EMAIL', 'MANUAL', 'OTHER',
]

const STATUSES = [
  'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL',
  'NEGOTIATION', 'WON', 'LOST',
]

const PRIORITIES = ['HOT', 'WARM', 'COLD']

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: 'MANUAL',
  status: 'NEW',
  priority: 'WARM',
  estimated_value: '0',
  notes: '',
}

const priorityStyle = {
  HOT: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  WARM: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  COLD: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
}

const statusStyle = {
  NEW: 'text-sky-300 bg-sky-400/10',
  CONTACTED: 'text-violet-300 bg-violet-400/10',
  QUALIFIED: 'text-emerald-300 bg-emerald-400/10',
  PROPOSAL: 'text-cyan-300 bg-cyan-400/10',
  NEGOTIATION: 'text-amber-300 bg-amber-400/10',
  WON: 'text-emerald-300 bg-emerald-400/10',
  LOST: 'text-rose-300 bg-rose-400/10',
}

function formatLabel(value) {
  return String(value || '—')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  if (!value) return 'No activity recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function Badge({ value, type = 'status' }) {
  const styles = type === 'priority' ? priorityStyle : statusStyle
  return (
    <span className={`inline-flex whitespace-nowrap items-center rounded-full px-2.5 py-1 text-[10px] font-medium ${styles[value] || 'bg-white/5 text-slate-300'}`}>
      {type === 'priority' && value === 'HOT' && (
        <Flame size={11} className="mr-1" />
      )}
      {formatLabel(value)}
    </span>
  )
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0c111d] px-3 py-2.5 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-violet-400/50'

function LeadForm({ initialLead, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    ...(initialLead || {}),
    estimated_value: String(initialLead?.estimated_value ?? '0'),
  }))
  const [error, setError] = useState('')

  function change(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Lead name is required.')
      return
    }

    if (!form.phone.trim() && !form.email.trim()) {
      setError('Enter at least a phone number or email address.')
      return
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      source: form.source,
      status: form.status,
      priority: form.priority,
      estimated_value: Number(form.estimated_value) || 0,
      notes: form.notes.trim(),
    }

    try {
      await onSave(payload)
    } catch (err) {
      const data = err?.response?.data
      const detail = data?.detail || data?.error
      const fieldErrors = data && typeof data === 'object'
        ? Object.entries(data)
            .map(([key, value]) =>
              `${key}: ${Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : JSON.stringify(value)}`
            )
            .join(' | ')
        : ''

      setError(
        detail ||
        fieldErrors ||
        err?.message ||
        'Unable to save this lead.'
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <form
        onSubmit={submit}
        className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#111725] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-violet-300">
              Lead management
            </p>
            <h3 className="mt-1 text-base font-semibold text-white">
              {initialLead ? 'Edit lead' : 'Create a new lead'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close form"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Full name *">
            <input
              autoFocus
              name="name"
              value={form.name}
              onChange={change}
              required
              maxLength={150}
              placeholder="e.g. Rahul Sharma"
              className={inputClass}
            />
          </Field>

          <Field label="Company">
            <input
              name="company"
              value={form.company}
              onChange={change}
              placeholder="Company name"
              className={inputClass}
            />
          </Field>

          <Field label="Email address">
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={change}
              placeholder="name@company.com"
              className={inputClass}
            />
          </Field>

          <Field label="Phone number">
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={change}
              placeholder="Mobile number"
              className={inputClass}
            />
          </Field>

          <Field label="Lead source">
            <select name="source" value={form.source} onChange={change} className={inputClass}>
              {SOURCES.map((item) => (
                <option key={item} value={item}>{formatLabel(item)}</option>
              ))}
            </select>
          </Field>

          <Field label="Pipeline status">
            <select name="status" value={form.status} onChange={change} className={inputClass}>
              {STATUSES.map((item) => (
                <option key={item} value={item}>{formatLabel(item)}</option>
              ))}
            </select>
          </Field>

          <Field label="Lead priority">
            <select name="priority" value={form.priority} onChange={change} className={inputClass}>
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>{formatLabel(item)}</option>
              ))}
            </select>
          </Field>

          <Field label="Estimated deal value (₹)">
            <input
              name="estimated_value"
              type="number"
              min="0"
              step="1"
              value={form.estimated_value}
              onChange={change}
              className={inputClass}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Notes / requirements">
              <textarea
                name="notes"
                value={form.notes}
                onChange={change}
                rows={3}
                placeholder="Customer requirement, budget, timeline..."
                className={`${inputClass} resize-y`}
              />
            </Field>
          </div>
        </div>

        {error && (
          <div role="alert" className="mx-5 mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-xs leading-5 text-rose-300 sm:mx-6">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <RefreshCw size={13} className="animate-spin" />}
            {saving ? 'Saving...' : initialLead ? 'Save changes' : 'Create lead'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function LeadTable({
  leads = [],
  query = '',
  setQuery = () => {},
  filter = 'All',
  setFilter = () => {},
  onViewAll,
  onLeadsChanged,
}) {
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [openMenu, setOpenMenu] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiScore, setAiScore] = useState(null)
  const [aiQualification, setAiQualification] = useState(null)

  async function runLeadAI(action) {
    if (!selectedLead) return
    setAiLoading(true)
    setAiError('')
    try {
      if (action === 'score') {
        setAiScore(await scoreLead(selectedLead.id))
      } else {
        setAiQualification(await qualifyLead(selectedLead.id))
      }
    } catch (error) {
      setAiError(
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        'AI request failed. Check your AI provider configuration and try again.'
      )
    } finally {
      setAiLoading(false)
    }
  }

  const [editingLead, setEditingLead] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [sortNewest, setSortNewest] = useState(true)

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()

    const result = leads.filter((lead) => {
      const searchText = [
        lead.name, lead.company, lead.email, lead.phone,
        lead.source, lead.status, lead.priority,
      ].join(' ').toLowerCase()

      const matchesQuery = searchText.includes(search)
      const matchesStatus =
        filter === 'All' ||
        lead.pipelineStatus === filter ||
        lead.status === filter
      const matchesPriority =
        priorityFilter === 'All' ||
        lead.priority === priorityFilter

      return matchesQuery && matchesStatus && matchesPriority
    })

    return [...result].sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime() || 0
      const bDate = new Date(b.created_at || 0).getTime() || 0
      return sortNewest ? bDate - aDate : aDate - bDate
    })
  }, [leads, query, filter, priorityFilter, sortNewest])

  async function saveLead(payload) {
    setSaving(true)
    setActionError('')
    try {
      if (editingLead) {
        await updateLead(editingLead.id, payload)
      } else {
        await createLead(payload)
      }

      setEditingLead(null)
      setShowCreate(false)
      await onLeadsChanged?.()
    } finally {
      setSaving(false)
    }
  }

  async function removeLead(lead) {
    if (!lead.id) {
      setActionError('This lead has no database ID, so it cannot be deleted.')
      return
    }

    const confirmed = window.confirm(
      `Delete "${lead.name}" permanently? This action cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(lead.id)
    setActionError('')
    try {
      await deleteLead(lead.id)
      setOpenMenu(null)
      setSelectedLead(null)
      await onLeadsChanged?.()
    } catch (err) {
      setActionError(
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        'Could not delete this lead. Check your permissions and try again.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#111725] to-[#0c111d]">
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-sm font-semibold tracking-tight text-white">
              Lead management
            </h3>
            <span className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.07] px-2 py-1 text-[9px] font-medium text-emerald-300">
              LIVE API
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
            Manage contacts, deal values, pipeline stages and lead priority.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 focus-within:border-violet-400/30 sm:flex-none">
            <Search size={14} className="shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search leads..."
              aria-label="Search leads"
              className="w-full min-w-0 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600 sm:w-32"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-slate-500 hover:text-white">
                <X size={13} />
              </button>
            )}
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5">
            <span className="text-[10px] text-slate-500">Stage</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by pipeline stage" className="max-w-[115px] bg-transparent text-xs text-slate-300 outline-none">
              <option className="bg-[#111827]" value="All">All stages</option>
              {STATUSES.map((item) => (
                <option key={item} className="bg-[#111827]" value={item}>{formatLabel(item)}</option>
              ))}
            </select>
            <ChevronDown size={12} className="text-slate-500" />
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5">
            <span className="text-[10px] text-slate-500">Priority</span>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority" className="max-w-[90px] bg-transparent text-xs text-slate-300 outline-none">
              <option className="bg-[#111827]" value="All">All</option>
              {PRIORITIES.map((item) => (
                <option key={item} className="bg-[#111827]" value={item}>{formatLabel(item)}</option>
              ))}
            </select>
          </label>

          <button type="button" onClick={() => { setShowCreate(true); setEditingLead(null) }} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-500 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-400">
            <Plus size={14} /> Add lead
          </button>

          {onViewAll && (
            <button type="button" onClick={onViewAll} className="rounded-xl border border-white/[0.08] px-3 py-2.5 text-xs text-slate-300 transition hover:bg-white/[0.04] hover:text-white">
              View all
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div role="alert" className="mx-5 mt-4 flex items-start justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2.5 text-xs text-rose-300 sm:mx-6">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} aria-label="Dismiss error"><X size={14} /></button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.015] text-[9px] font-medium tracking-[0.1em] text-slate-500">
              <th className="px-6 py-4">CONTACT</th>
              <th className="px-4 py-4">PIPELINE</th>
              <th className="px-4 py-4">PRIORITY</th>
              <th className="px-4 py-4">SOURCE</th>
              <th className="px-4 py-4">DEAL VALUE</th>
              <th className="px-4 py-4">
                <button type="button" onClick={() => setSortNewest((value) => !value)} className="hover:text-slate-200">
                  CREATED {sortNewest ? '↓' : '↑'}
                </button>
              </th>
              <th className="px-5 py-4 text-right">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((lead) => {
              const key = lead.id ?? lead.email ?? lead.name
              const priority = PRIORITIES.includes(lead.priority) ? lead.priority : 'COLD'
              const status = STATUSES.includes(lead.pipelineStatus)
                ? lead.pipelineStatus
                : STATUSES.includes(lead.status) ? lead.status : 'NEW'

              return (
                <tr key={key} className="border-b border-white/[0.045] transition-colors hover:bg-white/[0.025]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-400/[0.08] text-xs font-semibold text-violet-300">
                        {(lead.name || 'LD').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-[180px] truncate text-xs font-medium text-slate-200">{lead.name || 'Unnamed lead'}</p>
                        <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-500">
                          <Building2 size={10} /> {lead.company || 'Individual'}
                        </p>
                        <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-500">
                          {lead.email ? <Mail size={10} /> : <Phone size={10} />}
                          {lead.email || lead.phone || 'No contact details'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><Badge value={status} /></td>
                  <td className="px-4 py-4"><Badge value={priority} type="priority" /></td>
                  <td className="px-4 py-4 text-[11px] text-slate-400">{formatLabel(lead.source)}</td>
                  <td className="px-4 py-4 text-[11px] font-medium text-slate-300">{money(lead.estimated_value)}</td>
                  <td className="px-4 py-4 text-[11px] text-slate-500">{formatDate(lead.created_at)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button type="button" onClick={() => setSelectedLead(lead)} aria-label={`View ${lead.name}`} title="View details" className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white">
                        <Eye size={15} />
                      </button>
                      <button type="button" onClick={() => setEditingLead(lead)} aria-label={`Edit ${lead.name}`} title="Edit lead" className="rounded-lg p-2 text-slate-500 hover:bg-violet-400/10 hover:text-violet-300">
                        <Pencil size={15} />
                      </button>
                      <button type="button" onClick={() => removeLead(lead)} disabled={deletingId === lead.id} aria-label={`Delete ${lead.name}`} title="Delete lead" className="rounded-lg p-2 text-slate-500 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-40">
                        {deletingId === lead.id ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <Users size={28} className="text-slate-600" />
            <p className="mt-3 text-xs font-medium text-slate-300">No leads found</p>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-slate-500">
              Try another search or filter, or create your first lead.
            </p>
            <button type="button" onClick={() => { setQuery(''); setFilter('All'); setPriorityFilter('All') }} className="mt-3 text-xs text-violet-300 hover:text-violet-200">
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4 sm:px-6">
        <p className="text-[10px] text-slate-500">
          Showing <span className="font-semibold text-slate-300">{filtered.length}</span> of{' '}
          <span className="font-semibold text-slate-300">{leads.length}</span> leads
        </p>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Connected workspace
        </span>
      </div>

      {(showCreate || editingLead) && (
        <LeadForm
          key={editingLead?.id ?? 'new-lead'}
          initialLead={editingLead}
          saving={saving}
          onClose={() => { if (!saving) { setShowCreate(false); setEditingLead(null) } }}
          onSave={saveLead}
        />
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLead(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="lead-detail-title" className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#111725] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-violet-300">Lead profile</p>
                <h3 id="lead-detail-title" className="mt-2 text-lg font-semibold text-white">{selectedLead.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{selectedLead.company || 'Individual'}</p>
              </div>
              <button type="button" onClick={() => setSelectedLead(null)} aria-label="Close details" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X size={16} /></button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] text-slate-500">Email</p>
                <p className="mt-1 break-all text-xs text-slate-200">{selectedLead.email || 'Not provided'}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] text-slate-500">Phone</p>
                <p className="mt-1 text-xs text-slate-200">{selectedLead.phone || 'Not provided'}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] text-slate-500">Pipeline status</p>
                <div className="mt-2"><Badge value={selectedLead.pipelineStatus || selectedLead.status || 'NEW'} /></div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] text-slate-500">Priority</p>
                <div className="mt-2"><Badge value={selectedLead.priority || 'WARM'} type="priority" /></div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] text-slate-500">Estimated value</p>
                <p className="mt-1 text-sm font-semibold text-white">{money(selectedLead.estimated_value)}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] text-slate-500">Source / created</p>
                <p className="mt-1 text-xs text-slate-200">{formatLabel(selectedLead.source)}</p>
                <p className="mt-1 text-[10px] text-slate-500">{formatDate(selectedLead.created_at)}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:col-span-2">
                <p className="text-[10px] text-slate-500">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-300">{selectedLead.notes || 'No notes added.'}</p>
              </div>
            </div>


            <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
              <p className="text-xs font-semibold text-cyan-200">AI lead intelligence</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">
                Evaluate buying intent and discover the best next action for this lead.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={aiLoading}
                  onClick={() => runLeadAI('score')}
                  className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-50">
                  {aiLoading ? 'Analysing...' : 'AI Score'}
                </button>
                <button type="button" disabled={aiLoading}
                  onClick={() => runLeadAI('qualify')}
                  className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                  {aiLoading ? 'Analysing...' : 'Qualify Lead'}
                </button>
              </div>
              {aiError && <p className="mt-3 text-xs text-rose-300">{aiError}</p>}
              {aiScore && (
                <div className="mt-4 rounded-lg bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">AI lead score</span>
                    <span className="text-lg font-bold text-cyan-200">{aiScore.score ?? '?'}/100</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${Math.max(0, Math.min(100, Number(aiScore.score) || 0))}%` }} />
                  </div>
                  {aiScore.buying_intent && <p className="mt-2 text-xs text-slate-300">Buying intent: {aiScore.buying_intent}</p>}
                  {aiScore.reasoning && <p className="mt-2 text-xs leading-5 text-slate-400">{aiScore.reasoning}</p>}
                  {(aiScore.recommended_action || aiScore.recommended_next_action) &&
                    <p className="mt-2 text-xs text-cyan-200">Next: {aiScore.recommended_action || aiScore.recommended_next_action}</p>}
                </div>
              )}
              {aiQualification && (
                <div className="mt-3 rounded-lg bg-white/[0.04] p-3">
                  <p className="text-xs font-semibold text-white">
                    Qualification: {aiQualification.qualification || aiQualification.category || 'Complete'}
                  </p>
                  {aiQualification.reasoning && <p className="mt-2 text-xs leading-5 text-slate-400">{aiQualification.reasoning}</p>}
                  {aiQualification.recommended_action && <p className="mt-2 text-xs text-cyan-200">Next: {aiQualification.recommended_action}</p>}
                  {Array.isArray(aiQualification.questions_to_ask) && aiQualification.questions_to_ask.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold text-slate-300">Questions to ask</p>
                      <ul className="mt-1 list-disc pl-4 text-xs leading-5 text-slate-400">
                        {aiQualification.questions_to_ask.map((question, index) => <li key={index}>{question}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => { setSelectedLead(null); setEditingLead(selectedLead) }} className="flex-1 rounded-xl bg-violet-500 py-3 text-xs font-semibold text-white hover:bg-violet-400">
                Edit lead
              </button>
              <button type="button" onClick={() => setSelectedLead(null)} className="rounded-xl border border-white/10 px-4 py-3 text-xs text-slate-300 hover:bg-white/5">
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
