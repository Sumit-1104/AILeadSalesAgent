
import axios from 'axios'

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Separate Axios instance for refreshing tokens.
// This prevents the refresh request from triggering its own interceptor.
const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise = null

// Attach access token to every request.
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token')

    if (accessToken) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Automatically refresh expired access tokens.
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/token/') ||
      originalRequest.url?.includes('/auth/token/refresh/')
    ) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')

    if (!refreshToken) {
      clearAuthSession()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = refreshApi
          .post('/auth/token/refresh/', {
            refresh: refreshToken,
          })
          .then((response) => {
            const { access, refresh } = response.data

            if (!access) {
              throw new Error('New access token was not returned.')
            }

            localStorage.setItem('access_token', access)

            // Save rotated refresh token when backend provides one.
            if (refresh) {
              localStorage.setItem('refresh_token', refresh)
            }

            return access
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      const newAccessToken = await refreshPromise

      originalRequest.headers = originalRequest.headers || {}
      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`

      return api(originalRequest)
    } catch (refreshError) {
      clearAuthSession()
      return Promise.reject(refreshError)
    }
  }
)

// Clear authentication session.
export function clearAuthSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')

  window.dispatchEvent(new Event('auth:session-expired'))
}

// Login.
export async function loginUser(username, password) {
  const response = await api.post('/auth/token/', {
    username,
    password,
  })

  const { access, refresh } = response.data

  if (!access || !refresh) {
    throw new Error('Login response did not contain both tokens.')
  }

  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)

  return response.data
}

// Signup.
export async function signupUser(userData) {
  const response = await api.post('/auth/signup/', userData)

  const { access, refresh } = response.data

  if (!access || !refresh) {
    throw new Error('Signup response did not contain both tokens.')
  }

  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)

  return response.data
}

// Logout.
export async function logoutUser() {
  clearAuthSession()
}

// Password reset.
export async function requestPasswordReset(email) {
  const response = await api.post('/auth/password-reset/', {
    email: email.trim(),
  })

  return response.data
}

export async function confirmPasswordReset({
  uid,
  token,
  new_password,
}) {
  const response = await api.post('/auth/password-reset/confirm/', {
    uid,
    token,
    new_password,
  })

  return response.data
}

// Current user.
export async function getCurrentUser() {
  const response = await api.get('/auth/me/')
  return response.data
}

export async function updateCurrentUser(data) {
  const response = await api.patch('/auth/me/', data)
  return response.data
}

// Leads.
export async function getLeads(params = {}) {
  const response = await api.get('/leads/', { params })
  return response.data
}

export async function createLead(leadData) {
  const response = await api.post('/leads/', leadData)
  return response.data
}

export async function updateLead(id, leadData) {
  const response = await api.patch(`/leads/${id}/`, leadData)
  return response.data
}

export async function deleteLead(id) {
  const response = await api.delete(`/leads/${id}/`)
  return response.data
}

// Follow-ups.
export async function getFollowUps(params = {}) {
  const response = await api.get('/followups/', { params })
  return response.data
}

export async function createFollowUp(followUpData) {
  const response = await api.post('/followups/', followUpData)
  return response.data
}

export async function updateFollowUp(id, followUpData) {
  const response = await api.patch(`/followups/${id}/`, followUpData)
  return response.data
}

export async function deleteFollowUp(id) {
  const response = await api.delete(`/followups/${id}/`)
  return response.data
}

// Conversations.
export async function getConversations(params = {}) {
  const response = await api.get('/conversations/', { params })
  return response.data
}

export async function createConversation(data) {
  const response = await api.post('/conversations/', data)
  return response.data
}

export async function updateConversation(id, data) {
  const response = await api.patch(`/conversations/${id}/`, data)
  return response.data
}

export async function getConversationMessages(id) {
  const response = await api.get(`/conversations/${id}/messages/`)
  return response.data
}

export async function sendConversationMessage(id, data) {
  const response = await api.post(
    `/conversations/${id}/messages/`,
    data
  )
  return response.data
}

// Quotations.
export async function getQuotations(params = {}) {
  const response = await api.get('/quotations/', { params })
  return response.data
}

export async function createQuotation(data) {
  const response = await api.post('/quotations/', data)
  return response.data
}

export async function updateQuotation(id, data) {
  const response = await api.patch(`/quotations/${id}/`, data)
  return response.data
}

export async function deleteQuotation(id) {
  const response = await api.delete(`/quotations/${id}/`)
  return response.data
}

// Appointments.
export async function getAppointments(params = {}) {
  const response = await api.get('/appointments/', { params })
  return response.data
}

export async function createAppointment(data) {
  const response = await api.post('/appointments/', data)
  return response.data
}

export async function updateAppointment(id, data) {
  const response = await api.patch(`/appointments/${id}/`, data)
  return response.data
}

export async function deleteAppointment(id) {
  const response = await api.delete(`/appointments/${id}/`)
  return response.data
}

// Reports.
export async function getSalesReport(params = {}) {
  const response = await api.get('/reports/', { params })
  return response.data
}

// AI.
export async function scoreLead(lead_id) {
  const response = await api.post('/ai/score-lead/', {
    lead_id,
  })
  return response.data
}

export async function qualifyLead(lead_id) {
  const response = await api.post('/ai/qualify-lead/', {
    lead_id,
  })
  return response.data
}

export async function generateAIReply(data) {
  const response = await api.post('/ai/generate-reply/', data)
  return response.data
}

export async function suggestAIFollowup(lead_id, context = '') {
  const response = await api.post('/ai/suggest-followup/', {
    lead_id,
    context,
  })
  return response.data
}

// Compatibility exports for AIConversations.jsx.
export { generateAIReply as generateReply }
export { suggestAIFollowup as suggestFollowup }

// AI assistant configuration.
export async function getAssistantConfiguration() {
  const response = await api.get('/ai/assistant/configuration/')
  return response.data
}

export async function updateAssistantConfiguration(data) {
  const response = await api.patch(
    '/ai/assistant/configuration/',
    data
  )
  return response.data
}

// User preferences.
export async function getUserPreferences() {
  const response = await api.get('/auth/preferences/')
  return response.data
}

export async function updateUserPreferences(data) {
  const response = await api.patch('/auth/preferences/', data)
  return response.data
}

export async function changePassword(data) {
  const response = await api.post('/auth/change-password/', data)
  return response.data
}

// Business preferences.
export async function getBusinessPreferences() {
  const response = await api.get('/auth/business-preferences/')
  return response.data
}

export async function updateBusinessPreferences(data) {
  const response = await api.patch(
    '/auth/business-preferences/',
    data
  )
  return response.data
}

// Notifications.
export async function getNotifications(params = {}) {
  const response = await api.get('/notifications/', { params })
  return response.data
}

export async function markNotificationAsRead(id) {
  const response = await api.patch(`/notifications/${id}/`, {
    is_read: true,
  })
  return response.data
}

export async function markAllNotificationsAsRead(notifications = []) {
  const unread = notifications.filter(
    (notification) => !notification.is_read
  )

  return Promise.all(
    unread.map((notification) =>
      markNotificationAsRead(notification.id)
    )
  )
}

export default api
