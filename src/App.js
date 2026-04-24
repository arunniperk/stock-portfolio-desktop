import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ── THEME ─────────────────────────────────────────────────────────────────────
const mkT = (d, g60 = 60) => {
  const g = g60 / 100;
  return {
    bg: d ? '#020408' : '#f0f4ff', surface: d ? '#05080f' : '#ffffff',
    surface2: d ? '#090e1a' : '#f2f5fd', surface3: d ? '#0d1425' : '#e8eeff',
    border: d ? `rgba(99,102,241,${.18*g+.07})` : '#d0d8f0',
    borderHi: d ? `rgba(99,102,241,${.6*g+.2})` : '#6366f1',
    text: d ? '#b8cef0' : '#0a0c1a', text2: d ? '#3d5878' : '#4a5878',
    muted: d ? '#1a2840' : '#8899bb', accent: '#6366f1',
    accentLo: d ? `rgba(99,102,241,${.15*g})` : 'rgba(99,102,241,.08)',
    accentGlow: d ? `0 0 ${12*g}px rgba(99,102,241,${.6*g}),0 0 ${24*g}px rgba(99,102,241,${.3*g})` : 'none',
    cyan: '#00d9ff', cyanLo: d ? `rgba(0,217,255,${.12*g})` : 'rgba(0,217,255,.08)',
    cyanGlow: d ? `0 0 ${10*g}px rgba(0,217,255,${.5*g})` : 'none',
    success: d ? '#00ff88' : '#16a34a', successBg: d ? `rgba(0,255,136,${.1*g})` : 'rgba(22,163,74,.08)',
    successGlow: d ? `0 0 ${8*g}px rgba(0,255,136,${.4*g})` : 'none',
    danger: d ? '#ff2965' : '#dc2626', dangerBg: d ? `rgba(255,41,101,${.1*g})` : 'rgba(220,38,38,.08)',
    dangerGlow: d ? `0 0 ${8*g}px rgba(255,41,101,${.4*g})` : 'none',
    warning: '#ffaa00', warnBg: d ? `rgba(255,170,0,${.1*g})` : 'rgba(255,170,0,.08)',
    inColor: '#ff8c1a', usColor: '#00d9ff', dark: d,
  };
};
const PIE = ['#6366f1','#00d9ff','#00ff88','#ff2965','#ffaa00','#a855f7','#f97316','#10b981','#ec4899','#3b82f6','#8b5cf6','#06b6d4','#34d399','#fbbf24','#f43f5e'];
const PORT_COLORS = ['#6366f1','#00ff88','#ff8c1a','#ff2965','#00d9ff','#a855f7','#ffaa00','#ec4899'];

// ── DEFAULTS ─────────────────────────────────────────────────────────────────
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
const TWEAK_DEF = {darkMode:true,autoRefreshMins:5,compactRows:true,showCharts:true,glowIntensity:60};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const isUS = s => !s.endsWith('.NS') && !s.endsWith('.BO');
const short = s => s.replace('.NS','').replace('.BO','');
const fmtQty = v => v==null?'—':parseFloat(v.toFixed(8)).toString();
const fmt = (v,cur='INR') => {
  if(v==null||isNaN(v))return'—';
  return(cur==='USD'?'$':'₹')+Math.abs(v).toLocaleString(cur==='USD'?'en-US':'en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
};
const fmtBig = (v,cur='INR') => {
  if(v==null||isNaN(v))return'—';
  const s=cur==='USD'?'$':'₹';
  if(Math.abs(v)>=1e12)return`${s}${(v/1e12).toFixed(2)}T`;
  if(Math.abs(v)>=1e9)return`${s}${(v/1e9).toFixed(2)}B`;
  if(Math.abs(v)>=1e7)return`${s}${(v/1e7).toFixed(2)}Cr`;
  if(Math.abs(v)>=1e5)return`${s}${(v/1e5).toFixed(2)}L`;
  return fmt(v,cur);
};
const fmtPct = v => v==null||isNaN(v)?'—':`${v>=0?'+':''}${v.toFixed(2)}%`;
const gColor = (v,T) => v==null||isNaN(v)?T.text2:v>=0?T.success:T.danger;
const sortRows = (rows,col,dir) => [...rows].sort((a,b) => {
  let va=a[col],vb=b[col];
  if(va==null&&vb==null)return 0;if(va==null)return dir==='asc'?1:-1;if(vb==null)return dir==='asc'?-1:1;
  if(typeof va==='string')va=va.toLowerCase();if(typeof vb==='string')vb=vb.toLowerCase();
  return dir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0);
});

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Ic = {
  Plus:()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><line x1="12"y1="5"x2="12"y2="19"/><line x1="5"y1="12"x2="19"y2="12"/></svg>,
  Trash:()=><svg width="11"height="11"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  Refresh:({s})=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"style={{animation:s?'spin .7s linear infinite':'none'}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  Dl:()=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12"y1="15"x2="12"y2="3"/></svg>,
  Upload:()=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12"y1="3"x2="12"y2="15"/></svg>,
  Search:()=><svg width="11"height="11"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="11"cy="11"r="8"/><line x1="21"y1="21"x2="16.65"y2="16.65"/></svg>,
  Pencil:()=><svg width="10"height="10"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Check:()=><svg width="11"height="11"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  X:()=><svg width="10"height="10"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><line x1="18"y1="6"x2="6"y2="18"/><line x1="6"y1="6"x2="18"y2="18"/></svg>,
  Moon:()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Sun:()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="5"/><line x1="12"y1="1"x2="12"y2="3"/><line x1="12"y1="21"x2="12"y2="23"/><line x1="4.22"y1="4.22"x2="5.64"y2="5.64"/><line x1="18.36"y1="18.36"x2="19.78"y2="19.78"/><line x1="1"y1="12"x2="3"y2="12"/><line x1="21"y1="12"x2="23"y2="12"/><line x1="4.22"y1="19.78"x2="5.64"y2="18.36"/><line x1="18.36"y1="5.64"x2="19.78"y2="4.22"/></svg>,
  Up:()=><svg width="9"height="9"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>,
  Dn:()=><svg width="9"height="9"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>,
  Gear:()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  File:()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Alert:()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="10"/><line x1="12"y1="8"x2="12"y2="12"/><line x1="12"y1="16"x2="12.01"y2="16"/></svg>,
  Minimize:()=><svg width="11"height="11"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><line x1="5"y1="12"x2="19"y2="12"/></svg>,
  Maximize:()=><svg width="10"height="10"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><rect x="3"y="3"width="18"height="18"/></svg>,
  Update:()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
  Chart:()=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Target:()=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="10"/><circle cx="12"cy="12"r="6"/><circle cx="12"cy="12"r="2"/></svg>,
};

// ── CORNER BRACKET ────────────────────────────────────────────────────────────
const Corner = ({pos,color,size=10,thickness=1.5}) => {
  const st={TL:{top:0,left:0,borderTop:`${thickness}px solid ${color}`,borderLeft:`${thickness}px solid ${color}`},TR:{top:0,right:0,borderTop:`${thickness}px solid ${color}`,borderRight:`${thickness}px solid ${color}`},BL:{bottom:0,left:0,borderBottom:`${thickness}px solid ${color}`,borderLeft:`${thickness}px solid ${color}`},BR:{bottom:0,right:0,borderBottom:`${thickness}px solid ${color}`,borderRight:`${thickness}px solid ${color}`}};
  return <div style={{position:'absolute',width:size,height:size,...st[pos]}}/>;
};

// ── BADGE ─────────────────────────────────────────────────────────────────────
const Badge = ({val,pct,currency,T}) => {
  if(val==null||isNaN(val))return<span style={{color:T.muted,fontFamily:"'DM Mono',monospace",fontSize:11}}>—</span>;
  const pos=val>=0,col=pos?T.success:T.danger,bg=pos?T.successBg:T.dangerBg,glow=pos?T.successGlow:T.dangerGlow;
  return<span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',background:bg,color:col,fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:700,whiteSpace:'nowrap',border:`1px solid ${col}30`,boxShadow:glow}}>{pct?fmtPct(val):`${pos?'+':'−'}${fmt(Math.abs(val),currency)}`}</span>;
};

// ── SORT HEADER ───────────────────────────────────────────────────────────────
function SortTh({label,col,sort,onSort,T,right=false,minW,sticky=false}) {
  const active=sort.col===col;
  const [hov,setHov]=useState(false);
  return(
    <th onClick={()=>onSort(col)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{padding:'0 10px',height:32,background:T.dark?'rgba(6,10,20,.95)':T.surface2,borderBottom:`1px solid ${active?T.borderHi:T.border}`,color:active?T.accent:hov?T.text:T.muted,fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,fontFamily:"'DM Mono',monospace",whiteSpace:'nowrap',cursor:'pointer',userSelect:'none',textAlign:right?'right':'left',minWidth:minW,transition:'all .12s',position:sticky?'sticky':'static',left:sticky?0:'auto',zIndex:sticky?2:1,boxShadow:active&&T.dark?`inset 0 -1px 0 ${T.accent}`:'none'}}>
      <span style={{display:'flex',alignItems:'center',gap:3,justifyContent:right?'flex-end':'flex-start'}}>
        {label}<span style={{opacity:active?1:.2,color:active?T.accent:'inherit'}}>{active&&sort.dir==='asc'?<Ic.Up/>:<Ic.Dn/>}</span>
      </span>
    </th>
  );
}

// ── ANALYST TARGET CELL ───────────────────────────────────────────────────────
function TargetCell({id,target,curPrice,currency,onSave,T,compact=false}) {
  const [edit,setEdit]=useState(false);
  const [val,setVal]=useState(target!=null?String(target):'');
  const save=()=>{const n=parseFloat(val);onSave(id,isNaN(n)?null:n);setEdit(false);};
  const up=(target!=null&&curPrice!=null)?((target-curPrice)/curPrice)*100:null;
  const col=up==null?T.muted:up>=20?T.success:up>=5?'#00cc6a':up>=0?'#00aa55':up>=-10?T.warning:T.danger;
  if(edit)return(
    <div style={{display:'flex',gap:4,alignItems:'center'}}>
      <input autoFocus type="number" value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape')setEdit(false);}} placeholder="Price target" style={{width:88,padding:'4px 8px',background:T.surface3,color:T.text,fontSize:12,border:`1px solid ${T.accent}`,outline:'none',fontFamily:"'DM Mono',monospace"}}/>
      <button onClick={save} style={{background:'none',border:'none',cursor:'pointer',color:T.success,padding:2,display:'flex',alignItems:'center'}}><Ic.Check/></button>
      <button onClick={()=>setEdit(false)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:2,display:'flex',alignItems:'center'}}><Ic.X/></button>
    </div>
  );
  return(
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      <div style={{display:'flex',alignItems:'center',gap:5}}>
        <span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:12,color:col,fontStyle:target==null?'italic':'normal',opacity:target==null?.6:1}}>{target!=null?fmt(target,currency):'Set target'}</span>
        <button onClick={()=>{setVal(target!=null?String(target):'');setEdit(true);}} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:2,lineHeight:1,display:'flex',alignItems:'center',opacity:.5,transition:'opacity .1s'}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity='.5'}><Ic.Pencil/></button>
        {target!=null&&<button onClick={()=>onSave(id,null)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:2,lineHeight:1,display:'flex',alignItems:'center',opacity:.4,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.opacity=1;e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.opacity='.4';e.currentTarget.style.color=T.muted;}}><Ic.X/></button>}
      </div>
      {!compact&&up!=null&&<span style={{fontSize:9,fontWeight:700,color:col,fontFamily:"'DM Mono',monospace",letterSpacing:'.04em',textShadow:T.dark?`0 0 6px ${col}60`:'none'}}>{up>=0?'▲':'▼'} {Math.abs(up).toFixed(1)}% {up>=0?'UPSIDE':'DOWNSIDE'}</span>}
    </div>
  );
}

// ── UNPLEDGED QTY CELL ────────────────────────────────────────────────────────
function UnpledgedQtyCell({id,unpledgedQty,totalQty,onSave,T}) {
  const [edit,setEdit]=useState(false);
  const [val,setVal]=useState(unpledgedQty!=null?String(unpledgedQty):'');
  const save=()=>{const n=parseFloat(val);onSave(id,isNaN(n)||n<0?null:Math.min(n,totalQty));setEdit(false);};
  const pledged=unpledgedQty!=null?totalQty-unpledgedQty:null;
  const pctFree=unpledgedQty!=null&&totalQty?(unpledgedQty/totalQty)*100:null;
  const col=pctFree==null?T.muted:pctFree>=80?T.success:pctFree>=50?T.warning:T.danger;
  if(edit)return(
    <div style={{display:'flex',gap:4,alignItems:'center'}}>
      <input autoFocus type="number" value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape')setEdit(false);}}
        placeholder={`0–${fmtQty(totalQty)}`} min={0} max={totalQty} step="0.00000001"
        style={{width:80,padding:'4px 8px',background:T.surface3,color:T.text,fontSize:12,
          border:`1px solid ${T.accent}`,outline:'none',fontFamily:"'DM Mono',monospace"}}/>
      <button onClick={save} style={{background:'none',border:'none',cursor:'pointer',color:T.success,padding:2,display:'flex',alignItems:'center'}}><Ic.Check/></button>
      <button onClick={()=>setEdit(false)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:2,display:'flex',alignItems:'center'}}><Ic.X/></button>
    </div>
  );
  return(
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      <div style={{display:'flex',alignItems:'center',gap:5}}>
        <span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:11,color:col,fontStyle:unpledgedQty==null?'italic':'normal',opacity:unpledgedQty==null?.5:1}}>
          {unpledgedQty!=null?fmtQty(unpledgedQty):'—'}
        </span>
        <button onClick={()=>{setVal(unpledgedQty!=null?String(unpledgedQty):'');setEdit(true);}} title="Edit unpledged qty"
          style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:2,lineHeight:1,display:'flex',alignItems:'center',opacity:.45,transition:'opacity .1s'}}
          onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity='.45'}><Ic.Pencil/></button>
        {unpledgedQty!=null&&<button onClick={()=>onSave(id,null)} title="Clear"
          style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:2,lineHeight:1,display:'flex',alignItems:'center',opacity:.35,transition:'all .1s'}}
          onMouseEnter={e=>{e.currentTarget.style.opacity=1;e.currentTarget.style.color=T.danger;}}
          onMouseLeave={e=>{e.currentTarget.style.opacity='.35';e.currentTarget.style.color=T.muted;}}><Ic.X/></button>}
      </div>
      {pledged!=null&&<span style={{fontSize:8,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:'.04em'}}>
        {fmtQty(pledged)} pledged · {pctFree.toFixed(0)}% free
      </span>}
    </div>
  );
}


function Stat({label,value,sub,vc,accentColor,T}) {
  const c=accentColor||vc||T.accent;
  return(
    <div style={{background:T.dark?T.surface2:'#fff',border:`1px solid ${T.border}`,position:'relative',overflow:'hidden',padding:'10px 12px',boxShadow:T.dark?`inset 0 1px 0 ${c}18`:'none'}}>
      <Corner pos="TL" color={c} size={8} thickness={1}/><Corner pos="BR" color={c} size={8} thickness={1}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${c},transparent)`}}/>
      <div style={{fontSize:8,color:T.muted,textTransform:'uppercase',letterSpacing:'.12em',fontWeight:700,marginBottom:5,fontFamily:"'DM Mono',monospace"}}>{label}</div>
      <div style={{fontSize:15,fontWeight:700,color:vc||T.text,fontFamily:"'DM Mono',monospace",lineHeight:1.2,textShadow:T.dark&&vc?`0 0 12px ${vc}50`:'none'}}>{value}</div>
      {sub&&<div style={{fontSize:9,color:T.text2,marginTop:3,fontFamily:"'DM Mono',monospace"}}>{sub}</div>}
    </div>
  );
}

// ── SVG PRICE CHART ───────────────────────────────────────────────────────────
function PriceChart({history,buyPrice,analystTarget,currency,T}) {
  const [hover,setHover]=useState(null);
  const svgRef=useRef();
  if(!history||history.length<2)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,color:T.muted,fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:'.06em'}}>
      <span style={{animation:'pulse 1.5s infinite'}}>◈ LOADING CHART…</span>
    </div>
  );
  const VW=800,VH=240,PAD={t:20,r:24,b:44,l:72};
  const W=VW-PAD.l-PAD.r,H=VH-PAD.t-PAD.b;
  const closes=history.map(d=>d.close);
  const allP=[...closes];if(buyPrice)allP.push(buyPrice);if(analystTarget)allP.push(analystTarget);
  const minP=Math.min(...allP)*.985,maxP=Math.max(...allP)*1.015,range=maxP-minP||1;
  const xOf=i=>PAD.l+(i/(history.length-1))*W;
  const yOf=p=>PAD.t+H-((p-minP)/range)*H;
  const linePath=history.map((d,i)=>`${i===0?'M':'L'}${xOf(i).toFixed(1)},${yOf(d.close).toFixed(1)}`).join(' ');
  const areaPath=linePath+` L${xOf(history.length-1).toFixed(1)},${(PAD.t+H).toFixed(1)} L${PAD.l},${PAD.t+H} Z`;
  const isUp=closes[closes.length-1]>=closes[0],lc=isUp?T.success:T.danger;
  const handleMM=e=>{
    if(!svgRef.current)return;
    const rect=svgRef.current.getBoundingClientRect();
    const svgX=((e.clientX-rect.left)/rect.width)*VW;
    const i=Math.max(0,Math.min(history.length-1,Math.round(((svgX-PAD.l)/W)*(history.length-1))));
    setHover({i,...history[i]});
  };
  const yTicks=5;
  const yL=Array.from({length:yTicks},(_,i)=>{const p=minP+(range/(yTicks-1))*i;return{y:yOf(p),label:fmt(p,currency)};}).reverse();
  const xStep=Math.max(1,Math.floor(history.length/7));
  const xDates=history.filter((_,i)=>i%xStep===0||i===history.length-1);
  return(
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{width:'100%',height:'auto',display:'block',cursor:'crosshair'}} onMouseMove={handleMM} onMouseLeave={()=>setHover(null)}>
      <defs>
        <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lc} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={lc} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {yL.map((l,i)=><line key={i} x1={PAD.l} y1={l.y} x2={PAD.l+W} y2={l.y} stroke={T.border} strokeWidth="0.5" strokeDasharray="4 4"/>)}
      <path d={areaPath} fill="url(#gc)"/>
      <path d={linePath} fill="none" stroke={lc} strokeWidth="1.8" style={{filter:T.dark?`drop-shadow(0 0 4px ${lc}80)`:'none'}}/>
      {buyPrice&&buyPrice>=minP&&buyPrice<=maxP&&<>
        <line x1={PAD.l} y1={yOf(buyPrice)} x2={PAD.l+W} y2={yOf(buyPrice)} stroke={T.warning} strokeWidth="1" strokeDasharray="6 4" opacity=".8"/>
        <rect x={PAD.l+4} y={yOf(buyPrice)-13} width={88} height={12} fill={T.surface2} opacity=".9"/>
        <text x={PAD.l+8} y={yOf(buyPrice)-3} fontSize={8} fill={T.warning} fontFamily="'DM Mono',monospace" fontWeight="700">BUY {fmt(buyPrice,currency)}</text>
      </>}
      {analystTarget&&analystTarget>=minP&&analystTarget<=maxP&&<>
        <line x1={PAD.l} y1={yOf(analystTarget)} x2={PAD.l+W} y2={yOf(analystTarget)} stroke={T.cyan} strokeWidth="1" strokeDasharray="6 4" opacity=".8"/>
        <rect x={PAD.l+4} y={yOf(analystTarget)-13} width={98} height={12} fill={T.surface2} opacity=".9"/>
        <text x={PAD.l+8} y={yOf(analystTarget)-3} fontSize={8} fill={T.cyan} fontFamily="'DM Mono',monospace" fontWeight="700">TARGET {fmt(analystTarget,currency)}</text>
      </>}
      {yL.map((l,i)=><text key={i} x={PAD.l-5} y={l.y+4} fontSize={8} fill={T.muted} fontFamily="'DM Mono',monospace" textAnchor="end">{l.label}</text>)}
      {xDates.map((d,i)=>{const idx=history.indexOf(d);return<text key={i} x={xOf(idx)} y={PAD.t+H+16} fontSize={8} fill={T.muted} fontFamily="'DM Mono',monospace" textAnchor="middle">{new Date(d.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</text>;})}
      {hover&&<>
        <line x1={xOf(hover.i)} y1={PAD.t} x2={xOf(hover.i)} y2={PAD.t+H} stroke={T.text2} strokeWidth="0.5" strokeDasharray="3 3"/>
        <circle cx={xOf(hover.i)} cy={yOf(hover.close)} r={4} fill={lc} stroke={T.surface} strokeWidth="2" style={{filter:T.dark?`drop-shadow(0 0 5px ${lc})`:'none'}}/>
        <rect x={Math.min(xOf(hover.i)+10,VW-162)} y={PAD.t+2} width={156} height={82} rx={2} fill={T.surface2} stroke={lc} strokeWidth="0.8" opacity=".97"/>
        <text x={Math.min(xOf(hover.i)+17,VW-155)} y={PAD.t+16} fontSize={8} fill={T.muted} fontFamily="'DM Mono',monospace">{new Date(hover.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</text>
        <text x={Math.min(xOf(hover.i)+17,VW-155)} y={PAD.t+31} fontSize={12} fill={T.text} fontFamily="'DM Mono',monospace" fontWeight="700">{fmt(hover.close,currency)}</text>
        <text x={Math.min(xOf(hover.i)+17,VW-155)} y={PAD.t+45} fontSize={9} fill={hover.change>=0?T.success:T.danger} fontFamily="'DM Mono',monospace">{hover.change>=0?'▲':'▼'} {Math.abs(hover.change||0).toFixed(2)}%</text>
        <text x={Math.min(xOf(hover.i)+17,VW-155)} y={PAD.t+59} fontSize={8} fill={T.muted} fontFamily="'DM Mono',monospace">O:{fmt(hover.open,currency)} H:{fmt(hover.high,currency)}</text>
        <text x={Math.min(xOf(hover.i)+17,VW-155)} y={PAD.t+72} fontSize={8} fill={T.muted} fontFamily="'DM Mono',monospace">L:{fmt(hover.low,currency)} Vol:{((hover.volume||0)/1e6).toFixed(2)}M</text>
      </>}
    </svg>
  );
}

// ── STOCK DETAIL VIEW ─────────────────────────────────────────────────────────
function StockDetailView({symbol,holding,detail,prices,targets,onSaveTarget,onRefresh,onRangeChange,T}) {
  const p=prices[symbol],currency=p?.currency||(isUS(symbol)?'USD':'INR'),curPrice=p?.current??null;
  const dayChange=p?((p.current-p.prev)/p.prev)*100:null;
  const invested=holding?holding.buyPrice*holding.qty:null;
  const curValue=curPrice!=null&&holding?curPrice*holding.qty:null;
  const gain=curValue!=null&&invested!=null?curValue-invested:null;
  const gainPct=gain!=null&&invested?gain/invested*100:null;
  const target=holding?targets[holding.id]??null:null;
  const targetUp=target!=null&&curPrice!=null?(target-curPrice)/curPrice*100:null;
  const sm=detail?.summary||{};
  const priceData=sm.price||{},stats=sm.summaryDetail||{},keyStats=sm.defaultKeyStatistics||{};
  const finData=sm.financialData||{},recTrend=sm.recommendationTrend?.trend?.[0]||{};
  const totalAna=(recTrend.strongBuy||0)+(recTrend.buy||0)+(recTrend.hold||0)+(recTrend.sell||0)+(recTrend.strongSell||0);
  const recKey=finData.recommendationKey||priceData.recommendationKey||null;
  const recColor=recKey==='strongBuy'||recKey==='buy'?T.success:recKey==='hold'?T.warning:T.danger;
  const history=detail?.history||[];
  const loading=detail?.loading;
  const curRange=detail?.range||'3mo';
  const RANGES=[{v:'1mo',l:'1M'},{v:'3mo',l:'3M'},{v:'6mo',l:'6M'},{v:'1y',l:'1Y'}];
  const accent=isUS(symbol)?T.usColor:T.inColor;
  const dayRows=useMemo(()=>[...history].reverse().slice(0,60).map(d=>({...d,dayPL:holding&&d.change!=null?(d.change/100)*d.close*holding.qty:null})),[history,holding]);
  const tdS={padding:'6px 12px',borderBottom:`1px solid ${T.border}`,fontFamily:"'DM Mono',monospace",fontSize:11,whiteSpace:'nowrap'};
  const Row=({l,v,vc})=>(
    <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:10,borderBottom:`1px solid ${T.border}`,fontFamily:"'DM Mono',monospace"}}>
      <span style={{color:T.muted}}>{l}</span>
      <span style={{fontWeight:700,color:vc||T.text,textShadow:vc&&T.dark?`0 0 6px ${vc}40`:'none'}}>{v}</span>
    </div>
  );
  return(
    <div style={{flex:1,overflowY:'auto',padding:'10px 14px',display:'flex',flexDirection:'column',gap:12}}>
      {/* Header */}
      <div style={{background:T.surface,border:`1px solid ${accent}40`,position:'relative',overflow:'hidden',padding:'14px 20px',boxShadow:T.dark?`0 0 40px rgba(0,0,0,.5),inset 0 1px 0 ${accent}20`:'0 2px 12px rgba(0,0,0,.06)'}}>
        <Corner pos="TL" color={accent} size={14} thickness={2}/><Corner pos="TR" color={T.accent} size={14} thickness={2}/>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${accent},transparent)`}}/>
        {T.dark&&<div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)`,backgroundSize:'32px 32px',pointerEvents:'none'}}/>}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,position:'relative'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:22,fontWeight:900,color:accent,letterSpacing:'.06em',textShadow:T.dark?`0 0 20px ${accent}60`:'none'}}>{short(symbol)}</span>
              <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",border:`1px solid ${T.border}`,padding:'2px 8px',color:T.muted,letterSpacing:'.08em'}}>{isUS(symbol)?'NYSE/NASDAQ':'NSE/BSE'}</span>
              {dayChange!=null&&<span style={{fontSize:10,fontWeight:700,color:gColor(dayChange,T),fontFamily:"'DM Mono',monospace",background:dayChange>=0?T.successBg:T.dangerBg,padding:'2px 8px',border:`1px solid ${gColor(dayChange,T)}30`}}>{dayChange>=0?'▲':'▼'} {Math.abs(dayChange).toFixed(2)}% TODAY</span>}
            </div>
            <div style={{fontSize:11,color:T.text2,fontFamily:"'DM Mono',monospace",marginBottom:6,letterSpacing:'.03em'}}>{holding?.name||symbol}</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:700,color:T.text,letterSpacing:'-.02em',textShadow:T.dark?`0 0 20px ${T.text}20`:'none'}}>
              {curPrice!=null?fmt(curPrice,currency):<span style={{fontSize:16,color:T.muted,animation:'pulse 1.5s infinite'}}>LIVE PRICE…</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {RANGES.map(r=>(
              <button key={r.v} onClick={()=>onRangeChange(symbol,r.v)} style={{padding:'5px 12px',border:`1px solid ${curRange===r.v?accent:T.border}`,background:curRange===r.v?`${accent}18`:'transparent',color:curRange===r.v?accent:T.text2,cursor:'pointer',fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:curRange===r.v?700:400,boxShadow:curRange===r.v&&T.dark?`0 0 12px ${accent}40`:'none',transition:'all .12s'}}>{r.l}</button>
            ))}
            <button onClick={onRefresh} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',border:`1px solid ${T.border}`,background:'transparent',color:T.text2,cursor:'pointer',fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em',transition:'all .12s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text2;}}><Ic.Chart/>{loading?'LOADING…':'REFRESH'}</button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,position:'relative',overflow:'hidden'}}>
        <Corner pos="TL" color={T.accent} size={10}/><Corner pos="TR" color={T.accent} size={10}/>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${T.accent},transparent)`}}/>
        <div style={{padding:'8px 12px'}}>
          <PriceChart history={history} buyPrice={holding?.buyPrice??null} analystTarget={target} currency={currency} T={T}/>
          <div style={{display:'flex',gap:16,padding:'4px 8px',flexWrap:'wrap'}}>
            {holding?.buyPrice&&<span style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:T.warning,display:'flex',alignItems:'center',gap:5}}><span style={{display:'inline-block',width:18,borderTop:`1px dashed ${T.warning}`}}/> BUY PRICE</span>}
            {target&&<span style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:T.cyan,display:'flex',alignItems:'center',gap:5}}><span style={{display:'inline-block',width:18,borderTop:`1px dashed ${T.cyan}`}}/> ANALYST TARGET</span>}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {/* Position */}
        <div style={{background:T.surface,border:`1px solid ${accent}30`,position:'relative',overflow:'hidden'}}>
          <Corner pos="TL" color={accent} size={10} thickness={1.5}/>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${accent},transparent)`}}/>
          <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:10,fontWeight:700,color:T.text,fontFamily:"'Orbitron',monospace",letterSpacing:'.06em'}}>YOUR POSITION</span></div>
          <div style={{padding:'8px 14px'}}>
            {holding?[
              {l:'Quantity',v:fmtQty(holding.qty)},
              {l:'Unpledged Qty',v:holding.unpledgedQty!=null?fmtQty(holding.unpledgedQty):'—',vc:holding.unpledgedQty!=null&&holding.unpledgedQty<holding.qty?T.warning:null},
              {l:'Avg Buy Price',v:fmt(holding.buyPrice,currency)},
              {l:'Invested',v:fmt(invested,currency)},
              {l:'Market Value',v:curValue!=null?fmt(curValue,currency):'—'},
              {l:'Unrealized P&L',v:gain!=null?`${gain>=0?'+':'−'}${fmt(Math.abs(gain),currency)}`:'—',vc:gColor(gain,T)},
              {l:'Return %',v:gainPct!=null?fmtPct(gainPct):'—',vc:gColor(gainPct,T)},
              {l:'Day P&L',v:dayChange!=null&&curValue!=null?`${dayChange>=0?'+':'−'}${fmt(Math.abs(dayChange/100*(curValue||0)),currency)}`:'—',vc:gColor(dayChange,T)},
            ].map(({l,v,vc},i)=><Row key={i} l={l} v={v} vc={vc}/>)
            :<div style={{color:T.muted,fontSize:11,padding:'12px 0',textAlign:'center',fontFamily:"'DM Mono',monospace"}}>NOT HELD</div>}
          </div>
        </div>
        {/* Fundamentals */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,position:'relative',overflow:'hidden'}}>
          <Corner pos="TL" color={T.cyan} size={10} thickness={1.5}/>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${T.cyan},transparent)`}}/>
          <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:10,fontWeight:700,color:T.text,fontFamily:"'Orbitron',monospace",letterSpacing:'.06em'}}>FUNDAMENTALS</span></div>
          <div style={{padding:'8px 14px'}}>
            {[
              {l:'Market Cap',v:fmtBig(priceData.marketCap?.raw??priceData.marketCap,currency)},
              {l:'P/E (TTM)',v:stats.trailingPE?.raw!=null?stats.trailingPE.raw.toFixed(1):'—'},
              {l:'EPS (TTM)',v:keyStats.trailingEps?.raw!=null?fmt(keyStats.trailingEps.raw,currency):'—'},
              {l:'52W High',v:stats.fiftyTwoWeekHigh?.raw!=null?fmt(stats.fiftyTwoWeekHigh.raw,currency):'—'},
              {l:'52W Low',v:stats.fiftyTwoWeekLow?.raw!=null?fmt(stats.fiftyTwoWeekLow.raw,currency):'—'},
              {l:'Volume',v:priceData.regularMarketVolume?.raw!=null?`${(priceData.regularMarketVolume.raw/1e6).toFixed(2)}M`:'—'},
              {l:'Beta',v:stats.beta?.raw!=null?stats.beta.raw.toFixed(2):'—'},
              {l:'Div Yield',v:stats.dividendYield?.raw!=null?`${(stats.dividendYield.raw*100).toFixed(2)}%`:'—'},
            ].map(({l,v},i)=><Row key={i} l={l} v={v}/>)}
          </div>
        </div>
        {/* Analyst Target */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,position:'relative',overflow:'hidden'}}>
          <Corner pos="TL" color={T.warning} size={10} thickness={1.5}/>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${T.warning},transparent)`}}/>
          <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:10,fontWeight:700,color:T.text,fontFamily:"'Orbitron',monospace",letterSpacing:'.06em'}}>ANALYST TARGET</span></div>
          <div style={{padding:'10px 14px',display:'flex',flexDirection:'column',gap:10}}>
            {holding&&<TargetCell id={holding.id} target={target} curPrice={curPrice} currency={currency} onSave={onSaveTarget} T={T}/>}
            {!holding&&<span style={{color:T.muted,fontSize:11,fontFamily:"'DM Mono',monospace"}}>Not in portfolio</span>}
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:8}}>
              <div style={{fontSize:9,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:'.08em',marginBottom:6,fontWeight:700}}>ANALYST CONSENSUS</div>
              {recKey?(
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,color:recColor,textShadow:T.dark?`0 0 10px ${recColor}60`:'none',textTransform:'uppercase'}}>{recKey.replace(/([A-Z])/g,' $1').trim()}</span>
                  {totalAna>0&&<div style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:T.text2}}>{(recTrend.strongBuy||0)+(recTrend.buy||0)} Buy · {recTrend.hold||0} Hold · {(recTrend.sell||0)+(recTrend.strongSell||0)} Sell ({totalAna})</div>}
                  {finData.targetMeanPrice?.raw&&<div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:T.cyan}}>Mean: {fmt(finData.targetMeanPrice.raw,currency)}</div>}
                </div>
              ):<span style={{color:T.muted,fontSize:11,fontFamily:"'DM Mono',monospace",fontStyle:'italic'}}>No data</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Day-wise P&L Table */}
      {dayRows.length>0&&(
        <div style={{background:T.surface,border:`1px solid ${T.border}`,position:'relative',overflow:'hidden'}}>
          <Corner pos="TL" color={T.accent} size={10}/><Corner pos="BR" color={T.accent} size={10}/>
          <div style={{padding:'8px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:11,fontWeight:700,color:T.text,fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'.06em'}}>DAY-WISE PERFORMANCE ({dayRows.length} trading days)</span>
          </div>
          <div style={{overflowX:'auto',maxHeight:300,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead style={{position:'sticky',top:0,zIndex:2}}>
                <tr>{['DATE','OPEN','HIGH','LOW','CLOSE','DAY %','DAY P&L'].map(h=><th key={h} style={{...tdS,background:T.dark?'rgba(6,10,20,.98)':T.surface2,color:T.muted,fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,textAlign:h==='DATE'?'left':'right',padding:'8px 12px'}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {dayRows.map((d,i)=>(
                  <tr key={i} style={{background:i%2===0?T.surface:T.surface2}} onMouseEnter={e=>e.currentTarget.style.background=T.surface3} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:T.surface2}>
                    <td style={{...tdS,color:T.text2}}>{new Date(d.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                    <td style={{...tdS,textAlign:'right',color:T.text2}}>{fmt(d.open,currency)}</td>
                    <td style={{...tdS,textAlign:'right',color:T.success}}>{fmt(d.high,currency)}</td>
                    <td style={{...tdS,textAlign:'right',color:T.danger}}>{fmt(d.low,currency)}</td>
                    <td style={{...tdS,textAlign:'right',fontWeight:700,color:T.cyan,textShadow:T.dark?`0 0 6px ${T.cyan}40`:'none'}}>{fmt(d.close,currency)}</td>
                    <td style={{...tdS,textAlign:'right'}}><Badge val={d.change} pct T={T}/></td>
                    <td style={{...tdS,textAlign:'right'}}>{d.dayPL!=null?<Badge val={d.dayPL} currency={currency} T={T}/>:<span style={{color:T.muted}}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DONUT CHART ───────────────────────────────────────────────────────────────
function DonutChart({title,data,currency,offset=0,T}) {
  const [active,setActive]=useState(null);const [tip,setTip]=useState(null);
  const sorted=useMemo(()=>[...data].sort((a,b)=>b.value-a.value),[data]);
  const total=sorted.reduce((s,d)=>s+d.value,0);
  const CX=65,CY=65,OUTER=60,INNER=30,GAP=2;
  const segs=useMemo(()=>{let cum=0;return sorted.map((d,i)=>{const frac=total?d.value/total:0,s=cum+GAP/360,e=cum+frac-GAP/360;cum+=frac;const sa=(s*2*Math.PI)-Math.PI/2,ea=(e*2*Math.PI)-Math.PI/2;const x1o=CX+OUTER*Math.cos(sa),y1o=CY+OUTER*Math.sin(sa),x2o=CX+OUTER*Math.cos(ea),y2o=CY+OUTER*Math.sin(ea);const x1i=CX+INNER*Math.cos(ea),y1i=CY+INNER*Math.sin(ea),x2i=CX+INNER*Math.cos(sa),y2i=CY+INNER*Math.sin(sa);return{d,i,frac,path:`M${x1o} ${y1o} A${OUTER} ${OUTER} 0 ${frac>.5?1:0} 1 ${x2o} ${y2o} L${x1i} ${y1i} A${INNER} ${INNER} 0 ${frac>.5?1:0} 0 ${x2i} ${y2i}Z`,color:PIE[(i+offset)%PIE.length]};});},[sorted,total,offset]);
  return(
    <div style={{background:T.surface,border:`1px solid ${T.border}`,position:'relative',overflow:'hidden'}}>
      <Corner pos="TL" color={T.accent} size={10}/><Corner pos="TR" color={T.accent} size={10}/>
      <Corner pos="BL" color={T.accent} size={10}/><Corner pos="BR" color={T.accent} size={10}/>
      <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:11,fontWeight:700,color:T.text,fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'.06em'}}>{title}</span>
        <span style={{fontSize:9,color:T.muted,fontFamily:"'DM Mono',monospace",border:`1px solid ${T.border}`,padding:'1px 7px'}}>{sorted.length} STOCKS</span>
      </div>
      {!sorted.length?<div style={{color:T.muted,fontSize:11,textAlign:'center',padding:20,fontFamily:"'DM Mono',monospace"}}>NO HOLDINGS</div>
      :<div style={{padding:'10px 12px',display:'flex',gap:12,alignItems:'flex-start'}}>
        <div style={{flexShrink:0,position:'relative'}}>
          <svg width={130} height={130} style={{display:'block'}}>
            <circle cx={CX} cy={CY} r={OUTER+4} fill="none" stroke={T.border} strokeWidth=".5" strokeDasharray="2 4"/>
            {segs.map(s=><path key={s.i} d={s.path} fill={s.color} opacity={active===null||active===s.i?1:.2} style={{cursor:'default',transition:'opacity .15s',filter:active===s.i&&T.dark?`drop-shadow(0 0 4px ${s.color})`:'none'}} onMouseEnter={e=>{setActive(s.i);setTip({x:e.nativeEvent.offsetX,y:e.nativeEvent.offsetY,d:s.d,pct:(s.frac*100).toFixed(1),color:s.color});}} onMouseLeave={()=>{setActive(null);setTip(null);}}/>)}
            <text x={CX} y={CY-5} textAnchor="middle" fontSize={7} fill={T.muted} fontFamily="'DM Mono',monospace">{active!==null?sorted[active]?.name.toUpperCase().slice(0,8):'ALLOC'}</text>
            <text x={CX} y={CY+8} textAnchor="middle" fontSize={12} fontWeight="700" fill={T.text} fontFamily="'DM Mono',monospace">{active!==null?`${((segs[active]?.frac||0)*100).toFixed(1)}%`:sorted.length}</text>
          </svg>
          {tip&&<div style={{position:'absolute',top:tip.y+8,left:tip.x+6,background:T.surface2,border:`1px solid ${tip.color}60`,padding:'5px 9px',fontSize:10,pointerEvents:'none',zIndex:10,boxShadow:`0 0 12px ${tip.color}40`,whiteSpace:'nowrap',fontFamily:"'DM Mono',monospace"}}><div style={{fontWeight:700,color:tip.color}}>{tip.d.name.toUpperCase()}</div><div style={{color:T.text2,marginTop:2}}>{fmt(tip.d.value,currency)} · {tip.pct}%</div></div>}
        </div>
        <div style={{flex:1,overflowY:'auto',maxHeight:130}}>
          {sorted.map((e,i)=>(
            <div key={i} onMouseEnter={()=>setActive(i)} onMouseLeave={()=>setActive(null)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:10,padding:'3px 0',borderBottom:i<sorted.length-1?`1px solid ${T.border}`:'none',opacity:active===null||active===i?1:.25,transition:'opacity .12s',cursor:'default',fontFamily:"'DM Mono',monospace"}}>
              <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:6,height:6,background:PIE[(i+offset)%PIE.length],flexShrink:0,boxShadow:T.dark?`0 0 4px ${PIE[(i+offset)%PIE.length]}`:'none'}}/><span style={{color:T.text,fontWeight:600}}>{e.name}</span></div>
              <div style={{textAlign:'right',marginLeft:6}}><div style={{fontWeight:700,color:T.text}}>{total?((e.value/total)*100).toFixed(1):0}%</div><div style={{fontSize:8,color:T.text2}}>{fmt(e.value,currency)}</div></div>
            </div>
          ))}
        </div>
      </div>}
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
    <div style={{background:T.surface,border:`1px solid ${T.border}`,position:'relative',overflow:'hidden'}}>
      <Corner pos="TL" color={T.cyan} size={10}/><Corner pos="BR" color={T.cyan} size={10}/>
      <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:11,fontWeight:700,color:T.text,fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'.06em'}}>P&L %</span>
        <span style={{fontSize:9,color:T.muted,fontFamily:"'DM Mono',monospace"}}>{data.filter(d=>d.pct>0).length}↑ {data.filter(d=>d.pct<0).length}↓</span>
      </div>
      <div style={{padding:'8px 12px'}}>
        {data.map((d,i)=>(
          <div key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{display:'flex',alignItems:'center',height:20,gap:8,background:hov===i?T.surface3:'transparent',transition:'background .08s',cursor:'default'}}>
            <div style={{width:50,fontSize:9,fontWeight:700,color:T.text2,fontFamily:"'DM Mono',monospace",flexShrink:0,textAlign:'right'}}>{d.name}</div>
            <div style={{flex:1,position:'relative',height:6,display:'flex',alignItems:'center'}}>
              {mixed&&<div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:T.border}}/>}
              <div style={{position:'absolute',height:5,background:d.color,boxShadow:T.dark?`0 0 6px ${d.color}80`:'none',width:`${mixed?Math.abs(d.pct)/maxAbs*50:Math.abs(d.pct)/maxAbs*100}%`,left:mixed?(d.pct>=0?'50%':`calc(50% - ${Math.abs(d.pct)/maxAbs*50}%)`):'0',opacity:hov===null||hov===i?1:.4,transition:'all .2s'}}/>
            </div>
            <div style={{width:50,fontSize:9,fontWeight:700,color:d.color,fontFamily:"'DM Mono',monospace",flexShrink:0,textAlign:'right',textShadow:T.dark?`0 0 6px ${d.color}60`:'none'}}>{d.pct>=0?'+':''}{d.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN TAB BAR ──────────────────────────────────────────────────────────────
function MainTabBar({mainTab,setMainTab,inRows,usRows,openStockTabs,onCloseStock,inGain,usGain,T}) {
  const tabs=[{id:'IN',label:'INDIAN',flag:'🇮🇳',count:inRows.length,gain:inGain,cur:'INR',color:T.inColor},{id:'US',label:'US',flag:'🇺🇸',count:usRows.length,gain:usGain,cur:'USD',color:T.usColor}];
  return(
    <div style={{background:T.dark?'rgba(3,5,12,.98)':'#1a1d6e',borderBottom:`1px solid ${T.dark?'rgba(99,102,241,.2)':'#2d35b0'}`,display:'flex',alignItems:'center',height:38,flexShrink:0,overflowX:'auto',WebkitAppRegion:'no-drag',padding:'0 10px',gap:2}}>
      {tabs.map(tab=>{const active=mainTab===tab.id;return(
        <div key={tab.id} onClick={()=>setMainTab(tab.id)} style={{display:'flex',alignItems:'center',gap:7,height:38,padding:'0 14px',cursor:'pointer',flexShrink:0,position:'relative',userSelect:'none',borderBottom:active?`2px solid ${tab.color}`:'2px solid transparent',background:active?`${tab.color}12`:'transparent',transition:'all .15s'}}>
          <span style={{fontSize:15}}>{tab.flag}</span>
          <span style={{fontSize:10,fontWeight:active?700:400,fontFamily:"'DM Mono',monospace",letterSpacing:'.05em',color:active?'#e8f0ff':'rgba(180,200,255,.4)',textTransform:'uppercase',textShadow:active&&T.dark?`0 0 8px rgba(200,210,255,.4)`:'none',transition:'all .15s'}}>{tab.label} PORTFOLIO</span>
          <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:700,padding:'1px 6px',color:active?tab.color:'rgba(180,200,255,.2)',border:`1px solid ${active?tab.color+'50':'rgba(180,200,255,.1)'}`,background:active?`${tab.color}10`:'transparent',transition:'all .15s'}}>{tab.count}</span>
          {tab.gain!=null&&<span style={{fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:700,color:gColor(tab.gain,T),textShadow:T.dark?`0 0 6px ${gColor(tab.gain,T)}40`:'none'}}>{tab.gain>=0?'+':'−'}{tab.cur==='INR'?'₹':'$'}{Math.abs(tab.gain).toLocaleString(tab.cur==='USD'?'en-US':'en-IN',{maximumFractionDigits:0})}</span>}
        </div>
      );})}
      {openStockTabs.length>0&&<div style={{width:1,height:20,background:'rgba(99,102,241,.25)',marginLeft:4,marginRight:4,flexShrink:0}}/>}
      {openStockTabs.map(t=>{const tabId=`stock:${t.symbol}`,active=mainTab===tabId,color=isUS(t.symbol)?T.usColor:T.inColor;return(
        <div key={t.symbol} onClick={()=>setMainTab(tabId)} style={{display:'flex',alignItems:'center',gap:6,height:38,padding:'0 12px',cursor:'pointer',flexShrink:0,borderBottom:active?`2px solid ${color}`:'2px solid transparent',background:active?`${color}12`:'transparent',transition:'all .15s',userSelect:'none'}}>
          <span style={{fontSize:9,fontWeight:active?700:400,fontFamily:"'DM Mono',monospace",letterSpacing:'.08em',color:active?color:'rgba(180,200,255,.35)',textTransform:'uppercase',transition:'all .15s',textShadow:active&&T.dark?`0 0 8px ${color}60`:'none'}}>{short(t.symbol)}</span>
          <button onClick={e=>{e.stopPropagation();onCloseStock(t.symbol);}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(200,218,255,.25)',padding:'1px 2px',display:'flex',alignItems:'center',lineHeight:1,transition:'color .1s'}} onMouseEnter={e=>e.currentTarget.style.color='#ff2965'} onMouseLeave={e=>e.currentTarget.style.color='rgba(200,218,255,.25)'}><Ic.X/></button>
        </div>
      );})}
    </div>
  );
}

// ── PORTFOLIO TAB BAR ─────────────────────────────────────────────────────────
function PortfolioTabBar({portfolios,activeId,onSwitch,onAdd,onRename,onDelete,T}) {
  const [editId,setEditId]=useState(null);const [editName,setEditName]=useState('');const [hovId,setHovId]=useState(null);const inputRef=useRef();
  const commit=()=>{if(editName.trim())onRename(editId,editName.trim());setEditId(null);};
  useEffect(()=>{if(editId&&inputRef.current)inputRef.current.focus();},[editId]);
  return(
    <div style={{background:T.dark?'rgba(4,7,14,.98)':'#13166b',borderBottom:`1px solid ${T.dark?'rgba(99,102,241,.18)':'#252ec0'}`,display:'flex',alignItems:'center',height:30,flexShrink:0,overflowX:'auto',WebkitAppRegion:'no-drag',padding:'0 12px',gap:0}}>
      {portfolios.map((p,i)=>{const color=PORT_COLORS[i%PORT_COLORS.length],active=p.id===activeId,hover=hovId===p.id&&!active;return(
        <div key={p.id} onClick={()=>onSwitch(p.id)} onMouseEnter={()=>setHovId(p.id)} onMouseLeave={()=>setHovId(null)} style={{display:'flex',alignItems:'center',gap:6,height:30,padding:'0 12px',cursor:'pointer',flexShrink:0,userSelect:'none',borderBottom:active?`2px solid ${color}`:'2px solid transparent',background:active?`${color}15`:hover?'rgba(255,255,255,.04)':'transparent',transition:'all .15s'}}>
          <div style={{width:5,height:5,flexShrink:0,background:active?color:'transparent',border:`1px solid ${active?color:'rgba(200,218,255,.2)'}`,boxShadow:active&&T.dark?`0 0 6px ${color}`:'none',transition:'all .15s'}}/>
          {editId===p.id?<input ref={inputRef} value={editName} onChange={e=>setEditName(e.target.value)} onBlur={commit} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape')setEditId(null);}} style={{width:90,padding:'1px 5px',background:'rgba(255,255,255,.06)',color:'#e0e7ff',fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,border:`1px solid ${color}`,outline:'none'}}/>
          :<span onDoubleClick={e=>{e.stopPropagation();setEditId(p.id);setEditName(p.name);}} style={{fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:active?700:400,color:active?'#e8f0ff':'rgba(180,200,255,.35)',whiteSpace:'nowrap',letterSpacing:'.04em',textTransform:'uppercase',transition:'all .15s'}}>{p.name}</span>}
          <span style={{fontSize:8,fontFamily:"'DM Mono',monospace",fontWeight:700,padding:'1px 5px',color:active?color:'rgba(180,200,255,.2)',border:`1px solid ${active?color+'40':'rgba(180,200,255,.08)'}`,transition:'all .15s'}}>{p.holdings.length}</span>
          {portfolios.length>1&&(hover||active)&&editId!==p.id&&<button onClick={e=>{e.stopPropagation();onDelete(p.id);}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(200,218,255,.2)',padding:'1px 2px',display:'flex',alignItems:'center',lineHeight:1,transition:'color .1s'}} onMouseEnter={e=>e.currentTarget.style.color='#ff2965'} onMouseLeave={e=>e.currentTarget.style.color='rgba(200,218,255,.2)'}><Ic.X/></button>}
        </div>
      );})}
      <button onClick={onAdd} style={{display:'flex',alignItems:'center',gap:3,padding:'2px 9px',marginLeft:6,border:'1px solid rgba(99,102,241,.22)',background:'none',color:'rgba(160,180,255,.3)',cursor:'pointer',fontSize:9,flexShrink:0,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em',transition:'all .13s'}} onMouseEnter={e=>{e.currentTarget.style.color='#a5b4fc';e.currentTarget.style.borderColor='rgba(99,102,241,.6)';}} onMouseLeave={e=>{e.currentTarget.style.color='rgba(160,180,255,.3)';e.currentTarget.style.borderColor='rgba(99,102,241,.22)';}}><Ic.Plus/> NEW</button>
      <span style={{marginLeft:'auto',fontSize:7,color:'rgba(160,180,255,.1)',flexShrink:0,fontFamily:"'DM Mono',monospace",letterSpacing:'.1em'}}>DBL-CLICK TO RENAME</span>
    </div>
  );
}

// ── CSV IMPORT MODAL ──────────────────────────────────────────────────────────
function CSVImportModal({onImport,onClose,market,T}) {
  const [rows,setRows]=useState([]);const [errs,setErrs]=useState([]);const [drag,setDrag]=useState(false);const [parsed,setParsed]=useState(false);const fileRef=useRef();
  const isIN=market==='IN',ac=isIN?T.inColor:T.cyan;
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
      if(!sym){w.push(`Row ${i+2}: empty symbol`);return;}if(isNaN(qty)||qty<=0){w.push(`Row ${i+2}: bad qty`);return;}if(isNaN(buy)||buy<=0){w.push(`Row ${i+2}: bad price`);return;}
      p.push({id:Date.now()+i,symbol:sym,name:name||sym,qty:parseFloat(qty.toFixed(8)),buyPrice:buy,analystTarget:isNaN(tgt)?null:tgt});
    });
    if(!p.length){setErrs([...e,'No valid rows.',...w]);return;}setErrs(w);setRows(p);setParsed(true);
  };
  const handleFile=f=>{if(!f)return;if(!f.name.endsWith('.csv')&&f.type!=='text/csv'){setErrs(['Upload a .csv file']);return;}const r=new FileReader();r.onload=e=>parseCSV(e.target.result);r.readAsText(f);};
  return(
    <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(2,4,8,.88)',backdropFilter:'blur(8px)'}}>
      <div style={{background:T.surface,border:`1px solid ${ac}50`,width:580,maxWidth:'95vw',maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:`0 0 40px ${ac}30,0 24px 64px rgba(0,0,0,.7)`,position:'relative'}}>
        <Corner pos="TL" color={ac} size={14} thickness={2}/><Corner pos="TR" color={ac} size={14} thickness={2}/><Corner pos="BL" color={ac} size={14} thickness={2}/><Corner pos="BR" color={ac} size={14} thickness={2}/>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${ac},transparent)`}}/>
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${ac}40`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,border:`1px solid ${ac}60`,display:'flex',alignItems:'center',justifyContent:'center',color:ac,background:`${ac}10`}}><Ic.Upload/></div>
            <div><div style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:"'Orbitron',monospace",letterSpacing:'.04em'}}>IMPORT {isIN?'INDIAN':'US'} HOLDINGS</div><div style={{fontSize:10,color:T.text2,fontFamily:"'DM Mono',monospace",marginTop:1}}>Appends to active portfolio</div></div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:`1px solid ${T.border}`,cursor:'pointer',color:T.text2,padding:'5px 7px',display:'flex',alignItems:'center',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#ff2965';e.currentTarget.style.color='#ff2965';}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text2;}}><Ic.X/></button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:T.surface2,border:`1px solid ${ac}40`,padding:'10px 14px',position:'relative'}}><Corner pos="TL" color={ac} size={8}/>
            <div style={{fontWeight:700,color:T.text,marginBottom:6,display:'flex',alignItems:'center',gap:6,fontSize:11,fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'.06em'}}><Ic.File/> Required Columns</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px'}}>
              {[['Symbol *','RELIANCE.NS / AAPL…'],['Qty *','10, 2.5…'],['Buy Price *','2800, 150…'],['Name','Optional'],['Analyst Target','Optional']].map(([k,v])=>(
                <div key={k} style={{display:'flex',gap:8,padding:'2px 0',fontSize:10}}><span style={{fontFamily:"'DM Mono',monospace",color:ac,fontWeight:700,minWidth:110,fontSize:9,letterSpacing:'.04em'}}>{k}</span><span style={{color:T.text2,fontFamily:"'DM Mono',monospace",fontSize:9}}>{v}</span></div>
              ))}
            </div>
          </div>
          {!parsed&&<div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}} onClick={()=>fileRef.current.click()} style={{border:`2px dashed ${drag?ac:T.border}`,padding:'28px 24px',textAlign:'center',cursor:'pointer',background:drag?`${ac}08`:T.surface2,transition:'all .15s'}}>
            <div style={{fontSize:26,marginBottom:8}}>📁</div>
            <div style={{fontSize:12,fontWeight:700,color:drag?ac:T.text,fontFamily:"'DM Mono',monospace",letterSpacing:'.04em',textTransform:'uppercase'}}>{drag?'DROP TO IMPORT':'DRAG & DROP CSV or CLICK'}</div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
          </div>}
          {errs.length>0&&<div style={{background:T.warnBg,border:`1px solid ${T.warning}50`,padding:'10px 14px'}}>{errs.map((e,i)=><div key={i} style={{display:'flex',gap:6,fontSize:11,color:T.warning,marginBottom:i<errs.length-1?3:0,fontFamily:"'DM Mono',monospace"}}><span style={{flexShrink:0}}><Ic.Alert/></span>{e}</div>)}</div>}
          {parsed&&rows.length>0&&(<div>
            <div style={{fontSize:11,fontWeight:700,color:T.success,marginBottom:8,fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'.06em'}}>▶ {rows.length} HOLDING{rows.length!==1?'S':''} READY</div>
            <div style={{border:`1px solid ${T.border}`,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead><tr style={{background:T.surface2}}>{['Symbol','Name','Qty','Buy Price','Target'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:'left',color:T.muted,fontWeight:700,fontSize:8,textTransform:'uppercase',letterSpacing:'.1em',borderBottom:`1px solid ${T.border}`,fontFamily:"'DM Mono',monospace"}}>{h}</th>)}</tr></thead>
                <tbody>{rows.map((r,i)=><tr key={i} style={{background:i%2?T.surface2:T.surface}}><td style={{padding:'5px 10px',fontFamily:"'DM Mono',monospace",fontWeight:700,color:ac,borderBottom:`1px solid ${T.border}`}}>{r.symbol}</td><td style={{padding:'5px 10px',color:T.text2,borderBottom:`1px solid ${T.border}`,fontFamily:"'DM Mono',monospace",maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</td><td style={{padding:'5px 10px',fontFamily:"'DM Mono',monospace",color:T.text,borderBottom:`1px solid ${T.border}`}}>{fmtQty(r.qty)}</td><td style={{padding:'5px 10px',fontFamily:"'DM Mono',monospace",color:T.text,borderBottom:`1px solid ${T.border}`}}>{r.buyPrice}</td><td style={{padding:'5px 10px',fontFamily:"'DM Mono',monospace",color:r.analystTarget?T.success:T.muted,borderBottom:`1px solid ${T.border}`}}>{r.analystTarget??'—'}</td></tr>)}</tbody>
              </table>
            </div>
          </div>)}
        </div>
        <div style={{padding:'12px 18px',borderTop:`1px solid ${ac}40`,display:'flex',gap:8,justifyContent:'flex-end',alignItems:'center',background:T.surface2}}>
          {parsed&&<span style={{fontSize:10,color:T.text2,flex:1,fontFamily:"'DM Mono',monospace"}}>Existing holdings preserved</span>}
          <button onClick={onClose} style={{padding:'6px 14px',border:`1px solid ${T.border}`,background:'transparent',color:T.text2,cursor:'pointer',fontSize:11,fontWeight:500,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#ff2965';e.currentTarget.style.color='#ff2965';}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text2;}}>CANCEL</button>
          {!parsed?<button onClick={()=>fileRef.current.click()} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 16px',border:`1px solid ${ac}`,background:`${ac}15`,color:ac,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em'}}><Ic.Upload/> CHOOSE FILE</button>
          :<button onClick={()=>{onImport(rows);onClose();}} disabled={!rows.length} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 18px',border:`1px solid ${T.success}`,background:`${T.success}15`,color:T.success,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em'}}><Ic.Check/> IMPORT {rows.length}</button>}
        </div>
      </div>
    </div>
  );
}

// ── HOLDINGS SECTION ──────────────────────────────────────────────────────────
function Section({title,flag,accent,rows,currency,targets,onSaveTarget,onSaveUnpledged,onRemove,fetchPrices,loading,error,lastUpdated,compact,onImportCSV,addHolding,onRowClick,T}) {
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
    timer.current=setTimeout(async()=>{setBusyS(true);try{const res=await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,{headers:{Accept:'application/json'}});const json=await res.json();setResults((json?.quotes??[]).filter(r=>r.symbol&&r.quoteType!=='OPTION').slice(0,7));}catch{setResults([]);}setBusyS(false);},300);};
  const selectResult=r=>{setForm(p=>({...p,symbol:r.symbol,name:r.longname||r.shortname||r.symbol}));setSrch(r.longname||r.shortname||r.symbol);setResults([]);};
  const doAdd=()=>{const sym=form.symbol.trim().toUpperCase();if(!sym||!form.qty||!form.buyPrice)return;addHolding({id:Date.now(),symbol:sym,name:form.name.trim()||sym,qty:parseFloat(parseFloat(form.qty).toFixed(8)),buyPrice:parseFloat(form.buyPrice)});setForm({symbol:'',name:'',qty:'',buyPrice:''});setSrch('');setResults([]);setShowAdd(false);};
  const csvExport=()=>{const h=['Stock','Symbol','Qty','Unpledged Qty','Buy Price','Invested','LTP','Day%','Day P&L','Value','P&L','P&L%','Alloc%','Target','Upside%'];const body=rows.map(r=>{const tgt=targets[r.id],up=tgt!=null&&r.curPrice!=null?(tgt-r.curPrice)/r.curPrice*100:null;return[r.name,r.symbol,fmtQty(r.qty),r.unpledgedQty!=null?fmtQty(r.unpledgedQty):'',r.buyPrice,r.invested.toFixed(2),r.curPrice?.toFixed(2)??'',r.dayChange?.toFixed(2)??'',r.dayPL?.toFixed(2)??'',r.curValue?.toFixed(2)??'',r.gain?.toFixed(2)??'',r.gainPct?.toFixed(2)??'',((r.curValue??r.invested)/totalSect*100).toFixed(2),tgt?.toFixed(2)??'',up?.toFixed(2)??''];});const csv=[h,...body].map(r=>r.join(',')).join('\n');const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`portfolio_${currency}_${new Date().toISOString().slice(0,10)}.csv`});a.click();};
  const rp=compact?'5px 10px':'8px 10px';
  const tdB={padding:rp,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap',transition:'background .06s'};
  const tdN={...tdB,fontFamily:"'DM Mono',monospace",textAlign:'right'};
  const inpS={padding:'7px 10px',border:`1px solid ${T.border}`,background:T.surface2,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:"'DM Mono',monospace",transition:'border-color .12s,box-shadow .12s'};
  const inpF={borderColor:accent,boxShadow:`0 0 0 2px ${accent}20,0 0 8px ${accent}20`};
  const BtnRow=({children,onClick,col,disabled})=>{const [h,sH]=useState(false);return<button onClick={onClick} disabled={disabled} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .12s',fontFamily:"'DM Mono',monospace",letterSpacing:'.04em',border:`1px solid ${col?col+'50':T.border}`,background:h?(col?`${col}15`:T.surface3):'transparent',color:h?(col||T.text):T.text2,boxShadow:h&&col&&T.dark?`0 0 10px ${col}30`:'none',transform:h&&!disabled?'translateY(-1px)':'none'}}>{children}</button>;};
  return(
    <div style={{background:T.surface,border:`1px solid ${T.border}`,marginBottom:10,position:'relative',overflow:'hidden',boxShadow:T.dark?`0 0 30px rgba(0,0,0,.5),inset 0 1px 0 ${accent}15`:'0 2px 12px rgba(0,0,0,.08)'}}>
      <Corner pos="TL" color={accent} size={12} thickness={1.5}/><Corner pos="TR" color={accent} size={12} thickness={1.5}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent 0%,${accent} 20%,${accent} 80%,transparent 100%)`}}/>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:T.dark?`linear-gradient(90deg,${accent}12 0%,transparent 50%)`:`${accent}06`,flexWrap:'wrap',gap:6}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:17,lineHeight:1}}>{flag}</span>
          <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:"'Orbitron',monospace",letterSpacing:'.04em',textShadow:T.dark?`0 0 10px ${accent}60`:'none'}}>{title.toUpperCase()}</span>
          <span style={{fontSize:9,color:accent,fontFamily:"'DM Mono',monospace",border:`1px solid ${accent}40`,padding:'1px 7px',letterSpacing:'.08em'}}>{rows.length} HOLDINGS</span>
          {lastUpdated&&<span style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:T.muted,fontFamily:"'DM Mono',monospace"}}><span style={{width:5,height:5,background:T.success,display:'inline-block',animation:'pulse 1.5s infinite',boxShadow:T.dark?`0 0 6px ${T.success}`:'none'}}/>{lastUpdated.toLocaleTimeString()}</span>}
        </div>
        <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative'}}><span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:T.muted,pointerEvents:'none',fontSize:10}}><Ic.Search/></span><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="FILTER…" style={{...inpS,width:110,paddingLeft:24,padding:'5px 8px 5px 24px',fontSize:10}} onFocus={e=>Object.assign(e.target.style,inpF)} onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow='none';}}/></div>
          <BtnRow onClick={csvExport} col={T.cyan}><Ic.Dl/> EXPORT</BtnRow>
          <BtnRow onClick={onImportCSV} col={accent}><Ic.Upload/> IMPORT</BtnRow>
          <BtnRow onClick={fetchPrices} disabled={loading} col={T.text2}><Ic.Refresh s={loading}/>{loading?'…':'REFRESH'}</BtnRow>
          <button onClick={()=>setShowAdd(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'DM Mono',monospace",letterSpacing:'.06em',border:`1px solid ${accent}`,background:`${accent}15`,color:accent,boxShadow:T.dark?`0 0 12px ${accent}30`:'none',transition:'all .12s'}} onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 0 20px ${accent}50`} onMouseLeave={e=>e.currentTarget.style.boxShadow=T.dark?`0 0 12px ${accent}30`:'none'}><Ic.Plus/> ADD</button>
        </div>
      </div>
      {/* Summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:6,padding:'8px 12px',borderBottom:`1px solid ${T.border}`,background:T.dark?T.surface2:'#f8faff'}}>
        <Stat T={T} label="Invested" value={fmt(totalInv,currency)} accentColor={T.muted}/>
        <Stat T={T} label="Current Value" value={fmt(totalCur,currency)} accentColor={T.cyan}/>
        <Stat T={T} label="Overall P&L" value={`${totalGain>=0?'+':''}${fmt(Math.abs(totalGain),currency)}`} sub={fmtPct(totalGainP)} vc={gColor(totalGain,T)} accentColor={gColor(totalGain,T)}/>
        <Stat T={T} label="Today's P&L" value={`${dayTotal>=0?'+':''}${fmt(Math.abs(dayTotal),currency)}`} vc={gColor(dayTotal,T)} accentColor={gColor(dayTotal,T)}/>
        <Stat T={T} label="Win / Loss" value={`${rows.filter(r=>(r.gain??0)>0).length} / ${rows.filter(r=>(r.gain??0)<0).length}`} accentColor={accent}/>
      </div>
      {error&&<div style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:T.dangerBg,color:T.danger,fontSize:11,borderBottom:`1px solid ${T.danger}30`,fontFamily:"'DM Mono',monospace"}}><Ic.Alert/>⚠ {error}</div>}
      {/* Add form */}
      {showAdd&&(
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,background:T.surface2}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr .65fr .8fr auto',gap:8,alignItems:'end'}}>
            <div>
              <div style={{fontSize:8,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:'.1em',fontFamily:"'DM Mono',monospace"}}>Search {currency==='INR'?'NSE / BSE':'NYSE / NASDAQ'}</div>
              <div style={{position:'relative'}}>
                <input value={srch} onChange={e=>doSearch(e.target.value)} autoFocus onFocus={e=>{setFocused(true);Object.assign(e.target.style,inpF);}} onBlur={e=>{setTimeout(()=>setFocused(false),200);e.target.style.borderColor=T.border;e.target.style.boxShadow='none';}} placeholder={currency==='INR'?'e.g. TCS, RELIANCE.NS…':'e.g. AAPL, Tesla…'} style={{...inpS,border:`1px solid ${accent}`,boxShadow:`0 0 8px ${accent}20`}}/>
                {busyS&&<span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:10,color:T.muted,animation:'pulse 1s infinite'}}>…</span>}
                {focused&&results.length>0&&(
                  <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:999,background:T.surface,border:`1px solid ${accent}50`,boxShadow:`0 0 20px ${accent}30`,overflow:'hidden'}}>
                    {results.map((r,i)=><div key={r.symbol} onMouseDown={()=>selectResult(r)} style={{padding:'8px 12px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:i<results.length-1?`1px solid ${T.border}`:'none',transition:'background .08s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface3} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><div><span style={{fontWeight:700,fontSize:12,color:accent,fontFamily:"'DM Mono',monospace",letterSpacing:'.04em'}}>{r.symbol}</span><span style={{fontSize:11,color:T.text2,marginLeft:8}}>{r.longname||r.shortname||''}</span></div>{r.exchDisp&&<span style={{fontSize:9,background:`${accent}18`,color:accent,padding:'2px 6px',fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{r.exchDisp}</span>}</div>)}
                  </div>
                )}
              </div>
              {form.symbol&&<div style={{fontSize:9,color:T.success,marginTop:3,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:'.04em',display:'flex',alignItems:'center',gap:4}}>▶ {form.symbol} — {form.name}</div>}
            </div>
            <div><div style={{fontSize:8,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:'.1em',fontFamily:"'DM Mono',monospace"}}>Qty</div><input type="number" step="0.00000001" value={form.qty} placeholder="10.5" onChange={e=>setForm(p=>({...p,qty:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&doAdd()} style={inpS} onFocus={e=>Object.assign(e.target.style,inpF)} onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow='none';}}/></div>
            <div><div style={{fontSize:8,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:'.1em',fontFamily:"'DM Mono',monospace"}}>Buy Price ({currency==='INR'?'₹':'$'})</div><input type="number" step="0.01" value={form.buyPrice} placeholder={currency==='INR'?'2800':'150'} onChange={e=>setForm(p=>({...p,buyPrice:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&doAdd()} style={inpS} onFocus={e=>Object.assign(e.target.style,inpF)} onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow='none';}}/></div>
            <div style={{display:'flex',gap:5}}>
              <button onClick={doAdd} disabled={!form.symbol||!form.qty||!form.buyPrice} style={{padding:'7px 18px',border:`1px solid ${accent}`,background:`${accent}15`,color:accent,cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em',boxShadow:T.dark?`0 0 12px ${accent}30`:'none',transition:'all .12s'}} onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 0 20px ${accent}50`} onMouseLeave={e=>e.currentTarget.style.boxShadow=T.dark?`0 0 12px ${accent}30`:'none'}>ADD</button>
              <button onClick={()=>{setShowAdd(false);setSrch('');setResults([]);setForm({symbol:'',name:'',qty:'',buyPrice:''}); }} style={{padding:'7px 10px',border:`1px solid ${T.border}`,background:'transparent',color:T.text2,cursor:'pointer',fontSize:12,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#ff2965';e.currentTarget.style.color='#ff2965';}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text2;}}>✕</button>
            </div>
          </div>
        </div>
      )}
      {/* Table — no Buy Date column */}
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
          <thead>
            <tr>
              <SortTh T={T} label="STOCK"    col="name"      sort={sort} onSort={onSort} minW={130} sticky/>
              <SortTh T={T} label="QTY"      col="qty"       sort={sort} onSort={onSort} right minW={72}/>
              <th style={{padding:'0 10px',height:32,background:T.dark?'rgba(6,10,20,.95)':T.surface2,borderBottom:`1px solid ${T.border}`,color:T.muted,fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,fontFamily:"'DM Mono',monospace",minWidth:120,textAlign:'right'}}>UNPLEDGED QTY</th>
              <SortTh T={T} label="BUY"      col="buyPrice"  sort={sort} onSort={onSort} right minW={82}/>
              <SortTh T={T} label="INVESTED" col="invested"  sort={sort} onSort={onSort} right minW={96}/>
              <SortTh T={T} label="LTP"      col="curPrice"  sort={sort} onSort={onSort} right minW={96}/>
              <SortTh T={T} label="DAY%"     col="dayChange" sort={sort} onSort={onSort} right minW={72}/>
              <SortTh T={T} label="DAY P&L"  col="dayPL"     sort={sort} onSort={onSort} right minW={100}/>
              <SortTh T={T} label="VALUE"    col="curValue"  sort={sort} onSort={onSort} right minW={96}/>
              <SortTh T={T} label="P&L"      col="gain"      sort={sort} onSort={onSort} right minW={108}/>
              <SortTh T={T} label="P&L%"     col="gainPct"   sort={sort} onSort={onSort} right minW={72}/>
              <SortTh T={T} label="ALLOC%"   col="allocPct"  sort={sort} onSort={onSort} right minW={90}/>
              <th style={{padding:'0 10px',height:32,background:T.dark?'rgba(6,10,20,.95)':T.surface2,borderBottom:`1px solid ${T.border}`,color:T.muted,fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,fontFamily:"'DM Mono',monospace",minWidth:140}}>ANALYST TARGET</th>
              <th style={{padding:'0 8px',height:32,background:T.dark?'rgba(6,10,20,.95)':T.surface2,borderBottom:`1px solid ${T.border}`,width:34}}/>
            </tr>
          </thead>
          <tbody>
            {!flt.length&&<tr><td colSpan={13} style={{padding:28,textAlign:'center',color:T.muted,fontSize:11,fontFamily:"'DM Mono',monospace",letterSpacing:'.04em'}}>{filter?'[ NO MATCHES ]':`[ NO ${currency==='INR'?'INDIAN':'US'} HOLDINGS — CLICK ADD ]`}</td></tr>}
            {flt.map((r)=>(
              <tr key={r.id} style={{background:T.surface,borderLeft:'2px solid transparent',cursor:'pointer',transition:'all .08s'}} onClick={()=>onRowClick(r.symbol)} onMouseEnter={e=>{e.currentTarget.style.background=T.surface3;e.currentTarget.style.borderLeftColor=accent;}} onMouseLeave={e=>{e.currentTarget.style.background=T.surface;e.currentTarget.style.borderLeftColor='transparent';}}>
                <td style={{...tdB,background:'inherit',position:'sticky',left:0,zIndex:1,borderRight:`1px solid ${T.border}`}}>
                  <div style={{fontWeight:700,fontFamily:"'DM Mono',monospace",color:accent,fontSize:11,letterSpacing:'.04em',textShadow:T.dark?`0 0 8px ${accent}40`:'none'}}>{short(r.symbol)}</div>
                  <div style={{fontSize:9,color:T.muted,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',marginTop:1}}>{r.name}</div>
                  <div style={{fontSize:7,color:T.dark?'rgba(99,102,241,.35)':'rgba(99,102,241,.5)',marginTop:2,letterSpacing:'.08em',fontFamily:"'DM Mono',monospace"}}>CLICK FOR DETAILS →</div>
                </td>
                <td style={{...tdN,color:T.text2}}>{fmtQty(r.qty)}</td>
                <td style={{...tdB,textAlign:'right'}} onClick={e=>e.stopPropagation()}><UnpledgedQtyCell id={r.id} unpledgedQty={r.unpledgedQty??null} totalQty={r.qty} onSave={onSaveUnpledged} T={T}/></td>
                <td style={{...tdN,color:T.text2}}>{fmt(r.buyPrice,currency)}</td>
                <td style={{...tdN,color:T.text}}>{fmt(r.invested,currency)}</td>
                <td style={{...tdN}}>{r.curPrice!=null?<b style={{color:T.cyan,textShadow:T.dark?`0 0 8px ${T.cyan}40`:'none'}}>{fmt(r.curPrice,currency)}</b>:<span style={{color:T.muted,fontSize:9,animation:'pulse 2s infinite'}}>LIVE…</span>}</td>
                <td style={{...tdN}}><Badge val={r.dayChange} pct T={T}/></td>
                <td style={{...tdN}}><Badge val={r.dayPL} currency={currency} T={T}/></td>
                <td style={{...tdN,color:T.text}}>{r.curValue!=null?fmt(r.curValue,currency):'—'}</td>
                <td style={{...tdN}}><Badge val={r.gain} currency={currency} T={T}/></td>
                <td style={{...tdN}}><Badge val={r.gainPct} pct T={T}/></td>
                <td style={{...tdB,textAlign:'right'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:5}}>
                    <div style={{width:42,height:3,background:T.border,flexShrink:0}}><div style={{width:`${Math.min(r.allocPct,100)}%`,height:'100%',background:accent,boxShadow:T.dark?`0 0 4px ${accent}`:'none',transition:'width .3s'}}/></div>
                    <span style={{fontSize:10,color:T.text2,fontFamily:"'DM Mono',monospace",fontWeight:600,minWidth:34}}>{r.allocPct.toFixed(1)}%</span>
                  </div>
                </td>
                <td style={{...tdB}} onClick={e=>e.stopPropagation()}><TargetCell id={r.id} target={targets[r.id]??null} curPrice={r.curPrice} currency={currency} onSave={onSaveTarget} T={T} compact={true}/></td>
                <td style={{...tdB,padding:'5px 7px'}} onClick={e=>e.stopPropagation()}><button onClick={()=>onRemove(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,padding:'3px 5px',display:'flex',alignItems:'center',transition:'all .1s'}} onMouseEnter={e=>e.currentTarget.style.color='#ff2965'} onMouseLeave={e=>e.currentTarget.style.color=T.muted} title="Remove"><Ic.Trash/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TWEAKS PANEL ──────────────────────────────────────────────────────────────
function TweaksPanel({tweaks,onUpdate,T}) {
  return(
    <div style={{position:'fixed',bottom:16,right:16,background:T.surface,border:`1px solid ${T.border}`,padding:18,width:260,zIndex:1000,boxShadow:T.dark?`0 0 30px rgba(99,102,241,.2),0 16px 48px rgba(0,0,0,.7)`:'0 8px 32px rgba(0,0,0,.2)'}}>
      <Corner pos="TL" color={T.accent} size={12} thickness={1.5}/><Corner pos="TR" color={T.accent} size={12} thickness={1.5}/>
      <Corner pos="BL" color={T.accent} size={12} thickness={1.5}/><Corner pos="BR" color={T.accent} size={12} thickness={1.5}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${T.accent},transparent)`}}/>
      <div style={{fontWeight:700,fontSize:11,color:T.accent,marginBottom:14,display:'flex',alignItems:'center',gap:7,fontFamily:"'Orbitron',monospace",letterSpacing:'.06em'}}><Ic.Gear/> SYSTEM CONFIG</div>
      <div style={{display:'flex',flexDirection:'column',gap:11}}>
        {[{label:'DARK MODE',key:'darkMode'},{label:'COMPACT ROWS',key:'compactRows'},{label:'P&L CHARTS',key:'showCharts'}].map(({label,key})=>(
          <label key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:10,color:T.text,cursor:'pointer',fontFamily:"'DM Mono',monospace",letterSpacing:'.06em'}}>
            {label}
            <div onClick={()=>onUpdate(key,!tweaks[key])} style={{width:36,height:18,background:tweaks[key]?T.accent:T.surface3,position:'relative',cursor:'pointer',transition:'background .2s',border:`1px solid ${tweaks[key]?T.accent:T.border}`,boxShadow:tweaks[key]&&T.dark?`0 0 8px ${T.accent}50`:'none'}}>
              <div style={{position:'absolute',top:2,left:tweaks[key]?'calc(100% - 15px)':2,width:12,height:12,background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.4)'}}/>
            </div>
          </label>
        ))}
        <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:10,color:T.text,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em'}}><span style={{display:'flex',justifyContent:'space-between'}}>AUTO-REFRESH <b style={{color:T.accent}}>{tweaks.autoRefreshMins} MIN</b></span><input type="range" min={1} max={30} step={1} value={tweaks.autoRefreshMins} onChange={e=>onUpdate('autoRefreshMins',parseInt(e.target.value))}/></label>
        <label style={{display:'flex',flexDirection:'column',gap:5,fontSize:10,color:T.text,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em'}}><span style={{display:'flex',justifyContent:'space-between'}}>GLOW INTENSITY <b style={{color:T.accent}}>{tweaks.glowIntensity}%</b></span><input type="range" min={0} max={100} step={10} value={tweaks.glowIntensity} onChange={e=>onUpdate('glowIntensity',parseInt(e.target.value))}/></label>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tweaks,setTweaks]=useState(()=>{try{const s=localStorage.getItem('pm_tweaks');return s?{...TWEAK_DEF,...JSON.parse(s)}:TWEAK_DEF;}catch{return TWEAK_DEF;}});
  const [showTweaks,setShowTweaks]=useState(false);
  const [importModal,setImportModal]=useState(null);
  const T=useMemo(()=>mkT(tweaks.darkMode,tweaks.glowIntensity),[tweaks.darkMode,tweaks.glowIntensity]);
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
    if(holdings.length&&!Object.values(out).some(Boolean))setError('Live prices unavailable. Check internet connection.');
    setPrices(out);setLastUpdated(new Date());setLoading(false);
  },[holdings]);

  useEffect(()=>{fetchPrices();const t=setInterval(fetchPrices,(tweaks.autoRefreshMins||5)*60*1000);return()=>clearInterval(t);},[fetchPrices,tweaks.autoRefreshMins]);

  const fetchStockDetail=useCallback(async(symbol,range='3mo')=>{
    setStockDetails(prev=>({...prev,[symbol]:{...prev[symbol],loading:true,range}}));
    try{
      const [cRes,sRes]=await Promise.all([
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`,{headers:{Accept:'application/json'}}),
        fetch(`https://query1.finance.yahoo.com/v11/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,defaultKeyStatistics,financialData,price,recommendationTrend`,{headers:{Accept:'application/json'}}),
      ]);
      const cj=await cRes.json(),sj=await sRes.json();
      const result=cj?.chart?.result?.[0],ts=result?.timestamp||[],q=result?.indicators?.quote?.[0]||{};
      const history=ts.map((t,i)=>({date:t*1000,open:q.open?.[i],high:q.high?.[i],low:q.low?.[i],close:q.close?.[i],volume:q.volume?.[i],change:i>0&&q.close?.[i-1]?((q.close[i]-q.close[i-1])/q.close[i-1])*100:0})).filter(d=>d.close!=null);
      const summary=sj?.quoteSummary?.result?.[0]||{};
      setStockDetails(prev=>({...prev,[symbol]:{history,summary,loading:false,error:null,range}}));
    }catch{setStockDetails(prev=>({...prev,[symbol]:{history:[],summary:{},loading:false,error:'Failed',range}}));}
  },[]);

  const openStockTab=useCallback((symbol)=>{
    if(!openStockTabs.find(t=>t.symbol===symbol))setOpenStockTabs(prev=>[...prev,{symbol}]);
    setMainTab(`stock:${symbol}`);
    const ex=stockDetails[symbol];if(!ex||ex.error)fetchStockDetail(symbol,'3mo');
  },[openStockTabs,stockDetails,fetchStockDetail]);

  const closeStockTab=useCallback((symbol)=>{
    setOpenStockTabs(prev=>prev.filter(t=>t.symbol!==symbol));
    if(mainTab===`stock:${symbol}`)setMainTab('IN');
  },[mainTab]);

  const rows=useMemo(()=>holdings.map(h=>{const p=prices[h.symbol],cur=p?.currency??(isUS(h.symbol)?'USD':'INR'),cp=p?.current??null;const inv=parseFloat((h.buyPrice*h.qty).toFixed(8)),cv=cp!=null?parseFloat((cp*h.qty).toFixed(2)):null;const g=cv!=null?cv-inv:null,gp=g!=null?(g/inv)*100:null,dc=p?((p.current-p.prev)/p.prev)*100:null,dp=dc!=null&&cv!=null?(dc/100)*cv:null;return{...h,currency:cur,curPrice:cp,invested:inv,curValue:cv,gain:g,gainPct:gp,dayChange:dc,dayPL:dp};}),[ holdings,prices]);
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

  const Sidebar=({sRows,pie,currency,invAmt,totalAmt,gain,dayGain,offset})=>{
    const tRows=sRows.filter(r=>targets[r.id]!=null&&r.curPrice!=null);
    return(
      <div style={{display:'flex',flexDirection:'column',gap:9}}>
        <div style={{background:T.surface,border:`1px solid ${T.border}`,overflow:'hidden',position:'relative'}}>
          <Corner pos="TL" color={T.accent} size={10}/><Corner pos="BR" color={T.accent} size={10}/>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${T.accent},transparent)`}}/>
          <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:7}}><div style={{width:6,height:6,background:T.accent,boxShadow:T.dark?`0 0 6px ${T.accent}`:'none'}}/><span style={{fontSize:10,fontWeight:700,color:T.text,fontFamily:"'Orbitron',monospace",letterSpacing:'.06em'}}>{activePf?.name?.toUpperCase()}</span></div>
          <div style={{padding:'8px 12px'}}>
            {[{l:'HOLDINGS',v:sRows.length},{l:'WINNERS',v:sRows.filter(r=>(r.gain??0)>0).length,vc:T.success},{l:'LOSERS',v:sRows.filter(r=>(r.gain??0)<0).length,vc:T.danger},
              null,{l:'INVESTED',v:fmt(invAmt,currency)},{l:'CURRENT',v:fmt(totalAmt,currency)},{l:'TOTAL P&L',v:`${gain>=0?'+':''}${fmt(Math.abs(gain),currency)}`,vc:gColor(gain,T)},{l:'TODAY',v:`${dayGain>=0?'+':''}${fmt(Math.abs(dayGain),currency)}`,vc:gColor(dayGain,T)},
            ].map((row,i)=>row===null?<div key={i} style={{height:1,background:T.border,margin:'5px 0',opacity:.5}}/>
              :<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:10,borderBottom:`1px solid ${T.border}`,fontFamily:"'DM Mono',monospace"}}><span style={{color:T.muted,letterSpacing:'.04em'}}>{row.l}</span><span style={{fontWeight:700,color:row.vc||T.text,textShadow:row.vc&&T.dark?`0 0 6px ${row.vc}40`:'none'}}>{row.v}</span></div>
            )}
          </div>
        </div>
        {pie.length>0&&<DonutChart T={T} title="ALLOCATION" data={pie} currency={currency} offset={offset}/>}
        {tweaks.showCharts&&sRows.length>0&&<PLBarChart rows={sRows} currency={currency} T={T}/>}
        {tRows.length>0&&(
          <div style={{background:T.surface,border:`1px solid ${T.border}`,overflow:'hidden',position:'relative'}}>
            <Corner pos="TL" color={T.warning} size={10}/><Corner pos="BR" color={T.warning} size={10}/>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${T.warning},transparent)`}}/>
            <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:10,fontWeight:700,color:T.text,fontFamily:"'Orbitron',monospace",letterSpacing:'.06em'}}>ANALYST TARGETS</span><span style={{fontSize:9,color:T.muted,fontFamily:"'DM Mono',monospace",border:`1px solid ${T.border}`,padding:'1px 6px'}}>{tRows.length} SET</span></div>
            <div style={{padding:'8px 12px'}}>
              {tRows.sort((a,b)=>((targets[b.id]-b.curPrice)/b.curPrice)-((targets[a.id]-a.curPrice)/a.curPrice)).map(r=>{const tgt=targets[r.id],up=((tgt-r.curPrice)/r.curPrice)*100,col=up>=20?T.success:up>=0?'#00cc6a':up>=-10?T.warning:T.danger;return(
                <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:`1px solid ${T.border}`,fontSize:10}}>
                  <div><div style={{fontWeight:700,fontFamily:"'DM Mono',monospace",color:T.accent,fontSize:10,letterSpacing:'.06em'}}>{short(r.symbol)}</div><div style={{fontSize:8,color:T.muted,fontFamily:"'DM Mono',monospace",marginTop:1}}>{fmt(r.curPrice,r.currency)} → {fmt(tgt,r.currency)}</div></div>
                  <span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',border:`1px solid ${col}50`,background:`${col}12`,color:col,fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:700}}>{up>=0?'▲':'▼'} {Math.abs(up).toFixed(1)}%</span>
                </div>
              );})}
            </div>
          </div>
        )}
      </div>
    );
  };

  return(
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:T.bg,height:'100vh',display:'flex',flexDirection:'column',color:T.text,overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=DM+Sans:opsz,wght@9..40,300..700&family=DM+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:rgba(99,102,241,.35);border-radius:2px}
        ::-webkit-scrollbar-track{background:transparent}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=range]{width:100%;accent-color:#6366f1}
        button:disabled{opacity:.35;cursor:not-allowed!important}
        tr:hover td{background:${T.surface3}!important}
        tr:hover td:first-child{border-left-color:${T.accent}!important}
      `}</style>

      {/* Title Bar */}
      <div style={{background:T.dark?'#03050c':'#13166b',borderBottom:`1px solid ${T.dark?'rgba(99,102,241,.3)':'#252ec0'}`,height:48,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',position:'relative',overflow:'hidden',WebkitAppRegion:'drag'}}>
        {T.dark&&<div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.08) 2px,rgba(0,0,0,.08) 4px)',pointerEvents:'none',zIndex:0}}/>}
        {T.dark&&<div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)`,backgroundSize:'36px 36px',opacity:.6,pointerEvents:'none',zIndex:0}}/>}
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent 0%,rgba(99,102,241,.9) 50%,transparent 100%)',zIndex:1}}/>
        <div style={{display:'flex',alignItems:'center',gap:12,zIndex:2,WebkitAppRegion:'no-drag'}}>
          <div style={{width:34,height:34,background:'linear-gradient(135deg,#4f46e5,#818cf8)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:T.dark?'0 0 16px rgba(99,102,241,.7)':'none',flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:700,color:'#e0e7ff',letterSpacing:'.06em',textShadow:T.dark?'0 0 12px rgba(160,170,255,.6)':'none'}}>PORTFOLIO MANAGER</div>
            <div style={{fontSize:8,color:'rgba(160,170,255,.4)',fontFamily:"'DM Mono',monospace",letterSpacing:'.14em',marginTop:1}}>ARUN VERMA · v3.1 · {new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',zIndex:2,WebkitAppRegion:'no-drag'}}>
          {inRows.length>0&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',background:'rgba(255,255,255,.04)',border:`1px solid rgba(255,140,26,.3)`,position:'relative'}}><Corner pos="TL" color={T.inColor} size={6}/><Corner pos="BR" color={T.inColor} size={6}/><span style={{fontSize:10,color:'rgba(200,210,255,.4)',fontFamily:"'DM Mono',monospace"}}>🇮🇳</span><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:12,color:gColor(gainIN,T),textShadow:T.dark?`0 0 8px ${gColor(gainIN,T)}60`:'none'}}>{gainIN>=0?'+':''}₹{Math.abs(gainIN).toLocaleString('en-IN',{maximumFractionDigits:0})}</span><div style={{width:1,height:14,background:'rgba(255,255,255,.08)'}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:gColor(dayIN,T)}}>{dayIN>=0?'+':''}₹{Math.abs(dayIN).toLocaleString('en-IN',{maximumFractionDigits:0})} today</span></div>}
          {usRows.length>0&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',background:'rgba(255,255,255,.04)',border:`1px solid rgba(0,217,255,.3)`,position:'relative'}}><Corner pos="TL" color={T.cyan} size={6}/><Corner pos="BR" color={T.cyan} size={6}/><span style={{fontSize:10,color:'rgba(200,210,255,.4)',fontFamily:"'DM Mono',monospace"}}>🇺🇸</span><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:12,color:gColor(gainUS,T),textShadow:T.dark?`0 0 8px ${gColor(gainUS,T)}60`:'none'}}>{gainUS>=0?'+':''}${Math.abs(gainUS).toLocaleString('en-US',{maximumFractionDigits:0})}</span><div style={{width:1,height:14,background:'rgba(255,255,255,.08)'}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:gColor(dayUS,T)}}>{dayUS>=0?'+':''}${Math.abs(dayUS).toLocaleString('en-US',{maximumFractionDigits:0})} today</span></div>}
        </div>
        <div style={{display:'flex',gap:5,alignItems:'center',zIndex:2,WebkitAppRegion:'no-drag'}}>
          {updateAvail&&<button onClick={()=>window.electronAPI?.installUpdate()} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',fontSize:9,border:`1px solid ${T.success}`,background:`${T.success}15`,color:T.success,cursor:'pointer',fontFamily:"'DM Mono',monospace",letterSpacing:'.06em',animation:'pulse 2s infinite'}}><Ic.Update/> UPDATE READY</button>}
          {[{icon:tweaks.darkMode?<Ic.Sun/>:<Ic.Moon/>,label:tweaks.darkMode?'LIGHT':'DARK',onClick:()=>setTweaks(p=>({...p,darkMode:!p.darkMode})),active:false},{icon:<Ic.Gear/>,label:'CONFIG',onClick:()=>setShowTweaks(v=>!v),active:showTweaks}].map(({icon,label,onClick,active})=>(
            <button key={label} onClick={onClick} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',border:`1px solid ${active?T.accent+'80':'rgba(99,102,241,.25)'}`,background:active?`${T.accent}15`:'rgba(255,255,255,.04)',color:active?T.accent:'rgba(180,195,255,.6)',cursor:'pointer',fontSize:9,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em',transition:'all .12s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(99,102,241,.15)';e.currentTarget.style.color='#c7d2fe';}} onMouseLeave={e=>{e.currentTarget.style.background=active?`${T.accent}15`:'rgba(255,255,255,.04)';e.currentTarget.style.color=active?T.accent:'rgba(180,195,255,.6)';}}>
              {icon}{label}
            </button>
          ))}
          <div style={{display:'flex',marginLeft:6,gap:2}}>
            {[{icon:<Ic.Minimize/>,fn:()=>window.electronAPI?.minimize(),title:'Min',d:false},{icon:<Ic.Maximize/>,fn:()=>window.electronAPI?.maximize(),title:'Max',d:false},{icon:<Ic.X/>,fn:()=>window.electronAPI?.close(),title:'Close',d:true}].map(({icon,fn,title,d})=>(
              <button key={title} onClick={fn} title={title} style={{width:28,height:28,background:'transparent',border:'none',cursor:'pointer',color:'rgba(180,200,255,.4)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.background=d?'rgba(255,41,101,.25)':'rgba(255,255,255,.1)';e.currentTarget.style.color=d?'#ff2965':'#e0e7ff';}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(180,200,255,.4)';}}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Bar */}
      <MainTabBar mainTab={mainTab} setMainTab={setMainTab} inRows={inRows} usRows={usRows} openStockTabs={openStockTabs} onCloseStock={closeStockTab} inGain={gainIN} usGain={gainUS} T={T}/>

      {/* Portfolio Sub-Tab Bar (only on IN/US views) */}
      {!activeStock&&<PortfolioTabBar portfolios={portfolios} activeId={activeId} onSwitch={setActiveId} onAdd={addPortfolio} onRename={renamePortfolio} onDelete={deletePortfolio} T={T}/>}

      {/* Content */}
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {activeStock?(
          <StockDetailView symbol={activeStock} holding={rows.find(r=>r.symbol===activeStock)} detail={stockDetails[activeStock]} prices={prices} targets={targets} onSaveTarget={saveTarget} onRefresh={()=>fetchStockDetail(activeStock,stockDetails[activeStock]?.range||'3mo')} onRangeChange={(sym,range)=>fetchStockDetail(sym,range)} T={T}/>
        ):(
          <div style={{flex:1,overflow:'hidden',display:'grid',gridTemplateColumns:`minmax(0,1fr) clamp(240px,22vw,300px)`,gap:10,padding:10}}>
            <div style={{overflowY:'auto',paddingRight:2}}>
              {mainTab==='IN'&&<Section title="Indian Portfolio" flag="🇮🇳" accent={T.inColor} rows={inRows} currency="INR" onImportCSV={()=>setImportModal('IN')} onRowClick={openStockTab} {...sharedProps}/>}
              {mainTab==='US'&&<Section title="US Portfolio" flag="🇺🇸" accent={T.usColor} rows={usRows} currency="USD" onImportCSV={()=>setImportModal('US')} onRowClick={openStockTab} {...sharedProps}/>}
            </div>
            <div style={{overflowY:'auto'}}>
              {mainTab==='IN'&&<Sidebar sRows={inRows} pie={inPie} currency="INR" invAmt={invIN} totalAmt={totalIN} gain={gainIN} dayGain={dayIN} offset={0}/>}
              {mainTab==='US'&&<Sidebar sRows={usRows} pie={usPie} currency="USD" invAmt={invUS} totalAmt={totalUS} gain={gainUS} dayGain={dayUS} offset={6}/>}
            </div>
          </div>
        )}
      </div>

      {showTweaks&&<TweaksPanel tweaks={tweaks} onUpdate={(k,v)=>setTweaks(p=>({...p,[k]:v}))} T={T}/>}
      {importModal&&<CSVImportModal market={importModal} onImport={importHoldings} onClose={()=>setImportModal(null)} T={T}/>}
    </div>
  );
}
