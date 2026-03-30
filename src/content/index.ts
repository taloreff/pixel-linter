import type { StoredSettings } from '@shared/types';
import { isMessage } from '@shared/messaging';
import { getSettings, onSettingsChanged } from '@shared/storage';
import { InspectionController } from './inspector/inspectionController';

let controller: InspectionController | null = null;

async function initialize(): Promise<void> {
  try {
    const settings = await getSettings();
    controller = new InspectionController(settings);

    onSettingsChanged((newSettings: StoredSettings) => {
      controller?.updateSettings(newSettings);
    });

    console.log('[Pixel Linter] Content script initialized');
  } catch (err) {
    console.error('[Pixel Linter] Failed to initialize:', err);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isMessage(message)) return;

  try {
    switch (message.type) {
      case 'GET_STATUS':
        sendResponse({
          type: 'STATUS',
          data: {
            active: controller?.isActive ?? false,
            analysisReady: controller?.isAnalysisReady ?? false,
          },
        });
        break;

      case 'ACTIVATE_INSPECT':
        controller?.activate();
        sendResponse({ type: 'OK' });
        break;

      case 'DEACTIVATE_INSPECT':
        controller?.deactivate();
        sendResponse({ type: 'OK' });
        break;

      case 'REFRESH_ANALYSIS':
        controller?.refreshAnalysis();
        sendResponse({ type: 'OK' });
        break;

      case 'GET_TOKENS_SUMMARY':
        sendResponse({
          type: 'TOKENS_SUMMARY',
          data: controller?.designTokens ?? null,
        });
        break;

      case 'UPDATE_SETTINGS':
        controller?.updateSettings(message.settings);
        sendResponse({ type: 'OK' });
        break;

      default:
        sendResponse({ type: 'ERROR', message: 'Unknown message type' });
    }
  } catch (err) {
    console.error('[Pixel Linter] Message handler error:', err);
    sendResponse({ type: 'ERROR', message: String(err) });
  }

  return true;
});

initialize();
