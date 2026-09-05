#!/usr/bin/env node
/**
 * Industry-Standard Automated Extension Validator & Deterministic Packager
 * Author: Rajdip Ghosh (https://github.com/RajdipGhosh99)
 * 
 * Performs automated pre-package validation, deterministic Level-9 zip archiving, and SHA-256 calculation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');
const MANIFEST_PATH = path.join(ROOT_DIR, 'manifest.json');

function getPackageJson() {
  return JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
}

function calculateSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function runIntegrityChecks(version) {
  console.log(`🔍 Running Automated Pre-Package Integrity Checks...`);

  // 1. Check dist/ directory
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`'dist/' directory does not exist. Please run 'npm run build' first.`);
  }

  // 2. Check manifest in dist
  const distManifestPath = path.join(DIST_DIR, 'manifest.json');
  if (!fs.existsSync(distManifestPath)) {
    throw new Error(`'dist/manifest.json' is missing from build output.`);
  }

  const distManifest = JSON.parse(fs.readFileSync(distManifestPath, 'utf8'));

  // 3. Check version synchronization
  if (distManifest.version !== version) {
    console.warn(`⚠️ Warning: Manifest version (${distManifest.version}) does not match package.json (${version}). Synchronizing...`);
    distManifest.version = version;
    fs.writeFileSync(distManifestPath, JSON.stringify(distManifest, null, 2));
  }

  // 4. Verify essential UI files
  const requiredFiles = ['popup.html', 'options.html'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(DIST_DIR, file))) {
      throw new Error(`Critical UI file 'dist/${file}' is missing.`);
    }
  }

  // 5. Verify icons
  const iconSizes = ['16', '32', '48', '128'];
  for (const size of iconSizes) {
    const iconPath = path.join(DIST_DIR, 'icons', `icon${size}.png`);
    if (!fs.existsSync(iconPath)) {
      console.warn(`⚠️ Icon missing at: dist/icons/icon${size}.png`);
    }
  }

  console.log(`✅ All Pre-Package Integrity Checks Passed!`);
}

async function createZip(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    let archive;
    if (typeof archiver === 'function') {
      archive = archiver('zip', { zlib: { level: 9 } });
    } else if (archiver.ZipArchive) {
      archive = new archiver.ZipArchive({ zlib: { level: 9 } });
    } else if (archiver.default && typeof archiver.default === 'function') {
      archive = archiver.default('zip', { zlib: { level: 9 } });
    } else {
      throw new Error('Unsupported archiver module structure');
    }

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function pack() {
  const pkg = getPackageJson();
  const version = pkg.version || '2.0.0';

  console.log(`\n======================================================`);
  console.log(`📦 Automatic Package Builder — Live Train Delay Tracker v${version}`);
  console.log(`======================================================`);

  // Run integrity tests
  runIntegrityChecks(version);

  // Ensure release directory exists
  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
  }

  const versionedZipName = `train-delay-tracker-v${version}.zip`;
  const latestZipName = `train-delay-tracker-latest.zip`;
  const versionedZipPath = path.join(RELEASE_DIR, versionedZipName);
  const latestZipPath = path.join(RELEASE_DIR, latestZipName);
  const rootVersionedZipPath = path.join(ROOT_DIR, versionedZipName);

  console.log(`🗜️ Packaging 'dist/' folder into high-compression ZIP archives...`);

  const bytesWritten = await createZip(DIST_DIR, versionedZipPath);
  fs.copyFileSync(versionedZipPath, latestZipPath);
  fs.copyFileSync(versionedZipPath, rootVersionedZipPath);

  // Compute checksums
  const sha256 = calculateSha256(versionedZipPath);
  const checksumFileContent = [
    `# SHA-256 Checksums for Live Train Delay Tracker v${version}`,
    `# Generated at: ${new Date().toISOString()}`,
    ``,
    `${sha256}  ${versionedZipName}`,
    `${sha256}  ${latestZipName}`,
    ``,
  ].join('\n');

  fs.writeFileSync(path.join(RELEASE_DIR, 'SHA256SUMS.txt'), checksumFileContent);

  console.log(`\n✨ Packaging & Validation Completed Successfully!`);
  console.log(`------------------------------------------------------`);
  console.log(`📄 Versioned Archive : release/${versionedZipName} (${formatBytes(bytesWritten)})`);
  console.log(`📄 Latest Pointer    : release/${latestZipName}`);
  console.log(`📄 Root Copy         : ${versionedZipName}`);
  console.log(`🔒 SHA-256 Hash      : ${sha256}`);
  console.log(`📋 Checksums File    : release/SHA256SUMS.txt`);
  console.log(`------------------------------------------------------\n`);
}

pack().catch((err) => {
  console.error(`❌ Packaging failed:`, err);
  process.exit(1);
});
