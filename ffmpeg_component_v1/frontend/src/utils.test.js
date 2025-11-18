/**
 * @jest-environment jsdom
 */
import { base64ToUint8Array, uint8ArrayToBase64 } from './utils';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder and TextDecoder for JSDOM
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

describe('base64 conversion utilities', () => {

  it('converts a simple string to base64 and back', () => {
    const originalString = 'hello world';
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(originalString);

    const base64String = uint8ArrayToBase64(uint8Array);
    expect(base64String).toBe('aGVsbG8gd29ybGQ=');

    const decodedUint8Array = base64ToUint8Array(base64String);
    const decoder = new TextDecoder();
    const decodedString = decoder.decode(decodedUint8Array);

    expect(decodedString).toBe(originalString);
  });

  it('handles empty input', () => {
    const emptyArray = new Uint8Array([]);
    const base64String = uint8ArrayToBase64(emptyArray);
    expect(base64String).toBe('');

    const decodedArray = base64ToUint8Array('');
    expect(decodedArray).toEqual(emptyArray);
  });

  it('handles complex binary data', () => {
    const originalData = new Uint8Array([0, 1, 2, 255, 254, 128, 42]);
    const base64String = uint8ArrayToBase64(originalData);
    expect(base64String).toBe('AAEC//6AKg==');

    const decodedData = base64ToUint8Array(base64String);
    expect(decodedData).toEqual(originalData);
  });
});
