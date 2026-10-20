import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const projectRoot = new URL('../', import.meta.url);
const files = {};

async function include(relativePath) {
  const url = new URL(relativePath, projectRoot);
  if (relativePath.endsWith('/')) {
    for (const entry of await readdir(url, { withFileTypes: true })) {
      await include(relativePath + entry.name + (entry.isDirectory() ? '/' : ''));
    }
    return;
  }
  files[`ritm/${relativePath}`] = new Uint8Array(await readFile(url));
}

// Include only the maintainable project, never Git metadata or hosting credentials.
for (const path of [
  '.github/',
  'src/',
  'scripts/',
  'tests/',
  'package.json',
  'package-lock.json',
  'README.md',
  '.gitignore',
  '.prettierrc.json',
  '.prettierignore',
  '.editorconfig',
]) {
  await include(path);
}

const output = new URL('dist/ritm-source.zip', projectRoot);
await mkdir(new URL('dist/', projectRoot), { recursive: true });
await writeFile(output, zipSync(files, { level: 9 }));
console.log(`Source archive: ${fileURLToPath(output)}`);
