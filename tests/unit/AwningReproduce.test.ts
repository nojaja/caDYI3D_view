import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import { ModelLoader } from '../../src/loader/ModelLoader';
import { ModelBuilder } from '../../src/builder/ModelBuilder';

describe('AwningReproduce Test', () => {
  const modelPath = path.resolve(__dirname, '../data/awning_reproduce.cadiy4');

  it('awning_reproduce.cadiy4 を正常にロードし、movableGroups を正しく保持すること', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const loader = new ModelLoader();
    const data = loader.load(raw);

    expect(data).toBeDefined();
    expect(data.version).toBe(1);
    expect(data.objects).toHaveLength(4);

    // movableGroups の検証
    expect(data.movableGroups).toBeDefined();
    expect(data.movableGroups).toHaveLength(1);
    const group = data.movableGroups![0];
    expect(group.id).toBe('movable-awning-root');
    expect(group.kind).toBe('rotate');
    expect(group.rotateMax).toBe(90);
    expect(group.playMode).toBe('roundTrip');
    expect(group.targetObjectIds).toContain('test-waveboard-1');
  });

  it('波板 (waveBoard) が四角いバウンディングボックス枠の中にオブジェクトがあり、高さがバウンディングボックスの高さ (size.y) となること', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const loader = new ModelLoader();
    const data = loader.load(raw);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects);

    const waveObj = data.objects.find((o) => o.id === 'test-waveboard-1')!;
    const waveMesh = group.children.find((c) => c.userData.id === 'test-waveboard-1') as THREE.Mesh;
    expect(waveMesh).toBeDefined();
    expect(waveMesh).toBeInstanceOf(THREE.Mesh);

    // BufferGeometry であること
    const geom = waveMesh.geometry;
    expect(geom).toBeInstanceOf(THREE.BufferGeometry);

    // BoxGeometry の頂点数(24)ではなく、サイン波状グリッド頂点数(数千)を持つこと
    const posAttr = geom.getAttribute('position');
    expect(posAttr.count).toBeGreaterThan(100);

    // 波板の全高（山頂と谷底の差）が size.y (0.012m = 12mm) にぴったり一致していること
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const waveHeight = maxY - minY;
    expect(waveHeight).toBeCloseTo(waveObj.size.y, 4);

    // caDIY3D 仕様: 四角いバウンディングボックスのエッジ枠線 (12本 = 24頂点) が子要素に含まれること
    const edgeLines = waveMesh.children.find((c) => c instanceof THREE.LineSegments) as THREE.LineSegments;
    expect(edgeLines).toBeDefined();
    const edgeGeom = edgeLines.geometry;
    expect(edgeGeom.getAttribute('position').count).toBe(24); // 直方体ボックスの12エッジ
  });

  it('分度器 (protractor) が木材直方体ブロックではなく注釈グループ (THREE.Group) として構築されること', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const loader = new ModelLoader();
    const data = loader.load(raw);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects);

    const protractorObj = group.children.find((c) => c.userData.id === 'test-protractor-1');
    expect(protractorObj).toBeDefined();
    // 直方体 Mesh ではなく注釈 Group であること
    expect(protractorObj).toBeInstanceOf(THREE.Group);

    // Group 配下に円弧ラインや挟み線 (Line) が含まれていること
    const lines = (protractorObj as THREE.Group).children.filter((c) => c instanceof THREE.Line);
    expect(lines.length).toBeGreaterThanOrEqual(3); // 始線、終線、円弧
  });

  it('寸法線 (dimension) がオブジェクトの辺から引き出され、主寸法線の外側にサイズが表示されること', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const loader = new ModelLoader();
    const data = loader.load(raw);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects);

    const dimObj = data.objects.find((o) => o.id === 'test-dimension-1') as any;
    const dimGroup = group.children.find((c) => c.userData.id === 'test-dimension-1') as THREE.Group;
    expect(dimGroup).toBeDefined();
    expect(dimGroup).toBeInstanceOf(THREE.Group);

    // 引き出し線 (2本) と 主寸法線 (1本) および 矢印線
    const lines = dimGroup.children.filter((c) => c instanceof THREE.Line) as THREE.Line[];
    expect(lines.length).toBeGreaterThanOrEqual(3);

    // オフセット量 (size.x / 2 = 0.075)
    const expectedOffset = dimObj.measure?.offset ?? (dimObj.size.x / 2);
    expect(dimGroup.userData.offset).toBeCloseTo(expectedOffset);

    // 寸法値ラベル (PlaneGeometry メッシュ)
    const labelMesh = dimGroup.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh;
    expect(labelMesh).toBeDefined();

    // ラベルの位置が主寸法線 (X = expectedOffset) のさらに外側 (X > expectedOffset) に配置されていること
    expect(labelMesh.position.x).toBeGreaterThan(expectedOffset);
  });
});
