import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStorage: Record<string, unknown> = {};
const changeListeners: Array<(changes: Record<string, unknown>) => void> = [];

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
      }),
    },
    onChanged: {
      addListener: vi.fn((fn) => changeListeners.push(fn)),
      removeListener: vi.fn((fn) => {
        const idx = changeListeners.indexOf(fn);
        if (idx >= 0) changeListeners.splice(idx, 1);
      }),
    },
  },
});

import { getSettings, saveSettings, isSiteEnabled, toggleSite } from '../../src/shared/storage';
import { DEFAULT_SETTINGS } from '../../src/shared/constants';

describe('storage', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('returns defaults when storage is empty', async () => {
      const settings = await getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('merges stored values with defaults', async () => {
      mockStorage['pixelLinterSettings'] = { showSuggestions: false };
      const settings = await getSettings();
      expect(settings.showSuggestions).toBe(false);
      expect(settings.compactPanel).toBe(false);
      expect(settings.enabledSites).toEqual([]);
    });
  });

  describe('saveSettings', () => {
    it('persists partial settings merged with current', async () => {
      await saveSettings({ compactPanel: true });
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        pixelLinterSettings: { ...DEFAULT_SETTINGS, compactPanel: true },
      });
    });
  });

  describe('isSiteEnabled', () => {
    it('returns false for unknown sites', async () => {
      expect(await isSiteEnabled('example.com')).toBe(false);
    });

    it('returns true for enabled sites', async () => {
      mockStorage['pixelLinterSettings'] = { enabledSites: ['example.com'] };
      expect(await isSiteEnabled('example.com')).toBe(true);
    });
  });

  describe('toggleSite', () => {
    it('adds a site when enabling', async () => {
      await toggleSite('example.com', true);
      const call = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(call['pixelLinterSettings']).toMatchObject({
        enabledSites: ['example.com'],
      });
    });

    it('removes a site when disabling', async () => {
      mockStorage['pixelLinterSettings'] = {
        ...DEFAULT_SETTINGS,
        enabledSites: ['example.com', 'other.com'],
      };
      await toggleSite('example.com', false);
      const call = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(call['pixelLinterSettings']).toMatchObject({
        enabledSites: ['other.com'],
      });
    });
  });
});
