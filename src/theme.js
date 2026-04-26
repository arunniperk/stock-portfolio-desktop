// ── NVIDIA-STYLE THEME ────────────────────────────────────────────────────────
export const mkT = (dark = true) => dark ? {
  bg:       '#0a0a0a',
  sidebar:  '#111111',
  surface:  '#161616',
  surface2: '#1c1c1c',
  surface3: '#222222',
  surface4: '#2a2a2a',
  border:   '#2a2a2a',
  border2:  '#333333',
  text:     '#ffffff',
  text2:    '#a0a0a0',
  text3:    '#606060',
  accent:   '#76b900',
  accentDim:'#4a7500',
  accentBg: 'rgba(118,185,0,.10)',
  accentBg2:'rgba(118,185,0,.05)',
  success:  '#76b900',
  successBg:'rgba(118,185,0,.12)',
  danger:   '#f44336',
  dangerBg: 'rgba(244,67,54,.12)',
  warning:  '#ff9800',
  warnBg:   'rgba(255,152,0,.12)',
  cyan:     '#00b4d8',
  inColor:  '#ff9800',
  usColor:  '#00b4d8',
  r:        8,
  dark:     true,
} : {
  bg:       '#f5f5f5',
  sidebar:  '#1a1a1a',
  surface:  '#ffffff',
  surface2: '#f9f9f9',
  surface3: '#f0f0f0',
  surface4: '#e8e8e8',
  border:   '#e0e0e0',
  border2:  '#d0d0d0',
  text:     '#111111',
  text2:    '#555555',
  text3:    '#999999',
  accent:   '#76b900',
  accentDim:'#5a8e00',
  accentBg: 'rgba(118,185,0,.10)',
  accentBg2:'rgba(118,185,0,.05)',
  success:  '#388e3c',
  successBg:'rgba(56,142,60,.10)',
  danger:   '#d32f2f',
  dangerBg: 'rgba(211,47,47,.10)',
  warning:  '#f57c00',
  warnBg:   'rgba(245,124,0,.10)',
  cyan:     '#0077b6',
  inColor:  '#f57c00',
  usColor:  '#0077b6',
  r:        8,
  dark:     false,
};

export const PIE = ['#76b900','#00b4d8','#ff9800','#f44336','#9c27b0','#2196f3','#00bcd4','#ff5722','#8bc34a','#03a9f4','#cddc39','#ffc107','#e91e63','#00acc1','#7cb342'];
export const PORT_COLORS = ['#76b900','#00b4d8','#ff9800','#f44336','#9c27b0','#2196f3','#00bcd4','#ff5722'];

export const DEF_H = [
  {id:1,symbol:'RELIANCE.NS',name:'Reliance Industries',qty:10,unpledgedQty:null,buyPrice:2800},
  {id:2,symbol:'TCS.NS',name:'TCS',qty:5,unpledgedQty:null,buyPrice:3500},
  {id:3,symbol:'INFY.NS',name:'Infosys',qty:20,unpledgedQty:null,buyPrice:1400},
  {id:4,symbol:'VEDL.NS',name:'Vedanta',qty:50,unpledgedQty:null,buyPrice:280},
  {id:5,symbol:'AAPL',name:'Apple Inc.',qty:3,unpledgedQty:null,buyPrice:160},
  {id:6,symbol:'MSFT',name:'Microsoft Corp.',qty:2,unpledgedQty:null,buyPrice:280},
];
export const DEF_T = {1:3200,2:4000,3:1800,5:220,6:450};
export const DEF_PF = [{id:1,name:'Main Portfolio',holdings:DEF_H,targets:DEF_T}];

export const TWEAK_DEF = {darkMode:true,autoRefreshMins:5,compactRows:false,showCharts:true,glowIntensity:60};
