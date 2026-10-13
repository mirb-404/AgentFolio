/**
 * Pulls the résumé PDF from Google Drive and renders page images for the
 * in-chat preview. Run after updating the résumé on Drive:
 *
 *   npm run resume:sync
 *
 * Needs Ghostscript on PATH (`gswin64c` on Windows, `gs` elsewhere).
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DRIVE_ID = '1dYFu-Es-6oBQ4KWwp_wcgSgRB2XPCrdp';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/assets/resume');

const res = await fetch(`https://drive.google.com/uc?export=download&id=${DRIVE_ID}`, { redirect: 'follow' });
if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
const pdf = Buffer.from(await res.arrayBuffer());
if (pdf.subarray(0, 5).toString() !== '%PDF-') {
    throw new Error('Drive did not return a PDF — is the file still shared publicly?');
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'resume.pdf'), pdf);

const GS = process.platform === 'win32' ? 'gswin64c' : 'gs';
const src = path.join(OUT, 'resume.pdf');

// 16-colour PNGs: black text on white survives the palette untouched, and
// the files come out ~8x smaller than full greyscale or JPEG
const render = (dpi, outPattern, extra = []) => {
    const r = spawnSync(GS, [
        '-q', '-dNOPAUSE', '-dBATCH', '-dSAFER',
        '-sDEVICE=png16', '-dTextAlphaBits=4', '-dGraphicsAlphaBits=4',
        `-r${dpi}`, ...extra, `-sOutputFile=${outPattern}`, src,
    ], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`${GS} failed (is Ghostscript installed?)`);
};
// Full pages for the viewer (~1600px wide, sharp on 2x screens) + a first-page thumbnail
render(192, path.join(OUT, 'page-%d.png'));
render(58, path.join(OUT, 'thumb.png'), ['-dFirstPage=1', '-dLastPage=1']);

const files = await readdir(OUT);
console.log(`résumé synced → ${path.relative(process.cwd(), OUT)}: ${files.join(', ')}`);
