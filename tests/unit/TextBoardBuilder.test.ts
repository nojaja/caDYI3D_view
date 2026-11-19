import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TextBoardBuilder } from '../../src/builder/TextBoardBuilder';
import { TextBoardObject } from '../../src/types/cadiy4';

describe('TextBoardBuilder', () => {
  const builder = new TextBoardBuilder();

  it('contentRotation: 0 のテキストボードを正常に生成できること', () => {
    const obj: TextBoardObject = {
      id: 'tb-0',
      name: 'テスト1',
      type: 'textBoard',
      text: 'Sample Text',
      position: { x: 0, y: 0.5, z: 0 },
      quaternion: { x: 0.70710678, y: 0, z: 0, w: 0.70710678 },
      size: { x: 0.35, y: 0, z: 0.08 },
      visible: true,
      locked: false,
      layerId: 0,
      color: { r: 0.1, g: 0.1, b: 0.1 },
      displayId: 1,
      contentRotation: 0,
    };

    const mesh = builder.build(obj);
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.name).toBe('Sample Text');
    expect(mesh.visible).toBe(true);

    // ジオメトリの検証 (XZ 平面、PlaneGeometry rotateX(-PI/2))
    const geom = mesh.geometry as THREE.PlaneGeometry;
    geom.computeBoundingBox();
    const bb = geom.boundingBox!;
    expect(bb.max.x - bb.min.x).toBeCloseTo(0.35, 2);
    expect(bb.max.z - bb.min.z).toBeCloseTo(0.08, 2);
  });

  it('contentRotation: 90 のテキストボードで適切なアスペクト比と回転が適用されること', () => {
    const obj: TextBoardObject = {
      id: 'tb-90',
      name: 'caDIY3D WebView',
      type: 'textBoard',
      text: 'caDIY3D WebView',
      position: { x: 0.033, y: 0.684, z: -0.032 },
      quaternion: { x: 0.5, y: -0.5, z: -0.5, w: 0.5 },
      size: { x: 0.102, y: 0, z: 0.384 },
      visible: true,
      locked: false,
      layerId: 1,
      color: { r: 0, g: 0, b: 0 },
      displayId: 8,
      backgroundColor: { r: 1, g: 1, b: 1, a: 0 },
      frameVisible: true,
      contentRotation: 90,
    };

    const mesh = builder.build(obj);
    expect(mesh).toBeInstanceOf(THREE.Mesh);

    const geom = mesh.geometry as THREE.PlaneGeometry;
    geom.computeBoundingBox();
    const bb = geom.boundingBox!;
    expect(bb.max.x - bb.min.x).toBeCloseTo(0.102, 2);
    expect(bb.max.z - bb.min.z).toBeCloseTo(0.384, 2);

    const mat = mesh.material as THREE.MeshBasicMaterial;
    expect(mat.transparent).toBe(true);
    expect(mat.side).toBe(THREE.DoubleSide);
  });
});
