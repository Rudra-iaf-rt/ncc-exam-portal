# Phase 2: Design System Extraction

## Color Palette
Extracted from `index.css`. All colors are mapped to their hex values for 1:1 translation.

### Olive (Primary/Brand)
- `olive`: `#3B3D2A`
- `olive-mid`: `#5A5E3E`
- `olive-soft`: `#8B9063`
- `olive-pale`: `#C8CC9E`
- `olive-wash`: `#EEF0E0`

### Navy (Accent/Information)
- `navy`: `#1A2744`
- `navy-mid`: `#253660`
- `navy-soft`: `#4A6090`
- `navy-pale`: `#B8C8E0`
- `navy-wash`: `#EDF1F8`

### Gold (Warning/Highlight)
- `gold`: `#B8860B`
- `gold-mid`: `#D4A017`
- `gold-deep`: `#8E6806`
- `gold-pale`: `#F0DC82`
- `gold-wash`: `#FBF5DC`

### Crimson (Error/Destructive)
- `crimson`: `#8B1A1A`
- `crimson-deep`: `#631212`
- `crimson-soft`: `#C44040`
- `crimson-wash`: `#FAEAEA`

### Stone (Backgrounds/Surfaces)
- `stone`: `#F4F2EC` (Main App Background)
- `stone-mid`: `#E8E4D8`
- `stone-deep`: `#CCC8BC` (Borders)
- `stone-wash`: `#F9F8F4`

### Ink (Typography)
- `ink`: `#1C1C18` (Primary Text)
- `ink-2`: `#3A3A34` (Secondary Text)
- `ink-3`: `#6A6A60`
- `ink-4`: `#9A9A8E`

### Semantic Aliases
- `text`: `ink-2`
- `text-h`: `ink`
- `bg`: `stone`
- `border`: `stone-deep`
- `accent`: `navy`

## Typography
- **Families:** 
  - UI & Display: `Noto Sans`
  - Mono: `Noto Sans Mono`
- *Note:* React Native will require `expo-font` to load these from Google Fonts or local assets.
- **Scale:** Uses standard Tailwind spacing (sm, md, lg, xl, 2xl) overlaid with custom line heights.

## Spacing & Radius
- **Border Radius:** 
  - Base (`--r`): `6px`
  - Large (`--rl`): `10px`
- **Spacing:** standard tailwind, with a custom override for `--spacing-12` (`3rem`).

## Shadows / Elevation
- React Native will need a mapped elevation system since CSS Box Shadow doesn't translate 1:1 on Android.

## Iconography
- Uses `lucide-react`.
- *Action:* We will use `lucide-react-native` to ensure identical iconography.

*A corresponding `theme.ts` file has been created.*
