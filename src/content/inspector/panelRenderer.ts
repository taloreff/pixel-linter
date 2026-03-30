import type { InspectionData } from '@shared/types';

export class PanelRenderer {
  setCompact(_compact: boolean): void {}
  show(_data: InspectionData, _rect: DOMRect): void {}
  hide(): void {}
  destroy(): void {}
}
