import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processImage } from './process';
import { sniffImageType, UploadError, validateImageUpload, validatePdfUpload } from './validate';

const png = () =>
  sharp({ create: { width: 800, height: 600, channels: 3, background: '#b8321f' } })
    .png()
    .toBuffer();
const jpeg = () =>
  sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#335533' } })
    .jpeg()
    .toBuffer();

describe('upload validation', () => {
  it('sniffs real types', async () => {
    expect(sniffImageType(await png())).toBe('png');
    expect(sniffImageType(await jpeg())).toBe('jpeg');
    expect(sniffImageType(Buffer.from('<?php echo 1; ?>'))).toBeNull();
  });
  it('accepts a matching JPEG', async () => {
    const buf = await jpeg();
    expect(validateImageUpload({ name: 'foto.JPG', type: 'image/jpeg', size: buf.length }, buf)).toBe('jpeg');
  });
  it('rejects a script disguised as an image', () => {
    const buf = Buffer.from('#!/bin/sh\nrm -rf /');
    expect(() => validateImageUpload({ name: 'foto.jpg', type: 'image/jpeg', size: buf.length }, buf)).toThrow(UploadError);
  });
  it('rejects a mismatching extension', async () => {
    const buf = await png();
    expect(() => validateImageUpload({ name: 'foto.jpg', type: 'image/jpeg', size: buf.length }, buf)).toThrow(/geen echte foto/);
  });
  it('rejects executables and svg', () => {
    const exe = Buffer.from('MZ\x90\x00');
    expect(() => validateImageUpload({ name: 'virus.exe', type: 'application/octet-stream', size: 4 }, exe)).toThrow(/niet ondersteund/);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(() => validateImageUpload({ name: 'a.svg', type: 'image/svg+xml', size: svg.length }, svg)).toThrow(UploadError);
  });
  it('rejects oversized files', () => {
    expect(() => validateImageUpload({ name: 'a.jpg', type: 'image/jpeg', size: 16 * 1024 * 1024 }, Buffer.from([0xff, 0xd8, 0xff]))).toThrow(/te groot/);
  });
  it('explains HEIC', () => {
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(16)]);
    expect(() => validateImageUpload({ name: 'IMG_0001.HEIC', type: 'image/heic', size: heic.length }, heic)).toThrow(/HEIC/);
  });
  it('validates pdf', () => {
    const pdf = Buffer.from('%PDF-1.7\n');
    expect(() => validatePdfUpload({ name: 'menu.pdf', type: 'application/pdf', size: pdf.length }, pdf)).not.toThrow();
    expect(() => validatePdfUpload({ name: 'menu.pdf', type: 'application/pdf', size: 5 }, Buffer.from('hello'))).toThrow();
  });
});

describe('processImage', () => {
  it('creates responsive variants and strips metadata', async () => {
    const result = await processImage(await jpeg(), 'jpeg');
    expect(result.width).toBe(1600);
    expect(result.variantWidths).toEqual([320, 480, 640, 960, 1280, 1600]);
    expect(result.files.map((f) => f.name)).toContain('og.jpg');
    const meta = await sharp(result.files[0]!.data).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
  });
  it('rejects tiny images', async () => {
    const tiny = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    await expect(processImage(tiny, 'png')).rejects.toThrow(/te klein/);
  });
  it('rejects a format mismatch detected by the decoder', async () => {
    await expect(processImage(await png(), 'jpeg')).rejects.toThrow(UploadError);
  });
});
