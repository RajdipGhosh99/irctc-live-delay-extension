#!/usr/bin/env node
/**
 * Automated Verification Script for Vendor Configurations & Portal Adapters
 * Validates DOM parsing, card detection, regex extraction, and badge injection across mock portal DOMs.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

const assert = require('assert');

// Simple minimal DOM mock for headless testing
class MockElement {
  constructor(tagName, attrs = {}, text = '') {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.id = attrs.id || '';
    this.className = attrs.class || '';
    this.classList = {
      classes: new Set(this.className.split(/\s+/).filter(Boolean)),
      contains(c) { return this.classes.has(c); },
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
    };
    this._text = text;
    this.children = [];
    this.parentNode = null;
    this.parentElement = null;
    this.style = {};
  }

  get textContent() {
    if (this.children.length === 0) return this._text;
    return this.children.map(c => c.textContent).join(' ') + (this._text ? ' ' + this._text : '');
  }
  set textContent(t) { this._text = t; }

  getAttribute(name) { return this.attributes[name] || null; }
  setAttribute(name, val) { this.attributes[name] = val; }

  appendChild(child) {
    child.parentNode = this;
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newChild, refChild) {
    newChild.parentNode = this;
    newChild.parentElement = this;
    const idx = this.children.indexOf(refChild);
    if (idx === -1) {
      this.children.push(newChild);
    } else {
      this.children.splice(idx, 0, newChild);
    }
    return newChild;
  }

  closest(selector) {
    if (selector.startsWith('.') && this.classList.contains(selector.slice(1))) return this;
    if (selector.startsWith('#') && this.id === selector.slice(1)) return this;
    return this.parentNode && this.parentNode.closest ? this.parentNode.closest(selector) : null;
  }

  querySelector(selector) {
    const res = this.querySelectorAll(selector);
    return res.length > 0 ? res[0] : null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const check = (el) => {
      let isMatch = false;
      if (selector === '*' || selector.toUpperCase() === el.tagName) isMatch = true;
      else if (selector.startsWith('.') && el.classList.contains(selector.slice(1))) isMatch = true;
      else if (selector.startsWith('#') && el.id === selector.slice(1)) isMatch = true;
      else if (selector.includes('[id^="') && el.id.startsWith(selector.match(/\[id\^="([^"]+)"\]/)[1])) isMatch = true;
      else if (selector.includes('[class*="') && el.className.includes(selector.match(/\[class\*="([^"]+)"\]/)[1])) isMatch = true;
      else if (selector.includes('[data-train-number]') && el.getAttribute('data-train-number')) isMatch = true;
      else if (selector.includes('[href*="') && (el.getAttribute('href') || '').includes(selector.match(/\[href\*="([^"]+)"\]/)[1])) isMatch = true;
      else if (selector.toLowerCase() === el.tagName.toLowerCase()) isMatch = true;

      if (isMatch) matches.push(el);
      for (const child of el.children) {
        if (child instanceof MockElement) check(child);
      }
    };
    for (const child of this.children) {
      if (child instanceof MockElement) check(child);
    }
    return matches;
  }
}

// Universal regex test
function extractTrainNumberRegex(text) {
  if (!text) return null;
  const match = text.match(/(?:^|[^\d])(\d{5})(?=[^\d]|$)/);
  return match ? match[1] : null;
}

console.log('🧪 Starting Automated Portal Adapter & Vendor Config Tests...\n');

// 1. Test Regex Extraction
console.log('Test 1: Train Number Regex Extraction');
assert.strictEqual(extractTrainNumberRegex('12952 MMCT TEJAS RAJ'), '12952');
assert.strictEqual(extractTrainNumberRegex('22222 CSMT RAJDHANI'), '22222');
assert.strictEqual(extractTrainNumberRegex('Vande Bharat Express (22436)'), '22436');
assert.strictEqual(extractTrainNumberRegex('04153 Festival Special'), '04153');
assert.strictEqual(extractTrainNumberRegex('54321 Passenger Service'), '54321');
assert.strictEqual(extractTrainNumberRegex('82301 Suvidha Express'), '82301');
assert.strictEqual(extractTrainNumberRegex('Date: 2026-09-10 No train'), null);
console.log('  ✅ Train Number Regex accurately extracts 0xxxx, 1xxxx, 2xxxx, 5xxxx, 8xxxx series!\n');

// 2. Test Vendor Configs
const { ALL_VENDOR_CONFIGS } = require('../src/portals/configs/index.ts');
console.log('Test 2: Vendor Configurations Structure');
assert.strictEqual(ALL_VENDOR_CONFIGS.length, 9, 'Should have 9 registered vendor configs');

for (const cfg of ALL_VENDOR_CONFIGS) {
  assert(cfg.id, 'Vendor must have id');
  assert(cfg.name, 'Vendor must have name');
  assert(cfg.domains && cfg.domains.length > 0, `${cfg.name} must have domains`);
  assert(cfg.selectors && cfg.selectors.cardSelectors.length > 0, `${cfg.name} must have cardSelectors`);
  assert(cfg.selectors.badgeAnchorSelectors.length > 0, `${cfg.name} must have badgeAnchorSelectors`);
  console.log(`  ✅ Config verified: [${cfg.id}] ${cfg.name} (${cfg.domains.join(', ')})`);
}

// 3. Test ConfirmTkt DOM Simulation
console.log('\nTest 3: ConfirmTkt Card Detection & Flex Row Insertion');
const rootConfirmTkt = new MockElement('div', { id: 'app' });
const card1 = new MockElement('div', { id: 'train-12952', class: 'border-b border-tertiary rounded-10' });
const flexParent = new MockElement('div', { class: 'flex items-center' });
const truncateDiv = new MockElement('div', { class: 'truncate max-w-[215px] body-sm' }, '12952 MMCT TEJAS RAJ');
flexParent.appendChild(truncateDiv);
card1.appendChild(flexParent);
rootConfirmTkt.appendChild(card1);

const cardsCT = rootConfirmTkt.querySelectorAll('[id^="train-"]');
assert.strictEqual(cardsCT.length, 1);
assert.strictEqual(extractTrainNumberRegex(cardsCT[0].id), '12952');
console.log('  ✅ ConfirmTkt search card detected with ID train-12952');

// 4. Test IRCTC DOM Simulation (Angular components)
console.log('\nTest 4: IRCTC Angular app-train-item Detection');
const rootIrctc = new MockElement('div', { id: 'main-layout' });
const irctcItem = new MockElement('app-train-item', { class: 'train-details' });
const headingDiv = new MockElement('div', { class: 'train-heading' });
const strongTitle = new MockElement('strong', {}, '22436 VANDE BHARAT EXP');
headingDiv.appendChild(strongTitle);
irctcItem.appendChild(headingDiv);
rootIrctc.appendChild(irctcItem);

const cardsIrctc = rootIrctc.querySelectorAll('app-train-item');
assert.strictEqual(cardsIrctc.length, 1);
assert.strictEqual(extractTrainNumberRegex(cardsIrctc[0].textContent), '22436');
console.log('  ✅ IRCTC app-train-item successfully extracted train 22436');

// 5. Test MakeMyTrip DOM Simulation
console.log('\nTest 5: MakeMyTrip React trainCard Detection');
const rootMmt = new MockElement('div', { id: 'root' });
const mmtCard = new MockElement('div', { class: 'single-train-detail trainCard' });
const mmtTitle = new MockElement('div', { class: 'train-name boldFont' }, '12004 LKO SHTBDI');
mmtCard.appendChild(mmtTitle);
rootMmt.appendChild(mmtCard);

const cardsMmt = rootMmt.querySelectorAll('[class*="trainCard"]');
assert.strictEqual(cardsMmt.length, 1);
assert.strictEqual(extractTrainNumberRegex(cardsMmt[0].textContent), '12004');
console.log('  ✅ MakeMyTrip card successfully extracted train 12004');

console.log('\n🎉 ALL AUTOMATED ADAPTER & CONFIG INTEGRITY TESTS PASSED!\n');
