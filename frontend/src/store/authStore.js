import { create } from 'zustand';
import { authApi, configureApiAuth, refreshSession } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  status: 'idle',
  authError: '',

  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated', authError: '' }),
  clearSession: () => set({ user: null, accessToken: null, status: 'guest' }),
  setAuthError: (authError) => set({ authError }),

  hydrate: async () => {
    if (get().status === 'authenticated') return get().user;
    set({ status: 'loading', authError: '' });
    try {
      const data = await refreshSession();
      set({ user: data.user, accessToken: data.accessToken, status: 'authenticated' });
      return data.user;
    } catch (err) {
      set({ user: null, accessToken: null, status: 'guest' });
      return null;
    }
  },

  login: async (payload) => {
    set({ status: 'loading', authError: '' });
    try {
      const data = await authApi.login(payload);
      set({ user: data.user, accessToken: data.accessToken, status: 'authenticated' });
      return data.user;
    } catch (err) {
      set({ status: 'guest', authError: err.message });
      throw err;
    }
  },

  signup: async (payload) => {
    set({ status: 'loading', authError: '' });
    try {
      const data = await authApi.signup(payload);
      set({ user: data.user, accessToken: data.accessToken, status: 'authenticated' });
      return data.user;
    } catch (err) {
      set({ status: 'guest', authError: err.message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, accessToken: null, status: 'guest' });
    }
  }
}));

configureApiAuth(() => useAuthStore.getState());
