export const colors = {
  olive: {
    DEFAULT: '#3B3D2A',
    mid: '#5A5E3E',
    soft: '#8B9063',
    pale: '#C8CC9E',
    wash: '#EEF0E0',
  },
  navy: {
    DEFAULT: '#1A2744',
    mid: '#253660',
    soft: '#4A6090',
    pale: '#B8C8E0',
    wash: '#EDF1F8',
  },
  gold: {
    DEFAULT: '#B8860B',
    mid: '#D4A017',
    deep: '#8E6806',
    pale: '#F0DC82',
    wash: '#FBF5DC',
  },
  crimson: {
    DEFAULT: '#8B1A1A',
    deep: '#631212',
    soft: '#C44040',
    wash: '#FAEAEA',
  },
  stone: {
    DEFAULT: '#F4F2EC',
    mid: '#E8E4D8',
    deep: '#CCC8BC',
    wash: '#F9F8F4',
  },
  ink: {
    DEFAULT: '#1C1C18',
    2: '#3A3A34',
    3: '#6A6A60',
    4: '#9A9A8E',
  },
  white: '#FDFCF8',
};

export const semanticColors = {
  text: colors.ink[2],
  textHeading: colors.ink.DEFAULT,
  background: colors.stone.DEFAULT,
  border: colors.stone.deep,
  accent: colors.navy.DEFAULT,
};

export const radius = {
  base: 6,
  lg: 10,
};

export const typography = {
  families: {
    ui: 'NotoSans-Regular',
    display: 'NotoSans-Bold',
    mono: 'NotoSansMono-Regular',
  }
};
