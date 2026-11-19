/**
 * 画像データのデコード・解凍ユーティリティ
 */

/**
 * base64文字列（zlib deflate圧縮されている可能性がある）からBlob URLまたはData URLを生成
 */
export async function decodeImageData(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<string> {
  if (imageBase64.startsWith('data:')) {
    return imageBase64;
  }

  // base64 デコード
  let bytes: Uint8Array;
  if (typeof atob === 'function') {
    const binaryStr = atob(imageBase64);
    bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
  } else if (typeof Buffer !== 'undefined') {
    bytes = new Uint8Array(Buffer.from(imageBase64, 'base64'));
  } else {
    return `data:${mimeType};base64,${imageBase64}`;
  }

  // zlib ヘッダーチェック (0x78 0x9c, 0x78 0x01, 0x78 0x5e, 0x78 0xda など先頭が 0x78)
  const isZlib = bytes.length >= 2 && bytes[0] === 0x78;

  if (isZlib) {
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(bytes as any);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks: Uint8Array[] = [];
        let totalLen = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          totalLen += value.length;
        }
        const decompressed = new Uint8Array(totalLen);
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }
        bytes = decompressed;
      } else if (typeof require !== 'undefined') {
        // Node.js 環境用フォールバック
        const zlib = require('zlib');
        bytes = new Uint8Array(zlib.inflateSync(Buffer.from(bytes)));
      }
    } catch (e) {
      console.warn('Failed to decompress image with zlib, using raw bytes:', e);
    }
  }

  // ブラウザ環境では Blob URL を生成
  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([bytes as any], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  // Node環境等のフォールバック: Data URL
  if (typeof Buffer !== 'undefined') {
    return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
  }

  return `data:${mimeType};base64,${imageBase64}`;
}
