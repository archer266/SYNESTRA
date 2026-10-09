/** Curated from butterchurn-presets 2.4.7 (MIT). Creator credits retained. */
export const milkdropPresets=[
  {
    "id": "aurora",
    "name": "Geiss - Aurora",
    "description": "Flowing color"
  },
  {
    "id": "galaxy",
    "name": "Geiss - 3 layers (Rayleigh Scattering Mix)",
    "description": "Cosmic patterns"
  },
  {
    "id": "liquid",
    "name": "Flexi, martin + geiss - dedicated to the sherwin maxawow",
    "description": "Liquid motion"
  },
  {
    "id": "crystal",
    "name": "Flexi - mindblob mix",
    "description": "Energetic geometry"
  }
] as const;
export type PresetId=typeof milkdropPresets[number]['id'];
export const isPreset=(value:unknown):value is PresetId=>milkdropPresets.some(p=>p.id===value);
