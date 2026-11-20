#!/usr/bin/env node

/**
 * テスト用ミニマルモデル生成スクリプト
 * 使い方: node generate-test-model.js <test-name> [options]
 * 例: node generate-test-model.js my_feature
 * -> tests/data/my_feature.cadiy4 を最小構成で出力
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node generate-test-model.js <test_name> [--boolean] [--layers] [--cutlist]');
  process.exit(1);
}

const testName = args[0].replace(/\.(cadiy4|test\.ts|spec\.ts)$/, '');
const targetDir = path.resolve('tests/data');
const targetPath = path.join(targetDir, `${testName}.cadiy4`);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const hasBoolean = args.includes('--boolean');
const hasLayers = args.includes('--layers');
const hasCutList = args.includes('--cutlist');

const model = {
  version: 1,
  thumbnail: '',
  camera: {
    position: { x: 0.5, y: 0.5, z: 0.5 },
    target: { x: 0.0, y: 0.0, z: 0.0 },
    fov: 20,
    isOrthographic: false
  },
  layers: [
    {
      id: 0,
      name: 'ルート',
      visible: true,
      locked: false,
      color: { r: 0.3, g: 0.5, b: 1.0 },
      parentId: null
    }
  ],
  objects: [
    {
      id: 'test-part-1',
      name: 'SPF 1x1材',
      position: { x: 0.0, y: 0.0, z: 0.0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      size: { x: 0.019, y: 0.019, z: 0.1 },
      visible: true,
      locked: false,
      groupId: 0,
      layerId: 0,
      color: { r: 1, g: 1, b: 0.8 },
      textureId: 1,
      displayId: 1,
      type: 'lumber'
    }
  ],
  cutList: {
    cutWidthMm: 3,
    packingMode: 'adjacent',
    layouts: []
  }
};

if (hasLayers) {
  model.layers.push(
    {
      id: 1,
      name: '表示レイヤー',
      visible: true,
      locked: false,
      color: { r: 0.3, g: 0.5, b: 1.0 },
      parentId: 0
    },
    {
      id: 2,
      name: '非表示レイヤー',
      visible: false,
      locked: false,
      color: { r: 1.0, g: 0.3, b: 0.3 },
      parentId: 0
    }
  );
  model.objects[0].layerId = 1;
}

if (hasBoolean) {
  model.objects.push({
    id: 'boolean-part-1',
    name: 'ブーリアンパーツ',
    position: { x: 0.05, y: 0.0, z: 0.0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    size: { x: 0.038, y: 0.038, z: 0.038 },
    visible: true,
    locked: false,
    groupId: 0,
    layerId: hasLayers ? 1 : 0,
    color: { r: 0.9, g: 0.6, b: 0.4 },
    textureId: 1,
    displayId: 2,
    type: 'boolean',
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 0.038, y: 0, z: 0 },
      { x: 0.038, y: 0.038, z: 0 },
      { x: 0, y: 0.038, z: 0 },
      { x: 0, y: 0, z: 0.038 },
      { x: 0.038, y: 0, z: 0.038 },
      { x: 0.038, y: 0.038, z: 0.038 },
      { x: 0, y: 0.038, z: 0.038 }
    ],
    faces: [
      { indices: [0, 1, 2, 3] },
      { indices: [4, 5, 6, 7] },
      { indices: [0, 4, 7, 3] },
      { indices: [1, 5, 6, 2] },
      { indices: [3, 2, 6, 7] },
      { indices: [0, 1, 5, 4] }
    ]
  });
}

if (hasCutList) {
  model.cutList.layouts.push({
    baseId: 0,
    partsId: 'test-part-1',
    x: 0,
    z: 0
  });
}

fs.writeFileSync(targetPath, JSON.stringify(model, null, 2), 'utf-8');
console.log(`Generated minimal test model at: ${targetPath}`);
