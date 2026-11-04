// Serbian loyalty programs (pure, tested in card-brands.test.ts): the colors and motif of each
// program's card, matched on the name a card was given. Drawn by Hive from these numbers; no
// artwork is copied or downloaded.

import { latin } from './fiscal-parse';

export type CardStyle =
  'plain' | 'dots' | 'stripes' | 'cross' | 'x' | 'waves' | 'rings' | 'grid' | 'shine';

export type CardBrand = {
  name: string;
  /** The card's two colors as 0xRRGGBB (a program's own colors are data, not theme tokens). */
  color: number;
  color2: number;
  style: CardStyle;
  /** A light card gets dark text. */
  light: boolean;
};

type Rule = { pattern: RegExp; brand: CardBrand };

const brand = (
  pattern: RegExp,
  name: string,
  color: number,
  color2: number = color,
  style: CardStyle = 'plain',
  light = false,
): Rule => ({ pattern, brand: { name, color, color2, style, light } });

// The more specific patterns come first.
const rules: Rule[] = [
  // Groceries and drugstores
  brand(/SUPER ?KARTICA/, 'SuperKartica', 0x1d3fd6, 0x0b1f8f, 'grid'),
  brand(/LIDL/, 'Lidl Plus', 0xf4f6fa, 0xdce6f5, 'dots', true),
  brand(/DR\.? ?MAX/, 'Dr. Max', 0xe2231a, 0xb5121b, 'waves'),
  brand(/\bMAXI\b/, 'Moj Maxi', 0xf5f5f5, 0xe9e9e9, 'plain', true),
  brand(/\bDIS\b/, 'DIS Naša kartica', 0xe30613, 0x9e0b14, 'stripes'),
  brand(/\bIDEA\b/, 'Idea', 0xe30613, 0xb0101a, 'stripes'),
  brand(/\bVERO\b/, 'Vero klub', 0xe30613, 0x0e8a3e, 'stripes'),
  brand(/UNIVEREXPORT/, 'Univerexport bonus kartica', 0xf2f7ec, 0xd9ecc6, 'dots', true),
  brand(/METRO/, 'Metro klub prijatelja', 0xffe600, 0x003d7c, 'stripes'),
  brand(/\bDM\b|MOJ ?DM/, 'moj dm', 0xffe9a6, 0xc9e7f5, 'waves', true),
  brand(/LILLY/, 'Lilly Drogerie', 0x1ea0e6, 0x0b79c4, 'dots'),
  brand(/BENU/, 'Benu Plus', 0xe5007e, 0xb0005f, 'cross'),
  brand(/CVEJI[CĆ]/, 'Cvejić Apoteka', 0x00843d, 0x005a2a, 'cross'),
  brand(/FILLY/, 'Apoteka Filly Farm', 0x5db534, 0x2e8b1e, 'cross'),
  brand(/GALEN/, 'Galen Pharm', 0x5b3e91, 0x3a2766, 'cross'),
  brand(/JANKOVI[CĆ]/, 'Apoteka Janković', 0xf2b33d, 0xe08e12, 'cross'),
  brand(/BODY ?SHOP/, 'The Body Shop Love Your Body', 0x004236, 0x0b2620, 'waves'),
  brand(/L'?OCCITANE/, "L'Occitane", 0xe3a21a, 0x9c6b0e, 'shine'),
  brand(/GOLDEN BEAUTY/, 'Golden Beauty Shop', 0xf4c7c3, 0xe9a9a3, 'shine', true),
  // Books, toys, games
  brand(/VULKAN/, 'Vulkan klub', 0xe2231a, 0xa3141b, 'x'),
  brand(/LAGUNA/, 'Laguna klub čitalaca', 0xc8102e, 0x8e0b20, 'waves'),
  brand(/CICIBAN/, 'Ciciban klub', 0xe31e3c, 0xb01430, 'dots'),
  brand(/GAMES/, 'GameS Privilege', 0xf7c600, 0x1f5fd6, 'grid'),
  brand(/GAME ?CENTAR/, 'Game Centar Klan', 0x2a2a2a, 0xf08a1c, 'grid'),
  brand(/CRAFT/, 'Crafter Craftica', 0xf08a1c, 0xd45f0b, 'stripes'),
  brand(/ĐAK|\bDAK\b|\bSPOT\b/, 'Đak & Spot', 0xd7262e, 0x5a0e12, 'shine'),
  // Clothes, shoes, sport
  brand(/SPORT ?& ?BONUS|SPORTANDBONUS/, 'Sport&Bonus', 0x3a3a3a, 0x161616, 'shine'),
  brand(/SPORT ?VISION/, 'Sport Vision', 0x2a2a2a, 0x111111),
  brand(/SPORTINA/, 'Sportina club', 0xc9b8e8, 0x7b5ea7, 'grid'),
  brand(/TREF/, 'Tref Sport VIP klub', 0x3a3a3a, 0x1c1c1c, 'stripes'),
  brand(/UNDER ARMOUR|KVANTUM/, 'Under Armour Kvantum Plus', 0x2a2a2a, 0x0e0e0e, 'grid'),
  brand(/OFFICE ?SHOES/, 'Office Shoes', 0xd8b46a, 0xa7843e, 'shine', true),
  brand(/SHOESTAR/, 'Shoestar', 0x1f1f1f, 0x0a0a0a, 'shine'),
  brand(/PLANIKA/, 'Planika club', 0xd9dce1, 0xaeb3ba, 'shine', true),
  brand(/LINDEX/, 'Lindex More', 0x111111, 0x000000, 'rings'),
  brand(/TERRANOVA/, 'Terranova WE', 0x1a1a1a, 0x3a2a1a),
  brand(/H ?& ?M/, 'H&M Member', 0xf2ede4, 0xe4dccd, 'plain', true),
  brand(/PEEK/, 'Peek&Cloppenburg', 0x0a2a5e, 0x051737),
  brand(/\bOVS\b/, 'OVS', 0x0b1b3a, 0x050d1e),
  brand(/ORSAY/, 'Orsay club', 0x111111, 0x2a2a2a),
  brand(/P\.? ?S\.? ?FASHION/, 'P.S. Fashion Premium Club', 0x2a2a2a, 0x141414, 'shine'),
  brand(/EXTREME INTIMO/, 'Extreme Intimo', 0x2a2323, 0x140f0f, 'shine'),
  brand(/MANUAL ?CO/, 'Manual Co', 0x8b4a2b, 0x4a2414, 'rings'),
  // Home, tech, optics
  brand(/GIGATRON/, 'Gigatron baš tvoja', 0x141414, 0xf5c400, 'shine'),
  brand(/IKEA/, 'IKEA Family', 0x0058a3, 0xffdb00, 'stripes'),
  brand(/EMMEZETA/, 'Emmezeta klub', 0x8b1a7e, 0x5a0f52, 'rings'),
  brand(/SIMPO/, 'Simpo', 0xa51e22, 0x6e1215, 'stripes'),
  brand(/LESNINA|XXXL/, 'Lesnina XXXL', 0xe30613, 0xffe500, 'stripes'),
  brand(/WOBY/, 'Woby kartica', 0x0b5db5, 0x073c78, 'grid'),
  brand(/OKOV/, 'OKOV posto kartica', 0xf5f7fa, 0xdde6f2, 'waves', true),
  brand(/FORMA IDEALE/, 'Forma Ideale', 0x1f4ca1, 0x12306b, 'stripes'),
  brand(/OPTIPLAZA/, 'Optiplaza klub', 0x2a2a2a, 0x161616),
  brand(/SANI ?OPTIK/, 'Sani Optik', 0x7a8288, 0x545a5f, 'rings'),
  // Fuel
  brand(/\bMOL\b/, 'MOL Move', 0xf5f5f5, 0xc9a227, 'shine', true),
  brand(/OMV/, 'OMV MyStation', 0x0a3d8f, 0x06275c),
  brand(/LUKOIL/, 'Lukoil', 0xf5f5f5, 0xe2231a, 'x', true),
  brand(/KNEZ ?PETROL/, 'Knez Petrol', 0xd7262e, 0xededed, 'waves'),
  brand(/\bPETROL\b/, 'Petrol zlatna kartica', 0xe9cf7a, 0xc09a3e, 'shine', true),
  brand(/\bNIS\b|SA NAMA/, 'NIS Sa nama', 0x0057a8, 0xe2231a, 'waves'),
  // Malls, food, the rest
  brand(/ADA ?MALL/, 'Ada Mall Loyalty Club', 0x6a2c91, 0x1fb5a8, 'waves'),
  brand(/GALERIJA/, 'Galerija Beograd', 0xf5f5f5, 0xe3e3e3, 'rings', true),
  brand(/MC ?DONALD/, "My McDonald's Rewards", 0xffffff, 0xffc72c, 'plain', true),
  brand(/SRBIJA ?VOZ|SRB ?PLUS/, 'Srbija Voz SRB PLUS', 0x00539f, 0xe2231a, 'stripes'),
  brand(/AKSA/, 'Aksa', 0x1ea0e6, 0xe5007e, 'dots'),
  brand(/BAZEN/, 'Kartica za bazen', 0x1e3f8b, 0x4fa3e0, 'waves'),
  brand(/PENZION/, 'Penzionerska kartica', 0xf0f2f5, 0x1e4c9a, 'stripes', true),
  brand(/ZDRAVSTVEN/, 'Kartica zdravstvenog osiguranja', 0xe4e8df, 0xbfc9b5, 'waves', true),
];

/** The program a card's name points at, or null. */
export function findBrand(name: string): CardBrand | null {
  const text = (latin(name) ?? name).toUpperCase().trim();
  if (text === '') return null;
  return rules.find((rule) => rule.pattern.test(text))?.brand ?? null;
}

/** `0xRRGGBB` as `#rrggbb`. */
export const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** `color` moved `amount` (0 to 1) of the way to black. */
export function shade(color: number, amount: number): number {
  const channel = (shift: number) => Math.round(((color >> shift) & 0xff) * (1 - amount));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** A card's number as its last four digits, e.g. "•••• 3931"; nothing for a short number. */
export const maskedNumber = (number: string): string =>
  number.length > 4 ? `•••• ${number.slice(-4)}` : '';

/** The text color on a card: near-black on a light card, white on a dark one. */
export const inkOf = (light: boolean): number => (light ? 0x1c1c1e : 0xffffff);

export type CardLook = {
  brand: string | null;
  from: string;
  to: string;
  ink: string;
  style: CardStyle;
};

/** How a card is drawn: its program's look, else a gradient of the color the card was given. */
export function cardLook(name: string, fallback: string): CardLook {
  const found = findBrand(name);
  if (found) {
    const to = found.color2 === found.color ? shade(found.color, 0.3) : found.color2;
    return {
      brand: found.name,
      from: hex(found.color),
      to: hex(to),
      ink: hex(inkOf(found.light)),
      style: found.style,
    };
  }
  const base = parseInt(fallback.slice(1), 16);
  return {
    brand: null,
    from: fallback,
    to: hex(shade(base, 0.3)),
    ink: hex(inkOf(false)),
    style: 'plain',
  };
}

/** Up to two capital letters for a card's badge: "Lidl Plus" is "LP", "Idea" is "I". */
export function initialsOf(name: string): string {
  const words = (latin(name) ?? name).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** Programs to offer while a name is typed: those whose name or pattern the text matches. */
export function suggestBrands(query: string, limit = 5): CardBrand[] {
  const text = (latin(query) ?? query).toUpperCase().trim();
  if (text.length < 2) return [];
  const hits = rules.filter(
    ({ pattern, brand: { name } }) =>
      pattern.test(text) || (latin(name) ?? name).toUpperCase().includes(text),
  );
  return hits.map((rule) => rule.brand).slice(0, limit);
}
