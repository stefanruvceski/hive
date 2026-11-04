// Serbian fiscal receipts (pure, unit tested). The QR code on every receipt is a link to the tax
// office, suf.purs.gov.rs/v/?vl=…; asked with `Accept: application/json` it answers with the
// receipt (`invoiceRequest`, `invoiceResult`, `journal` = the printed text). Older answers or the
// HTML page are read too. Fields missing from the JSON are taken from the printed text.
// Ported from hive-poc FiscalParse.kt. Amounts here are in dinars (major units).

export const FISCAL_HOST = 'suf.purs.gov.rs';

export type ReceiptStatus = 'pending' | 'ok' | 'failed';

export type ReceiptItemData = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit: string | null;
  vat: string | null;
};

export type ReceiptData = {
  status: ReceiptStatus;
  company: string | null;
  shop: string | null;
  address: string | null;
  city: string | null;
  tin: string | null;
  /** Dinars; negative for a refund. */
  total: number | null;
  /** When it was issued, Belgrade time ("2026-10-25T14:03:11"). */
  time: string | null;
  invoiceNumber: string | null;
  refund: boolean;
  payment: string | null;
  items: ReceiptItemData[];
  /** The receipt as printed, in the tax office's text. */
  journal: string | null;
  error: string | null;
  /** The buyer's PIB when the receipt was issued to a company; null = personal. */
  buyerTin: string | null;
  /** The user set who it's for by hand; fetching again keeps their choice. */
  ownerManual: boolean;
};

export const emptyReceipt: ReceiptData = {
  status: 'pending',
  company: null,
  shop: null,
  address: null,
  city: null,
  tin: null,
  total: null,
  time: null,
  invoiceNumber: null,
  refund: false,
  payment: null,
  items: [],
  journal: null,
  error: null,
  buyerTin: null,
  ownerManual: false,
};

const LINK = /(?:https?:\/\/)?suf\.purs\.gov\.rs\/v\/?\?\S+/i;

/** The verification link in a scanned QR code or pasted text, as https; null when it isn't a Serbian fiscal receipt. */
export function verificationUrl(text: string): string | null {
  const match = LINK.exec(text.trim());
  if (!match) return null;
  const afterScheme = match[0].includes('://')
    ? match[0].slice(match[0].indexOf('://') + 3)
    : match[0];
  const rest = afterScheme.replace(/["'>).,]+$/, '');
  return `https://${FISCAL_HOST}${rest.slice(FISCAL_HOST.length)}`;
}

/** The receipt's id inside the link (the `vl` value), used to spot the same receipt scanned twice. */
export function receiptKey(url: string): string {
  const afterVl = url.includes('vl=') ? url.slice(url.indexOf('vl=') + 3) : url;
  const [id = ''] = afterVl.split('&');
  return id.replace(/%2B/gi, '+').replace(/%2F/gi, '/').replace(/%3D/gi, '=');
}

/** "8.200,00" → 8200; "40,000" → 40; "1" → 1. Comma is the decimal mark when there is one. */
export function number(s: string): number | null {
  const t = s.trim().replace(/ /g, '');
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  return Number(normalized);
}

// ---------------------------------------------------------------- Cyrillic → Latin

const CYR: Record<string, string> = {
  А: 'A',
  Б: 'B',
  В: 'V',
  Г: 'G',
  Д: 'D',
  Ђ: 'Đ',
  Е: 'E',
  Ж: 'Ž',
  З: 'Z',
  И: 'I',
  Ј: 'J',
  К: 'K',
  Л: 'L',
  Љ: 'Lj',
  М: 'M',
  Н: 'N',
  Њ: 'Nj',
  О: 'O',
  П: 'P',
  Р: 'R',
  С: 'S',
  Т: 'T',
  Ћ: 'Ć',
  У: 'U',
  Ф: 'F',
  Х: 'H',
  Ц: 'C',
  Ч: 'Č',
  Џ: 'Dž',
  Ш: 'Š',
};

const isUpper = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase();

/** Serbian Cyrillic in Latin letters, so receipts read (and search) the same whichever script the shop prints; null stays null. */
export function latin(s: string | null | undefined): string | null {
  if (!s || s.trim() === '') return null;
  let out = '';
  [...s].forEach((c, i, chars) => {
    const upper = CYR[c];
    const lowerSource = CYR[c.toUpperCase()];
    if (upper !== undefined) {
      // "Љ" in an all-caps word reads "LJ", in a capitalized one "Lj".
      const next = chars[i + 1];
      out +=
        upper.length === 2 && next !== undefined && isUpper(next) ? upper.toUpperCase() : upper;
    } else if (lowerSource !== undefined && c === c.toLowerCase()) {
      out += lowerSource.toLowerCase();
    } else {
      out += c;
    }
  });
  return out.trim();
}

// ---------------------------------------------------------------- times

const pad = (n: number) => String(n).padStart(2, '0');

const belgrade = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Belgrade',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** The tax office's time (ISO, usually UTC) as Belgrade local time. */
export function sdcTime(s: string): string | null {
  const trimmed = s.trim();
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return null;
    const p = Object.fromEntries(belgrade.formatToParts(date).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  }
  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(trimmed);
  return local ? `${local[1]}-${local[2]}-${local[3]}T${local[4]}:${local[5]}:${local[6]}` : null;
}

/** "03.01.2023. 11:15:33" (as printed, Belgrade time). */
export function printedTime(s: string): string | null {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\.\s+(\d{1,2}):(\d{2}):(\d{2})$/.exec(
    s.trim().replace(/\s+/g, ' '),
  );
  if (!m) return null;
  return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}T${pad(Number(m[4]))}:${m[5]}:${m[6]}`;
}

// ---------------------------------------------------------------- buyer

const COMPANY_BUYER = /(?<!\d)(10|12):\s*(\d{9})(?!\d)/;

/**
 * The buyer's PIB when a receipt was issued to a company. The buyer id is "<type>:<number>":
 * 10 = PIB, 12 = PIB with a public-sector code; other types (11 = JMBG, 20 = ID card,
 * passports, …) are a person, so null.
 */
export function companyTin(buyerId: string): string | null {
  return COMPANY_BUYER.exec(buyerId)?.[2] ?? null;
}

/** The buyer PIB in a receipt's printed text (for receipts saved before buyers were read). */
export function buyerTinIn(journal: string): string | null {
  const line = journal
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^(ИД купца:|ID kupca:)/i.test(l));
  return line ? companyTin(line) : null;
}

// ---------------------------------------------------------------- the printed text

const LETTERS =
  'A-Za-z\\u0400-\\u04FF\\u0110\\u0111\\u010C\\u010D\\u0106\\u0107\\u017D\\u017E\\u0160\\u0161';
const ITEM_NUMBERS =
  /^\s*(-?[\d.]+,\d+|-?\d+(?:\.\d+)?)\s+(-?[\d.]+(?:,\d+)?)\s+(-?[\d.]+,\d+|-?\d+(?:\.\d+)?)\s*$/;

/** Drops a leading GTIN ("8600…/") and splits off a trailing unit ("/KOM", "/L"). */
function splitName(raw: string): [string, string | null] {
  let s = raw
    .trim()
    .replace(/^\d{6,14}\s*\/\s*/, '')
    .replace(/\s+/g, ' ');
  let unit: string | null = null;
  const m = new RegExp(`\\s*/\\s*([${LETTERS}]{1,4})\\s*$`).exec(s);
  if (m) {
    s = s.slice(0, m.index);
    unit = latin(m[1])?.toUpperCase() ?? null;
  }
  return [latin(s.trim()) ?? s.trim(), unit];
}

/** The items between the "Назив Цена Кол. Укупно" header and the next dashed line: name line(s), then price, quantity, total. */
export function journalItems(lines: readonly string[]): ReceiptItemData[] {
  const start = lines.findIndex((l) => /Назив|Naziv/i.test(l) && /Укупно|Ukupno/i.test(l));
  if (start < 0) return [];
  const out: ReceiptItemData[] = [];
  let name = '';
  for (const l of lines.slice(start + 1)) {
    const t = l.trim();
    if (t.startsWith('---') || t.startsWith('===')) break;
    if (t === '') continue;
    const m = ITEM_NUMBERS.exec(l);
    if (m && name !== '') {
      const raw = name.trim();
      const vat = /\(([^()]{1,2})\)\s*$/.exec(raw)?.[1] ?? null;
      const [clean, unit] = splitName(raw.replace(/\s*\([^()]{1,2}\)\s*$/, ''));
      out.push({
        name: clean,
        quantity: number(m[2] ?? '') ?? 1,
        unitPrice: number(m[1] ?? '') ?? 0,
        total: number(m[3] ?? '') ?? 0,
        unit,
        vat,
      });
      name = '';
    } else {
      name = name === '' ? t : `${name} ${t}`;
    }
  }
  return out;
}

const PAYMENT_LABELS: [string[], string][] = [
  [['Платна картица:', 'Platna kartica:'], 'Card'],
  [['Готовина:', 'Gotovina:'], 'Cash'],
  [['Инстант плаћање:', 'Instant plaćanje:', 'Instant placanje:'], 'Instant payment'],
  [['Пренос на рачун:', 'Prenos na račun:', 'Prenos na racun:'], 'Bank transfer'],
  [['Ваучер:', 'Vaučer:', 'Vaucer:'], 'Voucher'],
  [['Чек:', 'Ček:'], 'Cheque'],
  [['Друго безготовинско плаћање:', 'Drugo bezgotovinsko plaćanje:'], 'Other'],
];

const PAYMENT_TYPES: Record<number, string> = {
  1: 'Cash',
  2: 'Card',
  3: 'Cheque',
  4: 'Bank transfer',
  5: 'Voucher',
  6: 'Instant payment',
};

const startsWithCI = (text: string, prefix: string) =>
  text.toLowerCase().startsWith(prefix.toLowerCase());

/** Fields and items from the receipt as printed (Cyrillic or Latin labels). */
export function parseJournal(base: ReceiptData, journal: string): ReceiptData {
  const lines = journal.replace(/\r\n/g, '\n').split('\n');
  const field = (...labels: string[]): string | null => {
    for (const l of lines) {
      const t = l.trim();
      const label = labels.find((x) => startsWithCI(t, x));
      if (label) {
        const rest = t.slice(label.length).trim();
        if (rest !== '') return rest;
      }
    }
    return null;
  };
  const refund = lines.some((l) => /РЕФУНДАЦИЈА|REFUNDACIJA/i.test(l));
  const rawTotal = field('Укупан износ:', 'Ukupan iznos:');
  const total = rawTotal === null ? null : number(rawTotal);
  const payments = PAYMENT_LABELS.filter(([labels]) =>
    labels.some((label) => lines.some((l) => startsWithCI(l.trim(), label))),
  ).map(([, name]) => name);
  const pfrTime = field('ПФР време:', 'PFR vreme:');
  const buyer = field('ИД купца:', 'ID kupca:');
  const items = journalItems(lines);
  return {
    ...base,
    company: latin(field('Предузеће:', 'Preduzeće:', 'Preduzece:')) ?? base.company,
    shop: latin(field('Место продаје:', 'Mesto prodaje:')) ?? base.shop,
    address: latin(field('Адреса:', 'Adresa:')) ?? base.address,
    city: latin(field('Општина:', 'Opština:', 'Opstina:')) ?? base.city,
    tin: field('ПИБ:', 'PIB:') ?? base.tin,
    total: total !== null ? (refund ? -Math.abs(total) : total) : base.total,
    time: (pfrTime !== null ? printedTime(pfrTime) : null) ?? base.time,
    invoiceNumber:
      field('ПФР број рачуна:', 'PFR broj računa:', 'PFR broj racuna:') ?? base.invoiceNumber,
    refund,
    payment: payments.length > 0 ? payments.join(', ') : base.payment,
    items: items.length > 0 ? items : base.items,
    journal,
    buyerTin: base.ownerManual
      ? base.buyerTin
      : ((buyer !== null ? companyTin(buyer) : null) ?? base.buyerTin),
  };
}

// ---------------------------------------------------------------- the HTML page

function unescapeHtml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

export function parseHtml(base: ReceiptData, html: string): ReceiptData | null {
  const span = (id: string): string | null => {
    const m = new RegExp(`id="${id}"[^>]*>([^<]*)<`).exec(html);
    const text = m?.[1] !== undefined ? unescapeHtml(m[1]).trim() : '';
    return text === '' ? null : text;
  };
  const preMatch = /<pre[^>]*>([\s\S]*?)<\/pre>/.exec(html);
  const journalText = preMatch?.[1] !== undefined ? unescapeHtml(preMatch[1]).trim() : '';
  const journal = journalText === '' ? null : journalText;
  const rawTotal = span('totalAmountLabel');
  const total = rawTotal === null ? null : number(rawTotal);
  if (journal === null && total === null) return null;
  const r = journal !== null ? parseJournal(base, journal) : base;
  const time = span('sdcDateTimeLabel');
  const buyer = span('buyerIdLabel');
  return {
    ...r,
    status: 'ok',
    company: latin(span('shopFullNameLabel')) ?? r.company,
    tin: span('tinLabel') ?? r.tin,
    total: total !== null ? (r.refund ? -Math.abs(total) : total) : r.total,
    time: (time !== null ? printedTime(time) : null) ?? r.time,
    invoiceNumber: span('invoiceNumberLabel') ?? r.invoiceNumber,
    journal: journal ?? r.journal,
    buyerTin: base.ownerManual
      ? base.buyerTin
      : ((buyer !== null ? companyTin(buyer) : null) ?? r.buyerTin),
    error: null,
  };
}

// ---------------------------------------------------------------- the JSON answer

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const obj = (o: Json | null, k: string): Json | null => {
  const v = o?.[k];
  return isObject(v) ? v : null;
};
const str = (o: Json | null, k: string): string | null => {
  const v = o?.[k];
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return null;
  const t = String(v).trim();
  return t === '' || t === 'null' ? null : t;
};
const num = (o: Json | null, k: string): number | null => {
  const v = o?.[k];
  if (typeof v === 'number') return v;
  return typeof v === 'string' ? number(v) : null;
};

function jsonItem(o: Json): ReceiptItemData | null {
  const name = str(o, 'name');
  if (name === null) return null;
  const [clean, unit] = splitName(name);
  const labels = o.labels;
  const first = Array.isArray(labels) ? labels[0] : undefined;
  return {
    name: clean,
    quantity: num(o, 'quantity') ?? 1,
    unitPrice: num(o, 'unitPrice') ?? 0,
    total: num(o, 'totalAmount') ?? 0,
    unit,
    vat: typeof first === 'string' ? first : null,
  };
}

export function parseJson(base: ReceiptData, body: string): ReceiptData | null {
  let root: unknown;
  try {
    root = JSON.parse(body);
  } catch {
    return null;
  }
  if (!isObject(root)) return null;
  const req = obj(root, 'invoiceRequest');
  const res = obj(root, 'invoiceResult');
  const journal = str(root, 'journal') ?? str(res, 'journal');
  if (req === null && res === null && journal === null) return null;
  if (root.isValid === false && res === null) {
    return { ...base, status: 'failed', error: "The tax office doesn't know this receipt." };
  }
  const fromText = journal !== null ? parseJournal(base, journal) : base;
  const rawItems = Array.isArray(req?.items) ? (req.items as unknown[]) : [];
  const items = rawItems.flatMap((i) => (isObject(i) ? (jsonItem(i) ?? []) : []));
  const rawPayments = Array.isArray(req?.payments) ? (req.payments as unknown[]) : [];
  const payments = rawPayments.flatMap((p) => {
    const type = isObject(p) ? p.paymentType : undefined;
    return typeof type === 'number' ? [PAYMENT_TYPES[type] ?? 'Other'] : [];
  });
  const transactionType = req?.transactionType;
  const refund = typeof transactionType === 'number' ? transactionType === 1 : fromText.refund;
  const rawTotal = num(res, 'totalAmount') ?? fromText.total;
  const total = rawTotal !== null && refund ? -Math.abs(rawTotal) : rawTotal;
  const sdc = str(res, 'sdcTime');
  const buyer = str(req, 'buyer');
  const payment = [...new Set(payments)].join(', ');
  return {
    ...fromText,
    status: 'ok',
    company: latin(str(req, 'businessName') ?? str(res, 'businessName')) ?? fromText.company,
    shop: latin(str(req, 'locationName') ?? str(res, 'locationName')) ?? fromText.shop,
    address: latin(str(req, 'address') ?? str(res, 'address')) ?? fromText.address,
    city:
      latin(str(req, 'district') ?? str(res, 'district') ?? str(req, 'administrativeUnit')) ??
      fromText.city,
    tin: str(req, 'taxId') ?? str(res, 'tin') ?? fromText.tin,
    total,
    time: (sdc !== null ? sdcTime(sdc) : null) ?? fromText.time,
    invoiceNumber: str(res, 'invoiceNumber') ?? fromText.invoiceNumber,
    refund,
    payment: payment !== '' ? payment : fromText.payment,
    items: items.length > 0 ? items : fromText.items,
    journal: journal ?? fromText.journal,
    buyerTin: base.ownerManual
      ? base.buyerTin
      : ((buyer !== null ? companyTin(buyer) : null) ?? fromText.buyerTin),
    error: null,
  };
}

/** `base` filled from the tax office's answer (JSON or the HTML page); null when `body` holds no receipt. */
export function parseReceipt(base: ReceiptData, body: string): ReceiptData | null {
  const t = body.trim();
  return t.startsWith('{') ? parseJson(base, t) : parseHtml(base, t);
}
