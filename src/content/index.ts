import type { StoredSettings } from '@shared/types';
import { isMessage } from '@shared/messaging';
import { getSettings, onSettingsChanged } from '@shared/storage';
import { InspectionController } from './inspector/inspectionController';

let controller: InspectionController | null = null;

async function initialize(): Promise<void> {
  const settings = await getSettings();
  controller = new InspectionController(settings);

  onSettingsChanged((newSettings: StoredSettings) => {
    controller?.updateSettings(newSettings);
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isMessage(message)) return;

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

  return true;
});

initialize();
