import { describe, it, expect, vi } from 'vitest';
import { ViewModeManager } from '../../src/core/ViewModeManager';

describe('ViewModeManager - 表示モード切替・管理', () => {
  it('初期モードは 3d (3Dview) であること', () => {
    const manager = new ViewModeManager();
    expect(manager.getCurrentMode()).toBe('3d');
  });

  it('3Dview, 材料取り図(cutList), 三面図(threeView) のモード切り替えができること', () => {
    const manager = new ViewModeManager();

    manager.setMode('cutList');
    expect(manager.getCurrentMode()).toBe('cutList');

    manager.setMode('threeView');
    expect(manager.getCurrentMode()).toBe('threeView');

    manager.setMode('3d');
    expect(manager.getCurrentMode()).toBe('3d');
  });

  it('モードが変更された際にリスナーへ正しく通知されること', () => {
    const manager = new ViewModeManager();
    const listener = vi.fn();

    manager.onModeChange(listener);

    manager.setMode('cutList');
    expect(listener).toHaveBeenCalledWith('cutList', '3d');

    manager.setMode('threeView');
    expect(listener).toHaveBeenCalledWith('threeView', 'cutList');

    // 同じモードを再設定した場合は通知されないこと
    listener.mockClear();
    manager.setMode('threeView');
    expect(listener).not.toHaveBeenCalled();
  });
});
