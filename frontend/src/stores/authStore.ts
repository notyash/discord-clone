// frontend/src/stores/authStore.ts
import { create } from 'zustand';
import { surreal, DB_CONFIG, initSurreal } from '../lib/surreal';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  signin: (email: string, pass: string) => Promise<void>;
  signup: (username: string, email: string, pass: string) => Promise<void>;
  signout: () => Promise<void>;
}

// Helper to extract a string token regardless of SDK return shape
function extractToken(tokenResponse: unknown): string | null {
  if (!tokenResponse) return null;
  if (typeof tokenResponse === 'string') return tokenResponse;
  if (typeof tokenResponse === 'object' && tokenResponse !== null) {
    return (tokenResponse as any).token || (tokenResponse as any).access || JSON.stringify(tokenResponse);
  }
  return String(tokenResponse);
}

// Helper: Fetch current user profile using $auth record pointer
async function fetchCurrentUser(): Promise<UserProfile | null> {
  try {
    const [result] = await surreal.query<[any[]]>('SELECT id, username, email, created_at FROM $auth;');
    const raw = result?.[0];
    if (!raw) return null;
    return {
      id: String(raw.id),
      username: String(raw.username),
      email: String(raw.email),
      created_at: String(raw.created_at),
    };
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,

  // 1. Initialize connection and resume session from localStorage
  initialize: async () => {
    try {
      await initSurreal();
      const savedToken = localStorage.getItem('surreal_token');

      if (savedToken) {
        // Re-authenticate using the stored JWT token
        await surreal.authenticate(savedToken);
        const profile = await fetchCurrentUser();

        if (profile) {
          set({ user: profile, token: savedToken, loading: false });
          return;
        } else {
          localStorage.removeItem('surreal_token');
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      localStorage.removeItem('surreal_token');
    }
    set({ user: null, token: null, loading: false });
  },

  // 2. Sign in action
  signin: async (email: string, pass: string) => {
    await initSurreal();
    const res = await surreal.signin({
      namespace: DB_CONFIG.namespace,
      database: DB_CONFIG.database,
      access: DB_CONFIG.access,
      variables: { email, pass },
    });

    const token = extractToken(res);
    if (token) {
      localStorage.setItem('surreal_token', token);
      const profile = await fetchCurrentUser();
      set({ user: profile, token });
    }
  },

  // 3. Sign up action
  signup: async (username: string, email: string, pass: string) => {
    await initSurreal();
    const res = await surreal.signup({
      namespace: DB_CONFIG.namespace,
      database: DB_CONFIG.database,
      access: DB_CONFIG.access,
      variables: { username, email, pass },
    });

    const token = extractToken(res);
    if (token) {
      localStorage.setItem('surreal_token', token);
      const profile = await fetchCurrentUser();
      set({ user: profile, token });
    }
  },

  // 4. Sign out action
  signout: async () => {
    try {
      await surreal.invalidate();
    } finally {
      localStorage.removeItem('surreal_token');
      set({ user: null, token: null });
    }
  },
}));