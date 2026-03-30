import type { StoredSettings } from '@shared/types';

interface SettingsPanelProps {
  settings: StoredSettings;
  onUpdate: (update: Partial<StoredSettings>) => void;
}

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  return (
    <div className="settings">
      <label className="setting-row">
        <span>Show suggestions</span>
        <input type="checkbox" checked={settings.showSuggestions} onChange={(e) => onUpdate({ showSuggestions: e.target.checked })} />
      </label>
      <label className="setting-row">
        <span>Compact panel</span>
        <input type="checkbox" checked={settings.compactPanel} onChange={(e) => onUpdate({ compactPanel: e.target.checked })} />
      </label>
    </div>
  );
}
