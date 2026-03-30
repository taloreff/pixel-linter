import { useState, useEffect, useCallback } from 'react';
import type { DesignTokens } from '@shared/types';
import { useTabMessaging } from './hooks/useTabMessaging';
import { useStorage } from './hooks/useStorage';
import { StatusBadge } from './components/StatusBadge';
import { SettingsPanel } from './components/SettingsPanel';
import { TokenSummary } from './components/TokenSummary';
import './popup.css';

type AppStatus = 'inactive' | 'analyzing' | 'ready';

export function App() {
  const { sendMessage } = useTabMessaging();
  const { settings, updateSettings } = useStorage();
  const [status, setStatus] = useState<AppStatus>('inactive');
  const [inspecting, setInspecting] = useState(false);
  const [tokens, setTokens] = useState<DesignTokens | null>(null);

  const refreshStatus = useCallback(async () => {
    const response = await sendMessage({ type: 'GET_STATUS' });
    if (response?.type === 'STATUS') {
      setInspecting(response.data.active);
      setStatus(response.data.analysisReady ? 'ready' : (response.data.active ? 'analyzing' : 'inactive'));
    }
    const tokenResp = await sendMessage({ type: 'GET_TOKENS_SUMMARY' });
    if (tokenResp?.type === 'TOKENS_SUMMARY') {
      setTokens(tokenResp.data);
    }
  }, [sendMessage]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  const handleToggleInspect = async () => {
    if (inspecting) {
      await sendMessage({ type: 'DEACTIVATE_INSPECT' });
    } else {
      await sendMessage({ type: 'ACTIVATE_INSPECT' });
    }
    setTimeout(refreshStatus, 100);
  };

  const handleRefresh = async () => {
    setStatus('analyzing');
    await sendMessage({ type: 'REFRESH_ANALYSIS' });
    setTimeout(refreshStatus, 200);
  };

  if (!settings) return null;

  return (
    <div className="popup">
      <div className="popup-header">
        <div>
          <div className="popup-title">Pixel Linter</div>
          <div className="popup-subtitle">Visual QA assistant</div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="controls">
        <button className={`btn ${inspecting ? 'btn-danger' : ''}`} onClick={handleToggleInspect}>
          {inspecting ? 'Exit Inspect Mode' : 'Enter Inspect Mode'}
        </button>
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={!inspecting}>
          Refresh Analysis
        </button>
      </div>

      <div className="divider" />

      <div className="section-label">Settings</div>
      <SettingsPanel settings={settings} onUpdate={updateSettings} />

      {tokens && (
        <>
          <div className="divider" />
          <div className="section-label">Detected Tokens</div>
          <TokenSummary tokens={tokens} />
        </>
      )}
    </div>
  );
}
