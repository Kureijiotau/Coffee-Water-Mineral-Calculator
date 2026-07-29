export interface SharedWater {
  id: number;
  name: string;
  ions: Record<string, number>;
  metadata?: {
    tds?: number;
    ph?: number;
  };
  shared: "yes" | "no";
  createdAt: string;
}

/**
 * Built-in catalog used when the separately deployed API cannot reach the
 * database. Keeping the shared catalog in the API bundle makes the public
 * calculator reliable without requiring a Vercel database migration.
 */
export const SHARED_WATERS: SharedWater[] = [
  {
    id: 22,
    name: "Ilıca (Afyon Ilıca) — madensulari.com",
    ions: { sodium: 210, calcium: 55, sulfate: 16, chloride: 72, magnesium: 19, potassium: 7, bicarbonate: 680 },
    metadata: { tds: 1060, ph: 6.6 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:13.065Z",
  },
  {
    id: 21,
    name: "Avoya (Kınık Mg) — madensulari.com",
    ions: { sodium: 18.8, calcium: 26.8, sulfate: 20, chloride: 10, magnesium: 122, potassium: 1.8, bicarbonate: 770 },
    metadata: { tds: 970, ph: 6.5 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:12.971Z",
  },
  {
    id: 20,
    name: "Fresa / İnişdibi (Giresun) — madensulari.com",
    ions: { sodium: 22, calcium: 52, sulfate: 22, chloride: 14, magnesium: 30, potassium: 4.5, bicarbonate: 320 },
    metadata: { tds: 465, ph: 7.2 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:12.882Z",
  },
  {
    id: 19,
    name: "Akmina (Bolvadin) — madensulari.com",
    ions: { sodium: 40, calcium: 393, sulfate: 5, chloride: 9.5, magnesium: 28.8, potassium: 8.2, bicarbonate: 1383 },
    metadata: { tds: 1870, ph: 6.6 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:12.788Z",
  },
  {
    id: 18,
    name: "Özkaynak (Eskişehir) — madensulari.com",
    ions: { sodium: 13.9, calcium: 34.6, sulfate: 20, chloride: 12, magnesium: 25.2, potassium: 1.2, bicarbonate: 270 },
    metadata: { tds: 385, ph: 7.1 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:12.716Z",
  },
  {
    id: 17,
    name: "Kınık (Afyon Kınık) — madensulari.com",
    ions: { sodium: 332, calcium: 102, sulfate: 35, chloride: 80, magnesium: 60, potassium: 22.8, bicarbonate: 1500 },
    metadata: { tds: 1750, ph: 6.4 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:12.622Z",
  },
  {
    id: 16,
    name: "Avşar (Afyonkarahisar) — madensulari.com",
    ions: { sodium: 151, calcium: 10.8, sulfate: 8, chloride: 55, magnesium: 0.7, potassium: 19.3, bicarbonate: 370 },
    metadata: { tds: 620, ph: 6.5 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:12.535Z",
  },
  {
    id: 15,
    name: "Sarıkız (Manisa Alaşehir) — madensulari.com",
    ions: { sodium: 11.7, calcium: 16.7, sulfate: 15, chloride: 10, magnesium: 12.4, potassium: 1.1, bicarbonate: 140 },
    metadata: { tds: 220, ph: 7.0 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:12.367Z",
  },
  {
    id: 14,
    name: "Sırma (Uludağ/İzmit) — madensulari.com",
    ions: { sodium: 85, calcium: 65.2, sulfate: 14, chloride: 30, magnesium: 22.3, potassium: 10.7, bicarbonate: 420 },
    metadata: { tds: 650, ph: 6.9 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:12.272Z",
  },
  {
    id: 13,
    name: "Uludağ (Keşiş Dağı) — madensulari.com",
    ions: { sodium: 37, calcium: 153, sulfate: 14, chloride: 65, magnesium: 15.7, potassium: 5.6, bicarbonate: 295 },
    metadata: { tds: 600, ph: 7.0 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:12.189Z",
  },
  {
    id: 12,
    name: "Bögert (Erzincan / Ekşisu) — madensulari.com",
    ions: { sodium: 20, calcium: 114, sulfate: 171, chloride: 25, magnesium: 533, potassium: 3, bicarbonate: 2550 },
    metadata: { tds: 3400, ph: 6.0 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:12.083Z",
  },
  {
    id: 11,
    name: "Kızılay Erzincan (Erzincan) — madensulari.com",
    ions: { sodium: 109, calcium: 40.6, sulfate: 4.4, chloride: 124, magnesium: 317, potassium: 4.5, bicarbonate: 1318 },
    metadata: { tds: 1920, ph: 6.2 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:11.991Z",
  },
  {
    id: 10,
    name: "Kızılay (Gazlıgöl / Afyon) — madensulari.com",
    ions: { sodium: 776, calcium: 50, sulfate: 22, chloride: 135, magnesium: 17, potassium: 11, bicarbonate: 2470 },
    metadata: { tds: 3480, ph: 6.3 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:11.812Z",
  },
  {
    id: 9,
    name: "Beypazarı (Beypazarı) — madensulari.com",
    ions: { sodium: 178, calcium: 48, sulfate: 18, chloride: 61, magnesium: 14, potassium: 8, bicarbonate: 530 },
    metadata: { tds: 870, ph: 6.8 },
    shared: "yes",
    createdAt: "2026-07-28T03:34:11.244Z",
  },
  {
    id: 8,
    name: "Perrier",
    ions: { sodium: 9.6, calcium: 150, sulfate: 25.3, chloride: 19.5, magnesium: 3.9, bicarbonate: 420 },
    shared: "yes",
    createdAt: "2026-07-28T01:58:37.721Z",
  },
  {
    id: 7,
    name: "evian",
    ions: { sodium: 6.5, calcium: 80, sulfate: 14, magnesium: 26, potassium: 1, bicarbonate: 360 },
    shared: "yes",
    createdAt: "2026-07-28T01:56:49.474Z",
  },
  {
    id: 6,
    name: "Solán de Cabras",
    ions: { sodium: 4.8, calcium: 60, magnesium: 26.7, potassium: 1, bicarbonate: 284 },
    shared: "yes",
    createdAt: "2026-07-27T01:05:07.951Z",
  },
  {
    id: 5,
    name: "Solan De Cabras",
    ions: { sodium: 4.8, calcium: 60, magnesium: 26.7, potassium: 1, bicarbonate: 284 },
    shared: "no",
    createdAt: "2026-07-26T12:23:28.513Z",
  },
];