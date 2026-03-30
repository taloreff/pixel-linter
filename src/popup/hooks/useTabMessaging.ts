import { useCallback } from 'react';
import type { Message, MessageResponse } from '@shared/messaging';

async function getCurrentTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

export function useTabMessaging() {
  const sendMessage = useCallback(async (message: Message): Promise<MessageResponse | null> => {
    const tabId = await getCurrentTabId();
    if (tabId === null) return null;
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch {
      return null;
    }
  }, []);
  return { sendMessage };
}
