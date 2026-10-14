/** Curated from butterchurn-presets 2.4.7 (MIT). Creator credits retained. */
export const milkdropPresets=[
  {
    "id": "aurora",
    "name": "Geiss - Aurora",
    "description": "Flowing color",
    "label": "Aurora"
  },
  {
    "id": "galaxy",
    "name": "Geiss - 3 layers (Rayleigh Scattering Mix)",
    "description": "Cosmic patterns",
    "label": "Cosmic layers"
  },
  {
    "id": "liquid",
    "name": "Flexi, martin + geiss - dedicated to the sherwin maxawow",
    "description": "Liquid motion",
    "label": "Liquid color"
  },
  {
    "id": "kaleidoscope",
    "name": "Cope - Passage (mandala mix)",
    "description": "Nested mandala and recursive symmetry",
    "label": "Kaleidoscope"
  },
  {
    "id": "tunnel",
    "name": "bdrv, flexi + martin - ultramix #380 [shiny tunnel derivative mix]",
    "description": "Reflective twisting tunnel",
    "label": "Chrome tunnel"
  },
  {
    "id": "ribbons",
    "name": "Eo.S. + Geiss - glowsticks v2 03 music shifter edit b (Psychedelic Mix)",
    "description": "Electric oscillating filaments",
    "label": "Psychedelic glowsticks"
  },
  {
    "id": "starburst",
    "name": "Eo.S. - starburst 01",
    "description": "Radial rhythmic starburst",
    "label": "Starburst"
  },
  {
    "id": "dream",
    "name": "Aderrasi - Causeway of Dreams (Point Mix)",
    "description": "Slow color spiral with a fine dancing trace",
    "label": "Spiral dreams"
  },
  {
    "id": "reaction",
    "name": "Geiss - Reaction Diffusion (Puddle Mix)",
    "description": "Organic liquid cells",
    "label": "Reaction pools"
  },
  {
    "id": "crystal",
    "name": "Flexi - mindblob mix",
    "description": "Energetic geometry",
    "label": "Mindblob geometry"
  }
] as const;
export type PresetId=typeof milkdropPresets[number]['id'];
export const isPreset=(value:unknown):value is PresetId=>milkdropPresets.some(p=>p.id===value);
