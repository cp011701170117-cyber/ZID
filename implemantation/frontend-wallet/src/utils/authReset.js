export function resetAuthState() {
  try {
    sessionStorage.clear()
    localStorage.removeItem('userSession')
    localStorage.removeItem('walletAddress')
  } catch (e) {
    console.warn('Storage reset error', e)
  }
}
