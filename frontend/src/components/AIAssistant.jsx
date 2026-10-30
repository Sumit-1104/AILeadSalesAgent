
import { useEffect, useState } from 'react'
import {
  Bot,
  Sparkles,
  Save,
  RotateCcw,
  ShieldCheck,
  MessageSquare,
  SlidersHorizontal,
  Globe2,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Power,
  WandSparkles,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react'

import {
  getAssistantConfiguration,
  updateAssistantConfiguration,
} from '../services/api'

const tones = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Clear, polished and trustworthy',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm and approachable',
  },
  {
    value: 'persuasive',
    label: 'Persuasive',
    description: 'Benefit-focused sales conversations',
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Relaxed and conversational',
  },
]

const inputClass =
  'mt-2 w-full rounded-xl border border-white/[0.09] bg-[#0a0e19] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/10'

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.08] text-violet-300">
        <Icon size={18} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  )
}

function QuickLink({ icon: Icon, title, description, color, onClick }) {
  const colors = {
    emerald:
      'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300 group-hover:border-emerald-400/30 group-hover:bg-emerald-400/[0.12]',
    violet:
      'border-violet-400/15 bg-violet-400/[0.07] text-violet-300 group-hover:border-violet-400/30 group-hover:bg-violet-400/[0.12]',
    sky: 'border-sky-400/15 bg-sky-400/[0.07] text-sky-300 group-hover:border-sky-400/30 group-hover:bg-sky-400/[0.12]',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.14] hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 sm:p-4"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${colors[color]}`}
      >
        <Icon size={19} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-100">
          {title}
        </span>
        <span className="mt-1 block text-[11px] leading-4 text-slate-500">
          {description}
        </span>
      </span>

      <ArrowUpRight
        size={15}
        className="shrink-0 text-slate-600 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-300"
      />
    </button>
  )
}

export default function AIAssistant() {
  const [form, setForm] = useState({
    name: 'Sales Assistant',
    instructions: '',
    welcome_message: 'Hello! How can I help you today?',
    tone: 'professional',
    language: 'English',
    model_name: 'default',
    is_active: true,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadConfiguration() {
      setLoading(true)
      setError('')

      try {
        const data = await getAssistantConfiguration()

        if (!cancelled) {
          setForm((current) => ({ ...current, ...data }))
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.detail ||
              'Could not load assistant settings. Check that the backend is running and you are signed in.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadConfiguration()

    return () => {
      cancelled = true
    }
  }, [])

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setNotice('')
  }

  async function saveConfiguration(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const data = await updateAssistantConfiguration(form)
      setForm((current) => ({ ...current, ...data }))
      setNotice('Assistant configuration saved successfully.')
    } catch (err) {
      const data = err?.response?.data

      const message =
        data?.detail ||
        (data && typeof data === 'object'
          ? Object.entries(data)
              .map(([key, value]) =>
                `${key}: ${Array.isArray(value) ? value.join(', ') : value}`
              )
              .join(' · ')
          : '') ||
        'Unable to save changes. Please check your connection and try again.'

      setError(message)
    } finally {
      setSaving(false)
    }
  }

  function jumpToField(id) {
    const element = document.getElementById(id)

    if (!element) return

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })

    element.focus({ preventScroll: true })
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-white/[0.07] bg-[#0c101d]">
        <div className="text-center">
          <LoaderCircle
            className="mx-auto animate-spin text-violet-300"
            size={30}
          />
          <p className="mt-3 text-sm text-slate-400">
            Loading assistant configuration…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Premium AI configuration hero */}
      <section className="group relative isolate overflow-hidden rounded-3xl border border-violet-400/20 bg-[#0b0d19] shadow-xl shadow-violet-950/20 transition-all duration-500 hover:border-violet-400/30">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-violet-600/[0.15] via-indigo-500/[0.06] to-fuchsia-500/[0.12]" />

        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl transition-transform duration-700 group-hover:scale-125" />

        <div className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4 sm:gap-5">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-500/25 to-fuchsia-500/10 text-violet-200 shadow-lg shadow-violet-950/30 transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3 sm:h-16 sm:w-16">
                <Bot size={30} />

                <span
                  className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-[3px] border-[#111020] ${
                    form.is_active ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-violet-200">
                    <Sparkles size={12} />
                    AI CONFIGURATION
                  </span>

                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
                      form.is_active
                        ? 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300'
                        : 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        form.is_active
                          ? 'animate-pulse bg-emerald-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    {form.is_active ? 'Assistant enabled' : 'Assistant paused'}
                  </span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Your AI,{' '}
                  <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                    your rules.
                  </span>
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-[15px]">
                  Shape your sales assistant’s personality, first impression
                  and customer experience—all from one place.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-300" />
                    Business-safe responses
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-violet-300" />
                    Custom greeting
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <Globe2 size={14} className="text-sky-300" />
                    Language preferences
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => change('is_active', !form.is_active)}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border px-4 py-3 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ${
                form.is_active
                  ? 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300 hover:border-emerald-300/40 hover:bg-emerald-400/[0.14]'
                  : 'border-violet-400/25 bg-violet-400/10 text-violet-200 hover:bg-violet-400/[0.16]'
              }`}
            >
              <Power size={15} />
              {form.is_active ? 'Pause assistant' : 'Enable assistant'}
            </button>
          </div>

          <div className="relative mt-7 border-t border-white/[0.08] pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Quick configuration
              </p>
              <span className="text-[10px] text-slate-600">
                Jump to a setting
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <QuickLink
                icon={ShieldCheck}
                title="Business instructions"
                description="Set rules for customer responses"
                color="emerald"
                onClick={() => jumpToField('assistant-instructions')}
              />

              <QuickLink
                icon={MessageSquare}
                title="Welcome message"
                description="Personalize the first greeting"
                color="violet"
                onClick={() => jumpToField('assistant-welcome-message')}
              />

              <QuickLink
                icon={Globe2}
                title="Language preferences"
                description="Choose your assistant's language"
                color="sky"
                onClick={() => jumpToField('assistant-language')}
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-4 text-sm text-rose-200"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200"
        >
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}

      <form
        onSubmit={saveConfiguration}
        className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]"
      >
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/[0.07] bg-[#0c101d] p-5 sm:p-6">
            <SectionTitle
              icon={SlidersHorizontal}
              title="Assistant identity"
              description="Set a name and communication preferences for your assistant."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-300">
                Assistant name
                <input
                  className={inputClass}
                  value={form.name}
                  maxLength={120}
                  onChange={(e) => change('name', e.target.value)}
                  required
                  placeholder="e.g. LeadPilot Sales Assistant"
                />
              </label>

              <label className="block text-xs font-medium text-slate-300">
                Preferred language
                <select
                  id="assistant-language"
                  className={inputClass}
                  value={form.language}
                  onChange={(e) => change('language', e.target.value)}
                >
                  {[
                    'English',
                    'Hindi',
                    'Hinglish',
                    'Spanish',
                    'French',
                    'German',
                    'Other',
                  ].map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-medium text-slate-300">
                Conversation tone
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {tones.map((tone) => (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() => change('tone', tone.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      form.tone === tone.value
                        ? 'border-violet-400/40 bg-violet-400/[0.08] ring-1 ring-violet-400/10'
                        : 'border-white/[0.07] bg-[#090d16] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100">
                        {tone.label}
                      </span>

                      {form.tone === tone.value && (
                        <CheckCircle2
                          size={15}
                          className="text-violet-300"
                        />
                      )}
                    </div>

                    <p className="mt-2 text-[11px] leading-5 text-slate-500">
                      {tone.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#0c101d] p-5 sm:p-6">
            <SectionTitle
              icon={WandSparkles}
              title="Personality & instructions"
              description="Guide the assistant on how it should answer customer questions."
            />

            <label className="block text-xs font-medium text-slate-300">
              System instructions
              <textarea
                id="assistant-instructions"
                className={`${inputClass} min-h-40 resize-y leading-6`}
                value={form.instructions}
                maxLength={12000}
                onChange={(e) => change('instructions', e.target.value)}
                placeholder="Explain your business, target customers, response rules, escalation steps and what the assistant must never promise."
              />

              <span className="mt-2 block text-right text-[10px] text-slate-600">
                {form.instructions.length}/12000 characters
              </span>
            </label>

            <label className="mt-5 block text-xs font-medium text-slate-300">
              First message / welcome message
              <textarea
                id="assistant-welcome-message"
                className={`${inputClass} min-h-24 resize-y leading-6`}
                value={form.welcome_message}
                maxLength={1000}
                onChange={(e) => change('welcome_message', e.target.value)}
                placeholder="Hello! Tell me what you are looking for, and I’ll help you."
              />
            </label>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/[0.07] bg-[#0c101d] p-5 sm:p-6">
            <SectionTitle
              icon={Sparkles}
              title="Model preference"
              description="Store the preferred model identifier for future provider integration."
            />

            <label className="block text-xs font-medium text-slate-300">
              Model identifier
              <input
                className={inputClass}
                value={form.model_name}
                maxLength={100}
                onChange={(e) => change('model_name', e.target.value)}
                placeholder="default"
              />
            </label>

            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              This setting stores a preference. It does not switch the live AI
              provider unless the backend AI service is configured to use it.
            </p>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#0c101d] p-5 sm:p-6">
            <SectionTitle
              icon={MessageSquare}
              title="Live preview"
              description="Preview the greeting and tone you have selected."
            />

            <div className="rounded-xl border border-white/[0.07] bg-[#090d16] p-4">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <Bot size={17} />
                </div>

                <div className="min-w-0">
                  <p className="break-words text-xs font-semibold text-slate-100">
                    {form.name || 'Sales Assistant'}
                  </p>

                  <p className="mt-0.5 text-[10px] capitalize text-emerald-300">
                    {form.tone} tone · {form.language}
                  </p>
                </div>
              </div>

              <div className="rounded-xl rounded-tl-sm border border-violet-400/10 bg-violet-400/[0.07] p-3 text-xs leading-6 text-slate-300">
                {form.welcome_message ||
                  'Your welcome message will appear here.'}
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-slate-500">
              <ShieldCheck
                size={14}
                className="mt-0.5 shrink-0 text-emerald-300"
              />
              <span>
                Use verified product details and pricing in your instructions.
                Avoid promises that your business cannot guarantee.
              </span>
            </div>
          </section>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0c101d] p-4">
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}

              {saving ? 'Saving configuration…' : 'Save configuration'}
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-4 py-3 text-xs text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <RotateCcw size={14} />
              Reload saved settings
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
