import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const projectRoot = new URL('../', import.meta.url);
const sourceDirectory = new URL('src/', projectRoot);
const outputDirectory = new URL('dist/', projectRoot);

// The application uses native browser modules, so building only copies sources.
// dist is generated output: edit src, then run npm run build.
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });

console.log(`Built ${fileURLToPath(outputDirectory)}`);
