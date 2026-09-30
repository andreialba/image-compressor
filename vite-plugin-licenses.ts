import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

// Bundled into the output but listed as devDependencies.
const EXTRA_BUNDLED = ['@fontsource/inter', 'tailwindcss'];
const LICENSE_FILE = /^(licen[cs]e|notice|copying)/i;

const findPackageDir = (name: string, fromDir: string): string | null => {
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', name);
    if (existsSync(path.join(candidate, 'package.json'))) return candidate;
    if (path.dirname(dir) === dir) return null;
  }
};

const licenseTexts = (dir: string): string[] => {
  const files = readdirSync(dir).filter((f) => LICENSE_FILE.test(f));
  // The jSquash packages keep the codecs' own licenses (MozJPEG, libwebp, OxiPNG) here.
  const codec = path.join('codec', 'LICENSE.codec.md');
  if (existsSync(path.join(dir, codec))) files.push(codec);
  return files.map((f) => readFileSync(path.join(dir, f), 'utf8').trim());
};

const buildLicenses = (root: string): string => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const seen = new Map<string, string>();
  const visit = (name: string, fromDir: string, recurse: boolean) => {
    const dir = findPackageDir(name, fromDir);
    if (!dir || seen.has(dir)) return;
    seen.set(dir, name);
    if (!recurse) return;
    const deps = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).dependencies ?? {};
    Object.keys(deps).forEach((dep) => visit(dep, dir, true));
  };
  Object.keys(pkg.dependencies ?? {}).forEach((dep) => visit(dep, root, true));
  EXTRA_BUNDLED.forEach((dep) => visit(dep, root, false));

  const sections = [...seen.entries()]
    .map(([dir, name]) => {
      const meta = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
      const texts = licenseTexts(dir);
      return `${name}@${meta.version} (${meta.license ?? 'see below'})\n\n${texts.join('\n\n') || 'No license file shipped.'}`;
    })
    .sort();

  const rule = `\n\n${'-'.repeat(72)}\n\n`;
  return [
    readFileSync(path.join(root, 'LICENSE'), 'utf8').trim(),
    'This software includes the following third-party components.',
    ...sections,
  ].join(rule) + '\n';
};

/** Emits licenses.txt: this project's license followed by every bundled dependency's. */
export default function licenses(): Plugin {
  let root = process.cwd();
  return {
    name: 'licenses',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use('/licenses.txt', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(buildLicenses(root));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'licenses.txt', source: buildLicenses(root) });
    },
  };
}
