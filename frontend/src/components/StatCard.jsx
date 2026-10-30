import {
  ArrowDownRight,
  ArrowUpRight,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'

const icons = {
  users: Users,
  target: Target,
  trending: TrendingUp,
  zap: Zap,
}

const accents = [
  {
    color: '#a78bfa',
    glow: 'rgba(139,92,246,0.13)',
    border: 'group-hover:border-violet-400/25',
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-300',
  },
  {
    color: '#67e8f9',
    glow: 'rgba(6,182,212,0.11)',
    border: 'group-hover:border-cyan-400/25',
    iconBg: 'bg-cyan-500/10',
    iconText: 'text-cyan-300',
  },
  {
    color: '#34d399',
    glow: 'rgba(16,185,129,0.10)',
    border: 'group-hover:border-emerald-400/25',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-300',
  },
  {
    color: '#fbbf24',
    glow: 'rgba(245,158,11,0.10)',
    border: 'group-hover:border-amber-400/25',
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-300',
  },
]

const fallbackStat = {
  title: 'Total Leads',
  value: '0',
  icon: 'users',
  positive: true,
  change: '0%',
  points: '0,25 20,20 40,22 60,12 80,16 100,5',
}

export default function StatCard({ stat, index = 0 }) {
  // Prevent the dashboard from crashing if a stat is missing.
  const safeStat = stat && typeof stat === 'object'
    ? { ...fallbackStat, ...stat }
    : fallbackStat

  const Icon = icons[safeStat.icon] || Users
  const accent = accents[Math.abs(Number(index) || 0) % accents.length]
  const isPositive = Boolean(safeStat.positive)
  const sparklineId = `sparkline-${index}`

  return (
    <article
      className={`group relative isolate overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#121827] to-[#0c111d] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 ${accent.border}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 -z-10 h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: accent.glow, opacity: 0.75 }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">
            {safeStat.title}
          </p>

          <p className="mt-3 break-words text-[27px] font-semibold leading-none tracking-tight text-white sm:text-[30px]">
            {safeStat.value ?? '0'}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] ${accent.iconBg} ${accent.iconText}`}
        >
          <Icon size={20} strokeWidth={1.8} />
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-2 pr-1">
        <span
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold ${
            isPositive
              ? 'border-emerald-400/10 bg-emerald-400/[0.08] text-emerald-300'
              : 'border-rose-400/10 bg-rose-400/[0.08] text-rose-300'
          }`}
        >
          {isPositive ? (
            <ArrowUpRight size={12} />
          ) : (
            <ArrowDownRight size={12} />
          )}
          {safeStat.change ?? '0%'}
        </span>

        {/* <span className="text-[10px] text-slate-500">
          vs. last week
        </span> */}
      </div>

      <svg
        aria-hidden="true"
        viewBox="0 0 100 35"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-[17px] right-4 h-7 w-[76px] opacity-50 transition-opacity duration-300 group-hover:opacity-90"
      >
        <defs>
          <linearGradient
            id={sparklineId}
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0%" stopColor={accent.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accent.color} stopOpacity="1" />
          </linearGradient>
        </defs>

        <polyline
          points={safeStat.points || fallbackStat.points}
          fill="none"
          stroke={`url(#${sparklineId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </article>
  )
}