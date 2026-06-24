import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/** Initial theme: saved choice, else the visitor's system preference. */
const initialTheme = (): Theme => {
  if (!browser) return 'light';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const theme = writable<Theme>(initialTheme());

/** Reflects the current theme onto <html> and persists the choice. */
const apply = (value: Theme) => {
  if (!browser) return;
  document.documentElement.classList.toggle('dark', value === 'dark');
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage may be unavailable (private mode) — theme still applies in-session
  }
};

// Keep <html> + storage in sync whenever the store changes.
theme.subscribe(apply);

export const toggleTheme = () => theme.update((value) => (value === 'dark' ? 'light' : 'dark'));
export const setTheme = (value: Theme) => theme.set(value);
