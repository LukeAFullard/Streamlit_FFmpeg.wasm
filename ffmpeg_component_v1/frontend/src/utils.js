/**
 * Decodes a base64 string into a Uint8Array.
 * @param {string} base64 The base64-encoded string.
 * @returns {Uint8Array} The decoded binary data.
 */
export function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a Uint8Array into a base64 string in chunks to avoid stack overflow.
 * @param {Uint8Array} bytes The binary data to encode.
 * @returns {string} The base64-encoded string.
 */
export function uint8ArrayToBase64(bytes) {
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  let b64 = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    b64 += String.fromCharCode.apply(null, chunk);
  }
  return btoa(b64);
}
