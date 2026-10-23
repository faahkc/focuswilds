import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const execute = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const task = process.argv[2];
if (!['check', 'build'].includes(task)) throw new Error('Use node scripts/game.mjs check|build');
const steam = 'C:/Program Files (x86)/Steam/steamapps/common';
const godot = `${steam}/Godot Engine/godot.windows.opt.tools.64.exe`;
await mkdir(path.join(root, 'game/build/web'), { recursive: true });
await writeFile(path.join(root, 'game/build/.gdignore'), '');
let log = '';
async function run(binary, args, pass) {
  const { stdout, stderr } = await execute(binary, args, { cwd: root, windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
  const output = stdout + stderr;
  log += output;
  await writeFile(path.join(root, 'game/build/check.log'), log);
  if (/SCRIPT ERROR:|ERROR:/.test(output) || (pass && !output.includes(pass))) throw new Error(output);
}
await run(`${steam}/Aseprite/Aseprite.exe`, ['-b', '--script-param', 'output=game/assets', '--script', 'art/apartment/export.lua'], 'PASS:');
await run(godot, ['--headless', '--path', 'game', '--editor', '--import', '--quit']);
await run(godot, ['--headless', '--path', 'game', '--script', 'res://scripts/check.gd'], 'PASS:');
if (task === 'build') await run(godot, ['--headless', '--path', 'game', '--export-release', 'Web', 'build/web/index.html']);
console.log(`PASS: artwork recomposition, Godot import/scene checks${task === 'build' ? ', single-thread Web export' : ''}`);
