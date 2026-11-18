import { describe, it, expect } from 'vitest';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';
import * as fs from 'fs';
import * as path from 'path';

describe('Cadiy4Parser', () => {
  const validJson = JSON.stringify({
    version: 1,
    thumbnail: '',
    camera: {
      position: { x: 1, y: 1, z: 1 },
      target: { x: 0, y: 0, z: 0 }
    },
    objects: [
      {
        id: 'obj-1',
        name: '角材',
        type: 'lumber',
        position: { x: 0, y: 0, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        size: { x: 0.038, y: 0.038, z: 0.5 },
        visible: true,
        color: { r: 0.8, g: 0.6, b: 0.4 }
      }
    ]
  });

  it('正しいJSON文字列をCadiy4Dataオブジェクトにパースできること', () => {
    const parser = new Cadiy4Parser();
    const data = parser.parse(validJson);

    expect(data.version).toBe(1);
    expect(data.camera.position.x).toBe(1);
    expect(data.objects).toHaveLength(1);
    expect(data.objects[0].name).toBe('角材');
    expect(data.objects[0].type).toBe('lumber');
  });

  it('tests/data/test_rack.cadiy4 を正常にパースできること', () => {
    const filePath = path.resolve(__dirname, '../data/test_rack.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    expect(data.version).toBe(1);
    expect(data.camera).toBeDefined();
    expect(data.camera.position).toEqual({ x: 0.8, y: 0.7, z: 0.9 });
    expect(data.camera.target).toEqual({ x: 0, y: 0.25, z: 0 });
    expect(data.objects.length).toBeGreaterThan(0);
  });

  it('必須フィールドが欠落している場合はエラーをスローすること', () => {
    const parser = new Cadiy4Parser();
    expect(() => parser.parse('{"version": 1}')).toThrowError(/camera/);
    expect(() => parser.parse('{"version": 1, "camera": {}}')).toThrowError(/objects/);
  });

  it('無効なJSON構文の場合は構文エラーをスローすること', () => {
    const parser = new Cadiy4Parser();
    expect(() => parser.parse('invalid json')).toThrowError();
  });
});
