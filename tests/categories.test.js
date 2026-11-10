// tests/categories.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, categoryOf } from '../src/lib/categories.js';

test('the categories are listed in the fixed order', () => {
  assert.deepEqual(
    CATEGORIES.map((c) => c.key),
    ['groceries', 'eating_out', 'transport', 'bills', 'shopping', 'health', 'income', 'other'],
  );
  assert.equal(CATEGORIES.find((c) => c.key === 'eating_out').label, 'Eating out');
});

const SHOPS = [
  ['Greenbarrow Fresh', 'groceries'],
  ['Pennywhistle Market', 'groceries'],
  ['Lowtide Grocers', 'groceries'],
  ['Harvest Lane Foods', 'groceries'],
  ['Pasta', 'eating_out'],
  ['Pizza & Co', 'eating_out'],
  ['Kestrel Coffee Bar', 'eating_out'],
  ['Saltbush Noodle House', 'eating_out'],
  ['Ember Grill', 'eating_out'],
  ['Waverly Fuel Stop', 'transport'],
  ['Tramline Fares', 'transport'],
  ['Lantern Rideshare', 'transport'],
  ['Northgate Parking', 'transport'],
  ['Brightfield Power', 'bills'],
  ['Clearwater Utilities', 'bills'],
  ['Skyline Broadband', 'bills'],
  ['Hollis Insurance', 'bills'],
  ['Marlowe Homewares', 'shopping'],
  ['Quillon Books', 'shopping'],
  ['Fernhill Outfitters', 'shopping'],
  ['Pixel Parade Tech', 'shopping'],
  ['Larkspur Pharmacy', 'health'],
  ['Elmgrove Physio', 'health'],
  ['Cobalt Dental', 'health'],
  ['Sunnyvale Optical', 'health'],
  ['Brightwave Payroll', 'income'],
  ['Tidepool Interest', 'income'],
  ['Oakridge Dividends', 'income'],
];

test('each shop name maps to its category in any letter case', () => {
  for (const [shop, key] of SHOPS) {
    assert.equal(categoryOf(shop), key, shop);
    assert.equal(categoryOf(shop.toUpperCase()), key, shop);
    assert.equal(categoryOf(shop.toLowerCase()), key, shop);
  }
});

test('a shop name inside other text still matches', () => {
  assert.equal(categoryOf('POS WAVERLY FUEL STOP 4411'), 'transport');
  assert.equal(categoryOf('card payment to pasta, london'), 'eating_out');
  assert.equal(categoryOf('Direct debit Brightfield Power ref 88'), 'bills');
});

test('a description matching no shop returns other', () => {
  assert.equal(categoryOf('Unknown merchant 19'), 'other');
  assert.equal(categoryOf(''), 'other');
  assert.equal(categoryOf(null), 'other');
  assert.equal(categoryOf(undefined), 'other');
});

test('a fragment of a shop name is not that shop', () => {
  assert.equal(categoryOf('Pizza Hut'), 'other');
});
