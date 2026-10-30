
import { useEffect, useState } from 'react'
import {
  Activity, ArrowRight, Eye, EyeOff, LockKeyhole, Mail,
  User, Building2, Phone, Sparkles, ShieldCheck, ArrowLeft,
  CheckCircle2, LoaderCircle,
} from 'lucide-react'
import {
  loginUser,
  signupUser,
  getCurrentUser,
  requestPasswordReset,
  confirmPasswordReset,
} from '../services/api'

const inputClass =
  'block w-full min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm leading-5 text-slate-100 outline-none placeholder:text-slate-500'

const fieldClass =
  'flex min-w-0 items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/70 px-3.5 transition-all duration-200 hover:border-slate-600 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15'

function getErrorMessage(err, fallback) {
  const data = err.response?.data

  if (!err.response) {
    return 'Cannot connect to the server. Check that Django is running.'
  }

  if (typeof data?.detail === 'string') return data.detail
  if (typeof data?.error === 'string') return data.error

  if (data && typeof data === 'object') {
    const messages = Object.entries(data).flatMap(([field, value]) => {
      const items = Array.isArray(value) ? value : [value]
      return items
        .filter((item) => typeof item === 'string')
        .map((item) =>
          `${field === 'non_field_errors' ? '' : `${field}: `}${item}`,
        )
    })

    if (messages.length) return messages.join(' ')
  }

  return fallback
}

function Field({ label, icon: Icon, children, htmlFor }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-xs font-medium text-slate-300"
      >
        {label}
      </label>

      <div className={fieldClass}>
        <Icon size={17} className="shrink-0 text-slate-500" />
        {children}
      </div>
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  autoComplete,
}) {
  return (
    <Field label={label} icon={LockKeyhole} htmlFor={id}>
      <input
        id={id}
        name={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        className={inputClass}
      />

      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="rounded-lg p-1.5 text-slate-500 transition hover:text-white"
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </Field>
  )
}

function CompanyBrand({ compact = false }) {
  return (
    <div
      className={`inline-flex items-center ${compact
        ? 'justify-center'
        : 'rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3'
        }`}
    >
      <img
        src="/websoul-logo.png"
        alt="WEBSOUL"
        className="h-auto w-full max-w-[280px] object-contain"
      />
    </div>
  )
}

export default function Login({ onLogin }) {
  const params = new URLSearchParams(window.location.search)

  const resetLinkPresent =
    window.location.pathname.endsWith('/reset-password') &&
    params.has('uid') &&
    params.has('token')

  function getInitialMode() {
    if (resetLinkPresent) return 'reset'

    const urlMode = new URLSearchParams(window.location.search).get('mode')

    return ['login', 'signup', 'forgot'].includes(urlMode)
      ? urlMode
      : 'login'
  }

  const [mode, setMode] = useState(getInitialMode)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const syncModeFromUrl = () => {
      const url = new URL(window.location.href)

      if (
        url.pathname.endsWith('/reset-password') &&
        url.searchParams.has('uid') &&
        url.searchParams.has('token')
      ) {
        setMode('reset')
        return
      }

      const urlMode = url.searchParams.get('mode')

      setMode(
        ['login', 'signup', 'forgot'].includes(urlMode)
          ? urlMode
          : 'login'
      )
    }

    window.addEventListener('popstate', syncModeFromUrl)

    return () => {
      window.removeEventListener('popstate', syncModeFromUrl)
    }
  }, [])

  function switchMode(nextMode) {
    const url = new URL(window.location.href)

    if (nextMode === 'login') {
      url.searchParams.delete('mode')
    } else {
      url.searchParams.set('mode', nextMode)
    }

    window.history.pushState({}, '', url)

    setMode(nextMode)
    setError('')
    setNotice('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (
      (mode === 'signup' || mode === 'reset') &&
      password !== confirmPassword
    ) {
      setError('Your passwords do not match.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        await loginUser(username.trim(), password)
        const user = await getCurrentUser()
        onLogin(user)
      } else if (mode === 'signup') {
        const response = await signupUser({
          username: username.trim(),
          email: email.trim(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          company_name: company.trim(),
        })

        const user = response.user || await getCurrentUser()
        onLogin(user)
      } else if (mode === 'forgot') {
        const response = await requestPasswordReset(email.trim())

        setNotice(
          response.detail ||
          'If an account exists for that email, password reset instructions will be sent.',
        )
      } else if (mode === 'reset') {
        const search = new URLSearchParams(window.location.search)
        const uid = search.get('uid')
        const token = search.get('token')

        if (!uid || !token) {
          throw new Error(
            'This reset link is incomplete. Request a new password reset link.',
          )
        }

        const response = await confirmPasswordReset({
          uid,
          token,
          new_password: password,
        })

        window.history.replaceState({}, '', '/')
        switchMode('login')

        setNotice(
          response.detail ||
          'Password reset successfully. Please sign in with your new password.',
        )
      }
    } catch (err) {
      if (mode === 'login' || mode === 'signup') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }

      setError(
        err.message && !err.response
          ? err.message
          : getErrorMessage(
            err,
            mode === 'login'
              ? 'Login failed. Check your credentials and try again.'
              : mode === 'signup'
                ? 'Could not create your account. Check your details.'
                : 'The request could not be completed. Please try again.',
          ),
      )
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    login: {
      eyebrow: 'WELCOME BACK',
      title: 'Welcome back.',
      description: 'Sign in and pick up where your sales journey left off.',
      button: 'Sign in to workspace',
    },
    signup: {
      eyebrow: 'GET STARTED',
      title: 'Build your momentum.',
      description: 'Create your account and bring your leads into focus.',
      button: 'Create my account',
    },
    forgot: {
      eyebrow: 'ACCOUNT RECOVERY',
      title: 'Let’s get you back.',
      description: 'Enter your account email to request a password reset link.',
      button: 'Send reset link',
    },
    reset: {
      eyebrow: 'RESET PASSWORD',
      title: 'Choose a new password.',
      description: 'Create a new password to secure your account.',
      button: 'Update password',
    },
  }

  const current = titles[mode]

  return (
    <main className="auth-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070a12] px-4 py-8 text-slate-100 sm:px-6 lg:py-12">
      <style>{`
        @keyframes authFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(20px, -28px, 0) scale(1.07); }
        }

        @keyframes authEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .auth-orb {
          animation: authFloat 12s ease-in-out infinite;
        }

        .auth-orb-delay {
          animation: authFloat 15s ease-in-out infinite reverse;
        }

        .auth-enter {
          animation: authEnter .45s cubic-bezier(.2,.7,.2,1) both;
        }

        .auth-grid {
          background-image:
            linear-gradient(rgba(148,163,184,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,.045) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, black, transparent 85%);
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-orb, .auth-orb-delay, .auth-enter {
            animation: none !important;
          }

          *, *::before, *::after {
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="auth-grid pointer-events-none absolute inset-0 opacity-70" />

      <div className="auth-orb pointer-events-none absolute -left-40 -top-32 h-[26rem] w-[26rem] rounded-full bg-indigo-600/20 blur-[110px]" />

      <div className="auth-orb-delay pointer-events-none absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/15 blur-[120px]" />

      <div className="auth-orb pointer-events-none absolute right-[18%] top-[35%] h-52 w-52 rounded-full bg-cyan-500/10 blur-[100px]" />

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_0.88fr] lg:gap-16">
        <section className="hidden max-w-xl lg:block">
          <div className="mb-10">
            <CompanyBrand />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[.28em] text-violet-300">
            AI-POWERED LEAD MANAGEMENT
          </p>

          <h2 className="mt-5 text-5xl font-semibold leading-[1.12] tracking-tight text-white xl:text-6xl">
            Turn every lead
            <span className="mt-2 block bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              into momentum.
            </span>
          </h2>

          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            A focused workspace for conversations, follow-ups and the next
            opportunity in your pipeline.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {[
              {
                icon: Sparkles,
                title: 'AI-assisted',
                text: 'Customer conversations',
              },
              {
                icon: Activity,
                title: 'Sales insights',
                text: 'Leads and follow-ups',
              },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 backdrop-blur-xl"
              >
                <Icon size={19} className="text-violet-300" />
                <p className="mt-4 text-sm font-medium text-white">{title}</p>
                <p className="mt-1 text-xs text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-lg">
          <div className="mb-7 flex justify-center lg:hidden">
            <CompanyBrand compact />
          </div>

          <div className="auth-enter rounded-[28px] border border-white/[0.10] bg-[#0d1220]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,.48)] backdrop-blur-2xl sm:p-8 md:p-9">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.24em] text-violet-300">
                  {current.eyebrow}
                </p>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {current.title}
                </h1>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                  {current.description}
                </p>
              </div>

              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/[0.08] text-violet-200 sm:flex">
                {mode === 'forgot' ? (
                  <Mail size={21} />
                ) : mode === 'reset' ? (
                  <ShieldCheck size={21} />
                ) : mode === 'signup' ? (
                  <Sparkles size={21} />
                ) : (
                  <LockKeyhole size={21} />
                )}
              </div>
            </div>

            {mode === 'login' && (
              <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/[0.07] bg-black/20 p-1 text-xs">
                <button
                  type="button"
                  className="rounded-lg bg-white/[0.09] px-3 py-2.5 font-medium text-white"
                >
                  Sign in
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="rounded-lg px-3 py-2.5 text-slate-400 transition hover:text-white"
                >
                  Create account
                </button>
              </div>
            )}

            {mode !== 'login' && mode !== 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="mb-5 inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-white"
              >
                <ArrowLeft size={14} /> Back to sign in
              </button>
            )}

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="mb-5 inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-white"
              >
                <ArrowLeft size={14} /> Request a new reset link
              </button>
            )}

            <form key={mode} onSubmit={handleSubmit} className="space-y-4.5">
              {mode === 'signup' && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="First name" icon={User} htmlFor="firstName">
                      <input
                        id="firstName"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        required
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Last name" icon={User} htmlFor="lastName">
                      <input
                        id="lastName"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="Username" icon={User} htmlFor="signupUsername">
                    <input
                      id="signupUsername"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      required
                      minLength={3}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Email address" icon={Mail} htmlFor="signupEmail">
                    <input
                      id="signupEmail"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Phone (optional)" icon={Phone} htmlFor="phone">
                      <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone number"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Company (optional)" icon={Building2} htmlFor="company">
                      <input
                        id="company"
                        autoComplete="organization"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Company name"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </>
              )}

              {mode === 'login' && (
                <Field label="Username" icon={User} htmlFor="username">
                  <input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className={inputClass}
                  />
                </Field>
              )}

              {mode === 'forgot' && (
                <Field label="Account email" icon={Mail} htmlFor="resetEmail">
                  <input
                    id="resetEmail"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className={inputClass}
                  />
                </Field>
              )}

              {(mode === 'login' || mode === 'signup') && (
                <PasswordField
                  id={mode === 'login' ? 'password' : 'signupPassword'}
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder={
                    mode === 'signup'
                      ? 'Create a strong password'
                      : 'Enter your password'
                  }
                  show={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                />
              )}

              {mode === 'reset' && (
                <>
                  <PasswordField
                    id="newPassword"
                    label="New password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter your new password"
                    show={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                    autoComplete="new-password"
                  />

                  <PasswordField
                    id="confirmNewPassword"
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Re-enter your new password"
                    show={showConfirm}
                    onToggle={() => setShowConfirm((value) => !value)}
                    autoComplete="new-password"
                  />
                </>
              )}

              {mode === 'signup' && (
                <PasswordField
                  id="confirmPassword"
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter your password"
                  show={showConfirm}
                  onToggle={() => setShowConfirm((value) => !value)}
                  autoComplete="new-password"
                />
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-medium text-violet-300 transition hover:text-violet-200"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm leading-5 text-rose-200"
                >
                  {error}
                </div>
              )}

              {notice && (
                <div
                  role="status"
                  className="flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm leading-5 text-emerald-200"
                >
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_100%] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition duration-300 hover:bg-right hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <LoaderCircle size={17} className="animate-spin" />}
                {loading ? 'Please wait...' : current.button}
                {!loading && (
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>
            </form>

            {mode === 'login' && (
              <p className="mt-6 text-center text-xs text-slate-500">
                New here?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-semibold text-violet-300 transition hover:text-white"
                >
                  Create an account
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p className="mt-5 text-center text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-violet-300 transition hover:text-white"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          <footer className="mt-5 text-center text-[11px] text-slate-500">
            © 2026 AIWEBSOUL.
          </footer>
        </section>
      </div>
    </main>
  )
}


