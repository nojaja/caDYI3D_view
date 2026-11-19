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

  it('Lumber, Comment, TextBoard, Paint, EdgeCuts が正しく変換されること', () => {
    const legacyProject: LegacyCadiyProject = {
      _2xModel: {
        Version: '7.0',
        Camera: {
          Position: '1.0,1.0,1.0',
          Center: '0,0,0',
        },
        _2xPaint: {
          _2xPaintings: [
            {
              PaintID: '10004',
              PaintName: 'ブルー (標準の塗料セット)',
              PaintColor: '#FF4F4FFF',
            },
          ],
        },
        _2xObject: {
          _2xLumber: [
            {
              UniqueID: '2',
              CommentText: 'SPF 2x4材',
              LinkedCutPartsText: '側板 (左)',
              Location: '-0.156,0.243,0',
              Quaternion: '0,0,0,1',
              Size: '0.089,0.038,0.45',
              CutValue: '-15,0,0,0,0,0,0,0',
            },
          ],
          _2xBoard: [
            {
              UniqueID: '1',
              CommentText: 'パイン集成材 18mm',
              Location: '0,0,0',
              Quaternion: '0,0,0,1',
              Size: '0.12,0.018,0.4',
              RoundValue: '0,0.02,0.02,0',
              RoundModes: '0,0,0,0',
            },
          ],
          _2xCylinder: [
            {
              UniqueID: '3',
              CommentText: '丸棒',
              Location: '0,0,0',
              Quaternion: '0,0,0,1',
              Size: '0.018,0.018,0.4',
              PaintID: '10004',
            },
          ],
          _2xComment: [
            {
              UniqueID: '14',
              CommentText: '強化バー',
              Location: '0.07,0.42,0.05',
              Quaternion: '0,0,0,1',
              Size: '0.08,0.02,0',
              ArrowPoint: { X: '0.02', Y: '0.37', Z: '0.01' },
            },
          ],
          _2xPicture: [
            {
              UniqueID: '17',
              CommentText: 'caDIY3D WebView',
              Location: '0.03,0.68,-0.03',
              Quaternion: '0.5,-0.5,-0.5,0.5',
              Size: '0.1,0,0.38',
              ImageMode: 'false',
              FontSize: '60',
              FontFamily: 'Meiryo UI',
            },
          ],
        },
      },
    };

    const v4 = converter.convert(legacyProject);

    // 1. Lumber
    const lumber = v4.objects.find((o) => o.type === 'lumber') as any;
    expect(lumber).toBeDefined();
    expect(lumber.name).toBe('SPF 2x4材');
    expect(lumber.partName).toBe('側板 (左)');
    expect(lumber.edgeCuts).toHaveLength(1);
    expect(lumber.edgeCuts[0].mode).toBe('cut');
    expect(lumber.edgeCuts[0].edgeIndex).toBe(6);
    expect(lumber.edgeCuts[0].faceADist).toBe(0.089);

    // 2. Board with Round
    const board = v4.objects.find((o) => o.type === 'board') as any;
    expect(board).toBeDefined();
    expect(board.edgeCuts).toHaveLength(2);
    expect(board.edgeCuts[0].mode).toBe('round');
    expect(board.edgeCuts[0].faceADist).toBe(0.02);

    // 3. Cylinder with Paint
    const cyl = v4.objects.find((o) => o.type === 'cylinder') as any;
    expect(cyl).toBeDefined();
    expect(cyl.defaultPaintId).toBe('legacy-10004');
    expect(v4.paint?.snapshot?.paints).toHaveLength(1);
    expect(v4.paint?.snapshot?.paints?.[0].id).toBe('legacy-10004');
    expect(v4.paint?.snapshot?.paints?.[0].name).toBe('ブルー (標準の塗料セット)');

    // 4. Comment
    const comment = v4.objects.find((o) => o.type === 'comment') as any;
    expect(comment).toBeDefined();
    expect(comment.text).toBe('強化バー');
    expect(comment.arrowPoint).toEqual({ x: 0.02, y: 0.37, z: 0.01 });

    // 5. TextBoard
    const textBoard = v4.objects.find((o) => o.type === 'textBoard') as any;
    expect(textBoard).toBeDefined();
    expect(textBoard.text).toBe('caDIY3D WebView');
    expect(textBoard.fontFamily).toBe('Meiryo UI');
  });

  it('正のカット角度 (例: +10°) で edgeIndex: 4 が選択され、cutAngles がクリアされること (008.cadiy 互換)', () => {
    const legacyProject: LegacyCadiyProject = {
      _2xModel: {
        Version: '7.0',
        Camera: {
          Position: '1.0,1.0,1.0',
          Center: '0,0,0',
        },
        _2xObject: {
          _2xBoard: [
            {
              UniqueID: '1',
              CommentText: 'OSB合板',
              Location: '0,0,0',
              Quaternion: '0,0,0,1',
              Size: '0.7689999,0.012,1.042999',
              CutValue: '10,0,0,0,0,0,0,0',
            },
          ],
        },
      },
    };

    const v4 = converter.convert(legacyProject);
    const board = v4.objects[0] as any;
    expect(board.edgeCuts).toHaveLength(1);
    expect(board.edgeCuts[0].edgeIndex).toBe(4);
    expect(board.edgeCuts[0].mode).toBe('cut');
    expect(board.edgeCuts[0].faceADist).toBe(0.7689999);
    expect(board.edgeCuts[0].faceBDist).toBeCloseTo(0.7689999 * Math.tan((10 * Math.PI) / 180), 6);
    expect(board.cutAngles).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('_2xDiyMaterial から waveBoard, tube, steelProfile が正しく変換され、レイヤーIDがマッピングされること', () => {
    const legacyProject: LegacyCadiyProject = {
      _2xModel: {
        Version: '7.0',
        Camera: {
          Position: '1.0,1.0,1.0',
          Center: '0,0,0',
        },
        _2xLayer: {
          _2xLayerInfoItem: [
            {
              LayerID: '25',
              LayerName: 'パイプ層',
              LayerVisible: 'true',
              LayerLocked: 'false',
            },
            {
              LayerID: '10',
              LayerName: '外壁層',
              LayerVisible: 'true',
              LayerLocked: 'false',
            },
          ],
        },
        _2xObject: {
          _2xDiyMaterial: [
            {
              UniqueID: '100',
              CommentText: '単管パイプ',
              Location: '0,0,0',
              Quaternion: '0,0,0,1',
              Size: '0.0486,0.0486,2',
              DiyMaterialType: 'diyTubeMaterial2',
              Thickness: '0.0018',
              Layer: '25',
            },
            {
              UniqueID: '101',
              CommentText: 'ガルバ波板',
              Location: '0,0,0',
              Quaternion: '0,0,0,1',
              Size: '0.655,0.009,2',
              DiyMaterialType: 'diyMatTypeWaveBoard2',
              Thickness: '0.00027',
              Layer: '10',
            },
          ],
        },
      },
    };

    const v4 = converter.convert(legacyProject);

    // tube (単管パイプ)
    const tube = v4.objects.find((o) => o.type === 'tube') as any;
    expect(tube).toBeDefined();
    expect(tube.subType).toBe('steel');
    expect(tube.thickness).toBe(0.0018);
    expect(tube.layerId).toBe(1); // 最初のLayerID '25' が ID 1 にマッピング

    // waveBoard (波板)
    const wave = v4.objects.find((o) => o.type === 'waveBoard') as any;
    expect(wave).toBeDefined();
    expect(wave.subType).toBe('trapezoidal');
    expect(wave.thickness).toBe(0.00027);
    expect(wave.layerId).toBe(2); // 2番目のLayerID '10' が ID 2 にマッピング
  });
});
