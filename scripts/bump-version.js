#!/usr/bin/env node
/**
 * Industry-Standard Semantic Version Bumping Tool
 * Author: Rajdip Ghosh (https://github.com/RajdipGhosh99)
 * 
 * Synchronizes versions across package.json, manifest.json, and source constants.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');
const PKG_LOCK_PATH = path.join(ROOT_DIR, 'package-lock.json');
const MANIFEST_PATH = path.join(ROOT_DIR, 'manifest.json');
const CONSTANTS_PATH = path.join(ROOT_DIR, 'src', 'core', 'constants.ts');

function parseSemver(v) {
  const match = v.trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function computeNewVersion(currentVersion, bumpType) {
  const parsed = parseSemver(currentVersion);
  if (!parsed) {
    throw new Error(`Invalid current version string: ${currentVersion}`);
  }

  if (bumpType === 'major') {
    return `${parsed.major + 1}.0.0`;
  } else if (bumpType === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  } else if (bumpType === 'patch') {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  } else if (parseSemver(bumpType)) {
    return bumpType.replace(/^v/, '');
  } else {
    throw new Error(`Invalid bump type or version: "${bumpType}". Must be 'patch', 'minor', 'major', or an explicit version like '2.0.1'.`);
  }
}

function bump() {
  const target = process.argv[2];
  if (!target) {
    console.error(`❌ Error: Please specify bump type ('patch', 'minor', 'major') or explicit version (e.g. '2.0.1').`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const oldVersion = pkg.version;
  const newVersion = computeNewVersion(oldVersion, target);

  console.log(`\n======================================================`);
  console.log(`🚀 Bumping version: v${oldVersion} ➔ v${newVersion}`);
  console.log(`======================================================`);

  // 1. Update package.json
  pkg.version = newVersion;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ Updated package.json`);

  // 2. Update package-lock.json if exists
  if (fs.existsSync(PKG_LOCK_PATH)) {
    const lock = JSON.parse(fs.readFileSync(PKG_LOCK_PATH, 'utf8'));
    lock.version = newVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = newVersion;
    }
    fs.writeFileSync(PKG_LOCK_PATH, JSON.stringify(lock, null, 2) + '\n');
    console.log(`✓ Updated package-lock.json`);
  }

  // 3. Update manifest.json
  if (fs.existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    manifest.version = newVersion;
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✓ Updated manifest.json`);
  }

  // 4. Update src/core/constants.ts if exists
  if (fs.existsSync(CONSTANTS_PATH)) {
    let content = fs.readFileSync(CONSTANTS_PATH, 'utf8');
    content = content.replace(/schemaVersion:\s*['"][^'"]+['"]/g, `schemaVersion: '${newVersion}'`);
    fs.writeFileSync(CONSTANTS_PATH, content);
    console.log(`✓ Updated schemaVersion in src/core/constants.ts`);
  }

  console.log(`\n🎉 Version bump completed: v${newVersion}\n`);
}

bump();
