import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';
import { ModelBuilder } from '../../src/builder/ModelBuilder';
import { PictureObject } from '../../src/types/cadiy4';
import { decodeImageData } from '../../src/utils/imageUtils';

describe('PictureBuilder - 画像オブジェクト(picture)の生成', () => {
  it('testdata/004.cadiy4 の画像オブジェクトを正しく Mesh として構築できること', () => {
    const filePath = path.resolve(__dirname, '../../testdata/004.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    expect(data.pictureImageTable).toBeDefined();
    expect(data.pictureImageTable).toHaveLength(1);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects, undefined, data.pictureImageTable);

    expect(group.children).toHaveLength(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);

    const obj = data.objects[0] as PictureObject;
    expect(obj.type).toBe('picture');
    expect(obj.imageBase64Id).toBe(1);
    expect(obj.contentRotation).toBe(270);

    // ジオメトリの検証: XZ 平面に沿った PlaneGeometry
    const geometry = mesh.geometry as THREE.PlaneGeometry;
    expect(geometry).toBeDefined();
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    expect(bb.max.x - bb.min.x).toBeCloseTo(obj.size.x, 2);
    expect(bb.max.z - bb.min.z).toBeCloseTo(obj.size.z, 2);

    // マテリアルの検証
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(material.transparent).toBe(true);
    expect(material.side).toBe(THREE.DoubleSide); // dispPattern: 1
  });

  it('zlib deflate 圧縮された imageBase64 を正常にデコードできること', async () => {
    const filePath = path.resolve(__dirname, '../../testdata/004.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const tableItem = data.pictureImageTable[0];

    const decodedUrl = await decodeImageData(tableItem.imageBase64, 'image/jpeg');
    expect(decodedUrl).toBeDefined();
    // Blob URL または Data URL が返されること
    expect(decodedUrl.startsWith('blob:') || decodedUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
  });
});
