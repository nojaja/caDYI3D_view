/**
 * 画像データのデコード・解凍ユーティリティ
 */

/**
 * マジックバイトから画像の MIME タイプを判定する
 */
function detectImageMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp';
  }
  return null;
}

/**
 * ストリームまたは zlib による解凍ヘルパー
 */
async function decompressStream(
  bytes: Uint8Array,
  format: 'deflate' | 'deflate-raw'
): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream(format);
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
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  } else if (typeof require !== 'undefined') {
    // Node.js 環境用フォールバック
    const zlib = require('zlib');
    if (format === 'deflate') {
      return new Uint8Array(zlib.inflateSync(Buffer.from(bytes)));
    } else {
      return new Uint8Array(zlib.inflateRawSync(Buffer.from(bytes)));
    }
  }
  throw new Error('Decompression not supported in this environment');
}

/**
 * base64文字列（zlib deflate または raw deflate 圧縮されている可能性がある）からBlob URLまたはData URLを生成
 */
export async function decodeImageData(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
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

  let finalMime = mimeType;
  const alreadyImageMime = detectImageMimeType(bytes);

  if (!alreadyImageMime) {
    // 圧縮されている可能性が高い
    let decompressed: Uint8Array | null = null;

    // 1. 先頭が 0x78 の場合は RFC 1950 (zlib deflate) を試す
    if (bytes.length >= 2 && bytes[0] === 0x78) {
      try {
        decompressed = await decompressStream(bytes, 'deflate');
      } catch (e) {
        // deflate 失敗時は deflate-raw へのフォールバックを試みる
      }
    }

    // 2. zlib ではない場合、または zlib 解凍に失敗した場合は RFC 1951 (raw deflate) を試す
    if (!decompressed) {
      try {
        decompressed = await decompressStream(bytes, 'deflate-raw');
      } catch (e) {
        // 解凍不可の場合は非圧縮データとして扱う
      }
    }

    if (decompressed) {
      bytes = decompressed;
      const detected = detectImageMimeType(bytes);
      if (detected) {
        finalMime = detected;
      }
    }
  } else {
    finalMime = alreadyImageMime;
  }

  // ブラウザ環境では Blob URL を生成
  if (
    typeof Blob !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  ) {
    const blob = new Blob([bytes as any], { type: finalMime });
    return URL.createObjectURL(blob);
  }

  // Node環境等のフォールバック: Data URL
  if (typeof Buffer !== 'undefined') {
    return `data:${finalMime};base64,${Buffer.from(bytes).toString('base64')}`;
  }

  return `data:${finalMime};base64,${imageBase64}`;
}
