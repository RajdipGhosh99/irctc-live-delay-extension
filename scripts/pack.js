#!/usr/bin/env node
/**
 * Industry-Standard Deterministic Extension Packager
 * Author: Rajdip Ghosh (https://github.com/RajdipGhosh99)
 * 
 * Creates cross-platform, deterministic zip packages and computes SHA-256 checksums.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');

function getVersion() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  return pkg.version || '2.0.0';
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
  const version = getVersion();
  console.log(`\n======================================================`);
  console.log(`📦 Packaging Live Train Delay Tracker v${version}`);
  console.log(`======================================================`);

  // Verify build output exists
  if (!fs.existsSync(DIST_DIR) || !fs.existsSync(path.join(DIST_DIR, 'manifest.json'))) {
    console.error(`❌ Error: 'dist/manifest.json' not found. Run 'npm run build' first.`);
    process.exit(1);
  }

  // Ensure release directory exists
  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
  }

  const versionedZipName = `train-delay-tracker-v${version}.zip`;
  const latestZipName = `train-delay-tracker-latest.zip`;
  const versionedZipPath = path.join(RELEASE_DIR, versionedZipName);
  const latestZipPath = path.join(RELEASE_DIR, latestZipName);
  const rootVersionedZipPath = path.join(ROOT_DIR, versionedZipName);

  console.log(`🗜️ Compressing 'dist/' folder with maximum compression (level 9)...`);

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

  console.log(`\n✨ Packaging Completed Successfully!`);
  console.log(`------------------------------------------------------`);
  console.log(`📄 Artifact 1: release/${versionedZipName} (${formatBytes(bytesWritten)})`);
  console.log(`📄 Artifact 2: release/${latestZipName}`);
  console.log(`📄 Artifact 3: ${versionedZipName}`);
  console.log(`🔒 SHA-256   : ${sha256}`);
  console.log(`📋 Checksums : release/SHA256SUMS.txt`);
  console.log(`------------------------------------------------------\n`);
}

pack().catch((err) => {
  console.error(`❌ Packaging failed:`, err);
  process.exit(1);
});
