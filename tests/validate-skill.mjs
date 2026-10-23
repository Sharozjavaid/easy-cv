import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
async function walk(dir){const all=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.name==='.git'||e.name==='node_modules')continue;const p=resolve(dir,e.name);if(e.isDirectory())all.push(...await walk(p));else all.push(p);}return all;}
const files=await walk(root);
const skill=await readFile(resolve(root,'skills/easy-cv/SKILL.md'),'utf8');
assert.match(skill,/^---\nname: easy-cv\ndescription: .+\n---/);
assert.ok(skill.split('\n').length<150,'Entrypoint should remain compact');
let links=0;
for(const file of files.filter(p=>p.endsWith('.md'))){
  const body=await readFile(file,'utf8');
  for(const match of body.matchAll(/\]\(([^)]+)\)/g)){
    const href=match[1];if(/^(https?:|#)/.test(href))continue;
    assert.ok((await stat(resolve(dirname(file),href.split('#')[0]))).isFile(),`Missing link ${href}`);links++;
  }
  assert.ok(!body.includes('/Users/'),'Do not publish local workspace paths');
}
assert.ok(files.every(p=>!/(\.mp4|\.mov|\.task|\.env)$/.test(p)),'No private media, env files or model binaries');
console.log(`Skill validated: ${files.length} files, ${links} local links, compact frontmatter entrypoint.`);
