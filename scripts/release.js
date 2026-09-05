#!/usr/bin/env node
/**
 * Industry-Standard Automated Release Orchestrator
 * Author: Rajdip Ghosh (https://github.com/RajdipGhosh99)
 * 
 * Orchestrates Version Bumping, Type Checking, Compiling, Packaging, and Git Tagging.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');

function run(command, cwd = ROOT_DIR) {
  console.log(`> ${command}`);
  execSync(command, { cwd, stdio: 'inherit' });
}

function main() {
  const arg = process.argv[2] || 'patch';

  console.log(`\n======================================================`);
  console.log(`🚀 Starting Release Pipeline (Target: ${arg})`);
  console.log(`======================================================\n`);

  // 1. Bump version
  run(`node scripts/bump-version.js ${arg}`);

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const version = pkg.version;
  const tag = `v${version}`;

  // 2. Build TypeScript & Vite bundle
  console.log(`\n🔨 Compiling TypeScript & Building Production Assets...`);
  run(`npm run build`);

  // 3. Package deterministic zip & SHA-256
  run(`node scripts/pack.js`);

  // 4. Git commit & Tag
  console.log(`🏷️ Creating Git Commit and Tag for ${tag}...`);
  try {
    run(`git add package.json package-lock.json manifest.json src/core/constants.ts release/ train-delay-tracker-*.zip`);
    run(`git commit -m "chore(release): ${tag}"`);
  } catch (e) {
    console.log(`ℹ️ Working tree clean or already committed.`);
  }

  // Delete tag locally if already exists
  try {
    execSync(`git tag -d ${tag}`, { stdio: 'ignore' });
  } catch (e) {}

  run(`git tag -a ${tag} -m "Release ${tag} - Live Train Delay Tracker"`);

  console.log(`\n======================================================`);
  console.log(`🎉 Release ${tag} is Ready!`);
  console.log(`------------------------------------------------------`);
  console.log(`📦 Generated Assets:`);
  console.log(`   • release/train-delay-tracker-${tag}.zip`);
  console.log(`   • release/train-delay-tracker-latest.zip`);
  console.log(`   • release/SHA256SUMS.txt`);
  console.log(`\n🚀 To publish this release to GitHub:`);
  console.log(`   git push origin main --tags`);
  console.log(`======================================================\n`);
}

main();
