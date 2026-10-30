import { useEffect, useState } from 'react'
import {
    UserRound, Building2, Bell, ShieldCheck, Save, LoaderCircle,
    CheckCircle2, AlertCircle, LockKeyhole, Eye, EyeOff,
    Clock3, CalendarClock, FileChartColumn, Sparkles,
} from 'lucide-react'

import {
    getCurrentUser,
    updateCurrentUser,
    getUserPreferences,
    updateUserPreferences,
    changePassword,
    getBusinessPreferences,
    updateBusinessPreferences,
} from '../services/api'

const inputClass =
    'settings-input mt-2 w-full rounded-xl border border-white/10 bg-[#090d16] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/10 disabled:cursor-not-allowed disabled:opacity-50'

const initialForm = {
    first_name: '', last_name: '', email: '', phone: '', company_name: '',
}

const initialPreferences = {
    email_notifications: true,
    follow_up_reminders: true,
    hot_lead_alerts: true,
}

const DEFAULT_WORKING_DAYS = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
]

const initialBusiness = {
    business_name: '',
    business_email: '',
    business_phone: '',
    website_url: '',
    industry: '',
    first_followup_days: 1,
    second_followup_days: 3,
    third_followup_days: 7,
    timezone: 'Asia/Kolkata',
    work_start_time: '09:00',
    work_end_time: '18:00',
    working_days: DEFAULT_WORKING_DAYS,
    daily_report_enabled: true,
    daily_report_time: '18:00',
}

const DAYS = [
    { label: 'Monday', value: 'monday' },
    { label: 'Tuesday', value: 'tuesday' },
    { label: 'Wednesday', value: 'wednesday' },
    { label: 'Thursday', value: 'thursday' },
    { label: 'Friday', value: 'friday' },
    { label: 'Saturday', value: 'saturday' },
    { label: 'Sunday', value: 'sunday' },
]

const preferenceSections = [
    {
        key: 'email_notifications',
        title: 'Email notifications',
        description: 'Preference for receiving email updates.',
    },
    {
        key: 'follow_up_reminders',
        title: 'Follow-up reminders',
        description: 'Reminders about pending follow-ups.',
    },
    {
        key: 'hot_lead_alerts',
        title: 'Hot lead alerts',
        description: 'Highlight high-priority leads.',
    },
]

function getErrorMessage(err, fallback) {
    const data = err.response?.data
    if (typeof data?.detail === 'string') return data.detail

    if (data && typeof data === 'object') {
        for (const value of Object.values(data)) {
            if (typeof value === 'string') return value
            if (Array.isArray(value) && value.length) return String(value[0])
        }
    }

    return fallback
}

function SectionHeading({ icon: Icon, title, description }) {
    return (
        <div className="mb-6 flex items-center gap-3">
            <div className="settings-icon flex shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.09] p-2.5 text-violet-300">
                <Icon size={19} />
            </div>
            <div className="min-w-0">
                <h3 className="font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
        </div>
    )
}

function Field({ label, name, value, onChange, type = 'text', ...props }) {
    return (
        <label className="block min-w-0 text-sm text-slate-300">
            {label}
            <input
                className={inputClass}
                name={name}
                type={type}
                value={value ?? ''}
                onChange={onChange}
                {...props}
            />
        </label>
    )
}

function Feedback({ type = 'success', children }) {
    const isError = type === 'error'
    const Icon = isError ? AlertCircle : CheckCircle2

    return (
        <div
            role={isError ? 'alert' : 'status'}
            className={`settings-feedback flex items-start gap-3 rounded-xl border p-4 text-sm ${isError
                ? 'border-rose-400/20 bg-rose-400/[0.06] text-rose-200'
                : 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200'
                }`}
        >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <span>{children}</span>
        </div>
    )
}

function SaveButton({ loading, children, variant = 'primary', type = 'submit' }) {
    const secondary = variant === 'secondary'

    return (
        <button
            type={type}
            disabled={loading}
            className={`settings-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${secondary
                ? 'border border-white/10 bg-white/[0.05] text-white hover:bg-white/10'
                : 'border border-violet-300/20 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500'
                }`}
        >
            {loading
                ? <LoaderCircle size={16} className="animate-spin" />
                : <Save size={16} />}
            {children}
        </button>
    )
}

export default function Settings({ user, onProfileUpdated, onPasswordChanged }) {
    const [form, setForm] = useState(initialForm)
    const [preferences, setPreferences] = useState(initialPreferences)
    const [business, setBusiness] = useState(initialBusiness)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savingBusiness, setSavingBusiness] = useState(false)
    const [savingPreference, setSavingPreference] = useState('')
    const [changingPassword, setChangingPassword] = useState(false)

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [businessError, setBusinessError] = useState('')
    const [businessSuccess, setBusinessSuccess] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState('')

    const [showPasswords, setShowPasswords] = useState({
        current_password: false,
        new_password: false,
        confirm_password: false,
    })

    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    })

    useEffect(() => {
        let cancelled = false

        async function loadSettings() {
            try {
                const [currentUser, savedPreferences, savedBusiness] = await Promise.all([
                    getCurrentUser(),
                    getUserPreferences(),
                    getBusinessPreferences(),
                ])

                if (cancelled) return

                setForm({
                    first_name: currentUser.first_name || '',
                    last_name: currentUser.last_name || '',
                    email: currentUser.email || '',
                    phone: currentUser.phone || '',
                    company_name: currentUser.company_name || '',
                })

                setPreferences({
                    email_notifications: savedPreferences.email_notifications ?? true,
                    follow_up_reminders: savedPreferences.follow_up_reminders ?? true,
                    hot_lead_alerts: savedPreferences.hot_lead_alerts ?? true,
                })

                setBusiness({
                    ...initialBusiness,
                    ...savedBusiness,
                    // Older saved preferences without working_days use Mon–Fri.
                    working_days: Array.isArray(savedBusiness.working_days)
                        ? savedBusiness.working_days
                        : DEFAULT_WORKING_DAYS,
                })
            } catch (err) {
                if (!cancelled) {
                    setError(getErrorMessage(
                        err,
                        'Could not load settings. Check your backend APIs and try again.',
                    ))
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        loadSettings()
        return () => { cancelled = true }
    }, [])

    function updateField(event) {
        const { name, value } = event.target
        setForm(current => ({ ...current, [name]: value }))
        setError('')
        setSuccess('')
    }

    function updateBusinessField(event) {
        const { name, value, type, checked } = event.target

        setBusiness(current => ({
            ...current,
            [name]: type === 'checkbox'
                ? checked
                : type === 'number'
                    ? (value === '' ? '' : Number(value))
                    : value,
        }))

        setBusinessError('')
        setBusinessSuccess('')
    }
    const workingDaysCount = (business.working_days || []).length
    const holidaysCount = 7 - workingDaysCount

    function toggleWorkingDay(day) {
        setBusiness(current => {
            const currentDays = current.working_days || []
            const working_days = currentDays.includes(day)
                ? currentDays.filter(item => item !== day)
                : [...currentDays, day]

            return {
                ...current,
                working_days: DAYS
                    .map(item => item.value)
                    .filter(value => working_days.includes(value)),
            }
        })

        setBusinessError('')
        setBusinessSuccess('')
    }

    async function handleSaveProfile(event) {
        event.preventDefault()
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            const updatedUser = await updateCurrentUser(form)

            setForm({
                first_name: updatedUser.first_name || '',
                last_name: updatedUser.last_name || '',
                email: updatedUser.email || '',
                phone: updatedUser.phone || '',
                company_name: updatedUser.company_name || '',
            })

            onProfileUpdated?.(updatedUser)
            setSuccess('Profile changes saved successfully.')
        } catch (err) {
            setError(getErrorMessage(err, 'Could not save your profile.'))
        } finally {
            setSaving(false)
        }
    }

    async function handleSaveBusiness(event) {
        event.preventDefault()
        setBusinessError('')
        setBusinessSuccess('')

        const first = Number(business.first_followup_days)
        const second = Number(business.second_followup_days)
        const third = Number(business.third_followup_days)

        if (![first, second, third].every(Number.isInteger) ||
            !(0 < first && first < second && second < third)) {
            setBusinessError(
                'Follow-up days must be increasing whole numbers, e.g. 1, 3, 7.',
            )
            return
        }

        if (!business.work_start_time || !business.work_end_time ||
            business.work_start_time >= business.work_end_time) {
            setBusinessError('Working end time must be later than start time.')
            return
        }

        if (!Array.isArray(business.working_days) || !business.working_days.length) {
            setBusinessError('Please select at least one office working day.')
            return
        }

        setSavingBusiness(true)

        try {
            const payload = {
                ...business,
                first_followup_days: first,
                second_followup_days: second,
                third_followup_days: third,
                working_days: business.working_days,
            }

            const saved = await updateBusinessPreferences(payload)

            setBusiness({
                ...initialBusiness,
                ...saved,
                working_days: Array.isArray(saved.working_days)
                    ? saved.working_days
                    : payload.working_days,
            })

            setBusinessSuccess('Business preferences saved successfully.')
        } catch (err) {
            setBusinessError(getErrorMessage(
                err,
                'Could not save business preferences.',
            ))
        } finally {
            setSavingBusiness(false)
        }
    }

    async function togglePreference(key) {
        if (savingPreference) return

        const previousValue = preferences[key]
        const updated = { ...preferences, [key]: !previousValue }

        setPreferences(updated)
        setSavingPreference(key)
        setError('')
        setSuccess('')

        try {
            const saved = await updateUserPreferences({ [key]: updated[key] })
            setPreferences(current => ({ ...current, ...saved }))
            setSuccess('Notification preference saved.')
        } catch (err) {
            setPreferences(current => ({ ...current, [key]: previousValue }))
            setError(getErrorMessage(err, 'Could not save notification preference.'))
        } finally {
            setSavingPreference('')
        }
    }

    function updatePasswordField(event) {
        const { name, value } = event.target
        setPasswordForm(current => ({ ...current, [name]: value }))
        setPasswordError('')
        setPasswordSuccess('')
    }

    async function handleChangePassword(event) {
        event.preventDefault()
        setPasswordError('')
        setPasswordSuccess('')

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPasswordError('New password and confirmation do not match.')
            return
        }

        if (passwordForm.new_password === passwordForm.current_password) {
            setPasswordError('New password must differ from your current password.')
            return
        }

        setChangingPassword(true)

        try {
            const result = await changePassword({
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password,
            })

            setPasswordForm({
                current_password: '',
                new_password: '',
                confirm_password: '',
            })

            setPasswordSuccess(
                result.detail || 'Password changed successfully. Please sign in again.',
            )

            onPasswordChanged?.()
        } catch (err) {
            setPasswordError(getErrorMessage(
                err,
                'Could not change password. Please try again.',
            ))
        } finally {
            setChangingPassword(false)
        }
    }

    function renderPasswordField(label, name, autoComplete) {
        const visible = showPasswords[name]

        return (
            <label className="block min-w-0 text-sm text-slate-300">
                {label}
                <div className="relative mt-2">
                    <input
                        className={`${inputClass} mt-0 pr-12`}
                        type={visible ? 'text' : 'password'}
                        name={name}
                        value={passwordForm[name]}
                        onChange={updatePasswordField}
                        autoComplete={autoComplete}
                        minLength={name === 'current_password' ? undefined : 8}
                        required
                    />

                    <button
                        type="button"
                        onClick={() => setShowPasswords(current => ({
                            ...current,
                            [name]: !current[name],
                        }))}
                        aria-label={visible ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition-colors hover:text-violet-300"
                    >
                        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </label>
        )
    }

    if (loading) {
        return (
            <div className="flex min-h-64 items-center justify-center text-sm text-slate-400">
                <LoaderCircle className="mr-2 animate-spin text-violet-400" size={18} />
                Loading settings...
            </div>
        )
    }

    return (
        <div className="settings-page space-y-6 pb-8">
            {/* Page header */}
            <section className="settings-card settings-hero relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 sm:p-7">
                <div className="settings-hero-glow pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/[0.12] blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-indigo-500/[0.08] blur-3xl" />

                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="settings-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-indigo-500/10 text-violet-200 shadow-lg shadow-violet-950/20">
                            <UserRound size={26} />
                        </div>

                        <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                                    Account settings
                                </h2>
                                <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2 py-1 text-[10px] font-medium text-violet-200">
                                    <Sparkles size={11} /> Workspace
                                </span>
                            </div>

                            <p className="text-sm leading-6 text-slate-400">
                                Manage your profile, business automation and security.
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                                Signed in as{' '}
                                <span className="font-medium text-slate-300">
                                    {user?.username || form.email || 'User'}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025] text-slate-500 sm:flex">
                        <ShieldCheck size={22} />
                    </div>
                </div>
            </section>

            {error && <Feedback type="error">{error}</Feedback>}
            {success && <Feedback>{success}</Feedback>}

            {/* Profile */}
            <form onSubmit={handleSaveProfile} className="space-y-6">
                <section className="settings-card rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 sm:p-7">
                    <SectionHeading
                        icon={UserRound}
                        title="Personal information"
                        description="Your account details"
                    />

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="First name" name="first_name" value={form.first_name} onChange={updateField} autoComplete="given-name" />
                        <Field label="Last name" name="last_name" value={form.last_name} onChange={updateField} autoComplete="family-name" />
                        <Field label="Email address" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
                        <Field label="Phone number" name="phone" type="tel" value={form.phone} onChange={updateField} autoComplete="tel" />
                    </div>
                </section>

                <section className="settings-card rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 sm:p-7">
                    <SectionHeading
                        icon={Building2}
                        title="Company information"
                        description="Business details for your workspace"
                    />

                    <Field
                        label="Company name"
                        name="company_name"
                        value={form.company_name}
                        onChange={updateField}
                        autoComplete="organization"
                        placeholder="Enter your company name"
                    />

                    <p className="mt-4 text-xs text-slate-500">
                        Account role:{' '}
                        <span className="text-slate-300">{user?.role || 'Not specified'}</span>
                    </p>
                </section>

                <div className="flex justify-end">
                    <SaveButton loading={saving}>
                        {saving ? 'Saving changes...' : 'Save profile'}
                    </SaveButton>
                </div>
            </form>

            {/* Business preferences */}
            <form onSubmit={handleSaveBusiness} className="space-y-6">
                <section className="settings-card rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 sm:p-7">
                    <SectionHeading
                        icon={Building2}
                        title="Business preferences"
                        description="Configure your business profile and sales automation defaults."
                    />

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Business name" name="business_name" value={business.business_name} onChange={updateBusinessField} placeholder="Your business name" />
                        <Field label="Industry" name="industry" value={business.industry} onChange={updateBusinessField} placeholder="e.g. Real estate, education" />
                        <Field label="Business email" name="business_email" type="email" value={business.business_email} onChange={updateBusinessField} />
                        <Field label="Business phone" name="business_phone" type="tel" value={business.business_phone} onChange={updateBusinessField} />

                        <div className="sm:col-span-2">
                            <Field label="Website URL" name="website_url" type="url" value={business.website_url} onChange={updateBusinessField} placeholder="https://example.com" />
                        </div>
                    </div>
                </section>

                <section className="settings-card rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 sm:p-7">
                    <SectionHeading
                        icon={CalendarClock}
                        title="Default follow-up schedule"
                        description="Set the number of days between each follow-up."
                    />

                    <div className="grid gap-5 sm:grid-cols-3">
                        <Field label="First follow-up (days)" name="first_followup_days" type="number" min="1" max="365" value={business.first_followup_days} onChange={updateBusinessField} required />
                        <Field label="Second follow-up (days)" name="second_followup_days" type="number" min="2" max="365" value={business.second_followup_days} onChange={updateBusinessField} required />
                        <Field label="Third follow-up (days)" name="third_followup_days" type="number" min="3" max="365" value={business.third_followup_days} onChange={updateBusinessField} required />
                    </div>

                    <p className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-xs leading-5 text-slate-500">
                        Example: 1, 3, 7 means follow-ups one, three and seven days after the starting point.
                    </p>
                </section>

                {/* Working days, hours and timezone */}
                <section className="settings-card rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 sm:p-7">
                    <SectionHeading
                        icon={Clock3}
                        title="Working hours & timezone"
                        description="Configure office working days, business hours and timezone."
                    />

                    <div className="mb-6">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <label className="text-sm font-medium text-slate-200">
                                Office working days
                            </label>

                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1 text-xs text-emerald-200">
                                    Working Days: {workingDaysCount}
                                </span>
                                <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-3 py-1 text-xs text-amber-200">
                                    Holidays: {holidaysCount}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {DAYS.map(day => {
                                const selected = (business.working_days || []).includes(day.value)
                                const weekend = ['saturday', 'sunday'].includes(day.value)

                                return (
                                    <label
                                        key={day.value}
                                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selected
                                            ? 'border-violet-400/40 bg-violet-500/10'
                                            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 shrink-0 accent-violet-500"
                                            checked={selected}
                                            onChange={() => toggleWorkingDay(day.value)}
                                        />

                                        <span className="min-w-0">
                                            <span className="block text-sm text-slate-200">
                                                {day.label}
                                            </span>

                                            <span className={`mt-1 block text-[10px] ${selected
                                                ? 'text-violet-300'
                                                : weekend
                                                    ? 'text-amber-300'
                                                    : 'text-slate-500'
                                                }`}>
                                                {selected ? 'Working day' : weekend ? 'Holiday' : 'Not selected'}
                                            </span>
                                        </span>
                                    </label>
                                )
                            })}
                        </div>

                        <p className="mt-3 text-xs leading-5 text-slate-500">
                            Default office schedule: Monday to Friday working; Saturday and Sunday are holidays.
                            You can change the selection whenever needed.
                        </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field
                            label="Working day starts"
                            name="work_start_time"
                            type="time"
                            value={business.work_start_time}
                            onChange={updateBusinessField}
                            required
                        />

                        <Field
                            label="Working day ends"
                            name="work_end_time"
                            type="time"
                            value={business.work_end_time}
                            onChange={updateBusinessField}
                            required
                        />

                        <label className="block min-w-0 text-sm text-slate-300 sm:col-span-2">
                            Timezone
                            <select
                                className={inputClass}
                                name="timezone"
                                value={business.timezone}
                                onChange={updateBusinessField}
                            >
                                <option className="bg-[#0e1320]" value="Asia/Kolkata">India — Asia/Kolkata</option>
                                <option className="bg-[#0e1320]" value="UTC">UTC</option>
                                <option className="bg-[#0e1320]" value="America/New_York">US Eastern — America/New_York</option>
                                <option className="bg-[#0e1320]" value="America/Chicago">US Central — America/Chicago</option>
                                <option className="bg-[#0e1320]" value="America/Denver">US Mountain — America/Denver</option>
                                <option className="bg-[#0e1320]" value="America/Los_Angeles">US Pacific — America/Los_Angeles</option>
                                <option className="bg-[#0e1320]" value="Europe/London">UK — Europe/London</option>
                            </select>
                        </label>
                    </div>
                </section>

                <section className="settings-card rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 sm:p-7">
                    <SectionHeading
                        icon={FileChartColumn}
                        title="Daily sales report"
                        description="Configure your preferred daily report."
                    />

                    <label className="settings-report-toggle flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                        <span>
                            <span className="block text-sm font-medium text-slate-200">Enable daily report</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                                Preference for a daily sales summary.
                            </span>
                        </span>

                        <input
                            className="h-4 w-4 shrink-0 accent-violet-500"
                            type="checkbox"
                            name="daily_report_enabled"
                            checked={Boolean(business.daily_report_enabled)}
                            onChange={updateBusinessField}
                        />
                    </label>

                    <div className="mt-5">
                        <Field
                            label="Preferred report time"
                            name="daily_report_time"
                            type="time"
                            value={business.daily_report_time}
                            onChange={updateBusinessField}
                            disabled={!business.daily_report_enabled}
                        />
                    </div>
                </section>

                {businessError && <Feedback type="error">{businessError}</Feedback>}
                {businessSuccess && <Feedback>{businessSuccess}</Feedback>}

                <div className="flex justify-end">
                    <SaveButton loading={savingBusiness}>
                        {savingBusiness ? 'Saving preferences...' : 'Save business preferences'}
                    </SaveButton>
                </div>
            </form>

            {/* Notifications */}
            <section className="settings-card rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 sm:p-7">
                <SectionHeading
                    icon={Bell}
                    title="Notification preferences"
                    description="Manage the updates you want to receive."
                />

                <div className="divide-y divide-white/[0.06]">
                    {preferenceSections.map(section => (
                        <div
                            key={section.key}
                            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-200">{section.title}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{section.description}</p>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={Boolean(preferences[section.key])}
                                aria-label={section.title}
                                disabled={Boolean(savingPreference)}
                                onClick={() => togglePreference(section.key)}
                                className={`settings-switch relative h-6 w-11 shrink-0 rounded-full disabled:cursor-wait disabled:opacity-60 ${preferences[section.key] ? 'bg-violet-500' : 'bg-slate-700'
                                    }`}
                            >
                                <span
                                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm ${preferences[section.key] ? 'left-6' : 'left-1'
                                        }`}
                                />
                            </button>
                        </div>
                    ))}
                </div>

                {savingPreference && (
                    <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                        <LoaderCircle size={13} className="animate-spin" />
                        Saving notification preference...
                    </p>
                )}
            </section>

            {/* Password */}
            <section className="settings-card rounded-2xl border border-white/[0.08] bg-[#0e1320] p-5 sm:p-7">
                <SectionHeading
                    icon={LockKeyhole}
                    title="Change password"
                    description="Update your password and keep your account secure."
                />

                {passwordError && (
                    <div className="mb-4">
                        <Feedback type="error">{passwordError}</Feedback>
                    </div>
                )}

                {passwordSuccess && (
                    <div className="mb-4">
                        <Feedback>{passwordSuccess}</Feedback>
                    </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-5">
                    {renderPasswordField('Current password', 'current_password', 'current-password')}

                    <div className="grid gap-5 sm:grid-cols-2">
                        {renderPasswordField('New password', 'new_password', 'new-password')}
                        {renderPasswordField('Confirm new password', 'confirm_password', 'new-password')}
                    </div>

                    <div className="flex justify-end pt-1">
                        <SaveButton loading={changingPassword} variant="secondary">
                            {changingPassword ? 'Updating password...' : 'Change password'}
                        </SaveButton>
                    </div>
                </form>
            </section>

            {/* Security note */}
            {/* <section className="settings-card rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-[#0e171b] to-[#0e1320] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.07] p-2 text-emerald-300">
                        <ShieldCheck size={20} />
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-white">Account security</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                            Profile, business preferences and notification preferences use the authenticated Django API.
                            Actual message delivery and scheduled automation require their respective integrations and workers.
                        </p>
                    </div>
                </div>
            </section> */}
        </div>
    )
}