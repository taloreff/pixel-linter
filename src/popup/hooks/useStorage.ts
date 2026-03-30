import { useState, useEffect } from 'react';
import type { StoredSettings } from '@shared/types';
import { getSettings, saveSettings, onSettingsChanged } from '@shared/storage';

export function useStorage() {
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  useEffect(() => {
    getSettings().then(setSettings);
    const cleanup = onSettingsChanged(setSettings);
    return cleanup;
  }, []);
  const updateSettings = async (update: Partial<StoredSettings>) => {
    await saveSettings(update);
  };
  return { settings, updateSettings };
}
