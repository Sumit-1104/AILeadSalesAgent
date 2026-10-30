
import {
  Activity,
  CalendarDays,
  Bot,
  Clock3,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Settings,
  TrendingUp,
  Users,
  X,
  LogOut,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getLeads, getFollowUps } from '../services/api'

export default function Sidebar({
  activePage,
  setActivePage,
  mobileMenu,
  setMobileMenu,
  user,
  onLogout,
}) {
  const [leadCount, setLeadCount] = useState(0)
  const [followUpCount, setFollowUpCount] = useState(0)

  const groups = [
    {
      label: 'WORKSPACE',
      items: [
        { name: 'Overview', icon: LayoutDashboard },
        { name: 'Leads', icon: Users, count: leadCount },
        { name: 'AI Conversations', icon: MessageSquare },
        { name: 'Follow-ups', icon: Clock3, count: followUpCount },
        { name: 'Appointments', icon: CalendarDays },
      ],
    },
    {
      label: 'MANAGEMENT',
      items: [
        { name: 'AI Assistant', icon: Bot },
        { name: 'Quotations', icon: FileText },
        { name: 'Analytics', icon: TrendingUp },
        { name: 'Settings', icon: Settings },
      ],
    },
  ]

  useEffect(() => {
    let active = true

    Promise.all([
      getLeads(),
      getFollowUps({ status: 'PENDING' }),
    ])
      .then(([leadData, followUpData]) => {
        if (!active) return

        const leads = Array.isArray(leadData)
          ? leadData
          : leadData?.results || []

        const followUps = Array.isArray(followUpData)
          ? followUpData
          : followUpData?.results || []

        setLeadCount(leads.length)
        setFollowUpCount(followUps.length)
      })
      .catch((error) => {
        console.error('Could not load sidebar counts:', error)
      })

    return () => {
      active = false
    }
  }, [])

  const displayName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    user?.email ||
    'User'

  const username = user?.username
    ? `@${user.username.replace(/^@/, '')}`
    : user?.email || 'Workspace Member'

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      {mobileMenu && (
        <button
          aria-label="Close menu overlay"
          onClick={() => setMobileMenu(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[255px] flex-col border-r border-white/[0.07] bg-[#0c101d] text-slate-100 shadow-2xl shadow-black/20 transition-transform duration-300 ${
          mobileMenu ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-white/[0.07] px-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-lg shadow-violet-500/10">
            <img
              src="/icon.png"
              alt="AI"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-[0.12em] text-white">
              WEB<span className="text-violet-400">SOUL</span>
            </p>
            <p className="mt-1 text-[9px] font-medium tracking-[0.18em] text-slate-500">
              AI SALES INTELLIGENCE
            </p>
          </div>

          <button
            aria-label="Close sidebar"
            onClick={() => setMobileMenu(false)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-6 [scrollbar-width:thin] [scrollbar-color:#34344b_transparent]">
          {groups.map((group) => (
            <div key={group.label} className="mb-7 last:mb-0">
              <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-500">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon || Activity
                  const isActive = activePage === item.name

                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActivePage(item.name)
                        setMobileMenu(false)
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex min-h-[43px] w-full items-center gap-3 rounded-xl border px-3 text-left text-[12px] transition-all duration-200 ${
                        isActive
                          ? 'border-violet-400/20 bg-gradient-to-r from-violet-500/[0.19] to-fuchsia-500/[0.06] font-semibold text-violet-200 shadow-sm shadow-violet-950/20'
                          : 'border-transparent text-slate-400 hover:border-white/[0.05] hover:bg-white/[0.045] hover:text-slate-100'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-violet-400" />
                      )}

                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={`shrink-0 transition-colors ${
                          isActive
                            ? 'text-violet-300'
                            : 'text-slate-500 group-hover:text-slate-200'
                        }`}
                      />

                      <span className="min-w-0 flex-1">{item.name}</span>

                      {item.count !== undefined && (
                        <span
                          className={`min-w-[22px] rounded-md px-1.5 py-1 text-center text-[10px] font-medium tabular-nums ${
                            isActive
                              ? 'bg-violet-400/15 text-violet-200'
                              : 'bg-white/[0.055] text-slate-400'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}

                      {isActive && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.7)]" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile + Logout */}
        <div className="shrink-0 border-t border-white/[0.07] bg-[#0c101d] p-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-2.5 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 text-xs font-bold text-violet-200">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-100">
                {displayName}
              </p>
              <p className="mt-1 truncate text-[10px] text-slate-500">
                {username}
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              disabled={!onLogout}
              aria-label="Log out"
              title="Log out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors duration-200 hover:border-red-400/20 hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LogOut size={17} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
