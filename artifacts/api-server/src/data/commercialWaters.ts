import type { SharedWater } from "./sharedWaters";

/**
 * Commercial and unusual waters imported from the reviewed research batch.
 * Keep this list separate from the older community/imported fallback entries.
 */
export const COMMERCIAL_WATERS: SharedWater[] = [
  // Source: user-provided Berain bottle label image, scanned and cross-checked with Gemini.
  { id: 79, name: "Berain", ions: { sodium: 17, potassium: 5, magnesium: 3, calcium: 22, chloride: 35, sulfate: 9, bicarbonate: 50 }, metadata: { tds: 155, ph: 8 }, shared: "yes", createdAt: "2026-09-12T00:00:00.000Z" },
  // Source: Sources ALMA, https://www.sources-alma.com/en/our-brands/mineral-water/brand-st-yorre/
  { id: 75, name: "St. Yorre", ions: { sodium: 1708, potassium: 110, magnesium: 11, calcium: 90, chloride: 322, sulfate: 174, bicarbonate: 4368 }, metadata: { tds: 4774 }, shared: "yes", createdAt: "2026-09-07T00:00:00.000Z" },
  // Source: Sources ALMA, https://www.sources-alma.com/en/our-brands/mineral-water/vichy-celestins/
  { id: 76, name: "Vichy Célestins", ions: { sodium: 1172, potassium: 66, magnesium: 10, calcium: 103, chloride: 235, sulfate: 138, bicarbonate: 2989 }, metadata: { tds: 3325 }, shared: "yes", createdAt: "2026-09-07T00:00:00.000Z" },
  // Source: Tŷ Nant, https://tynant.com/water-analysis/; bicarbonate cross-checked against the published analysis at https://finewaters.com/bottled-waters-of-the-world/uk/ty-nant
  { id: 77, name: "Ty Nant", ions: { sodium: 22, potassium: 1, magnesium: 11.5, calcium: 22.5, chloride: 14, sulfate: 3.7, bicarbonate: 116 }, metadata: { tds: 165 }, shared: "yes", createdAt: "2026-09-07T00:00:00.000Z" },
  // Source: Brecon Carreg, https://www.breconwater.co.uk/; composition published on the product label at https://aqua-amore.com/products/brecon-carreg-still-plastic-bottle-121-5l
  { id: 78, name: "Brecon Carreg", ions: { sodium: 5, potassium: 0.5, magnesium: 15, calcium: 55, chloride: 9, sulfate: 9, bicarbonate: 225 }, metadata: { tds: 210 }, shared: "yes", createdAt: "2026-09-07T00:00:00.000Z" },
  { id: 49, name: "Contrex", ions: { calcium: 468, magnesium: 74, sodium: 9.4, potassium: 2.8, bicarbonate: 372, chloride: 7.6, sulfate: 1121 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 50, name: "Courmayeur", ions: { calcium: 576, magnesium: 53, sodium: 1.2, bicarbonate: 151, chloride: 0.5, sulfate: 1420 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 51, name: "Aqua Carpatica (Naturally Sparkling)", ions: { calcium: 286, magnesium: 89, sodium: 5.3, potassium: 1, bicarbonate: 1281, chloride: 19, sulfate: 20 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 52, name: "Volvic", ions: { calcium: 12, magnesium: 8, sodium: 12, potassium: 6, bicarbonate: 74, chloride: 15, sulfate: 9 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 53, name: "Mountain Valley Spring Water", ions: { calcium: 67, magnesium: 7.1, sodium: 3.2, potassium: 1.2, bicarbonate: 220, chloride: 2.2, sulfate: 6.7 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 54, name: "Hildon", ions: { calcium: 97, magnesium: 1.7, sodium: 7.7, potassium: 1.4, bicarbonate: 330, chloride: 16, sulfate: 4 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 55, name: "Vittel", ions: { calcium: 240, magnesium: 42, sodium: 5.2, potassium: 2, bicarbonate: 384, chloride: 11, sulfate: 400 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 56, name: "San Pellegrino", ions: { calcium: 164, magnesium: 49.5, sodium: 31, potassium: 2.2, bicarbonate: 243, chloride: 49, sulfate: 402 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 57, name: "Zaros", ions: { calcium: 45, magnesium: 16, sodium: 2, potassium: 1, bicarbonate: 160, chloride: 4, sulfate: 10 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 58, name: "Wattwiller", ions: { calcium: 35, magnesium: 11, sodium: 0, potassium: 0.5, bicarbonate: 135, chloride: 4, sulfate: 24 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 59, name: "Orezza", ions: { calcium: 185, magnesium: 16.5, sodium: 6.9, potassium: 1.5, bicarbonate: 710, chloride: 10, sulfate: 14 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 60, name: "Donat Mg", ions: { calcium: 380, magnesium: 1000, sodium: 1500, bicarbonate: 7800, chloride: 66, sulfate: 2100 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 61, name: "Borsec", ions: { calcium: 325, magnesium: 113, sodium: 72, bicarbonate: 1600, chloride: 25, sulfate: 18 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 62, name: "Fiji", ions: { calcium: 18, magnesium: 15, sodium: 18, potassium: 4.9, bicarbonate: 153, chloride: 9, sulfate: 2 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 63, name: "Spa Reine", ions: { calcium: 5, magnesium: 2, sodium: 3, potassium: 0.5, bicarbonate: 15, chloride: 5, sulfate: 4 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 64, name: "Highland Spring", ions: { calcium: 40.5, magnesium: 10.1, sodium: 5.6, potassium: 0.7, bicarbonate: 150, chloride: 6.1, sulfate: 5.3 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 65, name: "Devin Spring", ions: { calcium: 5.7, magnesium: 1.6, sodium: 5.5, potassium: 0.5, bicarbonate: 31, chloride: 2.7, sulfate: 2.3 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 66, name: "Antipodes", ions: { calcium: 3, magnesium: 2, sodium: 11, potassium: 2, bicarbonate: 35, chloride: 9, sulfate: 4 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 67, name: "Mg Mivela", ions: { calcium: 22, magnesium: 343, sodium: 120, bicarbonate: 2000, chloride: 12, sulfate: 20 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 68, name: "Voss", ions: { calcium: 5, magnesium: 1, sodium: 6, bicarbonate: 20, chloride: 12, sulfate: 5 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 69, name: "Lanjaron", ions: { calcium: 13.9, magnesium: 3.9, sodium: 6.9, bicarbonate: 108, chloride: 13, sulfate: 13 }, shared: "yes", createdAt: "2026-08-25T00:00:00.000Z" },
  { id: 70, name: "Aquafina", ions: { sodium: 3, sulfate: 86, chloride: 1.3, magnesium: 20, bicarbonate: 1.3 }, shared: "yes", createdAt: "2026-08-24T11:53:23.156Z" },
  { id: 71, name: "Arwa", ions: { sodium: 2, sulfate: 63.2, chloride: 0.5, magnesium: 16.8, potassium: 8, bicarbonate: 15 }, shared: "yes", createdAt: "2026-08-24T11:51:26.697Z" },
  { id: 72, name: "Sama", ions: { sodium: 16.8, calcium: 20.3, sulfate: 15.9, chloride: 20.7, magnesium: 16.1, potassium: 1.6 }, shared: "yes", createdAt: "2026-08-24T11:48:54.143Z" },
  { id: 73, name: "Nawa", ions: { sodium: 33, calcium: 52, sulfate: 24, chloride: 54, magnesium: 24, potassium: 1.2, bicarbonate: 223 }, shared: "yes", createdAt: "2026-08-24T11:46:59.136Z" },
  { id: 74, name: "Donat", ions: { sodium: 1700, calcium: 380, sulfate: 2100, chloride: 75, magnesium: 1000, bicarbonate: 7800 }, shared: "yes", createdAt: "2026-08-10T15:26:45.513Z" },
];