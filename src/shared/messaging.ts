import type { StoredSettings, DesignTokens } from './types';

export type Message =
  | { type: 'GET_STATUS' }
  | { type: 'ACTIVATE_INSPECT' }
  | { type: 'DEACTIVATE_INSPECT' }
  | { type: 'REFRESH_ANALYSIS' }
  | { type: 'GET_TOKENS_SUMMARY' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<StoredSettings> };

export type MessageResponse =
  | { type: 'STATUS'; data: { active: boolean; analysisReady: boolean } }
  | { type: 'TOKENS_SUMMARY'; data: DesignTokens | null }
  | { type: 'OK' }
  | { type: 'ERROR'; message: string };

export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Message).type === 'string'
  );
}
