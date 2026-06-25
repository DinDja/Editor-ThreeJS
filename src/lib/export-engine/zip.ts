/* Minimal ZIP writer (STORE / no compression) with CRC32.
   Produces a valid .zip Blob in the browser without external dependencies. */

type ZipEntry = {
  path: string;
  data: Uint8Array;
  crc: number;
  offset: number;
};

export type ZipFile = { path: string; data: Uint8Array };

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const encodeUtf8 = (value: string): Uint8Array => {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value);
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return new Uint8Array(bytes);
};

const writeU16 = (view: DataView, offset: number, value: number) => {
  view.setUint16(offset, value & 0xffff, true);
};

const writeU32 = (view: DataView, offset: number, value: number) => {
  view.setUint32(offset, value >>> 0, true);
};

const dosTime = (date: Date): { time: number; date: number } => ({
  time: ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f),
  date: (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f),
});

export const buildZipBlob = (files: ZipFile[]): Blob => {
  const entries: ZipEntry[] = [];
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for (const file of files) {
    const data = file.data instanceof Uint8Array ? file.data : encodeUtf8(String(file.data));
    const crc = crc32(data);
    const offset = totalLength;
    entries.push({ path: file.path, data, crc, offset });
    const pathBytes = encodeUtf8(file.path);
    const localHeader = new Uint8Array(30 + pathBytes.length);
    const view = new DataView(localHeader.buffer);
    writeU32(view, 0, 0x04034b50);
    writeU16(view, 4, 20);
    writeU16(view, 6, 0);
    writeU16(view, 8, 0);
    const stamp = dosTime(new Date());
    writeU16(view, 10, stamp.time);
    writeU16(view, 12, stamp.date);
    writeU32(view, 14, crc);
    writeU32(view, 18, data.length & 0xffffffff);
    writeU32(view, 22, data.length & 0xffffffff);
    writeU16(view, 26, pathBytes.length);
    writeU16(view, 28, 0);
    localHeader.set(pathBytes, 30);
    chunks.push(localHeader);
    chunks.push(data);
    totalLength += localHeader.length + data.length;
  }

  const centralOffset = totalLength;
  let centralSize = 0;
  const centralChunks: Uint8Array[] = [];

  for (const entry of entries) {
    const pathBytes = encodeUtf8(entry.path);
    const record = new Uint8Array(46 + pathBytes.length);
    const view = new DataView(record.buffer);
    writeU32(view, 0, 0x02014b50);
    writeU16(view, 4, 20);
    writeU16(view, 6, 20);
    writeU16(view, 8, 0);
    writeU16(view, 10, 0);
    const stamp = dosTime(new Date());
    writeU16(view, 12, stamp.time);
    writeU16(view, 14, stamp.date);
    writeU32(view, 16, entry.crc);
    writeU32(view, 20, entry.data.length & 0xffffffff);
    writeU32(view, 24, entry.data.length & 0xffffffff);
    writeU16(view, 28, pathBytes.length);
    writeU16(view, 30, 0);
    writeU16(view, 32, 0);
    writeU16(view, 34, 0);
    writeU16(view, 36, 0);
    writeU32(view, 38, 0);
    writeU32(view, 42, entry.offset & 0xffffffff);
    record.set(pathBytes, 46);
    centralChunks.push(record);
    centralSize += record.length;
  }

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeU32(endView, 0, 0x06054b50);
  writeU16(endView, 4, 0);
  writeU16(endView, 6, 0);
  writeU16(endView, 8, entries.length);
  writeU16(endView, 10, entries.length);
  writeU32(endView, 12, centralSize & 0xffffffff);
  writeU32(endView, 16, centralOffset & 0xffffffff);
  writeU16(endView, 20, 0);

  return new Blob(
    [...chunks, ...centralChunks, endRecord].map((chunk) => chunk as unknown as BlobPart),
    { type: 'application/zip' },
  );
};

export const stringToBytes = (value: string): Uint8Array => encodeUtf8(value);

export const arrayBufferToBytes = (buffer: ArrayBuffer): Uint8Array => new Uint8Array(buffer);
