import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pluginDir = path.join(rootDir, 'figma-plugin');
const zipPath = path.join(rootDir, 'public', 'voronoi-shatter-figma-plugin.zip');

const EXPECTED_FILES = ['manifest.json', 'code.js', 'ui.html', 'README.md'];

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function findEocdOffset(buf) {
  const minOffset = Math.max(0, buf.length - 65557);
  for (let offset = buf.length - 22; offset >= minOffset; offset--) {
    if (buf.readUInt32LE(offset) === 0x06054b50) {
      const commentLen = buf.readUInt16LE(offset + 20);
      if (offset + 22 + commentLen === buf.length) {
        return offset;
      }
    }
  }
  return -1;
}

describe('build-plugin ZIP archive', () => {
  it('has a valid ZIP structure with matching EOCD, Central Directory, and Local File Headers', () => {
    const zip = readFileSync(zipPath);
    assert.ok(zip.length >= 22, 'ZIP file must be at least 22 bytes');

    const eocdOffset = findEocdOffset(zip);
    assert.ok(eocdOffset >= 0, 'ZIP must contain a valid EOCD signature (0x06054b50)');
    assert.equal(zip.readUInt32LE(eocdOffset), 0x06054b50);

    const diskNumber = zip.readUInt16LE(eocdOffset + 4);
    const startDisk = zip.readUInt16LE(eocdOffset + 6);
    const diskEntries = zip.readUInt16LE(eocdOffset + 8);
    const totalEntries = zip.readUInt16LE(eocdOffset + 10);
    const cdSize = zip.readUInt32LE(eocdOffset + 12);
    const cdOffset = zip.readUInt32LE(eocdOffset + 16);

    assert.equal(diskNumber, 0);
    assert.equal(startDisk, 0);
    assert.equal(diskEntries, EXPECTED_FILES.length);
    assert.equal(totalEntries, EXPECTED_FILES.length);
    assert.equal(cdOffset + cdSize, eocdOffset);

    let cursor = cdOffset;
    const seenNames = [];

    for (let i = 0; i < totalEntries; i++) {
      assert.equal(zip.readUInt32LE(cursor), 0x02014b50, `Central Directory signature mismatch at entry ${i}`);

      const cdFlags = zip.readUInt16LE(cursor + 8);
      const cdMethod = zip.readUInt16LE(cursor + 10);
      const cdDosTime = zip.readUInt16LE(cursor + 12);
      const cdDosDate = zip.readUInt16LE(cursor + 14);
      const cdCrc = zip.readUInt32LE(cursor + 16);
      const cdCompSize = zip.readUInt32LE(cursor + 20);
      const cdUncompSize = zip.readUInt32LE(cursor + 24);
      const cdNameLen = zip.readUInt16LE(cursor + 28);
      const cdExtraLen = zip.readUInt16LE(cursor + 30);
      const cdCommentLen = zip.readUInt16LE(cursor + 32);
      const localHeaderOffset = zip.readUInt32LE(cursor + 42);
      const cdName = zip.subarray(cursor + 46, cursor + 46 + cdNameLen).toString('utf8');

      seenNames.push(cdName);

      assert.ok(localHeaderOffset + 30 <= cdOffset, `Local header offset out of bounds for ${cdName}`);
      assert.equal(zip.readUInt32LE(localHeaderOffset), 0x04034b50, `Local File Header signature mismatch for ${cdName}`);

      const localFlags = zip.readUInt16LE(localHeaderOffset + 6);
      const localMethod = zip.readUInt16LE(localHeaderOffset + 8);
      const localDosTime = zip.readUInt16LE(localHeaderOffset + 10);
      const localDosDate = zip.readUInt16LE(localHeaderOffset + 12);
      const localCrc = zip.readUInt32LE(localHeaderOffset + 14);
      const localCompSize = zip.readUInt32LE(localHeaderOffset + 18);
      const localUncompSize = zip.readUInt32LE(localHeaderOffset + 22);
      const localNameLen = zip.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = zip.readUInt16LE(localHeaderOffset + 28);
      const localName = zip
        .subarray(localHeaderOffset + 30, localHeaderOffset + 30 + localNameLen)
        .toString('utf8');

      assert.equal(localName, cdName);
      assert.equal(localFlags, cdFlags);
      assert.equal(localMethod, cdMethod);
      assert.equal(localDosTime, cdDosTime);
      assert.equal(localDosDate, cdDosDate);
      assert.equal(localCrc, cdCrc);
      assert.equal(localCompSize, cdCompSize);
      assert.equal(localUncompSize, cdUncompSize);

      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      assert.ok(dataStart + localCompSize <= cdOffset, `Compressed payload out of bounds for ${cdName}`);

      cursor += 46 + cdNameLen + cdExtraLen + cdCommentLen;
    }

    assert.equal(cursor, cdOffset + cdSize);
    assert.deepEqual(seenNames, EXPECTED_FILES);
  });

  it('decompresses every plugin file cleanly with valid CRC32 and byte-for-byte parity with figma-plugin/', () => {
    const zip = readFileSync(zipPath);
    const eocdOffset = findEocdOffset(zip);
    assert.ok(eocdOffset >= 0);

    const totalEntries = zip.readUInt16LE(eocdOffset + 10);
    const cdOffset = zip.readUInt32LE(eocdOffset + 16);
    const extracted = new Map();

    let cursor = cdOffset;
    for (let i = 0; i < totalEntries; i++) {
      const method = zip.readUInt16LE(cursor + 10);
      const expectedCrc = zip.readUInt32LE(cursor + 16);
      const compSize = zip.readUInt32LE(cursor + 20);
      const uncompSize = zip.readUInt32LE(cursor + 24);
      const nameLen = zip.readUInt16LE(cursor + 28);
      const extraLen = zip.readUInt16LE(cursor + 30);
      const commentLen = zip.readUInt16LE(cursor + 32);
      const localHeaderOffset = zip.readUInt32LE(cursor + 42);
      const name = zip.subarray(cursor + 46, cursor + 46 + nameLen).toString('utf8');

      const localNameLen = zip.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = zip.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const payload = zip.subarray(dataStart, dataStart + compSize);

      assert.ok(method === 0 || method === 8, `Unsupported compression method ${method} for ${name}`);
      const content = method === 8 ? inflateRawSync(payload) : Buffer.from(payload);

      assert.equal(content.length, uncompSize, `Uncompressed size mismatch for ${name}`);
      assert.equal(crc32(content), expectedCrc, `CRC32 mismatch for ${name}`);

      const diskBytes = readFileSync(path.join(pluginDir, name));
      assert.equal(Buffer.compare(content, diskBytes), 0, `${name} in ZIP must match figma-plugin/${name} byte-for-byte`);

      extracted.set(name, content);
      cursor += 46 + nameLen + extraLen + commentLen;
    }

    assert.equal(extracted.size, EXPECTED_FILES.length);
    for (const fileName of EXPECTED_FILES) {
      assert.ok(extracted.has(fileName), `Missing expected entry ${fileName}`);
    }

    const manifest = JSON.parse(extracted.get('manifest.json').toString('utf8'));
    assert.equal(manifest.main, 'code.js');
    assert.equal(manifest.ui, 'ui.html');
    assert.ok(typeof manifest.name === 'string' && manifest.name.length > 0);
  });
});
