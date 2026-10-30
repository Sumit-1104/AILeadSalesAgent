import { useMemo, useState } from 'react'
import { ArrowUpRight, Flame, Snowflake, Thermometer } from 'lucide-react'

const segments = [
  { name: 'Hot leads', key: 'HOT', color: '#a78bfa', icon: Flame, text: 'text-violet-300', bg: 'bg-violet-400/10' },
  { name: 'Warm leads', key: 'WARM', color: '#67e8f9', icon: Thermometer, text: 'text-cyan-300', bg: 'bg-cyan-400/10' },
  { name: 'Cold leads', key: 'COLD', color: '#fbbf24', icon: Snowflake, text: 'text-amber-300', bg: 'bg-amber-400/10' },
]

const radius = 45
const circumference = 2 * Math.PI * radius

export default function LeadQualification({ leads = [], onViewLeads }) {
  const [activeSegment, setActiveSegment] = useState(null)

  const items = useMemo(() => {
    const total = leads.length

    return segments.map((segment) => {
      const count = leads.filter(
        (lead) => String(lead.priority || '').toUpperCase() === segment.key,
      ).length

      return {
        ...segment,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      }
    })
  }, [leads])

  const total = leads.length
  let offset = 0

  return (
    <section className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#111725] to-[#0c111d] p-5 transition-colors duration-300 hover:border-white/[0.11] sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-cyan-500/[0.045] blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.08] text-cyan-300">
              <Thermometer size={16} />
            </span>
            <h3 className="text-sm font-semibold tracking-tight text-slate-100">Lead qualification</h3>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Lead distribution by priority
          </p>
        </div>
      </div>

      <div className="relative mt-7 flex flex-col items-center gap-7 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
        <div className="relative h-[170px] w-[170px] shrink-0">
          <div className="absolute inset-3 rounded-full bg-violet-500/[0.04] blur-xl" />

          <svg viewBox="0 0 120 120" role="img" aria-label="Lead priority distribution" className="relative h-full w-full -rotate-90 overflow-visible">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />

            {items.map((item) => {
              const segmentLength = total ? (item.count / total) * circumference : 0
              const segmentOffset = offset
              offset += segmentLength

              if (!item.count) return null

              return (
                <circle
                  key={item.key}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={activeSegment === item.name ? 15 : 12}
                  strokeDasharray={`${Math.max(0, segmentLength - 3)} ${circumference}`}
                  strokeDashoffset={-segmentOffset}
                  strokeLinecap="round"
                  opacity={activeSegment && activeSegment !== item.name ? 0.28 : 1}
                  className="cursor-pointer transition-all duration-300"
                  onClick={() => setActiveSegment((current) => current === item.name ? null : item.name)}
                >
                  <title>{`${item.name}: ${item.count} (${item.pct}%)`}</title>
                </circle>
              )
            })}
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[27px] font-semibold tracking-tight text-white">
              {activeSegment ? (items.find((item) => item.name === activeSegment)?.count ?? 0).toLocaleString() : total.toLocaleString()}
            </span>
            <span className="mt-1 text-[10px] text-slate-500">
              {activeSegment || 'Total leads'}
            </span>
            <span className="mt-1.5 text-[9px] text-slate-500">
              Database records
            </span>
          </div>
        </div>

        <div className="w-full min-w-0 flex-1 space-y-4">
          {items.map((item) => {
            const Icon = item.icon
            const selected = activeSegment === item.name

            return (
              <button
                type="button"
                key={item.key}
                onClick={() => setActiveSegment((current) => current === item.name ? null : item.name)}
                aria-pressed={selected}
                className={`block w-full rounded-xl p-2.5 text-left transition-all duration-200 ${selected ? 'bg-white/[0.045] ring-1 ring-white/10' : 'hover:bg-white/[0.025]'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.bg} ${item.text}`}>
                      <Icon size={15} />
                    </span>
                    <span className="truncate text-[11px] font-medium text-slate-300">{item.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-white">{item.pct}%</span>
                </div>

                <div className="ml-[42px] mt-2.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.pct}%`, backgroundColor: item.color, boxShadow: selected ? `0 0 12px ${item.color}55` : 'none' }} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-500">{item.count.toLocaleString()} leads</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {total === 0 && (
        <p className="mt-4 text-center text-xs text-slate-500">
          No leads are available for your account yet.
        </p>
      )}

      <button
        type="button"
        onClick={onViewLeads}
        className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] py-3 text-[11px] font-medium text-slate-300 transition-all duration-200 hover:border-violet-400/25 hover:bg-violet-400/[0.05] hover:text-white"
      >
        View lead insights
        <ArrowUpRight size={14} />
      </button>
    </section>
  )
}