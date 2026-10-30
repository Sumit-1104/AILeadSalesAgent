
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot, MessageSquare, Plus, Search, Send, RefreshCw, Phone, Mail,
  Globe, Camera, MessageCircle, Clock3, CheckCircle2, X,
  LoaderCircle, AlertCircle, UserRound, Sparkles, ArrowUpRight,
  ChevronRight, WandSparkles, Lightbulb, Inbox, CircleDot,
} from 'lucide-react'
import {
  getConversations,
  createConversation,
  updateConversation,
  getConversationMessages,
  sendConversationMessage,
  getLeads,
  generateReply,
  suggestFollowup,
} from '../services/api'

const CHANNELS = ['WEBSITE', 'WHATSAPP', 'INSTAGRAM', 'EMAIL', 'PHONE', 'OTHER']
const STATUSES = ['OPEN', 'WAITING', 'CLOSED']

const channelInfo = {
  WEBSITE: { label: 'Website', icon: Globe },
  WHATSAPP: { label: 'WhatsApp', icon: MessageCircle },
  INSTAGRAM: { label: 'Instagram', icon: Camera },
  EMAIL: { label: 'Email', icon: Mail },
  PHONE: { label: 'Phone', icon: Phone },
  OTHER: { label: 'Other', icon: MessageSquare },
}

const panel = 'rounded-2xl border border-white/[0.08] bg-[#0e1320]'
const field = 'w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10'
const buttonSecondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50'
const buttonPrimary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50'

function unwrap(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
}

function displayError(error) {
  if (error.response?.status === 401) return 'Session expired. Please sign in again.'
  if (error.response?.status === 403) return 'You do not have permission to perform this action.'
  if (error.response?.data && typeof error.response.data === 'object') {
    return Object.values(error.response.data).flat().join(' ')
  }
  return error.message || 'Something went wrong. Please try again.'
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function initials(value = '') {
  return value.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join('').toUpperCase() || 'C'
}

function getContact(conversation) {
  return conversation.lead_name ||
    conversation.customer_name ||
    conversation.external_contact ||
    conversation.lead?.name ||
    conversation.customer?.name ||
    (conversation.lead ? `Lead #${conversation.lead}` : '') ||
    (conversation.customer ? `Customer #${conversation.customer}` : '') ||
    `Conversation #${conversation.id}`
}

function getMessageSender(message) {
  if (message.sender_type === 'AI') return 'iWebsoul AI'
  if (message.sender_type === 'SYSTEM') return 'System'
  if (message.sender_type === 'LEAD') return 'Customer'
  return 'You'
}

function StatusBadge({ status = 'OPEN' }) {
  const styles = {
    OPEN: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    WAITING: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    CLOSED: 'border-slate-500/20 bg-slate-500/10 text-slate-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${styles[status] || styles.OPEN}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

function Metric({ label, value, icon: Icon, tone, hint }) {
  return (
    <div className={`${panel} group relative overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] sm:p-5`}>
      <div className={`absolute -right-5 -top-5 h-20 w-20 rounded-full blur-2xl ${tone}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-1.5 text-[10px] text-slate-500">{hint}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

export default function AIConversations({ onChanged, refreshKey = 0 }) {
  const [conversations, setConversations] = useState([])
  const [leads, setLeads] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [aiReplyLoading, setAiReplyLoading] = useState(false)
  const [followupLoading, setFollowupLoading] = useState(false)
  const [aiReplyError, setAiReplyError] = useState('')
  const [followupSuggestion, setFollowupSuggestion] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const chatEndRef = useRef(null)
  const requestIdRef = useRef(0)
  const sendingRef = useRef(false)

  const [form, setForm] = useState({
    subject: '',
    channel: 'WEBSITE',
    lead: '',
    external_contact: '',
  })

  const selected = conversations.find((item) => item.id === selectedId) || null

  const loadConversations = useCallback(async (keepSelection = true) => {
    setLoading(true)
    setError('')
    try {
      const [conversationData, leadData] = await Promise.all([
        getConversations(),
        getLeads(),
      ])
      const items = unwrap(conversationData)
      setConversations(items)
      setLeads(unwrap(leadData))
      setSelectedId((current) => {
        if (keepSelection && current && items.some((item) => item.id === current)) return current
        return items[0]?.id ?? null
      })
    } catch (err) {
      setError(displayError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (id) => {
    const requestId = ++requestIdRef.current
    if (!id) {
      setMessages([])
      setMessagesLoading(false)
      return
    }
    setMessagesLoading(true)
    setAiReplyError('')
    setFollowupSuggestion(null)
    try {
      const data = await getConversationMessages(id)
      if (requestId === requestIdRef.current) setMessages(unwrap(data))
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setMessages([])
        setError(displayError(err))
      }
    } finally {
      if (requestId === requestIdRef.current) setMessagesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations(false)
  }, [loadConversations, refreshKey])

  useEffect(() => {
    loadMessages(selectedId)
  }, [selectedId, loadMessages])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, messagesLoading])

  const filtered = conversations.filter((conversation) => {
    const contact = getContact(conversation).toLowerCase()
    const subject = (conversation.subject || '').toLowerCase()
    const term = search.toLowerCase()
    return (!term || contact.includes(term) || subject.includes(term)) &&
      (statusFilter === 'ALL' || conversation.status === statusFilter)
  })

  const counts = {
    total: conversations.length,
    open: conversations.filter((item) => item.status === 'OPEN').length,
    waiting: conversations.filter((item) => item.status === 'WAITING').length,
    closed: conversations.filter((item) => item.status === 'CLOSED').length,
  }

  const linkedLead = selected
    ? leads.find((lead) => String(lead.id) === String(selected.lead?.id ?? selected.lead))
    : null

  async function handleCreate(event) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        subject: form.subject.trim(),
        channel: form.channel,
        external_contact: form.external_contact.trim(),
      }
      if (form.lead) payload.lead = Number(form.lead)
      const created = await createConversation(payload)
      setShowCreate(false)
      setForm({ subject: '', channel: 'WEBSITE', lead: '', external_contact: '' })
      await loadConversations(false)
      setSelectedId(created.id)
      onChanged?.()
    } catch (err) {
      setError(displayError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(status) {
    if (!selected || saving) return
    setSaving(true)
    setError('')
    try {
      const updated = await updateConversation(selected.id, { status })
      setConversations((current) => current.map((item) =>
        item.id === selected.id ? { ...item, ...updated } : item
      ))
      onChanged?.()
    } catch (err) {
      setError(displayError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateAIReply() {
    if (!selected) return
    setAiReplyLoading(true)
    setAiReplyError('')
    try {
      const context = [
        `Contact: ${getContact(selected)}`,
        `Subject: ${selected.subject || 'General inquiry'}`,
        `Conversation status: ${selected.status || 'OPEN'}`,
        ...messages.slice(-10).map((message) =>
          `${message.sender_type || 'CONTACT'}: ${message.body || ''}`
        ),
      ].join('\n')

      const result = await generateReply({
        lead_id: linkedLead?.id,
        context,
        tone: 'friendly and professional',
        language: 'English',
      })
      if (!result?.reply) throw new Error('AI did not return a reply. Please try again.')
      setDraft(result.reply)
    } catch (err) {
      setAiReplyError(err.response?.data?.detail || err.message || 'Unable to generate an AI reply.')
    } finally {
      setAiReplyLoading(false)
    }
  }

  async function handleSuggestFollowup() {
    if (!selected) return
    if (!linkedLead?.id) {
      setAiReplyError('Link this conversation to a lead to generate a follow-up suggestion.')
      return
    }
    setFollowupLoading(true)
    setAiReplyError('')
    setFollowupSuggestion(null)
    try {
      const context = messages.slice(-10).map((message) =>
        `${message.sender_type || 'CONTACT'}: ${message.body || ''}`
      ).join('\n')
      const result = await suggestFollowup({ lead_id: linkedLead.id, context })
      setFollowupSuggestion(result)
    } catch (err) {
      setAiReplyError(err.response?.data?.detail || err.message || 'Unable to suggest a follow-up.')
    } finally {
      setFollowupLoading(false)
    }
  }

  async function handleSend(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!selected || !body || sendingRef.current || selected.status === 'CLOSED') return

    const conversationId = selected.id
    const tempId = `temp-${Date.now()}`
    const sentAt = new Date().toISOString()
    const optimisticMessage = {
      id: tempId,
      body,
      sender_type: 'AGENT',
      direction: 'OUTBOUND',
      sent_at: sentAt,
      created_at: sentAt,
      _optimistic: true,
    }

    sendingRef.current = true
    setMessages((current) => [...current, optimisticMessage])
    setDraft('')
    setSaving(true)
    setError('')

    try {
      const response = await sendConversationMessage(conversationId, {
        body,
        sender_type: 'AGENT',
        direction: 'OUTBOUND',
      })
      const savedMessage = response?.data ?? response
      if (savedMessage?.id) {
        setMessages((current) => current.map((message) =>
          message.id === tempId ? savedMessage : message
        ))
      }
      getConversationMessages(conversationId).then((data) => {
        if (selectedId === conversationId) setMessages(unwrap(data))
      }).catch(() => {})
      loadConversations(true).catch(() => {})
      onChanged?.()
    } catch (err) {
      setMessages((current) => current.filter((message) => message.id !== tempId))
      setDraft(body)
      setError(displayError(err))
    } finally {
      sendingRef.current = false
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 text-slate-200 sm:space-y-6">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="All conversations" value={counts.total} icon={Inbox} tone="text-violet-300 bg-violet-400/[0.08]" hint="Across all channels" />
        <Metric label="Open" value={counts.open} icon={MessageCircle} tone="text-emerald-300 bg-emerald-400/[0.08]" hint="Active discussions" />
        <Metric label="Waiting" value={counts.waiting} icon={Clock3} tone="text-amber-300 bg-amber-400/[0.08]" hint="Awaiting a response" />
        <Metric label="Closed" value={counts.closed} icon={CheckCircle2} tone="text-slate-300 bg-slate-400/[0.08]" hint="Completed conversations" />
      </div>

      <div className={`${panel} overflow-hidden`}>
        <header className="flex flex-col justify-between gap-4 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-indigo-500/10 text-violet-200">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold tracking-tight text-white">Conversation inbox</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Workspace
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Customer conversations, organized in one place</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => loadConversations()} disabled={loading} className={buttonSecondary}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button type="button" onClick={() => setShowCreate(true)} className={buttonPrimary}>
              <Plus size={15} /> New conversation
            </button>
          </div>
        </header>

        <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="border-b border-white/[0.07] lg:border-b-0 lg:border-r">
            <div className="space-y-3 p-3 sm:p-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or subject..." className={`${field} pl-9`} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['ALL', 'All'],
                  ['OPEN', 'Open'],
                  ['WAITING', 'Waiting'],
                  ['CLOSED', 'Closed'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-lg px-3 py-2 text-[11px] font-medium transition ${
                      statusFilter === value
                        ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20'
                        : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                    }`}
                  >
                    {label}
                    {value === 'ALL' && <span className="ml-1.5 text-[10px] opacity-60">{counts.total}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[500px] space-y-1 overflow-y-auto px-2 pb-3">
              {loading ? (
                <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
                  <LoaderCircle size={16} className="animate-spin" /> Loading inbox...
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500">
                    <MessageSquare size={22} />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-300">Nothing here yet</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Try another filter or create a conversation.</p>
                  <button type="button" onClick={() => setShowCreate(true)} className="mt-4 text-xs font-semibold text-violet-300 hover:text-violet-200">
                    Create conversation <ArrowUpRight size={13} className="ml-1 inline" />
                  </button>
                </div>
              ) : filtered.map((conversation) => {
                const active = conversation.id === selectedId
                const ChannelIcon = channelInfo[conversation.channel]?.icon || MessageSquare
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`group w-full rounded-xl border p-3 text-left transition duration-150 ${
                      active
                        ? 'border-violet-400/20 bg-gradient-to-r from-violet-500/[0.12] to-indigo-500/[0.04]'
                        : 'border-transparent hover:border-white/[0.06] hover:bg-white/[0.025]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        active ? 'bg-violet-400/15 text-violet-200' : 'bg-white/[0.05] text-slate-300'
                      }`}>
                        {initials(getContact(conversation))}
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md border border-[#0e1320] bg-[#171d2d] text-slate-400">
                          <ChannelIcon size={11} />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-slate-100">{getContact(conversation)}</p>
                          <span className="shrink-0 text-[9px] text-slate-600">
                            {formatDate(conversation.last_message_at || conversation.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-400">{conversation.subject || 'General inquiry'}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="truncate text-[10px] text-slate-500">{channelInfo[conversation.channel]?.label || conversation.channel || 'Other'}</span>
                          <StatusBadge status={conversation.status || 'OPEN'} />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="flex min-h-[560px] min-w-0 flex-col">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/15 bg-gradient-to-br from-violet-400/10 to-indigo-400/[0.04] text-violet-200">
                  <MessageSquare size={27} />
                </div>
                <h3 className="mt-5 text-base font-semibold text-white">Your inbox starts here</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Select a conversation to review the message history, draft an AI-assisted reply, and manage its status.</p>
                <button type="button" onClick={() => setShowCreate(true)} className={`${buttonPrimary} mt-5`}>
                  <Plus size={15} /> New conversation
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/[0.08] text-sm font-bold text-violet-200">
                      {initials(getContact(selected))}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-white">{getContact(selected)}</h3>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {selected.subject || 'General inquiry'} Â· {channelInfo[selected.channel]?.label || selected.channel || 'Other'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selected.status || 'OPEN'} />
                    <label htmlFor="conversation-status" className="sr-only">Conversation status</label>
                    <select id="conversation-status" value={selected.status || 'OPEN'} disabled={saving} onChange={(e) => handleStatusChange(e.target.value)} className="rounded-xl border border-white/10 bg-[#090d16] px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-violet-400/50">
                      {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] bg-white/[0.012] px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CircleDot size={13} className="text-emerald-400" />
                    <span>{messages.length} message{messages.length === 1 ? '' : 's'}</span>
                    {linkedLead && <><span className="text-slate-700">Â·</span><span>Lead linked</span></>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={handleSuggestFollowup} disabled={followupLoading || messages.length === 0} className={buttonSecondary}>
                      {followupLoading ? <LoaderCircle size={13} className="animate-spin" /> : <Lightbulb size={13} />}
                      Suggest follow-up
                    </button>
                    <button type="button" onClick={handleGenerateAIReply} disabled={aiReplyLoading || selected.status === 'CLOSED'} className={`${buttonSecondary} border-violet-400/20 text-violet-200 hover:bg-violet-400/[0.08]`}>
                      {aiReplyLoading ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      AI draft
                    </button>
                  </div>
                </div>

                {aiReplyError && (
                  <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs text-amber-200 sm:mx-5">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span className="flex-1">{aiReplyError}</span>
                    <button type="button" onClick={() => setAiReplyError('')} aria-label="Dismiss AI message"><X size={13} /></button>
                  </div>
                )}

                {followupSuggestion && (
                  <div className="mx-4 mt-3 rounded-xl border border-violet-400/20 bg-violet-400/[0.05] p-4 sm:mx-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-violet-200">
                      <WandSparkles size={14} /> Suggested follow-up
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {typeof followupSuggestion === 'string'
                        ? followupSuggestion
                        : followupSuggestion.suggestion || followupSuggestion.message || followupSuggestion.reply || JSON.stringify(followupSuggestion, null, 2)}
                    </p>
                    {(followupSuggestion.suggestion || followupSuggestion.message || followupSuggestion.reply) && (
                      <button
                        type="button"
                        onClick={() => setDraft(followupSuggestion.suggestion || followupSuggestion.message || followupSuggestion.reply)}
                        className="mt-3 text-xs font-semibold text-violet-300 hover:text-violet-200"
                      >
                        Use in composer <ChevronRight size={13} className="ml-1 inline" />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex-1 space-y-4 overflow-y-auto bg-[#090d16]/60 p-4 sm:p-5">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                      <LoaderCircle size={16} className="animate-spin" /> Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500">
                        <MessageSquare size={22} />
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-300">No messages yet</p>
                      <p className="mt-1 text-xs text-slate-500">Write a message below to start the history.</p>
                    </div>
                  ) : messages.map((message) => {
                    const isSalesAgent = message.sender_type === 'AGENT'
                    const isAI = message.sender_type === 'AI'
                    const isSystem = message.sender_type === 'SYSTEM'
                    return (
                      <div key={message.id} className={`flex w-full ${isSystem ? 'justify-center' : isSalesAgent ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[78%] ${
                          isSalesAgent
                            ? 'rounded-br-md border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-indigo-500/10'
                            : isAI
                              ? 'rounded-bl-md border border-indigo-400/20 bg-indigo-500/[0.07]'
                              : isSystem
                                ? 'max-w-[95%] rounded-xl border border-amber-400/15 bg-amber-400/[0.04]'
                                : 'rounded-bl-md border border-white/[0.07] bg-[#151b29]'
                        }`}>
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                            {isAI ? <Bot size={13} className="text-indigo-300" /> : isSystem ? <CircleDot size={12} className="text-amber-300" /> : isSalesAgent ? <Sparkles size={12} className="text-violet-300" /> : <UserRound size={13} className="text-slate-400" />}
                            <span className={`font-semibold ${isSalesAgent ? 'text-violet-200' : isAI ? 'text-indigo-300' : isSystem ? 'text-amber-300' : 'text-slate-300'}`}>
                              {getMessageSender(message)}
                            </span>
                            <span>Â·</span>
                            <span>{message._optimistic ? 'Sendingâ€¦' : formatDate(message.sent_at || message.created_at)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{message.body}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSend} className="border-t border-white/[0.07] bg-[#0e1320] p-4 sm:p-5">
                  {selected.status === 'CLOSED' && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3 text-xs text-amber-200">
                      <AlertCircle size={14} /> Reopen this conversation to send messages.
                    </div>
                  )}
                  <div className="rounded-2xl border border-white/10 bg-[#090d16] p-2 transition focus-within:border-violet-400/40 focus-within:ring-2 focus-within:ring-violet-400/[0.07]">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          e.currentTarget.form?.requestSubmit()
                        }
                      }}
                      rows={2}
                      placeholder={selected.status === 'CLOSED' ? 'Reopen this conversation to reply...' : 'Write a thoughtful reply...'}
                      disabled={selected.status === 'CLOSED'}
                      className="max-h-40 min-h-[60px] w-full resize-y bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-1 pt-2">
                      <div className="flex items-center gap-2 text-[10px] text-slate-600">
                        {/* <Sparkles size={12} className="text-violet-300" /> */}
                        <span>AI-WEBSOUL</span>
                        <span>Â·</span>
                        <span>Enter to send</span>
                      </div>
                      <button type="submit" disabled={saving || !draft.trim() || selected.status === 'CLOSED'} className={buttonPrimary}>
                        {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
                        Send reply
                      </button>
                    </div>
                  </div>
                  {/* <p className="mt-2 text-[10px] leading-5 text-slate-600">
                    Messages are saved in your workspace database. Sending here does not contact WhatsApp, email, or phone channels.
                  </p> */}
                </form>
              </>
            )}
          </section>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="new-conversation-title" className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#101624] p-5 shadow-2xl shadow-black/40 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200">
                  <Plus size={19} />
                </div>
                <div>
                  <h2 id="new-conversation-title" className="text-lg font-semibold text-white">New conversation</h2>
                  <p className="mt-1 text-xs text-slate-500">Create a record for a customer inquiry.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-6 space-y-4">
              <div>
                <label htmlFor="conversation-subject" className="mb-1.5 block text-xs font-medium text-slate-300">Subject</label>
                <input id="conversation-subject" required maxLength={200} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Website development inquiry" className={field} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="conversation-channel" className="mb-1.5 block text-xs font-medium text-slate-300">Channel</label>
                  <select id="conversation-channel" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className={field}>
                    {CHANNELS.map((channel) => <option key={channel} value={channel}>{channelInfo[channel]?.label || channel}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="conversation-lead" className="mb-1.5 block text-xs font-medium text-slate-300">Link lead (optional)</label>
                  <select id="conversation-lead" value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} className={field}>
                    <option value="">No lead linked</option>
                    {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name || lead.email || `Lead #${lead.id}`}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="conversation-contact" className="mb-1.5 block text-xs font-medium text-slate-300">Customer name / contact (optional)</label>
                <input id="conversation-contact" maxLength={180} value={form.external_contact} onChange={(e) => setForm({ ...form, external_contact: e.target.value })} placeholder="Name, email, or phone" className={field} />
              </div>

              <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
                <button type="button" onClick={() => setShowCreate(false)} className={buttonSecondary}>Cancel</button>
                <button type="submit" disabled={saving} className={buttonPrimary}>
                  {saving && <LoaderCircle size={14} className="animate-spin" />}
                  Create conversation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

