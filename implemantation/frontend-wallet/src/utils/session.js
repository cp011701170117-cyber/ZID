export const SESSION_TIMEOUT = 30 * 60 * 1000
export const USER_SESSION_KEY = 'userSession'

export function createUserSession(token, role) {
  const userSession = {
    token,
    role,
    loginTime: Date.now()
  }

  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(userSession))
  return userSession
}

export function getUserSession() {
  const raw = localStorage.getItem(USER_SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isSessionValid() {
  const session = getUserSession()
  if (!session || !session.loginTime) return false

  const elapsed = Date.now() - session.loginTime
  return elapsed < SESSION_TIMEOUT
}

export function clearSessionStorage(additionalKeys = []) {
  localStorage.removeItem(USER_SESSION_KEY)
  additionalKeys.forEach((key) => localStorage.removeItem(key))
}

export function checkSession({ redirectPath = '/login', additionalKeys = [] } = {}) {
  const currentPage = window.location.pathname
  if (currentPage.includes('login')) {
    return true
  }

  if (!isSessionValid()) {
    clearSessionStorage(additionalKeys)
    if (currentPage !== redirectPath) {
      window.location.href = redirectPath
    }
    return false
  }

  return true
}
