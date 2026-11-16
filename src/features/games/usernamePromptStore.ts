import { create } from 'zustand';

type ResolveFn = (name: string) => void;
type RejectFn = (reason?: unknown) => void;

interface UsernamePromptState {
  open: boolean;
  resolve: ResolveFn | null;
  reject: RejectFn | null;
  requestUsername(): Promise<string>;
  close(): void;
}

export const useUsernamePromptStore = create<UsernamePromptState>((set, get) => ({
  open: false,
  resolve: null,
  reject: null,

  requestUsername: () =>
    new Promise<string>((resolve, reject) => {
      if (get().resolve) {
        reject(new Error('Már folyamatban van a felhasználónév megadása.'));
        return;
      }
      set({ open: true, resolve, reject });
    }),

  close: () => set({ open: false, resolve: null, reject: null }),
}));