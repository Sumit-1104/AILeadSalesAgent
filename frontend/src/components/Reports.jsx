import { useCallback, useEffect, useState } from 'react'
import {
  RefreshCw,
  Users,
  Flame,
  Trophy,
  TrendingUp,
  FileText,
  Clock3,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  CalendarDays,
} from 'lucide-react'
import { getSalesReport } from '../services/api'

const number = (value) => Number(value || 0).toLocaleString('en-IN')

const money = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })

const pretty = (value) =>
  String(value || 'Unspecified')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())

const statusColors = [
  'bg-violet-400',
  'bg-cyan-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-blue-400',
]

function Panel({ children, className = '' }) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 sm:p-6 ${className}`}
    >
      {children}
    </section>
  )
}

function PanelHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-2 text-violet-300">
          <Icon size={17} />
        </div>
      )}
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function Breakdown({ title, items = [], labelKey, emptyText }) {
  const total = items.reduce(
    (sum, item) => sum + Number(item.count || 0),
    0
  )

  return (
    <Panel>
      <PanelHeading
        icon={BarChart3}
        title={title}
        subtitle={`${number(total)} total records`}
      />

      {!items.length ? (
        <div className="mt-7 flex min-h-24 flex-col items-center justify-center text-center">
          <BarChart3 size={22} className="text-slate-600" />
          <p className="mt-2 text-sm text-slate-400">{emptyText}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {items.map((item, index) => {
            const count = Number(item.count || 0)
            const percent = total ? (count / total) * 100 : 0

            return (
              <div key={`${item[labelKey] || 'unknown'}-${index}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-slate-300">
                    {pretty(item[labelKey])}
                  </span>

                  <span className="shrink-0 text-xs tabular-nums text-slate-400">
                    {number(count)} <span className="text-slate-600">Â·</span>{' '}
                    {percent.toFixed(0)}%
                  </span>
                </div>

                <div
                  className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
                  role="progressbar"
                  aria-label={`${pretty(item[labelKey])}: ${percent.toFixed(0)}%`}
                  aria-valuenow={Math.round(percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`h-full rounded-full ${statusColors[index % statusColors.length]} transition-all duration-700`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

function EmptyState({ icon: Icon = BarChart3, message }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] px-4 py-7 text-center">
      <div className="rounded-xl bg-white/[0.04] p-3 text-slate-500">
        <Icon size={21} />
      </div>
      <p className="mt-3 text-sm text-slate-400">{message}</p>
    </div>
  )
}

export default function Reports({ refreshKey = 0 }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getSalesReport()
      setReport(data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Could not load reports. Check your login and backend connection.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReport()
  }, [loadReport, refreshKey])

  const summary = report?.summary || {}

  const cards = [
    {
      label: 'Total leads',
      value: number(summary.total_leads),
      icon: Users,
      color: 'text-violet-300',
      bg: 'bg-violet-400/10',
    },
    {
      label: 'Hot leads',
      value: number(summary.hot_leads),
      icon: Flame,
      color: 'text-orange-300',
      bg: 'bg-orange-400/10',
    },
    {
      label: 'Won leads',
      value: number(summary.won_leads),
      icon: Trophy,
      color: 'text-emerald-300',
      bg: 'bg-emerald-400/10',
    },
    {
      label: 'Conversion rate',
      value: `${Number(summary.conversion_rate || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-cyan-300',
      bg: 'bg-cyan-400/10',
    },
    {
      label: 'Quotations',
      value: number(summary.total_quotations),
      icon: FileText,
      color: 'text-blue-300',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Accepted quote value',
      value: money(summary.accepted_quotation_value),
      icon: CheckCircle2,
      color: 'text-emerald-300',
      bg: 'bg-emerald-400/10',
    },
    {
      label: 'Follow-ups',
      value: number(summary.total_followups),
      icon: Clock3,
      color: 'text-amber-300',
      bg: 'bg-amber-400/10',
    },
    {
      label: 'New leads',
      value: number(summary.new_leads),
      icon: Users,
      color: 'text-pink-300',
      bg: 'bg-pink-400/10',
    },
  ]

  const daily = report?.daily_leads || []
  const maxDaily = Math.max(
    1,
    ...daily.map((item) => Number(item.count || 0))
  )

  return (
    <div className="space-y-6 pb-8 text-slate-100">
      {/* The main page title is provided by App.jsx */}

      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-violet-500/[0.09] via-[#101624] to-cyan-500/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 p-3 text-violet-300">
            <TrendingUp size={21} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Business performance
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Sales metrics and activity from your account
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadReport}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? 'animate-spin' : ''}
          />
          {loading ? 'Refreshing...' : 'Refresh report'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p>{error}</p>
            <button
              type="button"
              onClick={loadReport}
              className="mt-2 font-medium underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {loading && !report ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
            />
          ))}
        </div>
      ) : report ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon

              return (
                <article
                  key={card.label}
                  className="group min-w-0 rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/25"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-400">{card.label}</p>
                    <div className={`shrink-0 rounded-xl p-2.5 ${card.bg} ${card.color}`}>
                      <Icon size={18} />
                    </div>
                  </div>

                  <p className="mt-5 break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    {card.value}
                  </p>

                  <div className="mt-4 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
                  <p className="mt-3 text-xs text-slate-500">
                    Account overview
                  </p>
                </article>
              )
            })}
          </div>

          {/* Daily activity chart */}
          <Panel>
            <PanelHeading
              icon={CalendarDays}
              title="Lead activity"
              subtitle="New leads created over the last 7 days"
            />

            {daily.length ? (
              <div className="mt-7">
                <div className="flex h-48 items-end gap-2 sm:h-56 sm:gap-5">
                  {daily.map((item) => {
                    const count = Number(item.count || 0)
                    const height = Math.max(
                      count > 0 ? 7 : 2,
                      (count / maxDaily) * 100
                    )

                    const parsedDate = new Date(`${item.date}T12:00:00`)
                    const dateLabel = Number.isNaN(parsedDate.getTime())
                      ? item.date
                      : parsedDate.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })

                    return (
                      <div
                        key={item.date}
                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                      >
                        <span className="text-xs font-medium tabular-nums text-slate-300">
                          {number(count)}
                        </span>

                        <div className="flex h-36 w-full items-end justify-center sm:h-40">
                          <div
                            title={`${item.date}: ${count} leads`}
                            className={`w-full max-w-14 rounded-t-lg transition-all duration-700 ${
                              count > 0
                                ? 'bg-gradient-to-t from-violet-600 to-cyan-400'
                                : 'bg-white/[0.06]'
                            }`}
                            style={{ height: `${height}%` }}
                          />
                        </div>

                        <span className="text-[10px] text-slate-500 sm:text-xs">
                          {dateLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  Leads created per day
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  icon={CalendarDays}
                  message="No lead activity recorded in this period."
                />
              </div>
            )}
          </Panel>

          {/* Lead and quotation breakdowns */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Breakdown
              title="Leads by status"
              items={report.lead_statuses || []}
              labelKey="status"
              emptyText="No lead status data yet."
            />

            <Breakdown
              title="Lead sources"
              items={report.lead_sources || []}
              labelKey="source"
              emptyText="No lead source data yet."
            />

            <Breakdown
              title="Quotation status"
              items={report.quotation_statuses || []}
              labelKey="status"
              emptyText="No quotations recorded yet."
            />

            {/* Sales snapshot */}
            <Panel>
              <PanelHeading
                icon={Trophy}
                title="Sales snapshot"
                subtitle="Key outcomes and follow-up totals"
              />

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                  <span className="text-sm text-slate-400">
                    Accepted quotations
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-emerald-300">
                    {number(summary.accepted_quotations)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                  <span className="text-sm text-slate-400">Lost leads</span>
                  <span className="text-sm font-semibold tabular-nums text-rose-300">
                    {number(summary.lost_leads)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">
                    Total follow-ups
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-amber-300">
                    {number(summary.total_followups)}
                  </span>
                </div>
              </div>

              <p className="mt-6 border-t border-white/[0.06] pt-4 text-xs leading-5 text-slate-500">
                Figures reflect records visible to your signed-in account.
              </p>
            </Panel>
          </div>
        </>
      ) : !loading && !error ? (
        <Panel>
          <EmptyState
            icon={BarChart3}
            message="No report data available yet."
          />
        </Panel>
      ) : null}
    </div>
  )
}
