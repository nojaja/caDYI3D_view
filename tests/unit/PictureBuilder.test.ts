import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';
import { ModelBuilder } from '../../src/builder/ModelBuilder';
import { PictureObject } from '../../src/types/cadiy4';
import { decodeImageData } from '../../src/utils/imageUtils';

describe('PictureBuilder - 画像オブジェクト(picture)の生成', () => {
  it('004.cadiy4 の画像オブジェクトを正しく Mesh として構築できること', () => {
    const filePath = path.resolve(__dirname, '../data/004.cadiy4');
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
    const filePath = path.resolve(__dirname, '../data/004.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const tableItem = data.pictureImageTable[0];

    const decodedUrl = await decodeImageData(tableItem.imageBase64, 'image/jpeg');
    expect(decodedUrl).toBeDefined();
    // Blob URL または Data URL が返されること
    expect(decodedUrl.startsWith('blob:') || decodedUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('Legacy .cadiy の Raw Deflate 画像および画像テーブルを正常に変換・デコードできること', async () => {
    const { LegacyCadiyParser } = await import('../../src/loader/LegacyCadiyParser');
    const { LegacyToV4Converter } = await import('../../src/loader/LegacyToV4Converter');

    const filePath = path.resolve(__dirname, '../data/picture_test.cadiy');
    const content = fs.readFileSync(filePath, 'utf-8');
    const legacyParser = new LegacyCadiyParser();
    const legacyProject = legacyParser.parse(content);
    const converter = new LegacyToV4Converter();
    const data = converter.convert(legacyProject, '画像テスト');

    // 1. pictureImageTable の検証
    expect(data.pictureImageTable).toBeDefined();
    expect(data.pictureImageTable?.length).toBe(2);
    expect(data.pictureImageTable?.[0].id).toBe(1);
    expect(data.pictureImageTable?.[1].id).toBe(2);

    // 2. PictureObject の検証
    const pictureObjs = data.objects.filter((o) => o.type === 'picture') as PictureObject[];
    expect(pictureObjs.length).toBe(2);

    const pic1 = pictureObjs.find((p) => p.imageBase64Id === 1);
    expect(pic1).toBeDefined();
    expect(pic1?.imageMimeType).toBe('image/jpeg');
    expect(pic1?.contentRotation).toBe(270);
    expect(pic1?.dispPattern).toBe(1);

    const pic2 = pictureObjs.find((p) => p.imageBase64Id === 2);
    expect(pic2).toBeDefined();
    expect(pic2?.imageMimeType).toBe('image/png');
    expect(pic2?.contentRotation).toBe(270);
    expect(pic2?.dispPattern).toBe(1);

    // 3. Raw Deflate データのデコード検証
    const item1 = data.pictureImageTable![0];
    const decodedUrl1 = await decodeImageData(item1.imageBase64, pic1!.imageMimeType);
    expect(decodedUrl1).toBeDefined();
    expect(
      decodedUrl1.startsWith('blob:') ||
      decodedUrl1.startsWith('data:image/jpeg;base64,')
    ).toBe(true);

    const item2 = data.pictureImageTable![1];
    const decodedUrl2 = await decodeImageData(item2.imageBase64, pic2!.imageMimeType);
    expect(decodedUrl2).toBeDefined();
    expect(
      decodedUrl2.startsWith('blob:') ||
      decodedUrl2.startsWith('data:image/png;base64,')
    ).toBe(true);

    // 4. ModelBuilder で Mesh が構築されること
    const builder = new ModelBuilder();
    const group = builder.build(data.objects, undefined, data.pictureImageTable);
    const picMeshes = group.children.filter((c) => (c as any).userData?.cadiyObject?.type === 'picture');
    expect(picMeshes.length).toBe(2);
  });
});
