
import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Clock3,
  MapPin,
  CheckCircle2,
  Users,
} from 'lucide-react'
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../services/api'

const initialForm = {
  title: '',
  description: '',
  starts_at: '',
  ends_at: '',
  status: 'SCHEDULED',
  location: '',
}

const statuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']

const pretty = (value) =>
  String(value || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

const localDateTime = (value) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (number) => String(number).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const displayDate = (value) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const statStyles = [
  'bg-cyan-500/15 text-cyan-300',
  'bg-violet-500/15 text-violet-300',
  'bg-emerald-500/15 text-emerald-300',
  'bg-amber-500/15 text-amber-300',
]

export default function Appointments({ refreshKey = 0 }) {
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
      const result = await getAppointments()
      setItems(
        Array.isArray(result)
          ? result
          : result?.results || result?.data || [],
      )
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          e?.message ||
          'Could not load appointments.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [refreshKey])

  const filtered = items.filter((appointment) =>
    [
      appointment.title,
      appointment.description,
      appointment.location,
      appointment.status,
    ].some((value) =>
      String(value || '').toLowerCase().includes(query.toLowerCase()),
    ),
  )

  const now = Date.now()

  const upcoming = items.filter(
    (appointment) =>
      appointment.status === 'SCHEDULED' &&
      new Date(appointment.starts_at).getTime() >= now,
  ).length

  const completed = items.filter(
    (appointment) => appointment.status === 'COMPLETED',
  ).length

  const today = items.filter((appointment) => {
    if (!appointment.starts_at) return false

    const start = new Date(appointment.starts_at)
    const current = new Date()

    return (
      start.getFullYear() === current.getFullYear() &&
      start.getMonth() === current.getMonth() &&
      start.getDate() === current.getDate()
    )
  }).length

  function openCreate() {
    setEditing(null)
    setForm({ ...initialForm })
    setError('')
    setModal(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      title: item.title || '',
      description: item.description || '',
      starts_at: localDateTime(item.starts_at),
      ends_at: localDateTime(item.ends_at),
      status: item.status || 'SCHEDULED',
      location: item.location || '',
    })
    setError('')
    setModal(true)
  }

  async function save(event) {
    event.preventDefault()

    if (
      !form.starts_at ||
      !form.ends_at ||
      new Date(form.ends_at).getTime() <=
        new Date(form.starts_at).getTime()
    ) {
      setError('End date and time must be later than the start date and time.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      }

      if (editing) {
        await updateAppointment(editing.id, payload)
      } else {
        await createAppointment(payload)
      }

      setModal(false)
      setNotice(
        editing
          ? 'Appointment updated successfully.'
          : 'Appointment created successfully.',
      )

      await load()
    } catch (e) {
      const data = e?.response?.data

      setError(
        typeof data === 'object' && data !== null
          ? Object.entries(data)
              .map(([key, value]) => {
                const message = Array.isArray(value)
                  ? value.join(', ')
                  : String(value)
                return `${key}: ${message}`
              })
              .join(' | ')
          : data || e?.message || 'Could not save appointment.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete appointment "${item.title}"?`)) return

    setError('')

    try {
      await deleteAppointment(item.id)
      setNotice('Appointment deleted.')
      await load()
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          e?.message ||
          'Could not delete appointment.',
      )
    }
  }

  const stats = [
    {
      label: 'Total appointments',
      value: items.length,
      icon: CalendarDays,
      note: 'All scheduled meetings',
    },
    {
      label: 'Upcoming meetings',
      value: upcoming,
      icon: Clock3,
      note: 'Scheduled for the future',
    },
    {
      label: 'Completed',
      value: completed,
      icon: CheckCircle2,
      note: 'Successfully completed',
    },
    {
      label: 'Today',
      value: today,
      icon: Users,
      note: 'Meetings scheduled today',
    },
  ]

  return (
    <div className="space-y-6 pb-8 text-slate-100">
      {/* The shared App.jsx header supplies the page title. */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
        >
          <Plus size={17} />
          Schedule appointment
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
            className="rounded-lg p-1 transition hover:bg-white/5"
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
            className="rounded-lg p-1 transition hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, note }, index) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/30"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-400">{label}</span>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${statStyles[index]}`}
              >
                <Icon size={18} />
              </span>
            </div>
            <div className="mt-4 text-3xl font-bold tracking-tight tabular-nums">
              {value}
            </div>
            <p className="mt-1 text-xs text-slate-500">{note}</p>
          </div>
        ))}
      </div>

      {/* Schedule table */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-semibold text-slate-100">Meeting schedule</h2>
            <p className="mt-1 text-xs text-slate-500">
              {filtered.length} appointment
              {filtered.length === 1 ? '' : 's'} found
            </p>
          </div>

          <div className="flex min-w-0 gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 sm:w-64 sm:flex-none">
              <Search size={16} className="shrink-0 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search meetings..."
                aria-label="Search appointments"
                className="min-w-0 w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-600"
              />
            </div>
            <button
              type="button"
              onClick={load}
              aria-label="Refresh appointments"
              disabled={loading}
              className="flex shrink-0 items-center justify-center rounded-xl border border-white/10 px-3 text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin' : ''}
              />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Meeting</th>
                <th className="px-5 py-4 font-medium">Starts</th>
                <th className="px-5 py-4 font-medium">Ends</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-14 text-center text-slate-400">
                    <RefreshCw
                      className="mx-auto mb-3 animate-spin"
                      size={20}
                    />
                    Loading appointments...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                      <CalendarDays size={22} />
                    </div>
                    <p className="font-medium text-slate-300">
                      {query
                        ? 'No matching appointments'
                        : 'No appointments scheduled'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {query
                        ? 'Try another search term.'
                        : 'Schedule your first client meeting or demo.'}
                    </p>
                    {!query && (
                      <button
                        type="button"
                        onClick={openCreate}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                      >
                        <Plus size={14} />
                        Schedule your first meeting
                      </button>
                    )}
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
                        {item.title || 'Untitled meeting'}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        {item.location ? (
                          <>
                            <MapPin size={12} className="shrink-0" />
                            <span>{item.location}</span>
                          </>
                        ) : (
                          item.description || 'Client meeting'
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-300">
                      {displayDate(item.starts_at)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                      {displayDate(item.ends_at)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
                          item.status === 'COMPLETED'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            : item.status === 'CANCELLED' ||
                                item.status === 'NO_SHOW'
                              ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                              : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
                        }`}
                      >
                        {pretty(item.status || 'SCHEDULED')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          title="Edit appointment"
                          aria-label={`Edit ${item.title || 'appointment'}`}
                          className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          title="Delete appointment"
                          aria-label={`Delete ${item.title || 'appointment'}`}
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
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
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
                  {editing ? 'Edit appointment' : 'Schedule appointment'}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Set the time and meeting details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm sm:col-span-2">
                <span className="text-slate-300">Meeting title *</span>
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  placeholder="e.g. Product demo with client"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 outline-none focus:border-cyan-400/60"
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="text-slate-300">Start date &amp; time *</span>
                <input
                  required
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) =>
                    setForm({ ...form, starts_at: event.target.value })
                  }
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400/60"
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="text-slate-300">End date &amp; time *</span>
                <input
                  required
                  type="datetime-local"
                  min={form.starts_at || undefined}
                  value={form.ends_at}
                  onChange={(event) =>
                    setForm({ ...form, ends_at: event.target.value })
                  }
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400/60"
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="text-slate-300">Status</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400/60"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {pretty(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="text-slate-300">Location / meeting link</span>
                <input
                  maxLength={300}
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                  placeholder="Office, Google Meet, etc."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 outline-none focus:border-cyan-400/60"
                />
              </label>

              <label className="space-y-1.5 text-sm sm:col-span-2">
                <span className="text-slate-300">Description</span>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Agenda and notes..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 outline-none focus:border-cyan-400/60"
                />
              </label>
            </div>

            {error && (
              <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-white/[0.07] pt-4">
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
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
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
                    : 'Schedule meeting'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

