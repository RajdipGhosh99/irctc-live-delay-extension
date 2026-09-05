#!/usr/bin/env bash
# Release Automation Script for Live Train Delay Tracker
# Created by Rajdip Ghosh (https://github.com/RajdipGhosh99)

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ Error: Version required."
  echo "Usage: ./scripts/release.sh <version> (e.g. ./scripts/release.sh 2.0.0)"
  exit 1
fi

TAG="v$VERSION"

echo "=========================================="
echo "🚀 Creating Release for Live Train Delay Tracker: $TAG"
echo "=========================================="

# 1. Update manifest.json version if needed
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
pkg.version = '$VERSION';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');

const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf8'));
manifest.version = '$VERSION';
fs.writeFileSync('./manifest.json', JSON.stringify(manifest, null, 2) + '\n');
"

# 2. Build & package
echo "📦 Building extension..."
npm run build

echo "🗜️ Packaging release zip..."
cd dist
zip -r "../train-delay-tracker-${TAG}.zip" .
zip -r "../train-delay-tracker-latest.zip" .
cd ..

# 3. Git commit & tag
echo "🏷️ Tagging version in Git..."
git add package.json manifest.json
git commit -m "chore(release): $TAG" || true

# If tag exists, delete locally first to overwrite
if git rev-parse "$TAG" >/dev/null 2>&1; then
  git tag -d "$TAG"
fi

git tag -a "$TAG" -m "Release $TAG - Live Train Delay Tracker"

echo "=========================================="
echo "✅ Release $TAG created successfully!"
echo "📦 Generated: train-delay-tracker-$TAG.zip"
echo ""
echo "👉 To publish release to GitHub, run:"
echo "   git push origin main --tags"
echo "=========================================="
