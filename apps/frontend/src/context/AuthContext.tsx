import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { keycloak } from '../lib/keycloak'

interface AuthState {
  initialized: boolean
  authenticated: boolean
  username: string | null
  roles: string[]
  /** Same-tab redirect to Keycloak login. Used by ProtectedRoute when /admin
   * itself is opened without a session (e.g. a direct link/bookmark). */
  login: () => void
  logout: () => void
  getToken: () => Promise<string | undefined>
  /** Opens /admin in a NEW tab from the marketing site — logs in first
   * (also in that new tab) if there's no session yet. */
  openAdmin: () => void
}

const AuthContext = createContext<AuthState | null>(null)

// Module-level (not component state) so it survives React StrictMode's
// dev-only double-invoke of effects — keycloak-js throws if init() is
// called twice on the same instance, so the second call must reuse the
// promise from the first instead of calling init() again.
let initPromise: Promise<boolean> | null = null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    if (!initPromise) {
      initPromise = keycloak.init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      })
    }

    initPromise
      .then((isAuthenticated) => {
        setAuthenticated(isAuthenticated)
        setInitialized(true)
      })
      .catch(() => {
        setInitialized(true)
      })
  }, [])

  const login = useCallback(
    () => keycloak.login({ redirectUri: `${window.location.origin}/admin` }),
    [],
  )
  const logout = useCallback(
    () => keycloak.logout({ redirectUri: window.location.origin }),
    [],
  )
  const getToken = useCallback(async () => {
    await keycloak.updateToken(30).catch(() => keycloak.login())
    return keycloak.token
  }, [])

  const openAdmin = useCallback(() => {
    const adminUrl = `${window.location.origin}/admin`

    if (keycloak.authenticated) {
      window.open(adminUrl, '_blank')
      return
    }

    // Open the tab synchronously (within the click handler) so popup
    // blockers allow it, then navigate it once we have the real login URL
    // (createLoginUrl is async — it hashes the PKCE code_verifier).
    const newTab = window.open('', '_blank')
    keycloak.createLoginUrl({ redirectUri: adminUrl }).then((url) => {
      if (newTab) newTab.location.href = url
    })
  }, [])

  const value: AuthState = {
    initialized,
    authenticated,
    username: keycloak.tokenParsed?.preferred_username ?? null,
    roles: keycloak.tokenParsed?.realm_access?.roles ?? [],
    login,
    logout,
    getToken,
    openAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
