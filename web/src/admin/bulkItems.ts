import { parseCsv } from './csv';

export interface ParsedItemRow {
  rowNumber: number;
  name: string;
  serialNo: number | null;
  groupName: string;
  shopName: string;
  extraCategoryNames: string[];
  description: string;
  unit: string;
  barcode: string;
  gstPercent: number;
  mrp: number;
  retailPrice: number;
  isActive: boolean;
  errors: string[];
}

export interface ParsedItemsFile {
  rows: ParsedItemRow[];
  missingColumns: string[];
  columns: string[];
}

export interface TemplateOptions {
  groupLabel: string;
  includeCrossListing: boolean;
}

const HEADER_ALIASES: Record<string, string> = {
  name: 'name',
  itemname: 'name',
  item: 'name',
  product: 'name',
  productname: 'name',

  serial: 'serialNo',
  serialno: 'serialNo',
  serialnumber: 'serialNo',
  sno: 'serialNo',
  slno: 'serialNo',

  subcategory: 'groupName',
  shopcategory: 'groupName',
  group: 'groupName',
  section: 'groupName',

  shop: 'shopName',
  shopname: 'shopName',
  alsoshowinshop: 'shopName',

  othercategories: 'extraCategories',
  extracategories: 'extraCategories',
  alsoshowinothercategories: 'extraCategories',
  alsoshowincategories: 'extraCategories',

  description: 'description',
  desc: 'description',

  unit: 'unit',
  packsize: 'unit',
  packsizeunit: 'unit',
  size: 'unit',

  barcode: 'barcode',
  ean: 'barcode',
  sku: 'barcode',

  gst: 'gstPercent',
  gstpercent: 'gstPercent',
  tax: 'gstPercent',

  mrp: 'mrp',

  retail: 'retailPrice',
  retailprice: 'retailPrice',
  price: 'retailPrice',
  sellingprice: 'retailPrice',

  active: 'isActive',
  isactive: 'isActive',
  status: 'isActive',
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, '');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseBoolean(raw: string, fallback: boolean): boolean {
  const value = raw.trim().toLowerCase();
  if (value === '') return fallback;
  return ['yes', 'y', 'true', '1', 'active'].includes(value);
}

function parseList(raw: string): string[] {
  return raw
    .split(/[;|,]/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

export function templateRows({ groupLabel, includeCrossListing }: TemplateOptions): string[][] {
  const headers = ['Name', 'Serial No', groupLabel];
  const example = ['Example Item', '1', ''];

  if (includeCrossListing) {
    headers.push('Also show in shop', 'Also show in other categories');
    example.push('', '');
  }

  headers.push('Description', 'Pack size / unit', 'Barcode', 'GST %', 'MRP', 'Retail price', 'Active');
  example.push('', '1 kg', '', '5', '120', '99', 'Yes');

  return [headers, example];
}

export function parseItemsCsv(text: string): ParsedItemsFile {
  const grid = parseCsv(text);
  if (grid.length === 0) {
    return { rows: [], missingColumns: ['Name', 'MRP', 'Retail price'], columns: [] };
  }

  const headers = grid[0].map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? '');
  const columns = headers.filter((header) => header !== '');

  const missingColumns: string[] = [];
  if (!headers.includes('name')) missingColumns.push('Name');
  if (!headers.includes('mrp')) missingColumns.push('MRP');
  if (!headers.includes('retailPrice')) missingColumns.push('Retail price');
  if (missingColumns.length > 0) return { rows: [], missingColumns, columns };

  const rows = grid.slice(1).map((cells, index) => {
    const valueOf = (key: string) => {
      const at = headers.indexOf(key);
      return at === -1 ? '' : (cells[at] ?? '').trim();
    };

    const errors: string[] = [];

    const name = valueOf('name');
    if (!name) errors.push('Name is required');

    const mrp = parseNumber(valueOf('mrp'));
    if (mrp === null) errors.push('MRP must be a number');
    else if (mrp < 0) errors.push('MRP cannot be negative');

    const retailPrice = parseNumber(valueOf('retailPrice'));
    if (retailPrice === null) errors.push('Retail price must be a number');
    else if (retailPrice < 0) errors.push('Retail price cannot be negative');

    if (mrp !== null && retailPrice !== null && retailPrice > mrp) {
      errors.push('Retail price is above MRP');
    }

    const gstRaw = valueOf('gstPercent');
    const gstPercent = gstRaw === '' ? 0 : parseNumber(gstRaw);
    if (gstPercent === null) errors.push('GST % must be a number');

    const serialRaw = valueOf('serialNo');
    const serialNo = serialRaw === '' ? null : parseNumber(serialRaw);
    if (serialRaw !== '' && serialNo === null) errors.push('Serial number must be a number');

    return {
      rowNumber: index + 2,
      name,
      serialNo,
      groupName: valueOf('groupName'),
      shopName: valueOf('shopName'),
      extraCategoryNames: parseList(valueOf('extraCategories')),
      description: valueOf('description'),
      unit: valueOf('unit'),
      barcode: valueOf('barcode'),
      gstPercent: gstPercent ?? 0,
      mrp: mrp ?? 0,
      retailPrice: retailPrice ?? 0,
      isActive: parseBoolean(valueOf('isActive'), true),
      errors,
    };
  });

  return { rows, missingColumns: [], columns };
}
