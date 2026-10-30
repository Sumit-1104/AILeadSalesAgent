import { useMemo } from 'react'
import {
  Activity,
  ArrowUpRight,
  MoreHorizontal,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-white/10 bg-[#111827]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-[11px] font-medium text-slate-400">{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center gap-2 py-1 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-slate-300">{item.name}</span>
          <span className="ml-5 font-semibold text-white">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function SalesChart({ leads = [] }) {
  const chartData = useMemo(() => {
    const days = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      days.push({
        key,
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        leads: 0,
        conversions: 0,
      })
    }

    const byDate = new Map(days.map((day) => [day.key, day]))

    leads.forEach((lead) => {
      if (!lead.created_at) return

      const date = new Date(lead.created_at)
      if (Number.isNaN(date.getTime())) return

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const day = byDate.get(key)

      if (!day) return

      day.leads += 1

      if (String(lead.status || '').toUpperCase() === 'WON') {
        day.conversions += 1
      }
    })

    return days
  }, [leads])

  const totalLeads = chartData.reduce((sum, day) => sum + day.leads, 0)
  const totalConversions = chartData.reduce((sum, day) => sum + day.conversions, 0)
  const conversionRate = totalLeads
    ? ((totalConversions / totalLeads) * 100).toFixed(1)
    : '0.0'

  return (
    <section className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#111725] to-[#0c111d] p-5 transition-colors duration-300 hover:border-white/[0.11] sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-500/[0.06] blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-400/[0.08] text-violet-300">
              <Activity size={16} />
            </span>
            <h3 className="text-sm font-semibold tracking-tight text-slate-100">Sales performance</h3>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Actual lead creation and won-lead trends
          </p>
        </div>
        <MoreHorizontal size={17} className="text-slate-500" />
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.055] bg-white/[0.02] p-3.5 sm:p-4">
          <p className="text-[10px] font-medium text-slate-500">Leads created</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{totalLeads.toLocaleString()}</p>
          <p className="mt-1.5 text-[10px] text-slate-600">Last 7 days</p>
        </div>
        <div className="rounded-xl border border-white/[0.055] bg-white/[0.02] p-3.5 sm:p-4">
          <p className="text-[10px] font-medium text-slate-500">Won leads</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{totalConversions.toLocaleString()}</p>
          <p className="mt-1.5 text-[10px] text-slate-600">{conversionRate}% of created leads</p>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 text-[10px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-violet-400" /> Leads
          </span>
          <span className="inline-flex items-center gap-2 text-[10px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-cyan-300" /> Won
          </span>
        </div>
        <span className="text-[10px] text-slate-600">Last 7 days</span>
      </div>

      <div className="relative mt-4 h-[230px] w-full min-w-0 sm:h-[255px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="salesLeadsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="salesConversionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ffffff0c" vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickMargin={12} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickMargin={8} width={35} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#64748b', strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="leads" name="Leads" stroke="#a78bfa" strokeWidth={2.5} fill="url(#salesLeadsGradient)" activeDot={{ r: 4, fill: '#a78bfa', stroke: '#111827', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="conversions" name="Won" stroke="#67e8f9" strokeWidth={2} fill="url(#salesConversionsGradient)" activeDot={{ r: 4, fill: '#67e8f9', stroke: '#111827', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="relative mt-3 flex items-center gap-2 border-t border-white/[0.055] pt-4">
        <TrendingUp size={14} className="shrink-0 text-emerald-300" />
        <p className="text-[10px] leading-5 text-slate-500">
          Calculated from leads currently returned by your Django API.
        </p>
      </div>
    </section>
  )
}