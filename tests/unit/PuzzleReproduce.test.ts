import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ModelLoader } from '../../src/loader/ModelLoader';
import { ModelBuilder } from '../../src/builder/ModelBuilder';
import { LayerManager } from '../../src/core/LayerManager';
import { CutListCalculator } from '../../src/core/CutListCalculator';
import * as THREE from 'three';

describe('PuzzleReproduce Verification Test', () => {
  const modelPath = path.resolve('tests/data/puzzle_reproduce.cadiy4');

  it('1. Cadiy4Parser normalizes duplicate legacy-0 IDs using displayId', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const loader = new ModelLoader();
    const project = loader.load(raw);

    expect(project).toBeDefined();
    expect(project.objects.length).toBe(5);

    // Part 1, 2, 3 should have unique IDs normalized from legacy-0 to legacy-101, legacy-102, legacy-103
    const ids = project.objects.map(o => o.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);

    expect(project.objects[0].id).toBe('legacy-101');
    expect(project.objects[1].id).toBe('legacy-102');
    expect(project.objects[2].id).toBe('legacy-103');
  });

  it('2. LayerManager correctly resolves visibility per layer without duplicate ID interference', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const loader = new ModelLoader();
    const project = loader.load(raw);

    const layerManager = new LayerManager();
    layerManager.init(project.layers, project.objects);

    // Layer 1 is visible (Part 1: 101, Part 2: 102, Part 5: 105)
    // Layer 2 is hidden (Part 3: 103)
    // Layer 3 is visible (Part 4: 104)
    expect(layerManager.isObjectVisible('legacy-101')).toBe(true);
    expect(layerManager.isObjectVisible('legacy-102')).toBe(true);
    expect(layerManager.isObjectVisible('legacy-103')).toBe(false);
    expect(layerManager.isObjectVisible('boolean-sample-1')).toBe(true);
    expect(layerManager.isObjectVisible('comment-sample-1')).toBe(true);

    // Total visible objects: 4
    const visibleCount = project.objects.filter(o => layerManager.isObjectVisible(o.id)).length;
    expect(visibleCount).toBe(4);
  });

  it('3. ModelBuilder builds boolean object with custom vertices/faces geometry', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const loader = new ModelLoader();
    const project = loader.load(raw);

    const layerManager = new LayerManager();
    layerManager.init(project.layers, project.objects);

    const builder = new ModelBuilder();
    const group = builder.build(
      project.objects,
      (id) => layerManager.isObjectVisible(id),
      project.pictureImageTable,
      project.polygonMeshTable,
      project.paint
    );

    // Group should have children
    expect(group.children.length).toBe(5);

    // Check visible children count
    const visibleChildren = group.children.filter(c => c.visible);
    expect(visibleChildren.length).toBe(4);

    // Find the boolean mesh
    const booleanMesh = group.children.find(
      c => c.userData?.cadiyObject?.type === 'boolean'
    ) as THREE.Mesh;
    expect(booleanMesh).toBeDefined();
    expect(booleanMesh.geometry).toBeDefined();

    // Verify it is a custom geometry constructed from vertices/faces, not default 24-vertex BoxGeometry
    const posAttr = booleanMesh.geometry.attributes.position;
    expect(posAttr).toBeDefined();
    expect(posAttr.count).toBeGreaterThan(24);
  });

  it('4. CutList matches normalized partsId correctly', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const loader = new ModelLoader();
    const project = loader.load(raw);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(project.cutList, project.objects);

    expect(sheets.length).toBeGreaterThan(0);
    // Sheet 0 (baseId: 0) should contain the 2 explicitly placed parts (legacy-101, legacy-102)
    const sheet0 = sheets.find(s => s.baseId === 0);
    expect(sheet0).toBeDefined();
    expect(sheet0!.items.length).toBe(2);
    expect(sheet0!.items.map(p => p.object.id).sort()).toEqual(['legacy-101', 'legacy-102'].sort());
  });

  it('5. Snaps (SceneSnapshots) are parsed and accessible', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const loader = new ModelLoader();
    const project = loader.load(raw);

    expect(project.snaps).toBeDefined();
    expect(project.snaps?.length).toBe(2);
    expect(project.snaps?.[0].name).toBe('ステップ1: 分解前');
    expect(project.snaps?.[0].visibleLayerIds).toEqual([0, 1]);
    expect(project.snaps?.[1].name).toBe('ステップ2: 結合状態');
    expect(project.snaps?.[1].visibleLayerIds).toEqual([0, 3]);
  });
});
