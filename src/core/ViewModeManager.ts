export type ViewMode = '3d' | 'cutList' | 'threeView';

export type ViewModeChangeListener = (newMode: ViewMode, oldMode: ViewMode) => void;

export class ViewModeManager {
  private currentMode: ViewMode = '3d';
  private listeners: ViewModeChangeListener[] = [];

  public getCurrentMode(): ViewMode {
    return this.currentMode;
  }

  public setMode(newMode: ViewMode): void {
    if (this.currentMode === newMode) return;

    const oldMode = this.currentMode;
    this.currentMode = newMode;

    for (const listener of this.listeners) {
      listener(newMode, oldMode);
    }
  }

  public onModeChange(listener: ViewModeChangeListener): void {
    this.listeners.push(listener);
  }
}
