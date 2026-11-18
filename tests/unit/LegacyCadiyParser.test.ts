import { describe, it, expect } from 'vitest';
import { LegacyCadiyParser } from '../../src/loader/LegacyCadiyParser';

describe('LegacyCadiyParser', () => {
  const parser = new LegacyCadiyParser();

  it('シンプルな旧形式XMLをパースしてLegacyCadiyProjectを構築できること', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<_2xModel>
  <Version>7.0</Version>
  <Camera>
    <Position>1.0,2.0,3.0</Position>
    <Center>0.0,0.5,0.0</Center>
  </Camera>
  <_2xLayer>
    <_2xLayerInfoItem>
      <LayerName>フォルダ1</LayerName>
      <LayerID>0</LayerID>
      <LayerVisible>true</LayerVisible>
      <LayerLocked>false</LayerLocked>
      <LayerColor>#FF4F80FF</LayerColor>
    </_2xLayerInfoItem>
  </_2xLayer>
  <_2xObject>
    <_2xBoard>
      <UniqueID>1</UniqueID>
      <CommentText>SPF 2x4</CommentText>
      <Location>0.1,0.2,0.3</Location>
      <Quaternion>0,0,0,1</Quaternion>
      <Size>0.038,0.089,0.5</Size>
      <Diffuse>1,1,1,1</Diffuse>
      <Layer>0</Layer>
    </_2xBoard>
  </_2xObject>
</_2xModel>`;

    const project = parser.parse(xml);
    expect(project).toBeDefined();
    expect(project._2xModel).toBeDefined();
    expect(project._2xModel.Version).toBe('7.0');
    expect(project._2xModel.Camera.Position).toBe('1.0,2.0,3.0');
    expect(project._2xModel.Camera.Center).toBe('0.0,0.5,0.0');

    // レイヤー
    const layers = project._2xModel._2xLayer?._2xLayerInfoItem;
    expect(layers).toBeDefined();
    const layer = Array.isArray(layers) ? layers[0] : layers;
    expect(layer?.LayerName).toBe('フォルダ1');
    expect(layer?.LayerID).toBe('0');

    // オブジェクト
    const boards = project._2xModel._2xObject._2xBoard;
    expect(boards).toBeDefined();
    const board = Array.isArray(boards) ? boards[0] : boards;
    expect(board?.UniqueID).toBe('1');
    expect(board?.CommentText).toBe('SPF 2x4');
  });

  it('不正なXMLや_2xModelがない場合にエラーを投げること', () => {
    expect(() => parser.parse('not xml')).toThrow();
    expect(() => parser.parse('<InvalidRoot></InvalidRoot>')).toThrow('ルート要素 <_2xModel> が見つかりません');
  });
});
