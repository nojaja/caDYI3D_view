import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { OrthographicViewManager } from '../../src/core/OrthographicViewManager';

describe('OrthographicViewManager - 三面図(平行投影)の視点・カメラ計算', () => {
  it('モデルのバウンディングボックスから適切な平行投影カメラの錐台(Frustum)を計算できること', () => {
    const manager = new OrthographicViewManager();

    // 幅 0.4m, 高さ 0.5m, 奥行き 0.3m のバウンディングボックス
    const box = new THREE.Box3(
      new THREE.Vector3(-0.2, 0, -0.15),
      new THREE.Vector3(0.2, 0.5, 0.15)
    );

    const frustum = manager.calculateFrustum(box, 1.0); // アスペクト比 1.0 (正方形)
    expect(frustum.left).toBeLessThan(0);
    expect(frustum.right).toBeGreaterThan(0);
    expect(frustum.top).toBeGreaterThan(0);
    expect(frustum.bottom).toBeLessThan(0);

    // 余白マージン（例: 1.2倍）が適用されていること
    const maxDim = 0.5; // 最大寸法 0.5m
    expect(frustum.top - frustum.bottom).toBeGreaterThanOrEqual(maxDim * 1.1);
  });

  it('上面(Top/平面図)、正面(Front)、側面(Side/右側図)の3つのカメラが正しい視線方向に設定されること', () => {
    const manager = new OrthographicViewManager();
    const center = new THREE.Vector3(0, 0.25, 0);

    const cameras = manager.createCameras(center, 1.0);

    // 1. 平面図 (Top): Y軸正から見下ろす
    expect(cameras.top.position.x).toBeCloseTo(0, 2);
    expect(cameras.top.position.y).toBeGreaterThan(0.25);
    expect(cameras.top.position.z).toBeCloseTo(0, 2);
    // upベクトルは奥方向 (-Z)
    expect(cameras.top.up.z).toBeCloseTo(-1, 2);

    // 2. 正面図 (Front): Z軸正から正面を見る
    expect(cameras.front.position.x).toBeCloseTo(0, 2);
    expect(cameras.front.position.y).toBeCloseTo(0.25, 2);
    expect(cameras.front.position.z).toBeGreaterThan(0);
    // upベクトルは上方向 (+Y)
    expect(cameras.front.up.y).toBeCloseTo(1, 2);

    // 3. 右側図 (Side): X軸正から右側面を見る
    expect(cameras.side.position.x).toBeGreaterThan(0);
    expect(cameras.side.position.y).toBeCloseTo(0.25, 2);
    expect(cameras.side.position.z).toBeCloseTo(0, 2);
    // upベクトルは上方向 (+Y)
    expect(cameras.side.up.y).toBeCloseTo(1, 2);
  });

  it('いずれかのカメラのズーム倍率を変更した際、3つのカメラのzoom値が同期すること', () => {
    const manager = new OrthographicViewManager();
    const cameras = manager.createCameras(new THREE.Vector3(0, 0, 0), 1.0);

    // ズームを1.5倍に更新
    manager.setZoom(1.5);

    expect(cameras.top.zoom).toBe(1.5);
    expect(cameras.front.zoom).toBe(1.5);
    expect(cameras.side.zoom).toBe(1.5);
  });
});
