import { DEFAULT_SETTINGS } from '@shared/constants';

chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get('pixelLinterSettings');
  if (!result['pixelLinterSettings']) {
    await chrome.storage.local.set({ pixelLinterSettings: DEFAULT_SETTINGS });
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'STATUS' && sender.tab?.id) {
    const active = message.data?.active ?? false;
    chrome.action.setBadgeText({
      text: active ? 'ON' : '',
      tabId: sender.tab.id,
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#10b981',
      tabId: sender.tab.id,
    });
  }
});
