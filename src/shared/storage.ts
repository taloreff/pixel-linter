import type { StoredSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';

const STORAGE_KEY = 'pixelLinterSettings';

export async function getSettings(): Promise<StoredSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<StoredSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Partial<StoredSettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

export async function isSiteEnabled(hostname: string): Promise<boolean> {
  const settings = await getSettings();
  return settings.enabledSites.includes(hostname);
}

export async function toggleSite(hostname: string, enabled: boolean): Promise<void> {
  const settings = await getSettings();
  const sites = new Set(settings.enabledSites);
  if (enabled) {
    sites.add(hostname);
  } else {
    sites.delete(hostname);
  }
  await saveSettings({ enabledSites: [...sites] });
}

export function onSettingsChanged(
  callback: (settings: StoredSettings) => void,
): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes[STORAGE_KEY]) {
      callback({ ...DEFAULT_SETTINGS, ...changes[STORAGE_KEY].newValue });
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
