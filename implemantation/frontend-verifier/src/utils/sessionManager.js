const SESSION_TIMEOUT = 30 * 60 * 1000

export function createSession(userData) {
  const session = {
    role: userData.role,
    address: userData.address,
    loginTime: Date.now()
  }

  sessionStorage.setItem('userSession', JSON.stringify(session))
}

export function getSession() {
  return JSON.parse(sessionStorage.getItem('userSession'))
}

export function destroySession() {
  sessionStorage.removeItem('userSession')
}

export function validateSession() {
  const session = JSON.parse(sessionStorage.getItem('userSession'))
  if (!session) {
    window.location.href = '/login'
    return
  }
}

export function startSessionWatcher() {
  return setInterval(() => {
    const session = getSession()
    if (!session) return

    const elapsed = Date.now() - session.loginTime
    if (elapsed > SESSION_TIMEOUT) {
      alert('Session expired')
      destroySession()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
  }, 60000)
}
