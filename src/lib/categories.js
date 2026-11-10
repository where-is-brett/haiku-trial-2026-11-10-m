// src/lib/categories.js

// The categories, in the order the month page shows them.
export const CATEGORIES = [
  { key: 'groceries', label: 'Groceries' },
  { key: 'eating_out', label: 'Eating out' },
  { key: 'transport', label: 'Transport' },
  { key: 'bills', label: 'Bills' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'health', label: 'Health' },
  { key: 'income', label: 'Income' },
  { key: 'other', label: 'Other' },
];

// Each shop name with its category. Checked in this order.
const SHOP_RULES = [
  { name: 'Greenbarrow Fresh', key: 'groceries' },
  { name: 'Pennywhistle Market', key: 'groceries' },
  { name: 'Lowtide Grocers', key: 'groceries' },
  { name: 'Harvest Lane Foods', key: 'groceries' },
  { name: 'Pasta', key: 'eating_out' },
  { name: 'Pizza & Co', key: 'eating_out' },
  { name: 'Kestrel Coffee Bar', key: 'eating_out' },
  { name: 'Saltbush Noodle House', key: 'eating_out' },
  { name: 'Ember Grill', key: 'eating_out' },
  { name: 'Waverly Fuel Stop', key: 'transport' },
  { name: 'Tramline Fares', key: 'transport' },
  { name: 'Lantern Rideshare', key: 'transport' },
  { name: 'Northgate Parking', key: 'transport' },
  { name: 'Brightfield Power', key: 'bills' },
  { name: 'Clearwater Utilities', key: 'bills' },
  { name: 'Skyline Broadband', key: 'bills' },
  { name: 'Hollis Insurance', key: 'bills' },
  { name: 'Marlowe Homewares', key: 'shopping' },
  { name: 'Quillon Books', key: 'shopping' },
  { name: 'Fernhill Outfitters', key: 'shopping' },
  { name: 'Pixel Parade Tech', key: 'shopping' },
  { name: 'Larkspur Pharmacy', key: 'health' },
  { name: 'Elmgrove Physio', key: 'health' },
  { name: 'Cobalt Dental', key: 'health' },
  { name: 'Sunnyvale Optical', key: 'health' },
  { name: 'Brightwave Payroll', key: 'income' },
  { name: 'Tidepool Interest', key: 'income' },
  { name: 'Oakridge Dividends', key: 'income' },
];

// Returns the key of the first shop whose name the description contains,
// ignoring case. If a description matched two shops, the first one listed wins.
// A plain substring check, not a regular expression, so '&' is literal.
export function categoryOf(description) {
  const text = String(description ?? '').toLowerCase();
  const rule = SHOP_RULES.find((r) => text.includes(r.name.toLowerCase()));
  return rule ? rule.key : 'other';
}
