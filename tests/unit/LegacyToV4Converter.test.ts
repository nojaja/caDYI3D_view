import { describe, it, expect, vi } from 'vitest';
import { LegacyToV4Converter } from '../../src/loader/LegacyToV4Converter';
import { LegacyCadiyProject } from '../../src/types/cadiy-legacy';

describe('LegacyToV4Converter', () => {
  const converter = new LegacyToV4Converter();

  it('LegacyCadiyProject を Cadiy4Data に正常に変換できること', () => {
    const legacyProject: LegacyCadiyProject = {
      _2xModel: {
        Version: '7.0',
        Thumbnail: 'base64thumbnail',
        Camera: {
          Position: '1.0,2.0,3.0',
          Center: '0.1,0.2,0.3',
        },
        _2xLayer: {
          _2xLayerInfoItem: [
            {
              LayerID: '0',
              LayerName: 'フォルダ1',
              LayerVisible: 'true',
              LayerLocked: 'false',
              LayerColor: '#FF4F80FF',
            },
          ],
        },
        _2xObject: {
          _2xBoard: [
            {
              UniqueID: '10',
              CommentText: '側板',
              SubPartsName: '部材A',
              Location: '0.1,0.2,0.3',
              Quaternion: '0,0.7071068,0,0.7071068',
              Size: '0.019,0.089,0.4',
              StandardSize: '0.019,0.089,1.82',
              Diffuse: '1,0.8,0.6,1',
              UnitPrice: '500',
              SpecificGravity: '0.45',
              Remarks: 'ホームセンター',
              CutValue: '0,0,0,0,0,0,0,0',
              Layer: '0',
              GroupID: '1',
              Hide: 'false',
            },
          ],
          _2xDimension: [
            {
              UniqueID: '20',
              CommentText: '400',
              Location: '0,0.1,0',
              Quaternion: '0,0,0,1',
              Size: '0.05,0,0.4',
              Diffuse: '0,0,0,1',
              Layer: '0',
            },
          ],
        },
        CutList: {
          CutListPartsBase: [
            {
              Parts: {
                CutParts: [
                  {
                    CutID: '10',
                    Location: '0.4,0',
                  },
                ],
              },
            },
          ],
        },
      },
    };

    const v4 = converter.convert(legacyProject, 'テストプロジェクト');

    expect(v4.version).toBe(1);
    expect(v4.camera.position).toEqual({ x: 1.0, y: 2.0, z: 3.0 });
    expect(v4.camera.target).toEqual({ x: 0.1, y: 0.2, z: 0.3 });

    // レイヤー（ルート + シフトされたレイヤー）
    expect(v4.layers.length).toBe(2);
    expect(v4.layers[0].id).toBe(0);
    expect(v4.layers[0].name).toBe('テストプロジェクト');
    expect(v4.layers[0].parentId).toBeNull();

    expect(v4.layers[1].id).toBe(1);
    expect(v4.layers[1].name).toBe('フォルダ1');
    expect(v4.layers[1].parentId).toBe(0);

    // オブジェクト
    expect(v4.objects.length).toBe(2);
    const board = v4.objects.find((o) => o.type === 'board') as any;
    expect(board).toBeDefined();
    expect(board?.id).toBe('legacy-10');
    expect(board?.name).toBe('側板');
    expect(board?.partName).toBe('部材A');
    expect(board?.position).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
    expect(board?.size).toEqual({ x: 0.019, y: 0.089, z: 0.4 });
    expect(board?.layerId).toBe(1); // 0 + 1
    expect(board?.unitPrice).toBe(500);
    expect(board?.specificGravity).toBe(0.45);
    expect(board?.remarks).toBe('ホームセンター');

    const dim = v4.objects.find((o) => o.type === 'dimension');
    expect(dim).toBeDefined();
    expect(dim?.name).toBe('400');

    // 木取り図
    expect(v4.cutList).toBeDefined();
    expect(v4.cutList?.layouts.length).toBe(1);
    expect(v4.cutList?.layouts[0].partsId).toBe('legacy-10');
    expect(v4.cutList?.layouts[0].z).toBe(0.4);
    expect(v4.cutList?.layouts[0].x).toBe(0);
  });

  it('変換に失敗した部材があっても、console.log に出力して処理を継続すること', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const corruptedProject: LegacyCadiyProject = {
      _2xModel: {
        Version: '7.0',
        Camera: {
          Position: 'invalid,coords', // 不正な座標
          Center: '0,0,0',
        },
        _2xObject: {
          _2xBoard: [
            {
              // 破損部材（Location, Size がない、または不正）
              UniqueID: 'corrupted-1',
              CommentText: '壊れた部材',
              Location: 'abc,def,ghi', // 数値パース失敗
              Quaternion: 'invalid',
              Size: 'invalid',
            },
            {
              // 正常な部材
              UniqueID: 'good-2',
              CommentText: '正常な部材',
              Location: '0.1,0.2,0.3',
              Quaternion: '0,0,0,1',
              Size: '0.1,0.1,0.1',
              Diffuse: '1,1,1,1',
            },
          ],
        },
      },
    };

    const v4 = converter.convert(corruptedProject, '異常系テスト');

    // 処理が継続され、正常な部材は変換されていること
    expect(v4).toBeDefined();
    expect(v4.objects.some((o) => o.name === '正常な部材')).toBe(true);

    // console.log が呼ばれ、失敗箇所と理由が出力されていること
    expect(consoleLogSpy).toHaveBeenCalled();
    const logCalls = consoleLogSpy.mock.calls.map((call) => call.join(' '));
    const hasCorruptedLog = logCalls.some(
      (msg) => msg.includes('corrupted-1') || msg.includes('失敗') || msg.includes('LegacyConverter')
    );
    expect(hasCorruptedLog).toBe(true);

    consoleLogSpy.mockRestore();
  });
});
