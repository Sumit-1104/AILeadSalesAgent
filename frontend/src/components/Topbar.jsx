
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Menu,
  Search,
  CheckCheck,
  Sparkles,
  ArrowUpRight,
  X,
  UserRound,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  MessageSquare,
  Clock3,
  CalendarDays,
  FileText,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react'
import {
  getLeads,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/api'

const pages = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Leads', icon: Users },
  { name: 'AI Conversations', icon: MessageSquare },
  { name: 'Follow-ups', icon: Clock3 },
  { name: 'Appointments', icon: CalendarDays },
  { name: 'AI Assistant', icon: Sparkles },
  { name: 'Quotations', icon: FileText },
  { name: 'Analytics', icon: BarChart3 },
  { name: 'Settings', icon: Settings },
]

export default function Topbar({
  activePage,
  setActivePage,
  setMobileMenu,
  user,
  onLogout,
}) {
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [leads, setLeads] = useState([])
  const [leadSearchLoading, setLeadSearchLoading] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [markingAllRead, setMarkingAllRead] = useState(false)

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length

  const searchRef = useRef(null)
  const profileRef = useRef(null)
  const notificationRef = useRef(null)

  const pageTitle =
    activePage === 'Overview' ? 'Sales overview' : activePage

  const displayName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    user?.email ||
    'Workspace Member'

  const initials = displayName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    if (!showSearch) return

    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setLeads([])
        return
      }

      try {
        setLeadSearchLoading(true)
        const data = await getLeads()
        const results = Array.isArray(data) ? data : data?.results || []
        setLeads(results)
      } catch (error) {
        console.error('Could not search leads:', error)
        setLeads([])
      } finally {
        setLeadSearchLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [showSearch, searchQuery])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowSearch(false)
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowProfile(false)
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false)
      }
    }

    function handleKeyDown(event) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault()
        setShowSearch(true)
        setShowProfile(false)
        setShowNotifications(false)
      }

      if (event.key === 'Escape') {
        setShowSearch(false)
        setShowProfile(false)
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!showNotifications) return

    let cancelled = false

    async function loadNotifications() {
      try {
        setNotificationLoading(true)
        setNotificationError('')

        const data = await getNotifications({ ordering: '-created_at' })
        const items = Array.isArray(data) ? data : data?.results || []

        if (!cancelled) {
          setNotifications(items)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Could not load notifications:', error)
          setNotificationError(
            'Could not load notifications. Please try again.'
          )
        }
      } finally {
        if (!cancelled) {
          setNotificationLoading(false)
        }
      }
    }

    loadNotifications()

    return () => {
      cancelled = true
    }
  }, [showNotifications])

  const query = searchQuery.trim().toLowerCase()

  const filteredPages = pages.filter((page) =>
    page.name.toLowerCase().includes(query)
  )

  const filteredLeads = leads.filter((lead) => {
    const searchable = [
      lead.name,
      lead.full_name,
      lead.email,
      lead.phone,
      lead.mobile,
      lead.company,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return query && searchable.includes(query)
  })

  function navigate(page) {
    setActivePage(page)
    setShowSearch(false)
    setShowProfile(false)
    setShowNotifications(false)
    setSearchQuery('')
  }

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-3 border-b border-white/10 bg-[#0b0f1a] px-4 sm:px-7 lg:px-9">
      {/* Page title */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileMenu(true)}
          className="rounded-xl border border-white/[0.09] bg-white/[0.025] p-2.5 text-slate-300 transition hover:bg-white/[0.07] lg:hidden"
        >
          <Menu size={19} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              {['Overview', 'Leads', 'AI Conversations', 'Follow-ups', 'Appointments'].includes(activePage)
                ? 'Workspace'
                : 'Management'}
            </span>
            <span className="text-slate-700">/</span>
            <span className="truncate text-violet-300">{activePage}</span>
          </div>

          <h1 className="mt-1 truncate text-sm font-semibold tracking-tight text-slate-100 sm:text-base">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Search, notifications, profile */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative" ref={searchRef}>
          <button
            type="button"
            aria-label="Search workspace"
            aria-expanded={showSearch}
            onClick={() => {
              setShowSearch((value) => !value)
              setShowProfile(false)
              setShowNotifications(false)
            }}
            className={`flex min-w-[140px] items-center gap-2 rounded-xl border px-3 py-2.5 transition sm:min-w-[180px] sm:px-4 ${showSearch
              ? 'border-violet-400/30 bg-violet-500/10 text-violet-200'
              : 'border-white/[0.08] bg-white/[0.025] text-slate-400 hover:border-violet-400/20 hover:bg-white/[0.05]'
              }`}
          >
            <Search size={18} />
            <span className="hidden text-base font-semibold md:inline">
              Search
            </span>
          </button>

          {showSearch && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-28px))] overflow-hidden rounded-2xl border border-slate-700/80 bg-[#111625] p-3 shadow-2xl shadow-black/60">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-[#0b0f1a] px-3">
                <Search size={15} className="shrink-0 text-violet-300" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search pages, name, email, phone..."
                  className="min-w-0 flex-1 bg-transparent py-3 text-xs text-white outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="rounded-md p-1 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              {!query ? (
                <>
                  <p className="px-2 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Quick navigation
                  </p>
                  {pages.slice(0, 5).map(({ name, icon: Icon }) => (
                    <button
                      type="button"
                      key={name}
                      onClick={() => navigate(name)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition hover:bg-violet-500/10 hover:text-violet-200"
                    >
                      <Icon size={15} className="text-slate-500" />
                      <span className="flex-1">{name}</span>
                      <ArrowUpRight size={13} className="text-slate-600" />
                    </button>
                  ))}
                </>
              ) : (
                <div className="mt-3 max-h-[300px] overflow-y-auto">
                  <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Pages
                  </p>

                  {filteredPages.map(({ name, icon: Icon }) => (
                    <button
                      type="button"
                      key={name}
                      onClick={() => navigate(name)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-slate-300 transition hover:bg-violet-500/10 hover:text-violet-200"
                    >
                      <Icon size={15} className="text-slate-500" />
                      <span className="flex-1">{name}</span>
                      <ArrowUpRight size={13} className="text-slate-600" />
                    </button>
                  ))}

                  <p className="px-2 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Leads
                  </p>

                  {leadSearchLoading && (
                    <p className="px-3 py-3 text-xs text-slate-500">
                      Searching leads...
                    </p>
                  )}

                  {!leadSearchLoading &&
                    filteredLeads.slice(0, 8).map((lead, index) => (
                      <button
                        type="button"
                        key={lead.id ?? lead.pk ?? index}
                        onClick={() => navigate('Leads')}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-violet-500/10"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                          <Users size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-slate-200">
                            {lead.name || lead.full_name || 'Unnamed lead'}
                          </span>
                          <span className="mt-1 block truncate text-[10px] text-slate-500">
                            {lead.email || lead.phone || lead.mobile || 'Lead record'}
                          </span>
                        </span>
                        <ArrowUpRight size={13} className="text-slate-600" />
                      </button>
                    ))}

                  {!leadSearchLoading &&
                    filteredPages.length === 0 &&
                    filteredLeads.length === 0 && (
                      <p className="px-3 py-4 text-xs text-slate-500">
                        No matching pages or leads found.
                      </p>
                    )}
                </div>
              )}

              <div className="mt-2 border-t border-white/[0.06] px-2 pt-3 text-[10px] text-slate-600">
                Press Esc to close
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={showNotifications}
            onClick={() => {
              setShowNotifications((value) => !value)
              setShowSearch(false)
              setShowProfile(false)
            }}
            className={`relative rounded-xl border p-2.5 transition ${showNotifications
              ? 'border-violet-400/20 bg-violet-500/10 text-violet-200'
              : 'border-transparent text-slate-300 hover:border-white/[0.08] hover:bg-white/[0.05]'
              }`}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#0b0f1a]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(300px,calc(100vw-28px))] rounded-2xl border border-slate-700/80 bg-[#111625] p-4 shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Notifications
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Workspace shortcuts
                  </p>
                </div>
                <span className="rounded-lg bg-violet-500/10 p-2 text-violet-300">
                  <Sparkles size={16} />
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('Leads')}
                  className="flex w-full gap-3 rounded-xl border border-white/[0.06] bg-[#171d2d] p-3 text-left transition hover:bg-[#1d2538]"
                >
                  <Users size={16} className="mt-0.5 text-cyan-300" />
                  <span>
                    <span className="block text-xs font-medium text-slate-200">
                      Lead activity
                    </span>
                    <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                      Open your lead workspace.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('Follow-ups')}
                  className="flex w-full gap-3 rounded-xl border border-white/[0.06] bg-[#171d2d] p-3 text-left transition hover:bg-[#1d2538]"
                >
                  <Clock3 size={16} className="mt-0.5 text-violet-300" />
                  <span>
                    <span className="block text-xs font-medium text-slate-200">
                      Follow-up reminders
                    </span>
                    <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                      Review your follow-up workspace.
                    </span>
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] py-2.5 text-[11px] text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <CheckCheck size={14} /> Close notifications
              </button>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            aria-label="Open profile menu"
            aria-expanded={showProfile}
            onClick={() => {
              setShowProfile((value) => !value)
              setShowSearch(false)
              setShowNotifications(false)
            }}
            className={`group flex items-center gap-2 rounded-full border p-1.5 transition-all duration-200 ease-out ${showProfile
              ? 'border-violet-400/30 bg-violet-500/[0.08]'
              : 'border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.04]'
              }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[11px] font-bold text-white ring-1 ring-white/15 transition-transform duration-200 group-hover:scale-[1.03]">
              {initials}
            </span>

          </button>

          {showProfile && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(280px,calc(100vw-28px))] origin-top-right overflow-hidden rounded-2xl border border-slate-700/80 bg-[#111625] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.75)]">
              <div className="border-b border-white/[0.08] bg-[#171d2d] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white ring-1 ring-white/10">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {displayName}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-slate-400">
                      {user?.email || user?.username || 'Signed-in account'}
                    </p>
                    {/* <p className="mt-1 text-[10px] text-violet-300">
                      Workspace account
                    </p> */}
                  </div>
                </div>
              </div>

              <div className="space-y-1 p-2">
                <button
                  type="button"
                  onClick={() => navigate('Settings')}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs text-slate-300 transition-all duration-200 hover:translate-x-0.5 hover:bg-violet-500/10 hover:text-white"
                >
                  <UserRound size={16} className="text-slate-400 transition-colors group-hover:text-violet-300" />
                  <span className="flex-1">Account &amp; profile</span>
                  <ArrowUpRight size={13} className="text-slate-600 transition-colors group-hover:text-violet-300" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('Settings')}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs text-slate-300 transition-all duration-200 hover:translate-x-0.5 hover:bg-violet-500/10 hover:text-white"
                >
                  <Settings size={16} className="text-slate-400 transition-colors group-hover:text-violet-300" />
                  <span className="flex-1">Settings</span>
                  <ArrowUpRight size={13} className="text-slate-600 transition-colors group-hover:text-violet-300" />
                </button>

                <div className="my-2 border-t border-white/[0.08]" />

                <button
                  type="button"
                  disabled={!onLogout}
                  onClick={() => {
                    setShowProfile(false)
                    if (onLogout) onLogout()
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs text-rose-300 transition-all duration-200 hover:translate-x-0.5 hover:bg-rose-500/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogOut size={16} />
                  <span className="flex-1">Log out</span>
                </button>

                {!onLogout && (
                  <p className="px-3 pb-2 text-[10px] text-slate-600">
                    Logout needs to be connected in the parent component.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
