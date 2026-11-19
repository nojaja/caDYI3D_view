import { describe, it, expect } from 'vitest';
import { ModelLoader } from '../../src/loader/ModelLoader';
import * as fs from 'fs';
import * as path from 'path';

describe('ModelLoader', () => {
  const loader = new ModelLoader();

  it('V4のJSON文字列を正しくパースできること', () => {
    const jsonStr = JSON.stringify({
      version: 1,
      camera: { position: { x: 1, y: 1, z: 1 }, target: { x: 0, y: 0, z: 0 } },
      objects: [],
      layers: [],
    });

    const data = loader.load(jsonStr, 'test_model');
    expect(data.version).toBe(1);
    expect(data.objects).toEqual([]);
  });

  it('旧形式のXML文字列（.cadiy）を受け取った場合、JSON構文エラーにならずV4データへ変換して返すこと', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<_2xModel>
  <Version>7.0</Version>
  <Camera>
    <Position>1,2,3</Position>
    <Center>0,0,0</Center>
  </Camera>
  <_2xObject>
    <_2xBoard>
      <UniqueID>1</UniqueID>
      <CommentText>板1</CommentText>
      <Location>0,0,0</Location>
      <Quaternion>0,0,0,1</Quaternion>
      <Size>0.1,0.01,0.2</Size>
    </_2xBoard>
  </_2xObject>
</_2xModel>`;

    // 旧バージョンを渡しても、ユーザーが直面した「JSON構文エラー: Unexpected token '<'」を起こさず成功すること
    const data = loader.load(xml, 'legacy_test');
    expect(data).toBeDefined();
    expect(data.version).toBe(1);
    expect(data.objects.length).toBe(1);
    expect(data.objects[0].name).toBe('板1');
  });

  it('実際の tests/data/008.cadiy を読み込んで正常にV4データが得られること', () => {
    const cadiyPath = path.resolve(__dirname, '../data/008.cadiy');
    if (fs.existsSync(cadiyPath)) {
      const xml = fs.readFileSync(cadiyPath, 'utf-8');
      const data = loader.load(xml, '008');
      expect(data).toBeDefined();
      expect(data.version).toBe(1);
      expect(data.objects.length).toBeGreaterThan(0);
      expect(data.layers.length).toBeGreaterThan(0);
    }
  });

  it('実際の 009.cadiy を読み込んで polygonMeshTable と polygon オブジェクトが正しく得られメッシュ生成できること', () => {
    const cadiyPath = path.resolve(__dirname, '../data/009.cadiy');
    expect(fs.existsSync(cadiyPath)).toBe(true);

    const xml = fs.readFileSync(cadiyPath, 'utf-8');
    const data = loader.load(xml, '009');

    expect(data.polygonMeshTable).toBeDefined();
    const meshTable = Array.isArray(data.polygonMeshTable) ? data.polygonMeshTable : [];
    expect(meshTable.length).toBe(4);

    const polyObjects = data.objects.filter((o) => o.type === 'polygon');
    expect(polyObjects.length).toBe(59);

    // _2xBoolean 由来のオブジェクトがメッシュテーブルを参照できていること
    const clamp = polyObjects.find((o) => o.name === '単管自在クランプ');
    expect(clamp).toBeDefined();
    expect((clamp as any).meshRef).toBe('1');
  });
});
