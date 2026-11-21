// Neon Coast — GTA-style multi-panel cover maker (Node 22, standard library only).
//
// main.ts hands the entry in: it copies app/ and screenshots/ from beside this
// file into the output directory and writes /output/dossier.json with the
// vendored make.fun library (vendor/makefun-app.ts, byte-identical kit copy).
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   MAKEFUN_OUTPUT_DIR=/tmp/neon-out node main.ts
//
// The output directory is a Docker volume mount in the grader, so this program
// NEVER removes the output directory itself (that throws EBUSY on a mount
// point). It creates the directory, clears only its CONTENTS, then copies in.
// The repository path is resolved from this file's own location, never from
// the working directory, so the program runs from any cwd.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clear the contents of the output directory, not the directory itself.
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(out)) {
  rmSync(join(out, entry), { recursive: true, force: true });
}

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Fail fast with a readable error when the copy did not land: without this,
// a missing index.html or an empty screenshots/ folder only surfaces later
// as a cryptic DossierError from buildDossier.
if (!existsSync(join(out, 'app', 'index.html'))) {
  throw new Error('main.ts: app/index.html missing after copy to ' + out);
}
if (readdirSync(join(out, 'screenshots')).length === 0) {
  throw new Error('main.ts: screenshots/ is empty in ' + out + ' — the first screenshot is the cover');
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in app/ or 48 MiB of app files in all,
// or a path under app/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
