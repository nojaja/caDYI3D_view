import { describe, it, expect } from 'vitest';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';
import * as fs from 'fs';
import * as path from 'path';

describe('Viewer camera synchronization', () => {
  it('cadiy4 の camera 情報を正確に抽出できること', () => {
    const filePath = path.resolve(__dirname, '../data/test_rack.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    expect(data.camera.position.x).toBeCloseTo(0.8);
    expect(data.camera.position.y).toBeCloseTo(0.7);
    expect(data.camera.position.z).toBeCloseTo(0.9);
    expect(data.camera.target.x).toBeCloseTo(0);
    expect(data.camera.target.y).toBeCloseTo(0.25);
    expect(data.camera.target.z).toBeCloseTo(0);
  });
});
