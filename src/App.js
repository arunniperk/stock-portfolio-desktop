import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';

// ── ERROR BOUNDARY ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(e){return{error:e};}
  componentDidCatch(e,info){console.error('Portfolio Manager error:',e,info);}
  render(){
    if(!this.state.error)return this.props.children;
    const T=this.props.theme||{bg:'#0a0a0a',surface:'#161616',surface2:'#1c1c1c',text:'#fff',text2:'#a0a0a0',text3:'#606060',accent:'#76b900',danger:'#f44336',border:'#2a2a2a',r:8};
    return(
      <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg,flexDirection:'column',gap:16,padding:32}}>
        <div style={{width:56,height:56,borderRadius:12,background:'rgba(244,67,54,.15)',border:'1px solid rgba(244,67,54,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>⚠</div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:18,fontWeight:700,color:T.text,marginBottom:6}}>Something went wrong</div>
          <div style={{fontSize:13,color:T.text3,marginBottom:16,maxWidth:400,lineHeight:1.6}}>{this.state.error?.message||'An unexpected error occurred.'}</div>
          <button onClick={()=>this.setState({error:null})}
            style={{padding:'8px 20px',background:T.accent,border:'none',borderRadius:T.r,color:'#000',fontWeight:700,cursor:'pointer',fontSize:13}}>
            Try Again
          </button>
          <button onClick={()=>window.location.reload()}
            style={{padding:'8px 20px',background:'transparent',border:`1px solid ${T.border}`,borderRadius:T.r,color:T.text2,fontWeight:600,cursor:'pointer',fontSize:13,marginLeft:8}}>
            Reload App
          </button>
        </div>
        <details style={{maxWidth:500,width:'100%'}}>
          <summary style={{fontSize:11,color:T.text3,cursor:'pointer',marginBottom:6}}>Technical details</summary>
          <pre style={{fontSize:10,color:T.text3,background:T.surface2,padding:12,borderRadius:6,overflow:'auto',maxHeight:200,border:`1px solid ${T.border}`}}>
            {this.state.error?.stack||'No stack trace'}
          </pre>
        </details>
      </div>
    );
  }
}


// ── NVIDIA-STYLE THEME ────────────────────────────────────────────────────────
const mkT = (dark = true) => dark ? {
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

const PIE = ['#76b900','#00b4d8','#ff9800','#f44336','#9c27b0','#2196f3','#00bcd4','#ff5722','#8bc34a','#03a9f4','#cddc39','#ffc107','#e91e63','#00acc1','#7cb342'];
const PORT_COLORS = ['#76b900','#00b4d8','#ff9800','#f44336','#9c27b0','#2196f3','#00bcd4','#ff5722'];

// ── DEFAULTS ──────────────────────────────────────────────────────────────────
const DEF_H = [
  {id:1,symbol:'RELIANCE.NS',name:'Reliance Industries',qty:10,unpledgedQty:null,buyPrice:2800},
  {id:2,symbol:'TCS.NS',name:'TCS',qty:5,unpledgedQty:null,buyPrice:3500},
  {id:3,symbol:'INFY.NS',name:'Infosys',qty:20,unpledgedQty:null,buyPrice:1400},
  {id:4,symbol:'VEDL.NS',name:'Vedanta',qty:50,unpledgedQty:null,buyPrice:280},
  {id:5,symbol:'AAPL',name:'Apple Inc.',qty:3,unpledgedQty:null,buyPrice:160},
  {id:6,symbol:'MSFT',name:'Microsoft Corp.',qty:2,unpledgedQty:null,buyPrice:280},
];
const DEF_T = {1:3200,2:4000,3:1800,5:220,6:450};
const DEF_PF = [{id:1,name:'Main Portfolio',holdings:DEF_H,targets:DEF_T}];

// ── AI PROVIDERS ──────────────────────────────────────────────────────────────
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_URL = key =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

async function callGroq(apiKey, prompt) {
  if (!apiKey) throw new Error('No Groq key');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
    body: JSON.stringify({model:GROQ_MODEL,messages:[{role:'user',content:prompt}],temperature:0.3,max_tokens:1024}),
  });
  if (!res.ok) {const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
  return (await res.json())?.choices?.[0]?.message?.content||'';
}

async function callGemini(apiKey, prompt) {
  if (!apiKey) throw new Error('No Gemini key');
  const res = await fetch(GEMINI_URL(apiKey), {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:1024}}),
  });
  if (!res.ok) {const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text||'';
}

async function callAI(groqKey, geminiKey, primary, prompt) {
  const order = primary==='groq'
    ? [{key:groqKey,fn:callGroq,name:'Groq'},{key:geminiKey,fn:callGemini,name:'Gemini'}]
    : [{key:geminiKey,fn:callGemini,name:'Gemini'},{key:groqKey,fn:callGroq,name:'Groq'}];
  let lastErr;
  for (const {key,fn,name} of order) {
    if (!key) continue;
    try {return {text:await fn(key,prompt),usedProvider:name};} catch(e){lastErr=e;}
  }
  throw lastErr||new Error('No AI provider configured');
}

function extractJSON(text) {
  try {
    const m=text.match(/```(?:json)?\s*([\s\S]*?)```/)||text.match(/(\{[\s\S]*\})/);
    return m?JSON.parse(m[1].trim()):JSON.parse(text.trim());
  } catch {return null;}
}

const TWEAK_DEF = {darkMode:true,autoRefreshMins:5,compactRows:false,showCharts:true,glowIntensity:60};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const isUS    = s => !s.endsWith('.NS') && !s.endsWith('.BO');
const short   = s => s.replace('.NS','').replace('.BO','');
const fmtQty  = v => v==null?'—':parseFloat(v.toFixed(8)).toString();
const fmt     = (v,cur='INR') => {
  if(v==null||isNaN(v))return'—';
  return(cur==='USD'?'$':'₹')+Math.abs(v).toLocaleString(cur==='USD'?'en-US':'en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
};
// Show USD value + INR equivalent: "$1,234.56  ≈ ₹1,02,345"
const fmtDual = (v, fx) => {
  if(v==null||isNaN(v)||!fx) return fmt(v,'USD');
  const sign=v>=0?'+':'−';
  const abs=Math.abs(v);
  const usd=`${sign}$${abs.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const inr=`₹${(abs*fx).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
  return `${usd}  ≈ ${inr}`;
};

const fmtBig = (v,cur='INR') => {
  if(v==null||isNaN(v))return'—';
  const s=cur==='USD'?'$':'₹';
  if(Math.abs(v)>=1e12)return`${s}${(v/1e12).toFixed(2)}T`;
  if(Math.abs(v)>=1e9) return`${s}${(v/1e9).toFixed(2)}B`;
  if(Math.abs(v)>=1e7) return`${s}${(v/1e7).toFixed(2)}Cr`;
  if(Math.abs(v)>=1e5) return`${s}${(v/1e5).toFixed(2)}L`;
  return fmt(v,cur);
};
const fmtPct  = v => v==null||isNaN(v)?'—':`${v>=0?'+':''}${v.toFixed(2)}%`;
const gColor  = (v,T) => v==null||isNaN(v)?T.text2:v>=0?T.success:T.danger;
const sortRows = (rows,col,dir) => [...rows].sort((a,b)=>{
  let va=a[col],vb=b[col];
  if(va==null&&vb==null)return 0;if(va==null)return dir==='asc'?1:-1;if(vb==null)return dir==='asc'?-1:1;
  if(typeof va==='string')va=va.toLowerCase();if(typeof vb==='string')vb=vb.toLowerCase();
  return dir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0);
});

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Ic = {
  Plus:     ()=><svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><line x1="12"y1="5"x2="12"y2="19"/><line x1="5"y1="12"x2="19"y2="12"/></svg>,
  Trash:    ()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  Refresh:  ({s})=><span style={{display:'inline-flex',width:13,height:13,flexShrink:0,willChange:s?'transform':'auto'}}><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"style={{animation:s?'spin .8s linear infinite':'none',transformOrigin:'center',display:'block'}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></span>,
  Download: ()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12"y1="15"x2="12"y2="3"/></svg>,
  Upload:   ()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12"y1="3"x2="12"y2="15"/></svg>,
  Search:   ()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="11"cy="11"r="8"/><line x1="21"y1="21"x2="16.65"y2="16.65"/></svg>,
  Pencil:   ()=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Check:    ()=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  X:        ()=><svg width="11"height="11"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><line x1="18"y1="6"x2="6"y2="18"/><line x1="6"y1="6"x2="18"y2="18"/></svg>,
  Moon:     ()=><svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Sun:      ()=><svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="5"/><line x1="12"y1="1"x2="12"y2="3"/><line x1="12"y1="21"x2="12"y2="23"/><line x1="4.22"y1="4.22"x2="5.64"y2="5.64"/><line x1="18.36"y1="18.36"x2="19.78"y2="19.78"/><line x1="1"y1="12"x2="3"y2="12"/><line x1="21"y1="12"x2="23"y2="12"/><line x1="4.22"y1="19.78"x2="5.64"y2="18.36"/><line x1="18.36"y1="5.64"x2="19.78"y2="4.22"/></svg>,
  ChevD:    ()=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevU:    ()=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>,
  Settings: ()=><svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Chart:    ()=><svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><line x1="18"y1="20"x2="18"y2="10"/><line x1="12"y1="20"x2="12"y2="4"/><line x1="6"y1="20"x2="6"y2="14"/><line x1="2"y1="20"x2="22"y2="20"/></svg>,
  Portfolio:()=><svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><rect x="2"y="7"width="20"height="14"rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12"y1="12"x2="12"y2="16"/><line x1="10"y1="14"x2="14"y2="14"/></svg>,
  India:    ()=><svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="10"/><line x1="2"y1="12"x2="22"y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  US:       ()=><svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="10"/><line x1="2"y1="12"x2="22"y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Target:   ()=><svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="10"/><circle cx="12"cy="12"r="6"/><circle cx="12"cy="12"r="2"/></svg>,
  Minimize: ()=><svg width="11"height="11"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><line x1="5"y1="12"x2="19"y2="12"/></svg>,
  Maximize: ()=><svg width="10"height="10"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><rect x="3"y="3"width="18"height="18"rx="1"/></svg>,
  Update:   ()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
  Alert:    ()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="10"/><line x1="12"y1="8"x2="12"y2="12"/><line x1="12"y1="16"x2="12.01"y2="16"/></svg>,
  File:     ()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  LineChart:()=><svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
};

// ── NV BUTTON ─────────────────────────────────────────────────────────────────
const NvBtn = ({children,onClick,variant='ghost',disabled,style:sx={}}) => {
  const [h,sH]=useState(false);
  const base={display:'inline-flex',alignItems:'center',gap:6,border:'none',cursor:disabled?'not-allowed':'pointer',
    fontFamily:'inherit',fontSize:12,fontWeight:600,letterSpacing:'.02em',
    transition:'background .12s, color .12s, border-color .12s',
    borderRadius:6,padding:'7px 14px',opacity:disabled?.4:1,flexShrink:0,...sx};
  const vs={
    primary:{background:h?'#8fd000':'#76b900',color:'#000'},
    ghost:{background:h?'rgba(255,255,255,.08)':'transparent',color:h?'#fff':'#a0a0a0',border:'1px solid #333'},
    danger:{background:h?'rgba(244,67,54,.2)':'rgba(244,67,54,.1)',color:'#f44336',border:'1px solid rgba(244,67,54,.3)'},
  };
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{...base,...vs[variant]}}>{children}</button>;
};

// ── NV INPUT ──────────────────────────────────────────────────────────────────
const NvInput = ({value,onChange,onKeyDown,onFocus:onFocusProp,onBlur:onBlurProp,placeholder,type='text',style:sx={},autoFocus,T}) => {
  const [f,sF]=useState(false);
  return <input autoFocus={autoFocus} type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder}
    onFocus={e=>{sF(true);onFocusProp&&onFocusProp(e);}} onBlur={e=>{sF(false);onBlurProp&&onBlurProp(e);}}
    style={{padding:'8px 12px',background:T.surface3,border:`1px solid ${f?T.accent:T.border2}`,borderRadius:6,
      color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit',
      transition:'border-color .15s',caretColor:T.accent,...sx}}/>;
};

// ── BADGE ─────────────────────────────────────────────────────────────────────
const Badge = ({val,pct,currency,T,size='sm'}) => {
  if(val==null||isNaN(val))return<span style={{color:T.text3,fontSize:size==='sm'?11:13}}>—</span>;
  const pos=val>=0,col=pos?T.success:T.danger,bg=pos?T.successBg:T.dangerBg;
  return<span style={{display:'inline-flex',alignItems:'center',padding:size==='sm'?'2px 7px':'3px 10px',background:bg,
    color:col,fontSize:size==='sm'?11:13,fontWeight:700,borderRadius:4,whiteSpace:'nowrap'}}>
    {pct?fmtPct(val):`${pos?'+':'−'}${fmt(Math.abs(val),currency)}`}
  </span>;
};

// ── SORT HEADER ───────────────────────────────────────────────────────────────
function SortTh({label,col,sort,onSort,T,right=false,minW,sticky=false}) {
  const active=sort.col===col,[h,sH]=useState(false);
  return<th onClick={()=>onSort(col)} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{padding:'10px 12px',background:T.surface2,borderBottom:`1px solid ${T.border}`,
      color:active?T.accent:h?T.text2:T.text3,fontSize:11,fontWeight:600,whiteSpace:'nowrap',
      cursor:'pointer',userSelect:'none',textAlign:right?'right':'left',minWidth:minW,
      transition:'color .12s',position:sticky?'sticky':'static',left:sticky?0:'auto',zIndex:sticky?2:1}}>
    <span style={{display:'flex',alignItems:'center',gap:4,justifyContent:right?'flex-end':'flex-start'}}>
      {label}{active?<span style={{color:T.accent,opacity:.8}}>{sort.dir==='asc'?<Ic.ChevU/>:<Ic.ChevD/>}</span>:<span style={{opacity:.2}}><Ic.ChevD/></span>}
    </span>
  </th>;
}

// ── TARGET CELL ───────────────────────────────────────────────────────────────
function TargetCell({id,target,curPrice,currency,onSave,T,compact=false}) {
  const [edit,setEdit]=useState(false);const [val,setVal]=useState(target!=null?String(target):'');
  const save=()=>{const n=parseFloat(val);onSave(id,isNaN(n)?null:n);setEdit(false);};
  const up=(target!=null&&curPrice!=null)?((target-curPrice)/curPrice)*100:null;
  const col=up==null?T.text3:up>=20?T.success:up>=0?'#8fd000':up>=-10?T.warning:T.danger;
  if(edit)return(
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      <NvInput autoFocus type="number" value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape')setEdit(false);}} placeholder="Target" T={T} style={{width:90,padding:'4px 8px'}}/>
      <button onClick={save} style={{background:'none',border:'none',cursor:'pointer',color:T.accent,padding:2,display:'flex'}}><Ic.Check/></button>
      <button onClick={()=>setEdit(false)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:2,display:'flex'}}><Ic.X/></button>
    </div>
  );
  return(
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <span style={{fontSize:12,fontWeight:600,color:col,fontStyle:target==null?'italic':'normal',opacity:target==null?.5:1}}>{target!=null?fmt(target,currency):'Set target'}</span>
        <button onClick={()=>{setVal(target!=null?String(target):'');setEdit(true);}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:2,display:'flex',opacity:.6,transition:'opacity .1s'}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity='.6'}><Ic.Pencil/></button>
        {target!=null&&<button onClick={()=>onSave(id,null)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:2,display:'flex',opacity:.4,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.opacity=1;e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.opacity='.4';e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
      </div>
      {!compact&&up!=null&&<span style={{fontSize:10,fontWeight:700,color:col}}>{up>=0?'▲':'▼'} {Math.abs(up).toFixed(1)}% {up>=0?'upside':'downside'}</span>}
    </div>
  );
}

// ── UNPLEDGED QTY CELL ────────────────────────────────────────────────────────
function UnpledgedQtyCell({id,unpledgedQty,totalQty,onSave,T}) {
  const [edit,setEdit]=useState(false);const [val,setVal]=useState(unpledgedQty!=null?String(unpledgedQty):'');
  const save=()=>{const n=parseFloat(val);onSave(id,isNaN(n)||n<0?null:Math.min(n,totalQty));setEdit(false);};
  const pledged=unpledgedQty!=null?totalQty-unpledgedQty:null;
  const pctFree=unpledgedQty!=null&&totalQty?(unpledgedQty/totalQty)*100:null;
  const col=pctFree==null?T.text3:pctFree>=80?T.success:pctFree>=50?T.warning:T.danger;
  if(edit)return(
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      <NvInput autoFocus type="number" value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape')setEdit(false);}} placeholder={`0–${fmtQty(totalQty)}`} T={T} style={{width:90,padding:'4px 8px'}}/>
      <button onClick={save} style={{background:'none',border:'none',cursor:'pointer',color:T.accent,padding:2,display:'flex'}}><Ic.Check/></button>
      <button onClick={()=>setEdit(false)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:2,display:'flex'}}><Ic.X/></button>
    </div>
  );
  return(
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <span style={{fontSize:12,fontWeight:600,color:col,fontStyle:unpledgedQty==null?'italic':'normal',opacity:unpledgedQty==null?.5:1}}>{unpledgedQty!=null?fmtQty(unpledgedQty):'—'}</span>
        <button onClick={()=>{setVal(unpledgedQty!=null?String(unpledgedQty):'');setEdit(true);}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:2,display:'flex',opacity:.6,transition:'opacity .1s'}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity='.6'}><Ic.Pencil/></button>
        {unpledgedQty!=null&&<button onClick={()=>onSave(id,null)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:2,display:'flex',opacity:.4,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.opacity=1;e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.opacity='.4';e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
      </div>
      {pledged!=null&&<span style={{fontSize:10,color:T.text3}}>{fmtQty(pledged)} pledged · {pctFree.toFixed(0)}% free</span>}
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({label,value,sub,valueColor,T}) {
  return(
    <div style={{background:T.surface2,borderRadius:T.r,padding:'16px 18px',border:`1px solid ${T.border}`}}>
      <div style={{fontSize:11,color:T.text3,fontWeight:500,marginBottom:8,textTransform:'uppercase',letterSpacing:'.06em'}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,color:valueColor||T.text,lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:valueColor||T.text3,marginTop:4,fontWeight:600}}>{sub}</div>}
    </div>
  );
}

// ── SVG PRICE CHART ───────────────────────────────────────────────────────────
function PriceChart({history,buyPrice,analystTarget,currency,T}) {
  const [hover,setHover]=useState(null);const svgRef=useRef();
  if(!history||history.length<2)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:180,color:T.text3,fontSize:12}}>
      Loading chart data…
    </div>
  );
  const VW=800,VH=200,PAD={t:16,r:16,b:36,l:64};
  const W=VW-PAD.l-PAD.r,H=VH-PAD.t-PAD.b;
  const closes=history.map(d=>d.close);
  const allP=[...closes];if(buyPrice)allP.push(buyPrice);if(analystTarget)allP.push(analystTarget);
  const minP=Math.min(...allP)*.985,maxP=Math.max(...allP)*1.015,range=maxP-minP||1;
  const xOf=i=>PAD.l+(i/(history.length-1))*W;
  const yOf=p=>PAD.t+H-((p-minP)/range)*H;
  const linePath=history.map((d,i)=>`${i===0?'M':'L'}${xOf(i).toFixed(1)},${yOf(d.close).toFixed(1)}`).join(' ');
  const areaPath=linePath+` L${xOf(history.length-1).toFixed(1)},${(PAD.t+H)} L${PAD.l},${PAD.t+H} Z`;
  const isUp=closes[closes.length-1]>=closes[0],lc=isUp?T.success:T.danger;
  const handleMM=e=>{
    if(!svgRef.current)return;
    const rect=svgRef.current.getBoundingClientRect();
    const svgX=((e.clientX-rect.left)/rect.width)*VW;
    const i=Math.max(0,Math.min(history.length-1,Math.round(((svgX-PAD.l)/W)*(history.length-1))));
    setHover({i,...history[i]});
  };
  const yTicks=4;
  const yL=Array.from({length:yTicks},(_,i)=>{const p=minP+(range/(yTicks-1))*i;return{y:yOf(p),label:fmt(p,currency)};}).reverse();
  const xStep=Math.max(1,Math.floor(history.length/6));
  return(
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{width:'100%',height:'auto',display:'block',cursor:'crosshair'}} onMouseMove={handleMM} onMouseLeave={()=>setHover(null)}>
      <defs>
        <linearGradient id="nvg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lc} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={lc} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {yL.map((l,i)=><line key={i} x1={PAD.l} y1={l.y} x2={PAD.l+W} y2={l.y} stroke={T.border} strokeWidth="0.5"/>)}
      <path d={areaPath} fill="url(#nvg)"/>
      <path d={linePath} fill="none" stroke={lc} strokeWidth="1.5"/>
      {buyPrice&&buyPrice>=minP&&buyPrice<=maxP&&<>
        <line x1={PAD.l} y1={yOf(buyPrice)} x2={PAD.l+W} y2={yOf(buyPrice)} stroke={T.warning} strokeWidth="1" strokeDasharray="5 3" opacity=".7"/>
        <rect x={PAD.l+4} y={yOf(buyPrice)-11} width={76} height={10} fill={T.surface3} rx="2" opacity=".9"/>
        <text x={PAD.l+8} y={yOf(buyPrice)-2} fontSize={7} fill={T.warning} fontFamily="inherit" fontWeight="600">BUY {fmt(buyPrice,currency)}</text>
      </>}
      {analystTarget&&analystTarget>=minP&&analystTarget<=maxP&&<>
        <line x1={PAD.l} y1={yOf(analystTarget)} x2={PAD.l+W} y2={yOf(analystTarget)} stroke={T.accent} strokeWidth="1" strokeDasharray="5 3" opacity=".7"/>
        <rect x={PAD.l+4} y={yOf(analystTarget)-11} width={86} height={10} fill={T.surface3} rx="2" opacity=".9"/>
        <text x={PAD.l+8} y={yOf(analystTarget)-2} fontSize={7} fill={T.accent} fontFamily="inherit" fontWeight="600">TARGET {fmt(analystTarget,currency)}</text>
      </>}
      {yL.map((l,i)=><text key={i} x={PAD.l-6} y={l.y+4} fontSize={8} fill={T.text3} fontFamily="inherit" textAnchor="end">{l.label}</text>)}
      {history.filter((_,i)=>i%xStep===0||i===history.length-1).map((d,i)=>{const idx=history.indexOf(d);return<text key={i} x={xOf(idx)} y={PAD.t+H+14} fontSize={8} fill={T.text3} fontFamily="inherit" textAnchor="middle">{new Date(d.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</text>;})}
      {hover&&<>
        <line x1={xOf(hover.i)} y1={PAD.t} x2={xOf(hover.i)} y2={PAD.t+H} stroke={T.border2} strokeWidth="0.8"/>
        <circle cx={xOf(hover.i)} cy={yOf(hover.close)} r={4} fill={lc} stroke={T.surface} strokeWidth="2"/>
        <rect x={Math.min(xOf(hover.i)+8,VW-148)} y={PAD.t+2} width={140} height={68} rx={4} fill={T.surface2} stroke={T.border2} strokeWidth="0.8" opacity=".97"/>
        <text x={Math.min(xOf(hover.i)+14,VW-142)} y={PAD.t+14} fontSize={8} fill={T.text3} fontFamily="inherit">{new Date(hover.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</text>
        <text x={Math.min(xOf(hover.i)+14,VW-142)} y={PAD.t+28} fontSize={12} fill={T.text} fontFamily="inherit" fontWeight="700">{fmt(hover.close,currency)}</text>
        <text x={Math.min(xOf(hover.i)+14,VW-142)} y={PAD.t+42} fontSize={9} fill={hover.change>=0?T.success:T.danger} fontFamily="inherit" fontWeight="600">{hover.change>=0?'▲':'▼'} {Math.abs(hover.change||0).toFixed(2)}%</text>
        <text x={Math.min(xOf(hover.i)+14,VW-142)} y={PAD.t+56} fontSize={8} fill={T.text3} fontFamily="inherit">H:{fmt(hover.high,currency)} L:{fmt(hover.low,currency)}</text>
      </>}
    </svg>
  );
}

// ── STOCK DETAIL VIEW ─────────────────────────────────────────────────────────
function StockDetailView({symbol,holding,detail,prices,targets,onSaveTarget,onRefresh,onRangeChange,groqKey,geminiKey,primaryAI,aiAnalysis,onAIRefresh,T}) {
  const p=prices[symbol],currency=p?.currency||(isUS(symbol)?'USD':'INR'),curPrice=p?.current??null;
  const dayChange=p?((p.current-p.prev)/p.prev)*100:null;
  const invested=holding?holding.buyPrice*holding.qty:null;
  const curValue=curPrice!=null&&holding?curPrice*holding.qty:null;
  const gain=curValue!=null&&invested!=null?curValue-invested:null;
  const gainPct=gain!=null&&invested?gain/invested*100:null;
  const target=holding?targets[holding.id]??null:null;
  const sm=detail?.summary||{};
  const priceData=sm.price||{},stats=sm.summaryDetail||{},keyStats=sm.defaultKeyStatistics||{};
  const finData=sm.financialData||{},recTrend=sm.recommendationTrend?.trend?.[0]||{};
  const totalAna=(recTrend.strongBuy||0)+(recTrend.buy||0)+(recTrend.hold||0)+(recTrend.sell||0)+(recTrend.strongSell||0);
  const recKey=finData.recommendationKey||priceData.recommendationKey||null;
  const recColor=recKey==='strongBuy'||recKey==='buy'?T.success:recKey==='hold'?T.warning:T.danger;
  const history=detail?.history||[],loading=detail?.loading,curRange=detail?.range||'3mo';
  const RANGES=[{v:'1mo',l:'1M'},{v:'3mo',l:'3M'},{v:'6mo',l:'6M'},{v:'1y',l:'1Y'}];
  const START_DATE = new Date('2026-03-30').getTime();
  const dayRows=useMemo(()=>[...history]
    .filter(d=>d.date>=START_DATE)
    .reverse()
    .slice(0,60)
    .map(d=>({...d,dayPL:holding&&d.change!=null?(d.change/100)*d.close*holding.qty:null}))
  ,[history,holding]);
  const InfoRow=({l,v,vc})=><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}><span style={{color:T.text3}}>{l}</span><span style={{fontWeight:600,color:vc||T.text}}>{v}</span></div>;
  const tdS={padding:'9px 12px',borderBottom:`1px solid ${T.border}`,fontSize:12};
  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:20}}>
      {/* Header */}
      <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
            <div style={{width:40,height:40,background:isUS(symbol)?'rgba(0,180,216,.15)':'rgba(255,152,0,.15)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:isUS(symbol)?T.usColor:T.inColor}}>{short(symbol).slice(0,2)}</div>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:T.text,letterSpacing:'-.01em'}}>{short(symbol)}</div>
              <div style={{fontSize:12,color:T.text3}}>{holding?.name||symbol} · {isUS(symbol)?'NYSE/NASDAQ':'NSE/BSE'}</div>
            </div>
            {dayChange!=null&&<span style={{padding:'4px 10px',background:dayChange>=0?T.successBg:T.dangerBg,color:dayChange>=0?T.success:T.danger,borderRadius:6,fontSize:12,fontWeight:700}}>{dayChange>=0?'▲':'▼'} {Math.abs(dayChange).toFixed(2)}%</span>}
          </div>
          <div style={{fontSize:32,fontWeight:700,color:T.text,letterSpacing:'-.02em'}}>{curPrice!=null?fmt(curPrice,currency):<span style={{fontSize:18,color:T.text3}}>Loading…</span>}</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          {RANGES.map(r=><button key={r.v} onClick={()=>onRangeChange(symbol,r.v)} style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${curRange===r.v?T.accent:T.border2}`,background:curRange===r.v?T.accentBg:'transparent',color:curRange===r.v?T.accent:T.text2,cursor:'pointer',fontSize:12,fontWeight:600,transition:'all .12s'}}>{r.l}</button>)}
          <NvBtn onClick={onRefresh} T={T}><Ic.Refresh s={loading}/> {loading?'Loading…':'Refresh'}</NvBtn>
        </div>
      </div>
      {/* Chart */}
      <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,padding:'16px 12px 8px'}}>
        <PriceChart history={history} buyPrice={holding?.buyPrice??null} analystTarget={target} currency={currency} T={T}/>
        <div style={{display:'flex',gap:16,padding:'6px 8px',flexWrap:'wrap'}}>
          {holding?.buyPrice&&<span style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:T.warning}}><span style={{display:'inline-block',width:16,borderTop:`1px dashed ${T.warning}`}}/> Avg Buy Price</span>}
          {target&&<span style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:T.accent}}><span style={{display:'inline-block',width:16,borderTop:`1px dashed ${T.accent}`}}/> Analyst Target</span>}
        </div>
      </div>
      {/* ── Day-wise P&L Table ── */}
      <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden'}}>
        {/* Header */}
        <div style={{padding:'12px 18px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:3,height:18,background:T.accent,borderRadius:2}}/>
            <span style={{fontSize:14,fontWeight:700,color:T.text}}>Day-wise P&L</span>
            {dayRows.length>0&&<span style={{fontSize:11,color:T.text3,background:T.surface3,padding:'2px 8px',borderRadius:10}}>{dayRows.length} sessions</span>}
          </div>
          {dayRows.length>0&&(
            <div style={{display:'flex',gap:14,fontSize:11,alignItems:'center'}}>
              <span style={{color:T.success,fontWeight:600}}>▲ {dayRows.filter(d=>d.change>=0).length} up</span>
              <span style={{color:T.danger,fontWeight:600}}>▼ {dayRows.filter(d=>d.change<0).length} down</span>
              {holding&&(()=>{const tot=dayRows.reduce((s,d)=>s+(d.dayPL||0),0);return<span style={{fontWeight:700,color:gColor(tot,T),background:`${gColor(tot,T)}15`,padding:'2px 10px',borderRadius:20}}>{tot>=0?'+':'−'}{fmt(Math.abs(tot),currency)} total</span>;})()}
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading&&!dayRows.length&&(
          <div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>
            {[1,2,3,4,5].map(i=><div key={i} style={{height:32,borderRadius:6,background:T.surface3,animation:'pulse 1.5s infinite',opacity:1-(i*0.1)}}/>)}
          </div>
        )}

        {/* No data yet */}
        {!loading&&!dayRows.length&&(
          <div style={{padding:32,textAlign:'center',color:T.text3,fontSize:13}}>
            Click Refresh to load price history
          </div>
        )}

        {/* Bar chart */}
        {dayRows.length>0&&(()=>{
          const chartD=[...dayRows].reverse().slice(0,40);
          const vals=chartD.map(d=>holding&&d.dayPL!=null?d.dayPL:d.change).filter(v=>v!=null);
          const maxAbs=Math.max(...vals.map(Math.abs),1);
          const hasPL=holding&&chartD.some(d=>d.dayPL!=null);
          return(
            <div style={{padding:'14px 18px 10px',borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontSize:10,color:T.text3,marginBottom:8,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>
                {hasPL?`Your P&L — Last ${chartD.length} Sessions`:`Price Change % — Last ${chartD.length} Sessions`}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:1.5,height:64,position:'relative'}}>
                {/* Zero line */}
                <div style={{position:'absolute',top:'50%',left:0,right:0,height:1,background:T.border,zIndex:0}}/>
                {chartD.map((d,i)=>{
                  const val=hasPL?d.dayPL:d.change;
                  if(val==null)return<div key={i} style={{flex:1}}/>;
                  const pos=val>=0;
                  const barH=Math.max((Math.abs(val)/maxAbs)*28,2);
                  const dateStr=new Date(d.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
                  const valStr=hasPL?`${pos?'+':'−'}${fmt(Math.abs(val),currency)}`:fmtPct(val);
                  return(
                    <div key={i} style={{flex:1,height:64,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'default',position:'relative',zIndex:1}}
                      title={`${dateStr}: ${valStr}`}>
                      {/* Top half (positive) */}
                      <div style={{flex:1,display:'flex',alignItems:'flex-end',width:'100%',paddingBottom:1}}>
                        {pos&&<div style={{width:'100%',height:barH,background:T.success,borderRadius:'2px 2px 0 0',opacity:.85}}/>}
                      </div>
                      {/* Bottom half (negative) */}
                      <div style={{flex:1,display:'flex',alignItems:'flex-start',width:'100%',paddingTop:1}}>
                        {!pos&&<div style={{width:'100%',height:barH,background:T.danger,borderRadius:'0 0 2px 2px',opacity:.85}}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Table — full height, no maxHeight cap */}
        {dayRows.length>0&&(
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:T.surface3}}>
                  {['Date','Open','High','Low','Close','Change %','Day P&L','Cumulative P&L'].map((h,i)=>(
                    <th key={h} style={{...tdS,background:T.surface3,color:T.text3,fontSize:11,fontWeight:700,textAlign:i===0?'left':'right',position:'sticky',top:0,zIndex:2,padding:'10px 12px'}}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(()=>{
                  let cumPL=0;
                  return dayRows.map((d,i)=>{
                    const dayPL=d.dayPL??null;
                    if(dayPL!=null) cumPL+=dayPL;
                    const isUp=d.change>=0;
                    return(
                      <tr key={i}
                        style={{background:i%2===0?T.surface2:T.surface3,transition:'background .06s'}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surface4}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                        <td style={{...tdS,fontWeight:600,color:T.text}}>
                          {new Date(d.date).toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'2-digit'})}
                        </td>
                        <td style={{...tdS,textAlign:'right',color:T.text3}}>{fmt(d.open,currency)}</td>
                        <td style={{...tdS,textAlign:'right',color:T.success,fontWeight:600}}>{fmt(d.high,currency)}</td>
                        <td style={{...tdS,textAlign:'right',color:T.danger,fontWeight:600}}>{fmt(d.low,currency)}</td>
                        <td style={{...tdS,textAlign:'right',fontWeight:700,color:isUp?T.success:T.danger}}>{fmt(d.close,currency)}</td>
                        <td style={{...tdS,textAlign:'right'}}><Badge val={d.change} pct T={T}/></td>
                        <td style={{...tdS,textAlign:'right'}}>
                          {dayPL!=null?<Badge val={dayPL} currency={currency} T={T}/>
                          :<span style={{fontSize:11,color:T.text3,fontStyle:'italic'}}>not held</span>}
                        </td>
                        <td style={{...tdS,textAlign:'right'}}>
                          {holding&&dayPL!=null
                            ?<span style={{fontWeight:700,fontSize:12,color:gColor(cumPL,T)}}>{cumPL>=0?'+':'−'}{fmt(Math.abs(cumPL),currency)}</span>
                            :<span style={{color:T.text3}}>—</span>}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>


            {/* Stats Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>

        {/* Col 1 — Your Position + Analyst Target */}
        <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:isUS(symbol)?T.usColor:T.inColor,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Your Position</span>
          </div>
          <div style={{padding:'4px 16px 12px'}}>
            {holding?[
              {l:'Quantity',v:fmtQty(holding.qty)},
              {l:'Unpledged Qty',v:holding.unpledgedQty!=null?fmtQty(holding.unpledgedQty):'—',vc:holding.unpledgedQty!=null&&holding.unpledgedQty<holding.qty?T.warning:null},
              {l:'Avg Buy Price',v:fmt(holding.buyPrice,currency)},
              {l:'Invested',v:fmt(invested,currency)},
              {l:'Market Value',v:curValue!=null?fmt(curValue,currency):'—'},
              {l:'Unrealized P&L',v:gain!=null?`${gain>=0?'+':'−'}${fmt(Math.abs(gain),currency)}`:'—',vc:gColor(gain,T)},
              {l:'Return',v:gainPct!=null?fmtPct(gainPct):'—',vc:gColor(gainPct,T)},
              {l:"Day's P&L",v:dayChange!=null&&curValue!=null?`${dayChange>=0?'+':'−'}${fmt(Math.abs(dayChange/100*(curValue||0)),currency)}`:'—',vc:gColor(dayChange,T)},
            ].map(({l,v,vc},i)=><InfoRow key={i} l={l} v={v} vc={vc}/>)
            :<div style={{padding:'16px 0',color:T.text3,fontSize:12,textAlign:'center'}}>Not in portfolio</div>}
          </div>
          {/* Analyst Target — compact, inside position card */}
          <div style={{borderTop:`1px solid ${T.border}`,margin:'0 16px',paddingTop:10,paddingBottom:12}}>
            <div style={{fontSize:10,color:T.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Analyst Target</div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              {holding
                ?<TargetCell id={holding.id} target={target} curPrice={curPrice} currency={currency} onSave={onSaveTarget} T={T} compact/>
                :<span style={{fontSize:11,color:T.text3,fontStyle:'italic'}}>Not held</span>}
              {recKey&&<span style={{fontSize:11,fontWeight:700,color:recColor,marginLeft:'auto'}}>{recKey.replace(/([A-Z])/g,' $1').trim()}</span>}
            </div>
            {finData.targetMeanPrice&&<div style={{fontSize:10,color:T.text3,marginTop:4}}>
              Analyst mean: <b style={{color:T.text}}>{fmt(finData.targetMeanPrice,currency)}</b>
              {totalAna>0&&<span style={{marginLeft:8}}>{(recTrend.strongBuy||0)+(recTrend.buy||0)} Buy · {recTrend.hold||0} Hold · {(recTrend.sell||0)+(recTrend.strongSell||0)} Sell</span>}
            </div>}
          </div>
        </div>

        {/* Col 2 — Fundamentals */}
        <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.cyan,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Fundamentals</span>
          </div>
          <div style={{padding:'4px 16px 12px'}}>
            {[
              {l:'Market Cap',v:fmtBig(priceData.marketCap,currency)},
              {l:'P/E (TTM)',v:stats.trailingPE!=null?Number(stats.trailingPE).toFixed(1):'—'},
              {l:'EPS (TTM)',v:keyStats.trailingEps!=null?fmt(keyStats.trailingEps,currency):'—'},
              {l:'52W High',v:stats.fiftyTwoWeekHigh!=null?fmt(stats.fiftyTwoWeekHigh,currency):'—'},
              {l:'52W Low',v:stats.fiftyTwoWeekLow!=null?fmt(stats.fiftyTwoWeekLow,currency):'—'},
              {l:'Volume',v:priceData.regularMarketVolume!=null?`${(priceData.regularMarketVolume/1e6).toFixed(2)}M`:'—'},
              {l:'Beta',v:stats.beta!=null?Number(stats.beta).toFixed(2):'—'},
              {l:'Div Yield',v:stats.dividendYield!=null?`${(stats.dividendYield*100).toFixed(2)}%`:'—'},
            ].map(({l,v},i)=><InfoRow key={i} l={l} v={v}/>)}
          </div>
        </div>

        {/* Col 3 — Day-wise P&L table (replaces Analyst Target) */}
        <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:3,height:16,background:T.accent,borderRadius:2}}/>
              <span style={{fontSize:13,fontWeight:700,color:T.text}}>Day-wise P&L</span>
            </div>
            {dayRows.length>0&&(()=>{
              const tot=dayRows.reduce((s,d)=>s+(d.dayPL||0),0);
              return holding?<span style={{fontSize:11,fontWeight:700,color:gColor(tot,T),background:`${gColor(tot,T)}15`,padding:'2px 8px',borderRadius:12}}>{tot>=0?'+':'−'}{fmt(Math.abs(tot),currency)}</span>:null;
            })()}
          </div>
          {/* Loading */}
          {loading&&!dayRows.length&&(
            <div style={{padding:16,display:'flex',flexDirection:'column',gap:6}}>
              {[1,2,3,4,5].map(i=><div key={i} style={{height:24,borderRadius:4,background:T.surface3,animation:'pulse 1.5s infinite',opacity:1-i*.15}}/>)}
            </div>
          )}
          {!loading&&!dayRows.length&&(
            <div style={{padding:24,textAlign:'center',color:T.text3,fontSize:12}}>Click Refresh to load</div>
          )}
          {/* Scrollable table */}
          {dayRows.length>0&&(
            <div style={{overflowY:'auto',flex:1}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead style={{position:'sticky',top:0,zIndex:2}}>
                  <tr style={{background:T.surface3}}>
                    <th style={{padding:'7px 10px',textAlign:'left',color:T.text3,fontWeight:700,fontSize:10,borderBottom:`1px solid ${T.border}`}}>Date</th>
                    <th style={{padding:'7px 10px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:10,borderBottom:`1px solid ${T.border}`}}>Close</th>
                    <th style={{padding:'7px 10px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:10,borderBottom:`1px solid ${T.border}`}}>Day %</th>
                    {holding&&<th style={{padding:'7px 10px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:10,borderBottom:`1px solid ${T.border}`}}>Day P&L</th>}
                  </tr>
                </thead>
                <tbody>
                  {dayRows.map((d,i)=>{
                    const isUp=d.change>=0;
                    return(
                      <tr key={i} style={{background:i%2===0?T.surface2:T.surface3}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surface4}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                        <td style={{padding:'6px 10px',color:T.text2,fontSize:11,borderBottom:`1px solid ${T.border}`}}>
                          {new Date(d.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                        </td>
                        <td style={{padding:'6px 10px',textAlign:'right',fontWeight:600,fontSize:11,color:isUp?T.success:T.danger,borderBottom:`1px solid ${T.border}`}}>
                          {fmt(d.close,currency)}
                        </td>
                        <td style={{padding:'6px 10px',textAlign:'right',borderBottom:`1px solid ${T.border}`}}>
                          <Badge val={d.change} pct T={T}/>
                        </td>
                        {holding&&<td style={{padding:'6px 10px',textAlign:'right',borderBottom:`1px solid ${T.border}`}}>
                          {d.dayPL!=null?<Badge val={d.dayPL} currency={currency} T={T}/>:<span style={{color:T.text3,fontSize:10}}>—</span>}
                        </td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
            {(groqKey||geminiKey)&&(
        <AIAnalysis symbol={symbol} holding={holding} analysis={aiAnalysis} groqKey={groqKey} geminiKey={geminiKey} primaryAI={primaryAI} onRefresh={onAIRefresh} T={T}/>
      )}
    </div>
  );
}

// ── DONUT CHART ───────────────────────────────────────────────────────────────
function DonutChart({title,data,currency,offset=0,T}) {
  const [active,setActive]=useState(null);const [tip,setTip]=useState(null);
  const sorted=useMemo(()=>[...data].sort((a,b)=>b.value-a.value),[data]);
  const total=sorted.reduce((s,d)=>s+d.value,0);
  const CX=60,CY=60,OUTER=55,INNER=28,GAP=1.5;
  const segs=useMemo(()=>{let cum=0;return sorted.map((d,i)=>{const frac=total?d.value/total:0,s=cum+GAP/360,e=cum+frac-GAP/360;cum+=frac;const sa=(s*2*Math.PI)-Math.PI/2,ea=(e*2*Math.PI)-Math.PI/2;const x1o=CX+OUTER*Math.cos(sa),y1o=CY+OUTER*Math.sin(sa),x2o=CX+OUTER*Math.cos(ea),y2o=CY+OUTER*Math.sin(ea);const x1i=CX+INNER*Math.cos(ea),y1i=CY+INNER*Math.sin(ea),x2i=CX+INNER*Math.cos(sa),y2i=CY+INNER*Math.sin(sa);return{d,i,frac,path:`M${x1o} ${y1o} A${OUTER} ${OUTER} 0 ${frac>.5?1:0} 1 ${x2o} ${y2o} L${x1i} ${y1i} A${INNER} ${INNER} 0 ${frac>.5?1:0} 0 ${x2i} ${y2i}Z`,color:PIE[(i+offset)%PIE.length]};});},[sorted,total,offset]);
  if(!sorted.length)return null;
  return(
    <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden'}}>
      <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:13,fontWeight:700,color:T.text}}>{title}</span></div>
      <div style={{padding:'12px 14px',display:'flex',gap:14,alignItems:'flex-start'}}>
        <div style={{flexShrink:0,position:'relative'}}>
          <svg width={120} height={120} style={{display:'block'}}>
            {segs.map(s=><path key={s.i} d={s.path} fill={s.color} opacity={active===null||active===s.i?1:.25} style={{cursor:'default',transition:'opacity .15s'}} onMouseEnter={e=>{setActive(s.i);setTip({d:s.d,pct:(s.frac*100).toFixed(1),color:s.color});}} onMouseLeave={()=>{setActive(null);setTip(null);}}/>)}
            <text x={CX} y={CY-5} textAnchor="middle" fontSize={9} fill={T.text3} fontFamily="inherit">{active!==null?sorted[active]?.name.slice(0,6).toUpperCase():'ALLOC'}</text>
            <text x={CX} y={CY+10} textAnchor="middle" fontSize={14} fontWeight="700" fill={T.text} fontFamily="inherit">{active!==null?`${((segs[active]?.frac||0)*100).toFixed(0)}%`:sorted.length}</text>
          </svg>
        </div>
        <div style={{flex:1,overflowY:'auto',maxHeight:120}}>
          {sorted.map((e,i)=>(
            <div key={i} onMouseEnter={()=>setActive(i)} onMouseLeave={()=>setActive(null)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,padding:'4px 0',borderBottom:i<sorted.length-1?`1px solid ${T.border}`:'none',opacity:active===null||active===i?1:.3,transition:'opacity .12s',cursor:'default'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:7,height:7,borderRadius:2,background:PIE[(i+offset)%PIE.length],flexShrink:0}}/><span style={{color:T.text2,fontWeight:500}}>{e.name}</span></div>
              <div style={{textAlign:'right'}}><span style={{fontWeight:700,color:T.text}}>{total?((e.value/total)*100).toFixed(1):0}%</span></div>
            </div>
          ))}
        </div>
      </div>
      {tip&&<div style={{margin:'0 14px 12px',padding:'6px 10px',background:T.surface4,borderRadius:6,fontSize:11}}><span style={{fontWeight:700,color:tip.color}}>{tip.d.name}</span><span style={{color:T.text3,marginLeft:8}}>{fmt(tip.d.value,currency)} · {tip.pct}%</span></div>}
    </div>
  );
}

// ── P&L BAR CHART ─────────────────────────────────────────────────────────────
function PLBarChart({rows,currency,T}) {
  const data=useMemo(()=>[...rows].filter(r=>r.gainPct!=null).sort((a,b)=>b.gainPct-a.gainPct).map(r=>({name:short(r.symbol),pct:parseFloat(r.gainPct.toFixed(2)),color:r.gainPct>=0?T.success:T.danger})),[rows,T]);
  const [hov,setHov]=useState(null);
  if(!data.length)return null;
  const maxAbs=Math.max(...data.map(d=>Math.abs(d.pct)),1);
  const mixed=data.some(d=>d.pct<0)&&data.some(d=>d.pct>0);
  return(
    <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden'}}>
      <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:13,fontWeight:700,color:T.text}}>Unrealized P&L</span>
        <span style={{fontSize:11,color:T.text3}}>{data.filter(d=>d.pct>0).length} up · {data.filter(d=>d.pct<0).length} down</span>
      </div>
      <div style={{padding:'8px 14px 12px'}}>
        {data.map((d,i)=>(
          <div key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{display:'flex',alignItems:'center',height:22,gap:8,borderRadius:4,padding:'0 4px',background:hov===i?T.surface3:'transparent',transition:'background .08s'}}>
            <div style={{width:44,fontSize:10,fontWeight:600,color:T.text3,flexShrink:0,textAlign:'right'}}>{d.name}</div>
            <div style={{flex:1,position:'relative',height:4,borderRadius:2}}>
              {mixed&&<div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:T.border}}/>}
              <div style={{position:'absolute',height:4,borderRadius:2,background:d.color,width:`${mixed?Math.abs(d.pct)/maxAbs*50:Math.abs(d.pct)/maxAbs*100}%`,left:mixed?(d.pct>=0?'50%':`calc(50% - ${Math.abs(d.pct)/maxAbs*50}%)`):'0',opacity:hov===null||hov===i?1:.3,transition:'all .2s'}}/>
            </div>
            <div style={{width:44,fontSize:10,fontWeight:700,color:d.color,flexShrink:0,textAlign:'right'}}>{d.pct>=0?'+':''}{d.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CSV IMPORT MODAL ──────────────────────────────────────────────────────────
function CSVImportModal({onImport,onClose,market,T}) {
  const [rows,setRows]=useState([]);const [errs,setErrs]=useState([]);const [drag,setDrag]=useState(false);const [parsed,setParsed]=useState(false);const fileRef=useRef();
  const isIN=market==='IN',ac=isIN?T.inColor:T.usColor;
  const findCol=(h,...n)=>{for(const x of n){const i=h.findIndex(c=>c.toLowerCase().replace(/[\s_]/g,'')===x.toLowerCase().replace(/[\s_]/g,''));if(i>=0)return i;}return -1;};
  const parseCSV=text=>{
    const lines=text.trim().split(/\r?\n/).filter(l=>l.trim());if(lines.length<2){setErrs(['Need header row + data.']);return;}
    const h=lines[0].split(',').map(x=>x.trim().replace(/^"|"$/g,''));
    const iS=findCol(h,'symbol','ticker','scrip'),iN=findCol(h,'name','company'),iQ=findCol(h,'qty','quantity','shares'),iB=findCol(h,'buyprice','avgbuyprice','purchaseprice','cost','averageprice'),iT=findCol(h,'analysttarget','target','targetprice');
    const e=[];if(iS<0)e.push('Missing "Symbol"');if(iQ<0)e.push('Missing "Qty"');if(iB<0)e.push('Missing "Buy Price"');if(e.length){setErrs(e);return;}
    const p=[],w=[];
    lines.slice(1).forEach((line,i)=>{
      const cells=[];let cur='',inQ=false;for(const ch of line+','){if(ch==='"'){inQ=!inQ;}else if(ch===','&&!inQ){cells.push(cur.trim());cur='';}else cur+=ch;}
      const sym=cells[iS]?.replace(/^"|"$/g,'').trim().toUpperCase(),name=iN>=0?cells[iN]?.replace(/^"|"$/g,'').trim():sym;
      const qty=parseFloat(cells[iQ]?.replace(/[^0-9.-]/g,'')),buy=parseFloat(cells[iB]?.replace(/[^0-9.-]/g,'')),tgt=iT>=0?parseFloat(cells[iT]?.replace(/[^0-9.-]/g,'')):NaN;
      if(!sym||isNaN(qty)||qty<=0||isNaN(buy)||buy<=0){w.push(`Row ${i+2}: skipped`);return;}
      p.push({id:Date.now()+i,symbol:sym,name:name||sym,qty:parseFloat(qty.toFixed(8)),buyPrice:buy,unpledgedQty:null,analystTarget:isNaN(tgt)?null:tgt});
    });
    if(!p.length){setErrs([...e,'No valid rows.',...w]);return;}setErrs(w);setRows(p);setParsed(true);
  };
  const handleFile=f=>{if(!f)return;const r=new FileReader();r.onload=e=>parseCSV(e.target.result);r.readAsText(f);};
  return(
    <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)'}}>
      <div style={{background:T.surface,borderRadius:T.r,border:`1px solid ${T.border2}`,width:540,maxWidth:'95vw',maxHeight:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,.5)'}}>
        <div style={{padding:'18px 24px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:8,background:T.accentBg,display:'flex',alignItems:'center',justifyContent:'center',color:T.accent}}><Ic.Upload/></div>
            <div><div style={{fontSize:15,fontWeight:700,color:T.text}}>Import {isIN?'Indian':'US'} Holdings</div><div style={{fontSize:12,color:T.text3,marginTop:1}}>Appends to active portfolio</div></div>
          </div>
          <button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'6px 8px',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.danger;e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:T.surface2,borderRadius:6,padding:'12px 16px',fontSize:12}}>
            <div style={{fontWeight:600,color:T.text,marginBottom:8,display:'flex',alignItems:'center',gap:6}}><Ic.File/> Required columns</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',color:T.text3}}>
              {[['Symbol *','RELIANCE.NS / AAPL'],['Qty *','10, 2.5'],['Buy Price *','2800, 150'],['Name','Optional'],['Analyst Target','Optional']].map(([k,v])=>(
                <div key={k} style={{display:'flex',gap:8,padding:'2px 0'}}><span style={{color:T.accent,fontWeight:600,minWidth:100}}>{k}</span><span>{v}</span></div>
              ))}
            </div>
          </div>
          {!parsed&&<div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}} onClick={()=>fileRef.current.click()} style={{border:`2px dashed ${drag?ac:T.border2}`,borderRadius:T.r,padding:'32px 24px',textAlign:'center',cursor:'pointer',background:drag?T.accentBg2:T.surface2,transition:'all .15s'}}>
            <div style={{fontSize:24,marginBottom:8}}>📂</div>
            <div style={{fontSize:13,fontWeight:600,color:drag?T.accent:T.text2}}>{drag?'Drop to import':'Drag & drop CSV or click to browse'}</div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
          </div>}
          {errs.length>0&&<div style={{background:T.warnBg,borderRadius:6,padding:'10px 14px',border:`1px solid ${T.warning}40`}}>{errs.map((e,i)=><div key={i} style={{fontSize:12,color:T.warning,marginBottom:i<errs.length-1?4:0}}>{e}</div>)}</div>}
          {parsed&&rows.length>0&&<div>
            <div style={{fontSize:13,fontWeight:600,color:T.success,marginBottom:10}}>{rows.length} holding{rows.length!==1?'s':''} ready to import</div>
            <div style={{border:`1px solid ${T.border}`,borderRadius:6,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:T.surface3}}>{['Symbol','Name','Qty','Buy Price','Target'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',color:T.text3,fontWeight:600,fontSize:11,borderBottom:`1px solid ${T.border}`}}>{h}</th>)}</tr></thead>
                <tbody>{rows.map((r,i)=><tr key={i} style={{background:i%2?T.surface3:T.surface2}}><td style={{padding:'7px 12px',fontWeight:700,color:T.accent,borderBottom:`1px solid ${T.border}`}}>{r.symbol}</td><td style={{padding:'7px 12px',color:T.text2,borderBottom:`1px solid ${T.border}`,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</td><td style={{padding:'7px 12px',color:T.text,borderBottom:`1px solid ${T.border}`}}>{fmtQty(r.qty)}</td><td style={{padding:'7px 12px',color:T.text,borderBottom:`1px solid ${T.border}`}}>{r.buyPrice}</td><td style={{padding:'7px 12px',color:r.analystTarget?T.success:T.text3,borderBottom:`1px solid ${T.border}`}}>{r.analystTarget??'—'}</td></tr>)}</tbody>
              </table>
            </div>
          </div>}
        </div>
        <div style={{padding:'14px 20px',borderTop:`1px solid ${T.border}`,display:'flex',gap:10,justifyContent:'flex-end',alignItems:'center'}}>
          {parsed&&<span style={{fontSize:11,color:T.text3,flex:1}}>Existing holdings will be preserved</span>}
          <NvBtn onClick={onClose} T={T}>Cancel</NvBtn>
          {!parsed?<NvBtn onClick={()=>fileRef.current.click()} variant="primary" T={T}><Ic.Upload/> Choose File</NvBtn>
          :<NvBtn onClick={()=>{onImport(rows);onClose();}} variant="primary" disabled={!rows.length} T={T}><Ic.Check/> Import {rows.length}</NvBtn>}
        </div>
      </div>
    </div>
  );
}


// ── AI SETUP MODAL ────────────────────────────────────────────────────────────
function AISetupModal({onSave,T}) {
  const [groqKey,setGroqKeyL]=useState('');
  const [geminiKey,setGeminiKeyL]=useState('');
  const [primary,setPrimary]=useState('groq');
  const [testing,setTesting]=useState(null);
  const [results,setResults]=useState({});
  const test=async(provider)=>{
    const key=provider==='groq'?groqKey:geminiKey;
    if(!key.trim())return;
    setTesting(provider);
    try{
      if(provider==='groq') await callGroq(key.trim(),'Reply OK');
      else await callGemini(key.trim(),'Reply OK');
      setResults(p=>({...p,[provider]:'ok'}));
    }catch(e){setResults(p=>({...p,[provider]:e.message}));}
    setTesting(null);
  };
  const hasAny=groqKey.trim()||geminiKey.trim();
  const PROVS=[
    {id:'groq',   label:'Groq',   sub:'Llama 3.3 70B · 14,400 free req/day',   icon:'⚡', grad:'linear-gradient(135deg,#f55036,#ff8c00)', ph:'gsk_…',  hint:'console.groq.com → API Keys'},
    {id:'gemini', label:'Gemini', sub:'Gemini 2.0 Flash · 1,500 free req/day',  icon:'✦', grad:'linear-gradient(135deg,#4285f4,#34a853)', ph:'AIza…',  hint:'aistudio.google.com → Get API Key'},
  ];
  return(
    <div style={{position:'fixed',inset:0,zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.78)',backdropFilter:'blur(6px)'}}>
      <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border2}`,width:560,maxWidth:'94vw',boxShadow:'0 32px 80px rgba(0,0,0,.6)',overflow:'hidden'}}>
        <div style={{background:'linear-gradient(135deg,#0d1117,#1a1a2e)',padding:'22px 28px',borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:18,fontWeight:700,color:'#fff',marginBottom:4}}>Enable AI Analysis</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>Configure one or both. Primary is tried first, secondary is automatic fallback.</div>
        </div>
        <div style={{padding:'20px 28px',display:'flex',flexDirection:'column',gap:14}}>
          {PROVS.map(prov=>{
            const key=prov.id==='groq'?groqKey:geminiKey;
            const setKey=prov.id==='groq'?setGroqKeyL:setGeminiKeyL;
            const res=results[prov.id];
            const isPrimary=primary===prov.id;
            return(
              <div key={prov.id} style={{background:T.surface2,borderRadius:10,border:`1px solid ${isPrimary?T.accent:T.border}`,padding:'14px 16px',transition:'border-color .15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{width:34,height:34,borderRadius:8,background:prov.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{prov.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{prov.label}</div>
                    <div style={{fontSize:11,color:T.text3}}>{prov.sub}</div>
                  </div>
                  <button onClick={()=>setPrimary(prov.id)} style={{padding:'3px 10px',borderRadius:20,border:`1px solid ${isPrimary?T.accent:T.border2}`,background:isPrimary?T.accentBg:'transparent',color:isPrimary?T.accent:T.text3,cursor:'pointer',fontSize:10,fontWeight:700,transition:'all .15s'}}>
                    {isPrimary?'★ Primary':'Set Primary'}
                  </button>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <NvInput value={key} onChange={e=>setKey(e.target.value)} placeholder={prov.ph} T={T} style={{fontFamily:'monospace',fontSize:12}}/>
                  <NvBtn onClick={()=>test(prov.id)} disabled={!key.trim()||testing===prov.id} T={T}>{testing===prov.id?'Testing…':'Test'}</NvBtn>
                </div>
                {res==='ok'&&<div style={{fontSize:11,color:T.success,marginTop:6}}>✓ Key verified</div>}
                {res&&res!=='ok'&&<div style={{fontSize:11,color:T.danger,marginTop:6}}>✗ {res}</div>}
                <div style={{fontSize:10,color:T.text3,marginTop:5}}>Get free key: <b>{prov.hint}</b></div>
              </div>
            );
          })}
        </div>
        <div style={{padding:'14px 28px',borderTop:`1px solid ${T.border}`,display:'flex',gap:10,justifyContent:'flex-end',background:T.surface2}}>
          <NvBtn onClick={()=>onSave('','','groq')} T={T}>Skip — Yahoo Finance only</NvBtn>
          <NvBtn onClick={()=>onSave(groqKey.trim(),geminiKey.trim(),primary)} variant="primary" disabled={!hasAny} T={T}>Save & Enable AI</NvBtn>
        </div>
      </div>
    </div>
  );
}

// ── AI ANALYSIS PANEL ─────────────────────────────────────────────────────────
function AIAnalysis({symbol,holding,analysis,groqKey,geminiKey,primaryAI,onRefresh,T}) {
  const loading=analysis?.loading,data=analysis?.data,err=analysis?.error,usedProvider=analysis?.provider;
  const hasBoth=!!(groqKey&&geminiKey);
  const sentColor=s=>!s?T.text3:s.toLowerCase().includes('bullish')?T.success:s.toLowerCase().includes('bearish')?T.danger:T.warning;
  const provIcon=p=>p==='Groq'?'⚡':'✦';
  const provGrad=p=>p==='Groq'?'linear-gradient(135deg,#f55036,#ff8c00)':'linear-gradient(135deg,#4285f4,#34a853)';
  return(
    <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden'}}>
      <div style={{padding:'12px 18px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(90deg,rgba(118,185,0,.06),transparent)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:6,background:provGrad(usedProvider||primaryAI),display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{provIcon(usedProvider||primaryAI||'Groq')}</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.text}}>AI Analysis</div>
            <div style={{fontSize:10,color:T.text3}}>{usedProvider?`via ${usedProvider}`:`Primary: ${primaryAI==='groq'?'Groq':'Gemini'}`}</div>
          </div>
          {data?.sentiment&&<span style={{padding:'3px 10px',borderRadius:20,background:`${sentColor(data.sentiment)}18`,color:sentColor(data.sentiment),fontSize:11,fontWeight:700}}>{data.sentiment}</span>}
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {hasBoth&&<div style={{display:'flex',background:T.surface3,borderRadius:6,padding:2,gap:2}}>
            {[{id:'groq',label:'⚡ Groq'},{id:'gemini',label:'✦ Gemini'}].map(p=>(
              <button key={p.id} onClick={()=>onRefresh(p.id)} style={{padding:'3px 10px',borderRadius:4,border:'none',background:(usedProvider||primaryAI)===(p.id==='groq'?'Groq':'Gemini')||primaryAI===p.id?T.surface:'transparent',color:T.text3,cursor:'pointer',fontSize:10,fontWeight:600,transition:'all .12s'}}>{p.label}</button>
            ))}
          </div>}
          <NvBtn onClick={()=>onRefresh(primaryAI)} disabled={loading} T={T}><Ic.Refresh s={loading}/>{loading?'Analysing…':'Analyse'}</NvBtn>
        </div>
      </div>
      <div style={{padding:'16px 18px'}}>
        {loading&&!data&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{[90,70,80,60].map((w,i)=><div key={i} style={{height:12,borderRadius:4,background:T.surface4,width:`${w}%`,animation:'pulse 1.5s infinite'}}/>)}</div>}
        {err&&!data&&<div style={{color:T.danger,fontSize:12,padding:'8px 0'}}>{err}</div>}
        {!loading&&!data&&!err&&<div style={{color:T.text3,fontSize:12,textAlign:'center',padding:'12px 0'}}>Click Analyse to generate AI insights for this stock.</div>}
        {data&&(
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {data.overview&&<div><div style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Overview</div><div style={{fontSize:13,color:T.text,lineHeight:1.65}}>{data.overview}</div></div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {data.opportunities?.length>0&&<div style={{background:T.successBg,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.success}20`}}><div style={{fontSize:11,fontWeight:700,color:T.success,marginBottom:8,textTransform:'uppercase',letterSpacing:'.05em'}}>Opportunities</div>{[].concat(data.opportunities).map((o,i)=><div key={i} style={{display:'flex',gap:6,fontSize:12,color:T.text,marginBottom:4}}><span style={{color:T.success,flexShrink:0}}>▲</span>{o}</div>)}</div>}
              {data.risks?.length>0&&<div style={{background:T.dangerBg,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.danger}20`}}><div style={{fontSize:11,fontWeight:700,color:T.danger,marginBottom:8,textTransform:'uppercase',letterSpacing:'.05em'}}>Risks</div>{[].concat(data.risks).map((r,i)=><div key={i} style={{display:'flex',gap:6,fontSize:12,color:T.text,marginBottom:4}}><span style={{color:T.danger,flexShrink:0}}>▼</span>{r}</div>)}</div>}
            </div>
            {data.performance&&<div><div style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Recent Performance</div><div style={{fontSize:12,color:T.text2,lineHeight:1.65}}>{data.performance}</div></div>}
            {holding&&data.positionComment&&<div style={{background:T.accentBg,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.accent}20`}}><div style={{fontSize:11,fontWeight:700,color:T.accent,marginBottom:5,textTransform:'uppercase',letterSpacing:'.05em'}}>Your Position</div><div style={{fontSize:12,color:T.text,lineHeight:1.65}}>{data.positionComment}</div></div>}
            {data.disclaimer&&<div style={{fontSize:10,color:T.text3,fontStyle:'italic'}}>{data.disclaimer}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── HOLDINGS TABLE ────────────────────────────────────────────────────────────
function Section({title,flag,accent,rows,currency,usdInr,targets,onSaveTarget,onSaveUnpledged,onRemove,fetchPrices,loading,error,lastUpdated,compact,onImportCSV,addHolding,onRowClick,T}) {
  const [sort,setSort]=useState({col:'allocPct',dir:'desc'});
  const [filter,setFilter]=useState('');
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({symbol:'',name:'',qty:'',buyPrice:''});
  const [srch,setSrch]=useState('');const [results,setResults]=useState([]);const [busyS,setBusyS]=useState(false);const [focused,setFocused]=useState(false);const timer=useRef(null);
  const totalSect=rows.reduce((s,r)=>s+(r.curValue??r.invested),0)||1;
  const totalInv=rows.reduce((s,r)=>s+r.invested,0),totalCur=rows.reduce((s,r)=>s+(r.curValue??r.invested),0);
  const totalGain=totalCur-totalInv,totalGainP=totalInv?(totalGain/totalInv)*100:0,dayTotal=rows.reduce((s,r)=>s+(r.dayPL??0),0);
  const aug=useMemo(()=>rows.map(r=>({...r,allocPct:((r.curValue??r.invested)/totalSect)*100})),[rows,totalSect]);
  const srt=useMemo(()=>sortRows(aug,sort.col,sort.dir),[aug,sort]);
  const flt=useMemo(()=>filter.trim()?srt.filter(r=>r.name.toLowerCase().includes(filter.toLowerCase())||r.symbol.toLowerCase().includes(filter.toLowerCase())):srt,[srt,filter]);
  const onSort=col=>setSort(p=>({col,dir:p.col===col?(p.dir==='asc'?'desc':'asc'):'desc'}));
  const doSearch=q=>{setSrch(q);clearTimeout(timer.current);if(!q.trim()){setResults([]);return;}
    timer.current=setTimeout(async()=>{
      setBusyS(true);
      try{
        let quotes=[];
        for(const host of ['query1','query2']){
          try{
            const res=await fetch(`https://${host}.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&lang=en-US`,{headers:{Accept:'application/json'}});
            if(res.ok){const json=await res.json();quotes=(json?.quotes??[]).filter(r=>r.symbol&&r.quoteType!=='OPTION').slice(0,7);if(quotes.length)break;}
          }catch{}
        }
        setResults(quotes);
      }catch{setResults([]);}
      setBusyS(false);
    },400);};
  const selectResult=r=>{setForm(p=>({...p,symbol:r.symbol,name:r.longname||r.shortname||r.symbol}));setSrch(r.longname||r.shortname||r.symbol);setResults([]);};
  const doAdd=()=>{const sym=form.symbol.trim().toUpperCase();if(!sym||!form.qty||!form.buyPrice)return;addHolding({id:Date.now(),symbol:sym,name:form.name.trim()||sym,qty:parseFloat(parseFloat(form.qty).toFixed(8)),buyPrice:parseFloat(form.buyPrice),unpledgedQty:null});setForm({symbol:'',name:'',qty:'',buyPrice:''});setSrch('');setResults([]);setShowAdd(false);};
  const buildExportData=()=>{
    const h=['Stock','Symbol','Qty','Unpledged Qty','Buy Price','Invested','LTP','Day %','Day P&L','Value','P&L','P&L %','Alloc %','Target','Upside %'];
    const body=rows.map(r=>{const tgt=targets[r.id],up=tgt!=null&&r.curPrice!=null?(tgt-r.curPrice)/r.curPrice*100:null;
      return[r.name,r.symbol,fmtQty(r.qty),r.unpledgedQty!=null?fmtQty(r.unpledgedQty):'',r.buyPrice,r.invested.toFixed(2),r.curPrice?.toFixed(2)??'',r.dayChange?.toFixed(2)??'',r.dayPL?.toFixed(2)??'',r.curValue?.toFixed(2)??'',r.gain?.toFixed(2)??'',r.gainPct?.toFixed(2)??'',((r.curValue??r.invested)/totalSect*100).toFixed(2),tgt?.toFixed(2)??'',up?.toFixed(2)??''];});
    return{h,body};
  };
  const csvExport=()=>{
    const {h,body}=buildExportData();
    const csv=[h,...body].map(r=>r.join(',')).join('\n');
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`portfolio_${currency}_${new Date().toISOString().slice(0,10)}.csv`});
    a.click();
  };
  const xlsxExport=()=>{
    const {h,body}=buildExportData();
    const ws=XLSX.utils.aoa_to_sheet([h,...body]);
    // Auto column widths
    ws['!cols']=h.map((hdr,i)=>{const max=Math.max(hdr.length,...body.map(r=>String(r[i]||'').length));return{wch:Math.min(max+2,30)};});
    // Header style (row 1)
    const range=XLSX.utils.decode_range(ws['!ref']);
    for(let C=range.s.c;C<=range.e.c;C++){
      const addr=XLSX.utils.encode_cell({r:0,c:C});
      if(!ws[addr])continue;
      ws[addr].s={font:{bold:true},fill:{fgColor:{rgb:'1A1A2E'}},font:{color:{rgb:'76B900'},bold:true}};
    }
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,currency==='INR'?'Indian Portfolio':'US Portfolio');
    XLSX.writeFile(wb,`portfolio_${currency}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const rp=compact?'7px 12px':'10px 12px';
  const tdB={padding:rp,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap'};
  const tdN={...tdB,textAlign:'right'};
  return(
    <div style={{display:'flex',flexDirection:'column',gap:0}}>
      {/* Summary Strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:16}}>
        <StatCard T={T} label="Invested" value={fmt(totalInv,currency)}/>
        <StatCard T={T} label="Current Value" value={fmt(totalCur,currency)} valueColor={T.text}/>
        <StatCard T={T} label="Total P&L"
          value={`${totalGain>=0?'+':'−'}${fmt(Math.abs(totalGain),currency)}`}
          sub={currency==='USD'&&usdInr?`≈ ${totalGain>=0?'+':'−'}₹${Math.abs(totalGain*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})} · ${fmtPct(totalGainP)}`:fmtPct(totalGainP)}
          valueColor={gColor(totalGain,T)}/>
        <StatCard T={T} label="Today's P&L"
          value={`${dayTotal>=0?'+':'−'}${fmt(Math.abs(dayTotal),currency)}`}
          sub={currency==='USD'&&usdInr?`≈ ${dayTotal>=0?'+':'−'}₹${Math.abs(dayTotal*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}`:''}
          valueColor={gColor(dayTotal,T)}/>
        <StatCard T={T} label="Holdings" value={`${rows.filter(r=>(r.gain??0)>0).length}↑  ${rows.filter(r=>(r.gain??0)<0).length}↓`}/>
      </div>
      {/* Toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:'0 0 200px'}}>
          <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.text3,pointerEvents:'none'}}><Ic.Search/></span>
          <NvInput value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter holdings…" T={T} style={{paddingLeft:34}}/>
        </div>
        {lastUpdated&&<span style={{fontSize:11,color:T.text3,display:'flex',alignItems:'center',gap:5}}><span style={{width:6,height:6,borderRadius:'50%',background:T.accent,display:'inline-block'}}/>{lastUpdated.toLocaleTimeString()}</span>}
        <div style={{marginLeft:'auto',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',flexShrink:0}}>
          <NvBtn onClick={csvExport} T={T}><Ic.Download/> CSV</NvBtn>
          <NvBtn onClick={xlsxExport} T={T}><Ic.Download/> XLSX</NvBtn>
          <NvBtn onClick={onImportCSV} T={T}><Ic.Upload/> Import</NvBtn>
          <NvBtn onClick={fetchPrices} disabled={loading} T={T} style={{minWidth:128}}><Ic.Refresh s={loading}/>{loading?'Refreshing…':'Refresh Prices'}</NvBtn>
          <NvBtn onClick={()=>setShowAdd(v=>!v)} variant="primary" T={T}><Ic.Plus/> Add Holding</NvBtn>
        </div>
      </div>
      {error&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:T.dangerBg,borderRadius:6,color:T.danger,fontSize:12,marginBottom:12,border:`1px solid ${T.danger}30`}}><Ic.Alert/>{error}</div>}
      {/* Add Form */}
      {showAdd&&(
        <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,padding:'16px 18px',marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>Add {currency==='INR'?'Indian':'US'} Holding</div>
          <div style={{display:'grid',gridTemplateColumns:'2fr .7fr .8fr auto',gap:10,alignItems:'end'}}>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Search {currency==='INR'?'NSE / BSE':'NYSE / NASDAQ'}</div>
              <div style={{position:'relative'}}>
                <NvInput value={srch} onChange={e=>doSearch(e.target.value)} autoFocus onFocus={e=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),200)} placeholder={currency==='INR'?'e.g. TCS, RELIANCE.NS…':'e.g. AAPL, Tesla…'} T={T}/>
                {busyS&&<span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:11,color:T.text3}}>…</span>}
                {focused&&results.length>0&&(
                  <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:9999,background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:T.r,boxShadow:'0 8px 24px rgba(0,0,0,.3)',overflow:'hidden'}}>
                    {results.map((r,i)=><div key={r.symbol} onMouseDown={()=>selectResult(r)} style={{padding:'10px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:i<results.length-1?`1px solid ${T.border}`:'none',transition:'background .08s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><div><span style={{fontWeight:700,fontSize:13,color:T.accent}}>{r.symbol}</span><span style={{fontSize:12,color:T.text3,marginLeft:8}}>{r.longname||r.shortname||''}</span></div>{r.exchDisp&&<span style={{fontSize:10,background:T.accentBg,color:T.accent,padding:'2px 8px',borderRadius:4,fontWeight:600}}>{r.exchDisp}</span>}</div>)}
                  </div>
                )}
              </div>
              {form.symbol&&<div style={{fontSize:11,color:T.accent,marginTop:4,fontWeight:600}}>✓ {form.symbol} — {form.name}</div>}
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Qty</div>
              <NvInput type="number" value={form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&doAdd()} placeholder="10.5" T={T}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'.04em'}}>Avg Buy Price</div>
              <NvInput type="number" value={form.buyPrice} onChange={e=>setForm(p=>({...p,buyPrice:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&doAdd()} placeholder={currency==='INR'?'2800':'150'} T={T}/>
            </div>
            <div style={{display:'flex',gap:8,alignSelf:'flex-end'}}>
              <NvBtn onClick={doAdd} variant="primary" disabled={!form.symbol||!form.qty||!form.buyPrice} T={T}><Ic.Plus/> Add</NvBtn>
              <NvBtn onClick={()=>{setShowAdd(false);setSrch('');setResults([]);setForm({symbol:'',name:'',qty:'',buyPrice:''});}} T={T}><Ic.X/></NvBtn>
            </div>
          </div>
        </div>
      )}
      {/* Table */}
      <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr>
                <SortTh T={T} label="Stock"          col="name"      sort={sort} onSort={onSort} minW={150} sticky/>
                <SortTh T={T} label="Qty"            col="qty"       sort={sort} onSort={onSort} right minW={72}/>
                <th style={{padding:'10px 12px',background:T.surface2,borderBottom:`1px solid ${T.border}`,color:T.text3,fontSize:11,fontWeight:600,textAlign:'right',minWidth:110,whiteSpace:'nowrap'}}>Unpledged Qty</th>
                <SortTh T={T} label="Buy Price"      col="buyPrice"  sort={sort} onSort={onSort} right minW={90}/>
                <SortTh T={T} label="Invested"       col="invested"  sort={sort} onSort={onSort} right minW={100}/>
                <SortTh T={T} label="LTP"            col="curPrice"  sort={sort} onSort={onSort} right minW={100}/>
                <SortTh T={T} label="Day %"          col="dayChange" sort={sort} onSort={onSort} right minW={75}/>
                <SortTh T={T} label="Day P&L"        col="dayPL"     sort={sort} onSort={onSort} right minW={100}/>
                <SortTh T={T} label="Value"          col="curValue"  sort={sort} onSort={onSort} right minW={100}/>
                <SortTh T={T} label="P&L"            col="gain"      sort={sort} onSort={onSort} right minW={110}/>
                <SortTh T={T} label="P&L %"          col="gainPct"   sort={sort} onSort={onSort} right minW={76}/>
                <SortTh T={T} label="Alloc %"        col="allocPct"  sort={sort} onSort={onSort} right minW={90}/>
                <th style={{padding:'10px 12px',background:T.surface2,borderBottom:`1px solid ${T.border}`,color:T.text3,fontSize:11,fontWeight:600,minWidth:150,whiteSpace:'nowrap'}}>Analyst Target</th>
                <th style={{padding:'10px 12px',background:T.surface2,borderBottom:`1px solid ${T.border}`,width:40}}/>
              </tr>
            </thead>
            <tbody>
              {!flt.length&&<tr><td colSpan={14} style={{padding:32,textAlign:'center',color:T.text3,fontSize:13}}>{filter?'No matches found.':`No ${currency==='INR'?'Indian':'US'} holdings yet — click Add Holding.`}</td></tr>}
              {flt.map((r)=>(
                <tr key={r.id} style={{background:'transparent',cursor:'pointer',transition:'background .08s',borderLeft:'2px solid transparent'}}
                  onClick={()=>onRowClick(r.symbol)}
                  onMouseEnter={e=>{e.currentTarget.style.background=T.surface3;e.currentTarget.style.borderLeftColor=accent;}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderLeftColor='transparent';}}>
                  <td style={{...tdB,position:'sticky',left:0,background:'inherit',zIndex:1,borderRight:`1px solid ${T.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:32,height:32,borderRadius:8,background:isUS(r.symbol)?'rgba(0,180,216,.12)':'rgba(255,152,0,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:isUS(r.symbol)?T.usColor:T.inColor,flexShrink:0}}>{short(r.symbol).slice(0,2)}</div>
                      <div>
                        <div style={{fontWeight:700,color:T.text,fontSize:12}}>{short(r.symbol)}</div>
                        <div style={{fontSize:10,color:T.text3,maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{...tdN,color:T.text2}}>{fmtQty(r.qty)}</td>
                  <td style={{...tdB,textAlign:'right'}} onClick={e=>e.stopPropagation()}><UnpledgedQtyCell id={r.id} unpledgedQty={r.unpledgedQty??null} totalQty={r.qty} onSave={onSaveUnpledged} T={T}/></td>
                  <td style={{...tdN,color:T.text2}}>{fmt(r.buyPrice,currency)}</td>
                  <td style={{...tdN,color:T.text}}>{fmt(r.invested,currency)}</td>
                  <td style={{...tdN,fontWeight:700,color:T.text}}>{r.curPrice!=null?fmt(r.curPrice,currency):<span style={{color:T.text3,fontSize:10}}>Live…</span>}</td>
                  <td style={{...tdN}}><Badge val={r.dayChange} pct T={T}/></td>
                  <td style={{...tdN}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:1}}>
                    <Badge val={r.dayPL} currency={currency} T={T}/>
                    {currency==='USD'&&usdInr&&r.dayPL!=null&&<span style={{fontSize:9,color:gColor(r.dayPL,T),opacity:.7}}>≈ {r.dayPL>=0?'+':'−'}₹{Math.abs(r.dayPL*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>}
                  </div>
                </td>
                  <td style={{...tdN,color:T.text}}>{r.curValue!=null?fmt(r.curValue,currency):'—'}</td>
                  <td style={{...tdN}}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:1}}>
                      <Badge val={r.gain} currency={currency} T={T}/>
                      {currency==='USD'&&usdInr&&r.gain!=null&&<span style={{fontSize:9,color:gColor(r.gain,T),opacity:.7}}>≈ {r.gain>=0?'+':'−'}₹{Math.abs(r.gain*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>}
                    </div>
                  </td>
                  <td style={{...tdN}}><Badge val={r.gainPct} pct T={T}/></td>
                  <td style={{...tdB,textAlign:'right'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8}}>
                      <div style={{width:50,height:3,background:T.surface4,borderRadius:2,flexShrink:0}}><div style={{width:`${Math.min(r.allocPct,100)}%`,height:'100%',background:accent,borderRadius:2,transition:'width .3s'}}/></div>
                      <span style={{fontSize:11,color:T.text2,fontWeight:600,minWidth:36,textAlign:'right'}}>{r.allocPct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{...tdB}} onClick={e=>e.stopPropagation()}><TargetCell id={r.id} target={targets[r.id]??null} curPrice={r.curPrice} currency={currency} onSave={onSaveTarget} T={T} compact/></td>
                  <td style={{...tdB}} onClick={e=>e.stopPropagation()}><button onClick={()=>onRemove(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'4px 6px',borderRadius:4,display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.color=T.danger;e.currentTarget.style.background=T.dangerBg;}} onMouseLeave={e=>{e.currentTarget.style.color=T.text3;e.currentTarget.style.background='none';}} title="Remove"><Ic.Trash/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS PANEL ────────────────────────────────────────────────────────────
function SettingsPanel({tweaks,onUpdate,onClose,groqKey,geminiKey,primaryAI,onSaveAIKeys,T}) {
  const [editing,setEditing]=useState(null);
  const [newKey,setNewKey]=useState('');
  const [testing,setTesting]=useState(false);
  const [testResult,setTestResult]=useState(null);
  const testKey=async(provider)=>{
    setTesting(true);setTestResult(null);
    try{
      if(provider==='groq') await callGroq(newKey.trim(),'Reply OK');
      else await callGemini(newKey.trim(),'Reply OK');
      setTestResult('ok');
    }catch(e){setTestResult(e.message);}
    setTesting(false);
  };
  const saveKey=(provider)=>{
    const gk=provider==='groq'?newKey.trim():groqKey||'';
    const gmk=provider==='gemini'?newKey.trim():geminiKey||'';
    onSaveAIKeys(gk,gmk,primaryAI);setEditing(null);
  };
  const removeKey=(provider)=>onSaveAIKeys(provider==='groq'?'':groqKey||'',provider==='gemini'?'':geminiKey||'',primaryAI);
  const setPrim=(p)=>onSaveAIKeys(groqKey||'',geminiKey||'',p);
  const PROVS=[
    {id:'groq',   label:'Groq',   icon:'⚡', grad:'linear-gradient(135deg,#f55036,#ff8c00)', key:groqKey, ph:'gsk_…'},
    {id:'gemini', label:'Gemini', icon:'✦', grad:'linear-gradient(135deg,#4285f4,#34a853)', key:geminiKey, ph:'AIza…'},
  ];
  return(
    <div style={{position:'fixed',inset:0,zIndex:1500,display:'flex',alignItems:'flex-start',justifyContent:'flex-end',paddingTop:52}}>
      <div onClick={onClose} style={{position:'absolute',inset:0}}/>
      <div style={{position:'relative',width:340,background:T.surface,borderRadius:T.r,border:`1px solid ${T.border2}`,boxShadow:'0 16px 48px rgba(0,0,0,.4)',margin:'8px 8px 0 0',overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:14,fontWeight:700,color:T.text}}>Settings</span>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,display:'flex',padding:4}}><Ic.X/></button>
        </div>
        <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:14,maxHeight:'85vh',overflowY:'auto'}}>
          {[{label:'Dark Mode',key:'darkMode'},{label:'Compact Rows',key:'compactRows'},{label:'Show P&L Charts',key:'showCharts'}].map(({label,key})=>(
            <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:T.text2}}>{label}</span>
              <div onClick={()=>onUpdate(key,!tweaks[key])} style={{width:40,height:22,borderRadius:11,background:tweaks[key]?T.accent:T.surface4,position:'relative',cursor:'pointer',transition:'background .2s',border:`1px solid ${tweaks[key]?T.accent:T.border2}`}}>
                <div style={{position:'absolute',top:2,left:tweaks[key]?'calc(100% - 18px)':2,width:16,height:16,borderRadius:8,background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
              </div>
            </div>
          ))}
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:13,color:T.text2}}>Auto Refresh</span><span style={{fontSize:13,fontWeight:600,color:T.accent}}>{tweaks.autoRefreshMins} min</span></div>
            <input type="range" min={1} max={30} step={1} value={tweaks.autoRefreshMins} onChange={e=>onUpdate('autoRefreshMins',parseInt(e.target.value))} style={{accentColor:T.accent}}/>
          </div>
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>AI Providers</div>
            {PROVS.map(prov=>{
              const isActive=!!prov.key,isPrimary=primaryAI===prov.id,isEditing=editing===prov.id;
              return(
                <div key={prov.id} style={{marginBottom:10,background:T.surface3,borderRadius:8,border:`1px solid ${isPrimary&&isActive?T.accent:T.border}`,padding:'10px 12px',transition:'border-color .15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:isEditing?10:4}}>
                    <div style={{width:24,height:24,borderRadius:5,background:prov.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>{prov.icon}</div>
                    <span style={{fontSize:12,fontWeight:700,color:T.text,flex:1}}>{prov.label}</span>
                    {isActive?<span style={{fontSize:9,background:T.successBg,color:T.success,padding:'2px 6px',borderRadius:8,fontWeight:700}}>Active</span>:<span style={{fontSize:9,background:T.surface4,color:T.text3,padding:'2px 6px',borderRadius:8}}>Off</span>}
                    {isActive&&<button onClick={()=>setPrim(prov.id)} style={{fontSize:9,padding:'2px 7px',borderRadius:8,border:`1px solid ${isPrimary?T.accent:T.border2}`,background:isPrimary?T.accentBg:'transparent',color:isPrimary?T.accent:T.text3,cursor:'pointer',fontWeight:600}}>{isPrimary?'★ Primary':'Set Primary'}</button>}
                  </div>
                  {isEditing?(
                    <div style={{display:'flex',flexDirection:'column',gap:7}}>
                      <NvInput value={newKey} onChange={e=>setNewKey(e.target.value)} placeholder={prov.ph} T={T} style={{fontFamily:'monospace',fontSize:11}}/>
                      {testResult==='ok'&&<span style={{fontSize:11,color:T.success}}>✓ Key works</span>}
                      {testResult&&testResult!=='ok'&&<span style={{fontSize:11,color:T.danger,wordBreak:'break-word'}}>✗ {testResult}</span>}
                      <div style={{display:'flex',gap:5}}>
                        <NvBtn onClick={()=>testKey(prov.id)} disabled={testing||!newKey.trim()} T={T}>{testing?'…':'Test'}</NvBtn>
                        <NvBtn onClick={()=>saveKey(prov.id)} variant="primary" disabled={!newKey.trim()} T={T}>Save</NvBtn>
                        <NvBtn onClick={()=>{setEditing(null);setTestResult(null);}} T={T}>Cancel</NvBtn>
                      </div>
                    </div>
                  ):(
                    <div style={{display:'flex',gap:6}}>
                      <NvBtn onClick={()=>{setNewKey(prov.key||'');setEditing(prov.id);setTestResult(null);}} T={T}>{isActive?'Update':'Add Key'}</NvBtn>
                      {isActive&&<NvBtn onClick={()=>removeKey(prov.id)} variant="danger" T={T}>Remove</NvBtn>}
                    </div>
                  )}
                </div>
              );
            })}
            {groqKey&&geminiKey&&<div style={{fontSize:11,color:T.text3}}>Both configured — <b style={{color:T.text}}>{primaryAI==='groq'?'Groq':'Gemini'}</b> is primary with auto-fallback.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}



// ── PORTFOLIO TABS ────────────────────────────────────────────────────────────
function PortfolioTabs({portfolios,activeId,onSwitch,onAdd,onRename,onDelete,T}) {
  const [editId,setEditId]=useState(null);const [editName,setEditName]=useState('');const inputRef=useRef();
  const commit=()=>{if(editName.trim())onRename(editId,editName.trim());setEditId(null);};
  useEffect(()=>{if(editId&&inputRef.current)inputRef.current.focus();},[editId]);
  return(
    <div style={{display:'flex',alignItems:'center',gap:4,padding:'0 20px',borderBottom:`1px solid ${T.border}`,background:T.surface,height:38,flexShrink:0,overflowX:'auto',position:'relative',zIndex:10}}>
      {portfolios.map((p,i)=>{const active=p.id===activeId,color=PORT_COLORS[i%PORT_COLORS.length];return(
        <div key={p.id} onClick={()=>onSwitch(p.id)} style={{display:'flex',alignItems:'center',gap:6,height:38,padding:'0 14px',cursor:'pointer',flexShrink:0,userSelect:'none',borderBottom:active?`2px solid ${color}`:'2px solid transparent',color:active?T.text:T.text3,transition:'all .15s',fontSize:12,fontWeight:active?600:400}}>
          {editId===p.id?<input ref={inputRef} value={editName} onChange={e=>setEditName(e.target.value)} onBlur={commit} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape')setEditId(null);}} style={{width:100,padding:'1px 6px',background:T.surface3,color:T.text,fontSize:12,border:`1px solid ${color}`,borderRadius:4,outline:'none'}}/>
          :<span onDoubleClick={e=>{e.stopPropagation();setEditId(p.id);setEditName(p.name);}}>{p.name}</span>}
          <span style={{fontSize:10,background:active?color+'20':T.surface3,color:active?color:T.text3,padding:'1px 6px',borderRadius:10,fontWeight:600}}>{p.holdings.length}</span>
          {portfolios.length>1&&active&&<button onClick={e=>{e.stopPropagation();onDelete(p.id);}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'1px 2px',display:'flex',lineHeight:1,transition:'color .1s'}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3}><Ic.X/></button>}
        </div>
      );})}
      <button onClick={onAdd} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 10px',marginLeft:4,border:`1px solid ${T.border}`,borderRadius:6,background:'transparent',color:T.text3,cursor:'pointer',fontSize:11,fontWeight:600,transition:'all .13s',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=T.accent;e.currentTarget.style.borderColor=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.color=T.text3;e.currentTarget.style.borderColor=T.border;}}><Ic.Plus/> New</button>
      <span style={{marginLeft:8,fontSize:10,color:T.text3,flexShrink:0,opacity:.5}}>Double-click to rename</span>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
function AppInner() {
  const [tweaks,setTweaks]=useState(()=>{try{const s=localStorage.getItem('pm_tweaks');return s?{...TWEAK_DEF,...JSON.parse(s)}:TWEAK_DEF;}catch{return TWEAK_DEF;}});
  const [showSettings,setShowSettings]=useState(false);
  const [importModal,setImportModal]=useState(null);
  const T=useMemo(()=>mkT(tweaks.darkMode),[tweaks.darkMode]);
  const [portfolios,setPortfolios]=useState(()=>{try{const s=localStorage.getItem('pm_portfolios');return s?JSON.parse(s):DEF_PF;}catch{return DEF_PF;}});
  const [activeId,setActiveId]=useState(()=>{try{const s=localStorage.getItem('pm_activeId');return s?JSON.parse(s):1;}catch{return 1;}});
  const [prices,setPrices]=useState({});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [lastUpdated,setLastUpdated]=useState(null);
  const [updateAvail,setUpdateAvail]=useState(false);
  const [mainTab,setMainTab]=useState('IN');
  const [openStockTabs,setOpenStockTabs]=useState([]);
  const [stockDetails,setStockDetails]=useState({});

  // AI provider state
  const [groqKey,setGroqKey]=useState(()=>localStorage.getItem('pm_groq_key'));
  const [geminiKey,setGeminiKey]=useState(()=>localStorage.getItem('pm_gemini_key'));
  const [primaryAI,setPrimaryAI]=useState(()=>localStorage.getItem('pm_primary_ai')||'groq');
  const [showAISetup,setShowAISetup]=useState(()=>
    localStorage.getItem('pm_groq_key')===null && localStorage.getItem('pm_gemini_key')===null
  );
  const [aiAnalyses,setAiAnalyses]=useState({});
  const [usdInr,setUsdInr]=useState(null); // live exchange rate

  // Fetch USD/INR rate from Yahoo Finance
  useEffect(()=>{
    const fetchFx=async()=>{
      try{
        const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDINR%3DX?interval=1d&range=1d',{headers:{Accept:'application/json'}});
        if(r.ok){const j=await r.json();const price=j?.chart?.result?.[0]?.meta?.regularMarketPrice;if(price)setUsdInr(price);}
      }catch{}
    };
    fetchFx();
    const t=setInterval(fetchFx,10*60*1000); // refresh every 10 min
    return()=>clearInterval(t);
  },[]);

  const saveAIKeys=(gk,gmk,prim)=>{
    localStorage.setItem('pm_groq_key',gk);
    localStorage.setItem('pm_gemini_key',gmk);
    localStorage.setItem('pm_primary_ai',prim);
    setGroqKey(gk); setGeminiKey(gmk); setPrimaryAI(prim);
    setShowAISetup(false);
  };
  const activePf=useMemo(()=>portfolios.find(p=>p.id===activeId)||portfolios[0],[portfolios,activeId]);
  const holdings=activePf?.holdings??[],targets=activePf?.targets??{};
  const setHoldings=fn=>setPortfolios(ps=>ps.map(p=>p.id===activeId?{...p,holdings:typeof fn==='function'?fn(p.holdings):fn}:p));
  const setTargets=fn=>setPortfolios(ps=>ps.map(p=>p.id===activeId?{...p,targets:typeof fn==='function'?fn(p.targets):fn}:p));
  const addPortfolio=()=>{const id=Date.now(),n=portfolios.length+1;setPortfolios(ps=>[...ps,{id,name:`Portfolio ${n}`,holdings:[],targets:{}}]);setActiveId(id);};
  const renamePortfolio=(id,name)=>setPortfolios(ps=>ps.map(p=>p.id===id?{...p,name}:p));
  const deletePortfolio=id=>{if(portfolios.length<=1)return;const r=portfolios.filter(p=>p.id!==id);setPortfolios(r);if(activeId===id)setActiveId(r[0].id);};
  const addHolding=h=>setHoldings(p=>[...p,h]);
  const removeHolding=id=>setHoldings(p=>p.filter(h=>h.id!==id));
  const saveTarget=(id,val)=>setTargets(p=>val==null?Object.fromEntries(Object.entries(p).filter(([k])=>+k!==id)):{...p,[id]:val});
  const saveUnpledgedQty=(id,val)=>setHoldings(p=>p.map(h=>h.id===id?{...h,unpledgedQty:val}:h));
  const importHoldings=rows=>{const nt={};const nh=rows.map(({analystTarget,...h})=>{if(analystTarget!=null)nt[h.id]=analystTarget;return h;});setHoldings(p=>[...p,...nh]);if(Object.keys(nt).length)setTargets(p=>({...p,...nt}));};
  useEffect(()=>{localStorage.setItem('pm_portfolios',JSON.stringify(portfolios));},[portfolios]);
  useEffect(()=>{localStorage.setItem('pm_activeId',JSON.stringify(activeId));},[activeId]);
  useEffect(()=>{localStorage.setItem('pm_tweaks',JSON.stringify(tweaks));},[tweaks]);
  useEffect(()=>{if(window.electronAPI?.onUpdateAvailable)window.electronAPI.onUpdateAvailable(()=>setUpdateAvail(true));},[]);
  const fetchPrices=useCallback(async()=>{
    if(!holdings.length)return;setLoading(true);setError(null);const out={};
    await Promise.all(holdings.map(async h=>{try{const res=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(h.symbol)}?interval=1d&range=1d`,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error();const json=await res.json();const meta=json?.chart?.result?.[0]?.meta;if(meta?.regularMarketPrice){out[h.symbol]={current:meta.regularMarketPrice,prev:meta.chartPreviousClose??meta.regularMarketPrice,currency:meta.currency??(isUS(h.symbol)?'USD':'INR')};}else out[h.symbol]=null;}catch{out[h.symbol]=null;}}));
    // Only update entries that returned data; preserve last-known for failures
    const merged={...prices};
    let anyNew=false;
    for(const [sym,val] of Object.entries(out)){
      if(val){merged[sym]=val;anyNew=true;}
      // if null, keep merged[sym] as-is (last-known price)
    }
    if(!anyNew&&holdings.length){
      setError('Live prices unavailable — showing last known prices.');
    } else {
      setError(null);
    }
    setPrices({...merged});setLastUpdated(new Date());setLoading(false);
  },[holdings,prices]);
  useEffect(()=>{
    fetchPrices();
    const ms=(tweaks.autoRefreshMins||5)*60*1000;
    const t=setInterval(fetchPrices,ms);
    return()=>clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[fetchPrices,tweaks.autoRefreshMins]);
  const fetchStockDetail=useCallback(async(symbol,range='3mo')=>{
    setStockDetails(prev=>({...prev,[symbol]:{...prev[symbol],loading:true,range}}));
    try{
      // ── 1. Chart API — history + meta (52W, marketCap, volume) ──────────────
      const chartRes=await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}&includePrePost=false`,
        {headers:{Accept:'application/json'}}
      );
      const cj=await chartRes.json();
      const result=cj?.chart?.result?.[0]||{};
      const meta=result.meta||{};
      const ts=result.timestamp||[],q=result.indicators?.quote?.[0]||{};
      const history=ts.map((t,i)=>({
        date:t*1000,open:q.open?.[i],high:q.high?.[i],low:q.low?.[i],close:q.close?.[i],volume:q.volume?.[i],
        change:i>0&&q.close?.[i-1]?((q.close[i]-q.close[i-1])/q.close[i-1])*100:0,
      })).filter(d=>d.close!=null);

      // ── 2. Fundamentals: try v10 quoteSummary → v7 quote → chart meta ─────────
      const n=v=>v==null?null:(typeof v==='object'&&'raw' in v?v.raw:v);
      let qd={};  // v7 quote data
      let qs={};  // v10 quoteSummary data

      // Try v10 quoteSummary (best structured data, works without cookies)
      for(const host of ['query1','query2']){
        try{
          const r=await fetch(
            `https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,defaultKeyStatistics,financialData,price`,
            {headers:{Accept:'application/json'}}
          );
          if(r.ok){
            const j=await r.json();
            const res=j?.quoteSummary?.result?.[0];
            if(res){qs=res;break;}
          }
        }catch{}
      }

      // Try v7 quote as supplementary (good for marketCap, volume, 52W)
      for(const host of ['query1','query2']){
        try{
          const r=await fetch(
            `https://${host}.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&lang=en-US&region=US`,
            {headers:{Accept:'application/json'}}
          );
          if(r.ok){
            const j=await r.json();
            const res=j?.quoteResponse?.result?.[0];
            if(res?.symbol){qd=res;break;}
          }
        }catch{}
      }

      // ── 3. Merge all sources — v10 wins for fundamentals ────────────────────
      const sd=qs.summaryDetail||{}, fd=qs.financialData||{}, ks=qs.defaultKeyStatistics||{}, pd=qs.price||{};
      const betaVal=n(sd.beta)??n(ks.beta)??n(qd.beta)??n(qd.beta3Year)??n(meta.beta);
      const divYield=n(sd.dividendYield)??n(sd.trailingAnnualDividendYield)??n(qd.trailingAnnualDividendYield);
      const summary={
        price:{
          marketCap:           n(pd.marketCap)??n(qd.marketCap)??n(meta.marketCap),
          regularMarketVolume: n(pd.regularMarketVolume)??n(qd.regularMarketVolume)??n(meta.regularMarketVolume),
          shortName:           pd.shortName??qd.shortName??meta.shortName,
          recommendationKey:   fd.recommendationKey??qd.recommendationKey,
          targetMeanPrice:     n(fd.targetMeanPrice)??n(qd.targetMeanPrice),
        },
        summaryDetail:{
          trailingPE:       n(sd.trailingPE)??n(qd.trailingPE),
          fiftyTwoWeekHigh: n(sd.fiftyTwoWeekHigh)??n(qd.fiftyTwoWeekHigh)??n(meta.fiftyTwoWeekHigh),
          fiftyTwoWeekLow:  n(sd.fiftyTwoWeekLow)??n(qd.fiftyTwoWeekLow)??n(meta.fiftyTwoWeekLow),
          beta:             betaVal,
          dividendYield:    divYield,
        },
        defaultKeyStatistics:{
          trailingEps:             n(ks.trailingEps)??n(qd.epsTrailingTwelveMonths),
          numberOfAnalystOpinions: n(ks.numberOfAnalystOpinions)??n(qd.numberOfAnalystOpinions),
        },
        financialData:{
          recommendationKey:    fd.recommendationKey??qd.recommendationKey,
          targetMeanPrice:      n(fd.targetMeanPrice)??n(qd.targetMeanPrice),
          targetHighPrice:      n(fd.targetHighPrice),
          targetLowPrice:       n(fd.targetLowPrice),
          targetMeanPrice2:     n(fd.targetMeanPrice),
          numberOfAnalystOpinions: n(fd.numberOfAnalystOpinions),
        },
        recommendationTrend: qs.recommendationTrend||null,
      };

      setStockDetails(prev=>({...prev,[symbol]:{history,summary,loading:false,error:null,range}}));
    }catch(e){
      setStockDetails(prev=>({...prev,[symbol]:{history:[],summary:{},loading:false,error:'Failed to load data',range}}));
    }
  },[]);
  const fetchAIAnalysis=useCallback(async(symbol,holding,curPrice,currency,provider)=>{
    const prim=provider||primaryAI;
    if(!groqKey&&!geminiKey)return;
    setAiAnalyses(prev=>({...prev,[symbol]:{...prev[symbol],loading:true,error:null}}));
    const cur=currency==='INR'?'₹':'$';
    const pos=holding
      ?`The user holds ${holding.qty} shares bought at ${cur}${holding.buyPrice}. Current price: ${cur}${curPrice?.toFixed(2)??'unknown'}.`
      :'The user does not hold this stock.';
    const prompt=`You are a concise financial analyst. Analyse ${symbol} (${holding?.name||symbol}).
${pos}
Respond ONLY as a JSON object with these keys:
{"overview":"2-sentence description","sentiment":"Bullish|Neutral|Bearish","performance":"2-sentence recent performance","opportunities":["pt1","pt2","pt3"],"risks":["r1","r2","r3"],"positionComment":"1 sentence on user position or null","disclaimer":"Not financial advice."}`;
    try{
      const {text,usedProvider}=await callAI(groqKey,geminiKey,prim,prompt);
      const data=extractJSON(text);
      if(data) setAiAnalyses(prev=>({...prev,[symbol]:{loading:false,data,error:null,provider:usedProvider}}));
      else setAiAnalyses(prev=>({...prev,[symbol]:{loading:false,data:null,error:'Could not parse AI response.',provider:usedProvider}}));
    }catch(e){
      setAiAnalyses(prev=>({...prev,[symbol]:{loading:false,data:null,error:e.message,provider:null}}));
    }
  },[groqKey,geminiKey,primaryAI]);

  const openStockTab=useCallback((symbol)=>{
    if(!openStockTabs.find(t=>t.symbol===symbol))setOpenStockTabs(prev=>[...prev,{symbol}]);
    setMainTab(`stock:${symbol}`);
    const ex=stockDetails[symbol];if(!ex||ex.error||!ex.history?.length)fetchStockDetail(symbol,'3mo');
  },[openStockTabs,stockDetails,fetchStockDetail]);
  const closeStockTab=useCallback((symbol)=>{setOpenStockTabs(prev=>prev.filter(t=>t.symbol!==symbol));if(mainTab===`stock:${symbol}`)setMainTab('IN');},[mainTab]);
  const rows=useMemo(()=>holdings.map(h=>{const p=prices[h.symbol],cur=p?.currency??(isUS(h.symbol)?'USD':'INR'),cp=p?.current??null;const inv=parseFloat((h.buyPrice*h.qty).toFixed(8)),cv=cp!=null?parseFloat((cp*h.qty).toFixed(2)):null;const g=cv!=null?cv-inv:null,gp=g!=null?(g/inv)*100:null,dc=p?((p.current-p.prev)/p.prev)*100:null,dp=dc!=null&&cv!=null?(dc/100)*cv:null;return{...h,currency:cur,curPrice:cp,invested:inv,curValue:cv,gain:g,gainPct:gp,dayChange:dc,dayPL:dp};}),[holdings,prices]);
  const inRows=useMemo(()=>rows.filter(r=>r.currency==='INR'),[rows]);
  const usRows=useMemo(()=>rows.filter(r=>r.currency==='USD'),[rows]);
  const inPie=useMemo(()=>inRows.map(r=>({name:short(r.symbol),value:r.curValue??r.invested})),[inRows]);
  const usPie=useMemo(()=>usRows.map(r=>({name:short(r.symbol),value:r.curValue??r.invested})),[usRows]);
  const gainIN=inRows.reduce((s,r)=>s+(r.gain??0),0),gainUS=usRows.reduce((s,r)=>s+(r.gain??0),0);
  const dayIN=inRows.reduce((s,r)=>s+(r.dayPL??0),0),dayUS=usRows.reduce((s,r)=>s+(r.dayPL??0),0);
  const totalIN=inRows.reduce((s,r)=>s+(r.curValue??r.invested),0),totalUS=usRows.reduce((s,r)=>s+(r.curValue??r.invested),0);
  const invIN=inRows.reduce((s,r)=>s+r.invested,0),invUS=usRows.reduce((s,r)=>s+r.invested,0);
  const activeStock=mainTab.startsWith('stock:')?mainTab.slice(6):null;
  const sharedProps={fetchPrices,loading,error,lastUpdated,targets,onSaveTarget:saveTarget,onSaveUnpledged:saveUnpledgedQty,onRemove:removeHolding,compact:tweaks.compactRows,addHolding,T};

  // Sidebar content for IN/US views
  const SidebarContent=({sRows,pie,currency,usdInr,invAmt,totalAmt,gain,dayGain,offset})=>{
    const tRows=sRows.filter(r=>targets[r.id]!=null&&r.curPrice!=null);
    return(
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {/* Portfolio summary */}
        <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.accent,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>{activePf?.name}</span>
          </div>
          <div style={{padding:'8px 16px 12px'}}>
            {[
              {l:'Holdings',v:`${sRows.length} stocks`},
              {l:'Winners / Losers',v:`${sRows.filter(r=>(r.gain??0)>0).length} / ${sRows.filter(r=>(r.gain??0)<0).length}`},
              null,
              {l:'Invested',v:fmt(invAmt,currency)},
              {l:'Current Value',v:fmt(totalAmt,currency)},
              {l:'Total P&L',v:`${gain>=0?'+':'−'}${fmt(Math.abs(gain),currency)}`,vc:gColor(gain,T),sub:currency==='USD'&&usdInr?`≈ ${gain>=0?'+':'−'}₹${Math.abs(gain*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}`:''},
              {l:"Today's P&L",v:`${dayGain>=0?'+':'−'}${fmt(Math.abs(dayGain),currency)}`,vc:gColor(dayGain,T),sub:currency==='USD'&&usdInr?`≈ ${dayGain>=0?'+':'−'}₹${Math.abs(dayGain*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}`:''},
            ].map((row,i)=>row===null?<div key={i} style={{height:1,background:T.border,margin:'8px 0'}}/>
              :<div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'5px 0',fontSize:12,borderBottom:`1px solid ${T.border}`}}>
                <span style={{color:T.text3}}>{row.l}</span>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:600,color:row.vc||T.text}}>{row.v}</div>
                  {row.sub&&<div style={{fontSize:10,color:row.vc||T.text3,opacity:.7}}>{row.sub}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
        {currency==='USD'&&usdInr&&(
          <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,color:T.text3,fontWeight:600}}>💱 USD/INR</span>
            <span style={{fontSize:12,fontWeight:700,color:T.text}}>₹{usdInr.toFixed(2)}</span>
          </div>
        )}
        {pie.length>0&&<DonutChart T={T} title="Allocation" data={pie} currency={currency} offset={offset}/>}
        {tweaks.showCharts&&sRows.length>0&&<PLBarChart rows={sRows} currency={currency} T={T}/>}
        {tRows.length>0&&(
          <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:700,color:T.text}}>Targets</span>
              <span style={{fontSize:11,color:T.text3,background:T.surface3,padding:'2px 8px',borderRadius:10,fontWeight:600}}>{tRows.length}</span>
            </div>
            <div style={{padding:'4px 16px 12px'}}>
              {tRows.sort((a,b)=>((targets[b.id]-b.curPrice)/b.curPrice)-((targets[a.id]-a.curPrice)/a.curPrice)).map(r=>{const tgt=targets[r.id],up=((tgt-r.curPrice)/r.curPrice)*100,col=up>=20?T.success:up>=0?'#8fd000':up>=-10?T.warning:T.danger;return(
                <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                  <div><div style={{fontWeight:700,color:T.text}}>{short(r.symbol)}</div><div style={{fontSize:10,color:T.text3,marginTop:1}}>{fmt(r.curPrice,r.currency)} → {fmt(tgt,r.currency)}</div></div>
                  <span style={{padding:'2px 8px',borderRadius:4,background:up>=0?T.successBg:T.dangerBg,color:col,fontWeight:700,fontSize:11}}>{up>=0?'▲':'▼'} {Math.abs(up).toFixed(1)}%</span>
                </div>
              );})}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Left sidebar nav items
  const NAV=[
    {id:'IN', label:'Indian Equity', icon:<Ic.India/>, flag:'🇮🇳', color:T.inColor},
    {id:'US', label:'US Equity',     icon:<Ic.US/>,    flag:'🇺🇸', color:T.usColor},
  ];

  return(
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',background:T.bg,height:'100vh',display:'flex',flexDirection:'column',color:T.text,overflow:'hidden'}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:${T.surface4};border-radius:3px}
        ::-webkit-scrollbar-track{background:transparent}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        input[type=range]{width:100%;accent-color:${T.accent}}
        button:disabled{opacity:.35;cursor:not-allowed!important}
      `}</style>

      {/* ── Title Bar ── */}
      <div style={{background:T.sidebar,height:64,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',borderBottom:`1px solid ${T.border}`,WebkitAppRegion:'drag',position:'relative',zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:12,WebkitAppRegion:'no-drag'}}>
          <div style={{width:32,height:32,borderRadius:8,background:T.accent,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,letterSpacing:'-.01em'}}>Portfolio Manager</div>
            <div style={{fontSize:10,color:T.text3,marginTop:1}}>Arun Verma · v4.2</div>
          </div>
        </div>

        {/* P&L pills */}
        <div style={{display:'flex',gap:10,alignItems:'center',WebkitAppRegion:'no-drag'}}>
          {inRows.length>0&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`}}>
            <span style={{fontSize:12}}>🇮🇳</span>
            <span style={{fontSize:13,fontWeight:700,color:gColor(gainIN,T)}}>{gainIN>=0?'+':'−'}₹{Math.abs(gainIN).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
            <div style={{width:1,height:14,background:T.border}}/>
            <span style={{fontSize:11,color:gColor(dayIN,T)}}>{dayIN>=0?'+':'−'}₹{Math.abs(dayIN).toLocaleString('en-IN',{maximumFractionDigits:0})} today</span>
          </div>}
          {usRows.length>0&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`}}>
            <span style={{fontSize:12}}>🇺🇸</span>
            <div style={{display:'flex',flexDirection:'column',gap:1}}>
              <span style={{fontSize:13,fontWeight:700,color:gColor(gainUS,T)}}>{gainUS>=0?'+':'−'}${Math.abs(gainUS).toLocaleString('en-US',{maximumFractionDigits:0})}</span>
              {usdInr&&<span style={{fontSize:9,color:gColor(gainUS,T),opacity:.75}}>≈ {gainUS>=0?'+':'−'}₹{Math.abs(gainUS*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>}
            </div>
            <div style={{width:1,height:18,background:T.border}}/>
            <div style={{display:'flex',flexDirection:'column',gap:1}}>
              <span style={{fontSize:11,color:gColor(dayUS,T)}}>{dayUS>=0?'+':'−'}${Math.abs(dayUS).toLocaleString('en-US',{maximumFractionDigits:0})} today</span>
              {usdInr&&<span style={{fontSize:9,color:gColor(dayUS,T),opacity:.75}}>≈ {dayUS>=0?'+':'−'}₹{Math.abs(dayUS*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>}
            </div>
          </div>}
        </div>

        {/* Controls */}
        <div style={{display:'flex',gap:6,alignItems:'center',WebkitAppRegion:'no-drag'}}>
          {updateAvail&&<NvBtn onClick={()=>window.electronAPI?.installUpdate()} variant="primary" T={T}><Ic.Update/> Update Ready</NvBtn>}
          <button onClick={()=>onUpdate('darkMode',!tweaks.darkMode)} style={{padding:'7px 8px',borderRadius:6,border:`1px solid ${T.border}`,background:'transparent',color:T.text3,cursor:'pointer',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}} onClick={()=>setTweaks(p=>({...p,darkMode:!p.darkMode}))}>
            {tweaks.darkMode?<Ic.Sun/>:<Ic.Moon/>}
          </button>
          <button onClick={()=>setShowSettings(v=>!v)} style={{padding:'7px 8px',borderRadius:6,border:`1px solid ${showSettings?T.accent:T.border}`,background:showSettings?T.accentBg:'transparent',color:showSettings?T.accent:T.text3,cursor:'pointer',display:'flex',transition:'all .1s'}}>
            <Ic.Settings/>
          </button>
          <div style={{display:'flex',marginLeft:4,gap:1}}>
            {[{icon:<Ic.Minimize/>,fn:()=>window.electronAPI?.minimize(),d:false},{icon:<Ic.Maximize/>,fn:()=>window.electronAPI?.maximize(),d:false},{icon:<Ic.X/>,fn:()=>window.electronAPI?.close(),d:true}].map(({icon,fn,d},i)=>(
              <button key={i} onClick={fn} style={{width:32,height:32,background:'transparent',border:'none',cursor:'pointer',color:T.text3,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.background=d?'rgba(244,67,54,.2)':T.surface3;e.currentTarget.style.color=d?T.danger:T.text;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=T.text3;}}>{icon}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body: Left Nav + Content ── */}
      <div style={{flex:1,overflow:'hidden',display:'flex'}}>

        {/* Left Sidebar */}
        <div style={{width:152,background:T.sidebar,borderRight:`1px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
          <div style={{padding:'16px 12px 8px',fontSize:10,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.08em'}}>Portfolios</div>
          {/* Main nav: IN | US */}
          {NAV.map(nav=>{
            const active=mainTab===nav.id||mainTab.startsWith('stock:');
            const isActive=mainTab===nav.id;
            return(
              <button key={nav.id} onClick={()=>setMainTab(nav.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:isActive?T.accentBg:'transparent',border:'none',borderLeft:isActive?`3px solid ${T.accent}`:'3px solid transparent',cursor:'pointer',width:'100%',textAlign:'left',color:isActive?T.accent:T.text2,transition:'all .15s',marginBottom:2}}>
                <span style={{fontSize:15}}>{nav.flag}</span>
                <span style={{fontSize:13,fontWeight:isActive?600:400}}>{nav.label}</span>
              </button>
            );
          })}
          {/* Stock tabs in sidebar */}
          {openStockTabs.length>0&&<>
            <div style={{padding:'12px 12px 6px',fontSize:10,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.08em',marginTop:8}}>Open Stocks</div>
            {openStockTabs.map(t=>{const tabId=`stock:${t.symbol}`,isA=mainTab===tabId,color=isUS(t.symbol)?T.usColor:T.inColor;return(
              <div key={t.symbol} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:isA?`${color}15`:'transparent',borderLeft:isA?`3px solid ${color}`:'3px solid transparent',transition:'all .15s',marginBottom:2}}>
                <button onClick={()=>setMainTab(tabId)} style={{background:'none',border:'none',cursor:'pointer',color:isA?color:T.text3,fontSize:12,fontWeight:isA?700:400,flex:1,textAlign:'left',padding:0}}>{short(t.symbol)}</button>
                <button onClick={()=>closeStockTab(t.symbol)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'1px 2px',display:'flex',transition:'color .1s'}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3}><Ic.X/></button>
              </div>
            );})}
          </>}
          {/* Bottom settings shortcut */}
          <div style={{marginTop:'auto',padding:'12px',borderTop:`1px solid ${T.border}`}}>
            <button onClick={()=>setShowSettings(v=>!v)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:6,background:showSettings?T.accentBg:'transparent',border:'none',cursor:'pointer',width:'100%',color:showSettings?T.accent:T.text3,transition:'all .15s',fontSize:12}}>
              <Ic.Settings/> Settings
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          {activeStock?(
            <StockDetailView symbol={activeStock} holding={rows.find(r=>r.symbol===activeStock)} detail={stockDetails[activeStock]} prices={prices} targets={targets} onSaveTarget={saveTarget} onRefresh={()=>fetchStockDetail(activeStock,stockDetails[activeStock]?.range||'3mo')} onRangeChange={(sym,range)=>fetchStockDetail(sym,range)} groqKey={groqKey} geminiKey={geminiKey} primaryAI={primaryAI} aiAnalysis={aiAnalyses[activeStock]} onAIRefresh={(prov)=>{const r=rows.find(r=>r.symbol===activeStock);fetchAIAnalysis(activeStock,r,r?.curPrice,r?.currency,prov);}} T={T}/>
          ):(
            <>
              {/* Portfolio sub-tabs */}
              <PortfolioTabs portfolios={portfolios} activeId={activeId} onSwitch={setActiveId} onAdd={addPortfolio} onRename={renamePortfolio} onDelete={deletePortfolio} T={T}/>
              {/* Main grid */}
              <div style={{flex:1,overflow:'hidden',display:'grid',gridTemplateColumns:'minmax(0,1fr) clamp(220px,20vw,280px)',gap:0}}>
                <div style={{overflowY:'auto',padding:20}}>
                  {mainTab==='IN'&&<Section title="Indian Equity" flag="🇮🇳" accent={T.inColor} rows={inRows} currency="INR" onImportCSV={()=>setImportModal('IN')} onRowClick={openStockTab} {...sharedProps}/>}
                  {mainTab==='US'&&<Section title="US Equity" flag="🇺🇸" accent={T.usColor} rows={usRows} currency="USD" usdInr={usdInr} onImportCSV={()=>setImportModal('US')} onRowClick={openStockTab} {...sharedProps}/>}
                </div>
                <div style={{overflowY:'auto',padding:'20px 16px 20px 0',borderLeft:`1px solid ${T.border}`}}>
                  <div style={{padding:'0 0 0 16px'}}>
                    {mainTab==='IN'&&<SidebarContent sRows={inRows} pie={inPie} currency="INR" invAmt={invIN} totalAmt={totalIN} gain={gainIN} dayGain={dayIN} offset={0}/>}
                    {mainTab==='US'&&<SidebarContent sRows={usRows} pie={usPie} currency="USD" usdInr={usdInr} invAmt={invUS} totalAmt={totalUS} gain={gainUS} dayGain={dayUS} offset={6}/>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showAISetup&&<AISetupModal onSave={saveAIKeys} T={T}/> }
      {showSettings&&<SettingsPanel tweaks={tweaks} onUpdate={(k,v)=>setTweaks(p=>({...p,[k]:v}))} onClose={()=>setShowSettings(false)} groqKey={groqKey} geminiKey={geminiKey} primaryAI={primaryAI} onSaveAIKeys={saveAIKeys} T={T}/>}
      {importModal&&<CSVImportModal market={importModal} onImport={importHoldings} onClose={()=>setImportModal(null)} T={T}/>}
    </div>
  );
}

export default function App() {
  return(
    <ErrorBoundary>
      <AppInner/>
    </ErrorBoundary>
  );
}
