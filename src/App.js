import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ── THEME ─────────────────────────────────────────────────────────────────────
const mkT = (d, glowPct = 60) => {
  const g = glowPct / 100;
  return {
    bg:          d ? '#020408'  : '#f0f4ff',
    surface:     d ? '#05080f'  : '#ffffff',
    surface2:    d ? '#090e1a'  : '#f2f5fd',
    surface3:    d ? '#0d1425'  : '#e8eeff',
    border:      d ? `rgba(99,102,241,${.18*g+.07})` : '#d0d8f0',
    borderHi:    d ? `rgba(99,102,241,${.6*g+.2})`  : '#6366f1',
    text:        d ? '#b8cef0'  : '#0a0c1a',
    text2:       d ? '#3d5878'  : '#4a5878',
    muted:       d ? '#1a2840'  : '#8899bb',
    accent:      '#6366f1',
    accentLo:    d ? `rgba(99,102,241,${.15*g})` : 'rgba(99,102,241,.08)',
    accentGlow:  d ? `0 0 ${12*g}px rgba(99,102,241,${.6*g}), 0 0 ${24*g}px rgba(99,102,241,${.3*g})` : 'none',
    cyan:        '#00d9ff',
    cyanLo:      d ? `rgba(0,217,255,${.12*g})` : 'rgba(0,217,255,.08)',
    cyanGlow:    d ? `0 0 ${10*g}px rgba(0,217,255,${.5*g})` : 'none',
    success:     d ? '#00ff88' : '#16a34a',
    successBg:   d ? `rgba(0,255,136,${.1*g})` : 'rgba(22,163,74,.08)',
    successGlow: d ? `0 0 ${8*g}px rgba(0,255,136,${.4*g})` : 'none',
    danger:      d ? '#ff2965' : '#dc2626',
    dangerBg:    d ? `rgba(255,41,101,${.1*g})` : 'rgba(220,38,38,.08)',
    dangerGlow:  d ? `0 0 ${8*g}px rgba(255,41,101,${.4*g})` : 'none',
    warning:     '#ffaa00',
    warnBg:      d ? `rgba(255,170,0,${.1*g})` : 'rgba(255,170,0,.08)',
    inColor:     '#ff8c1a',
    usColor:     '#00d9ff',
    dark: d,
  };
};

const PIE = ['#6366f1','#00d9ff','#00ff88','#ff2965','#ffaa00',
             '#a855f7','#f97316','#10b981','#ec4899','#3b82f6',
             '#8b5cf6','#06b6d4','#22d3ee','#34d399','#fbbf24'];
const PORT_COLORS = ['#6366f1','#00ff88','#ff8c1a','#ff2965','#00d9ff','#a855f7','#ffaa00','#ec4899'];

// ── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULT_HOLDINGS = [
  {id:1,symbol:'RELIANCE.NS',name:'Reliance Industries',qty:10.5,  buyPrice:2800},
  {id:2,symbol:'TCS.NS',     name:'TCS',                qty:5,     buyPrice:3500},
  {id:3,symbol:'INFY.NS',    name:'Infosys',            qty:20.25, buyPrice:1400},
  {id:4,symbol:'VEDL.NS',    name:'Vedanta',            qty:50,    buyPrice:280 },
  {id:5,symbol:'AAPL',       name:'Apple Inc.',         qty:3.5,   buyPrice:160 },
  {id:6,symbol:'MSFT',       name:'Microsoft Corp.',    qty:2.125, buyPrice:280 },
];
const DEFAULT_TARGETS = {1:3200,2:4000,3:1800,5:220,6:450};
const DEFAULT_PORTFOLIOS = [
  {id:1,name:'Main Portfolio',holdings:DEFAULT_HOLDINGS,targets:DEFAULT_TARGETS},
];
const TWEAK_DEFAULTS = {
  darkMode: true,
  autoRefreshMins: 5,
  compactRows: true,
  showCharts: true,
  glowIntensity: 60,
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const isUS    = s => !s.endsWith('.NS') && !s.endsWith('.BO');
const short   = s => s.replace('.NS','').replace('.BO','');
const fmtQty  = v => v == null ? '—' : parseFloat(v.toFixed(8)).toString();
const fmt     = (v, cur = 'INR') => {
  if (v == null || isNaN(v)) return '—';
  return (cur === 'USD' ? '$' : '₹') + Math.abs(v).toLocaleString(
    cur === 'USD' ? 'en-US' : 'en-IN',
    {minimumFractionDigits:2, maximumFractionDigits:2}
  );
};
const fmtPct  = v => v == null || isNaN(v) ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const gColor  = (v, T) => v == null || isNaN(v) ? T.text2 : v >= 0 ? T.success : T.danger;
const gGlow   = (v, T) => v == null || isNaN(v) ? 'none' : v >= 0 ? T.successGlow : T.dangerGlow;

const sortRows = (rows, col, dir) => [...rows].sort((a, b) => {
  let va = a[col], vb = b[col];
  if (va == null && vb == null) return 0;
  if (va == null) return dir === 'asc' ? 1 : -1;
  if (vb == null) return dir === 'asc' ? -1 : 1;
  if (typeof va === 'string') va = va.toLowerCase();
  if (typeof vb === 'string') vb = vb.toLowerCase();
  return dir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
});

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Ic = {
  Plus:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash:   () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  Refresh: ({s}) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:s?'spin .7s linear infinite':'none'}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  Dl:      () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Upload:  () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Search:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Pencil:  () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Check:   () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  X:       () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Moon:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Sun:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Up:      () => <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>,
  Dn:      () => <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>,
  Gear:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  File:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Alert:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Target:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Minimize:() => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Maximize:() => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18"/></svg>,
  Update:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
};

// ── HUD CORNER BRACKET ────────────────────────────────────────────────────────
const Corner = ({ pos, color, size = 10, thickness = 1.5 }) => {
  const styles = {
    TL: { top:0,    left:0,  borderTop:`${thickness}px solid ${color}`, borderLeft:`${thickness}px solid ${color}` },
    TR: { top:0,    right:0, borderTop:`${thickness}px solid ${color}`, borderRight:`${thickness}px solid ${color}` },
    BL: { bottom:0, left:0,  borderBottom:`${thickness}px solid ${color}`, borderLeft:`${thickness}px solid ${color}` },
    BR: { bottom:0, right:0, borderBottom:`${thickness}px solid ${color}`, borderRight:`${thickness}px solid ${color}` },
  };
  return <div style={{ position:'absolute', width:size, height:size, ...styles[pos] }} />;
};

// ── CYBER BADGE ───────────────────────────────────────────────────────────────
const Badge = ({ val, pct, currency, T }) => {
  if (val == null || isNaN(val)) return <span style={{ color:T.muted, fontFamily:"'DM Mono',monospace", fontSize:11 }}>—</span>;
  const pos  = val >= 0;
  const col  = pos ? T.success : T.danger;
  const bg   = pos ? T.successBg : T.dangerBg;
  const glow = pos ? T.successGlow : T.dangerGlow;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px',
      background:bg, color:col, fontFamily:"'DM Mono',monospace", fontSize:11,
      fontWeight:700, whiteSpace:'nowrap', letterSpacing:'.02em',
      border:`1px solid ${col}30`, boxShadow:glow }}>
      {pct ? fmtPct(val) : `${pos?'+':'−'}${fmt(Math.abs(val), currency)}`}
    </span>
  );
};

// ── SORT HEADER ───────────────────────────────────────────────────────────────
function SortTh({ label, col, sort, onSort, T, right = false, minW, sticky = false }) {
  const active = sort.col === col;
  const [hov, setHov] = useState(false);
  return (
    <th onClick={() => onSort(col)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding:'0 10px', height:32,
        background: T.dark ? 'rgba(6,10,20,.95)' : T.surface2,
        borderBottom:`1px solid ${active ? T.borderHi : T.border}`,
        color: active ? T.accent : hov ? T.text : T.muted,
        fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', fontWeight:700,
        fontFamily:"'DM Mono',monospace", whiteSpace:'nowrap', cursor:'pointer',
        userSelect:'none', textAlign:right?'right':'left', minWidth:minW,
        transition:'all .12s',
        position: sticky ? 'sticky' : 'static',
        left: sticky ? 0 : 'auto', zIndex: sticky ? 2 : 1,
        boxShadow: active && T.dark ? `inset 0 -1px 0 ${T.accent}` : 'none',
      }}>
      <span style={{ display:'flex', alignItems:'center', gap:3, justifyContent:right?'flex-end':'flex-start' }}>
        {label}
        <span style={{ opacity:active?1:.2, transition:'opacity .12s', color:active?T.accent:'inherit' }}>
          {active && sort.dir === 'asc' ? <Ic.Up /> : <Ic.Dn />}
        </span>
      </span>
    </th>
  );
}

// ── ANALYST TARGET CELL ───────────────────────────────────────────────────────
function TargetCell({ id, target, curPrice, currency, onSave, T }) {
  const [edit, setEdit] = useState(false);
  const [val,  setVal]  = useState(target != null ? String(target) : '');
  const save = () => { const n = parseFloat(val); onSave(id, isNaN(n) ? null : n); setEdit(false); };
  const up = (target != null && curPrice != null) ? ((target - curPrice) / curPrice) * 100 : null;
  const col = up == null ? T.muted
    : up >= 20 ? T.success
    : up >= 5  ? '#00cc6a'
    : up >= 0  ? '#00aa55'
    : up >= -10 ? T.warning
    : T.danger;

  if (edit) return (
    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
      <input autoFocus type="number" value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key==='Enter') save(); if (e.key==='Escape') setEdit(false); }}
        placeholder="Price target"
        style={{ width:88, padding:'4px 8px', background:T.surface3, color:T.text, fontSize:12,
          border:`1px solid ${T.accent}`, outline:'none', fontFamily:"'DM Mono',monospace",
          boxShadow:T.accentGlow }} />
      <button onClick={save} style={{ background:'none', border:'none', cursor:'pointer', color:T.success, padding:2, display:'flex', alignItems:'center' }}><Ic.Check /></button>
      <button onClick={() => setEdit(false)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, padding:2, display:'flex', alignItems:'center' }}><Ic.X /></button>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:600, fontSize:12, color:col,
          fontStyle: target == null ? 'italic' : 'normal', opacity: target == null ? .6 : 1 }}>
          {target != null ? fmt(target, currency) : 'Set target'}
        </span>
        <button onClick={() => { setVal(target != null ? String(target) : ''); setEdit(true); }}
          title="Edit analyst target"
          style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, padding:2,
            lineHeight:1, display:'flex', alignItems:'center', opacity:.5, transition:'opacity .1s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = '.5'}>
          <Ic.Pencil />
        </button>
        {target != null && (
          <button onClick={() => onSave(id, null)}
            title="Clear target"
            style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, padding:2,
              lineHeight:1, display:'flex', alignItems:'center', opacity:.4, transition:'opacity .1s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = T.danger; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '.4'; e.currentTarget.style.color = T.muted; }}>
            <Ic.X />
          </button>
        )}
      </div>
      {up != null && (
        <span style={{ fontSize:9, fontWeight:700, color:col, fontFamily:"'DM Mono',monospace",
          letterSpacing:'.04em', textShadow:T.dark ? `0 0 6px ${col}60` : 'none' }}>
          {up >= 0 ? '▲' : '▼'} {Math.abs(up).toFixed(1)}% {up >= 0 ? 'UPSIDE' : 'DOWNSIDE'}
        </span>
      )}
    </div>
  );
}

// ── CYBER STAT CARD ───────────────────────────────────────────────────────────
function Stat({ label, value, sub, vc, accentColor, T }) {
  const c = accentColor || vc || T.accent;
  return (
    <div style={{ background:T.dark?T.surface2:'#fff', border:`1px solid ${T.border}`,
      position:'relative', overflow:'hidden', padding:'10px 12px',
      boxShadow:T.dark ? `inset 0 1px 0 ${c}18` : 'none' }}>
      <Corner pos="TL" color={c} size={8} thickness={1} />
      <Corner pos="BR" color={c} size={8} thickness={1} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:`linear-gradient(90deg,${c},transparent)` }} />
      <div style={{ fontSize:8, color:T.muted, textTransform:'uppercase', letterSpacing:'.12em',
        fontWeight:700, marginBottom:5, fontFamily:"'DM Mono',monospace" }}>{label}</div>
      <div style={{ fontSize:15, fontWeight:700, color:vc||T.text, letterSpacing:'-.01em',
        fontFamily:"'DM Mono',monospace", lineHeight:1.2,
        textShadow:T.dark && vc ? `0 0 12px ${vc}50` : 'none' }}>{value}</div>
      {sub && <div style={{ fontSize:9, color:T.text2, marginTop:3, fontFamily:"'DM Mono',monospace", letterSpacing:'.03em' }}>{sub}</div>}
    </div>
  );
}

// ── DONUT CHART ───────────────────────────────────────────────────────────────
function DonutChart({ title, data, currency, offset = 0, T }) {
  const [active, setActive] = useState(null);
  const [tip,    setTip]    = useState(null);
  const sorted = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data]);
  const total  = sorted.reduce((s, d) => s + d.value, 0);
  const CX=65, CY=65, OUTER=60, INNER=30, GAP=2;
  const segs = useMemo(() => {
    let cum = 0;
    return sorted.map((d, i) => {
      const frac = total ? d.value / total : 0;
      const s = cum + GAP/360, e = cum + frac - GAP/360;
      cum += frac;
      const sa = (s*2*Math.PI) - Math.PI/2;
      const ea = (e*2*Math.PI) - Math.PI/2;
      const x1o = CX+OUTER*Math.cos(sa), y1o = CY+OUTER*Math.sin(sa);
      const x2o = CX+OUTER*Math.cos(ea), y2o = CY+OUTER*Math.sin(ea);
      const x1i = CX+INNER*Math.cos(ea), y1i = CY+INNER*Math.sin(ea);
      const x2i = CX+INNER*Math.cos(sa), y2i = CY+INNER*Math.sin(sa);
      const lg = frac > 0.5 ? 1 : 0;
      return { d, i, frac,
        path:`M${x1o} ${y1o} A${OUTER} ${OUTER} 0 ${lg} 1 ${x2o} ${y2o} L${x1i} ${y1i} A${INNER} ${INNER} 0 ${lg} 0 ${x2i} ${y2i}Z`,
        color: PIE[(i+offset) % PIE.length] };
    });
  }, [sorted, total, offset]);

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, position:'relative',
      overflow:'hidden', boxShadow:T.dark?`0 0 20px rgba(99,102,241,.08)`:'none' }}>
      <Corner pos="TL" color={T.accent} size={10} /><Corner pos="TR" color={T.accent} size={10} />
      <Corner pos="BL" color={T.accent} size={10} /><Corner pos="BR" color={T.accent} size={10} />
      <div style={{ padding:'8px 14px', borderBottom:`1px solid ${T.border}`,
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, fontWeight:700, color:T.text, fontFamily:"'DM Mono',monospace",
          textTransform:'uppercase', letterSpacing:'.06em' }}>{title}</span>
        <span style={{ fontSize:9, color:T.muted, fontFamily:"'DM Mono',monospace",
          border:`1px solid ${T.border}`, padding:'1px 7px', letterSpacing:'.06em' }}>
          {sorted.length} STOCKS
        </span>
      </div>
      {!sorted.length
        ? <div style={{ color:T.muted, fontSize:11, textAlign:'center', padding:20, fontFamily:"'DM Mono',monospace" }}>NO HOLDINGS</div>
        : <div style={{ padding:'10px 12px', display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ flexShrink:0, position:'relative' }}>
              <svg width={130} height={130} style={{ display:'block' }}>
                <circle cx={CX} cy={CY} r={OUTER+4} fill="none" stroke={T.border} strokeWidth=".5" strokeDasharray="2 4" />
                {segs.map(s => (
                  <path key={s.i} d={s.path} fill={s.color}
                    opacity={active === null || active === s.i ? 1 : .2}
                    style={{ cursor:'default', transition:'opacity .15s',
                      filter: active===s.i && T.dark ? `drop-shadow(0 0 4px ${s.color})` : 'none' }}
                    onMouseEnter={e => { setActive(s.i); setTip({ x:e.nativeEvent.offsetX, y:e.nativeEvent.offsetY, d:s.d, pct:(s.frac*100).toFixed(1), color:s.color }); }}
                    onMouseLeave={() => { setActive(null); setTip(null); }} />
                ))}
                <text x={CX} y={CY-5} textAnchor="middle" fontSize={7} fill={T.muted}
                  fontFamily="'DM Mono',monospace" letterSpacing=".06em">
                  {active !== null ? sorted[active]?.name.toUpperCase().slice(0,8) : 'ALLOC'}
                </text>
                <text x={CX} y={CY+8} textAnchor="middle" fontSize={12} fontWeight="700"
                  fill={T.text} fontFamily="'DM Mono',monospace">
                  {active !== null ? `${((segs[active]?.frac||0)*100).toFixed(1)}%` : sorted.length}
                </text>
              </svg>
              {tip && (
                <div style={{ position:'absolute', top:tip.y+8, left:tip.x+6,
                  background:T.surface2, border:`1px solid ${tip.color}60`,
                  padding:'5px 9px', fontSize:10, pointerEvents:'none', zIndex:10,
                  boxShadow:`0 0 12px ${tip.color}40`, whiteSpace:'nowrap', fontFamily:"'DM Mono',monospace" }}>
                  <div style={{ fontWeight:700, color:tip.color }}>{tip.d.name.toUpperCase()}</div>
                  <div style={{ color:T.text2, marginTop:2 }}>{fmt(tip.d.value, currency)} · {tip.pct}%</div>
                </div>
              )}
            </div>
            <div style={{ flex:1, overflowY:'auto', maxHeight:130 }}>
              {sorted.map((e, i) => (
                <div key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    fontSize:10, padding:'3px 0',
                    borderBottom: i < sorted.length-1 ? `1px solid ${T.border}` : 'none',
                    opacity: active===null||active===i ? 1 : .25,
                    transition:'opacity .12s', cursor:'default', fontFamily:"'DM Mono',monospace" }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:6, height:6, background:PIE[(i+offset)%PIE.length], flexShrink:0,
                      boxShadow: T.dark ? `0 0 4px ${PIE[(i+offset)%PIE.length]}` : 'none' }} />
                    <span style={{ color:T.text, fontWeight:600, letterSpacing:'.02em' }}>{e.name}</span>
                  </div>
                  <div style={{ textAlign:'right', marginLeft:6 }}>
                    <div style={{ fontWeight:700, color:T.text }}>{total ? ((e.value/total)*100).toFixed(1) : 0}%</div>
                    <div style={{ fontSize:8, color:T.text2 }}>{fmt(e.value, currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
      }
    </div>
  );
}

// ── P&L BAR CHART ─────────────────────────────────────────────────────────────
function PLBarChart({ rows, currency, T }) {
  const data = useMemo(() => [...rows]
    .filter(r => r.gainPct != null)
    .sort((a, b) => b.gainPct - a.gainPct)
    .map(r => ({ name:short(r.symbol), pct:parseFloat(r.gainPct.toFixed(2)), color:r.gainPct>=0?T.success:T.danger }))
  , [rows, T]);
  const [hov, setHov] = useState(null);
  if (!data.length) return null;
  const maxAbs   = Math.max(...data.map(d => Math.abs(d.pct)), 1);
  const hasMixed = data.some(d => d.pct < 0) && data.some(d => d.pct > 0);
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, position:'relative', overflow:'hidden' }}>
      <Corner pos="TL" color={T.cyan} size={10} /><Corner pos="BR" color={T.cyan} size={10} />
      <div style={{ padding:'8px 14px', borderBottom:`1px solid ${T.border}`,
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, fontWeight:700, color:T.text, fontFamily:"'DM Mono',monospace",
          textTransform:'uppercase', letterSpacing:'.06em' }}>Unrealized P&L %</span>
        <span style={{ fontSize:9, color:T.muted, fontFamily:"'DM Mono',monospace" }}>
          {data.filter(d=>d.pct>0).length}↑ {data.filter(d=>d.pct<0).length}↓
        </span>
      </div>
      <div style={{ padding:'8px 12px' }}>
        {data.map((d, i) => (
          <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            style={{ display:'flex', alignItems:'center', height:20, gap:8,
              background: hov===i ? T.surface3 : 'transparent', transition:'background .08s', cursor:'default' }}>
            <div style={{ width:52, fontSize:9, fontWeight:700, color:T.text2,
              fontFamily:"'DM Mono',monospace", flexShrink:0, textAlign:'right', letterSpacing:'.04em' }}>{d.name}</div>
            <div style={{ flex:1, position:'relative', height:6, display:'flex', alignItems:'center' }}>
              {hasMixed && <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:T.border }} />}
              <div style={{ position:'absolute', height:5, background:d.color,
                boxShadow: T.dark ? `0 0 6px ${d.color}80` : 'none',
                width:`${hasMixed ? Math.abs(d.pct)/maxAbs*50 : Math.abs(d.pct)/maxAbs*100}%`,
                left: hasMixed ? (d.pct>=0 ? '50%' : `calc(50% - ${Math.abs(d.pct)/maxAbs*50}%)`) : '0',
                opacity: hov===null||hov===i ? 1 : .4, transition:'all .2s ease' }} />
            </div>
            <div style={{ width:52, fontSize:9, fontWeight:700, color:d.color,
              fontFamily:"'DM Mono',monospace", flexShrink:0, textAlign:'right',
              textShadow: T.dark ? `0 0 6px ${d.color}60` : 'none' }}>
              {d.pct >= 0 ? '+' : ''}{d.pct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PORTFOLIO TAB BAR ─────────────────────────────────────────────────────────
function PortfolioTabBar({ portfolios, activeId, onSwitch, onAdd, onRename, onDelete, T }) {
  const [editId,   setEditId]   = useState(null);
  const [editName, setEditName] = useState('');
  const [hovId,    setHovId]    = useState(null);
  const inputRef = useRef();

  const startEdit = (p, e) => { e.stopPropagation(); setEditId(p.id); setEditName(p.name); };
  const commit    = () => { if (editName.trim()) onRename(editId, editName.trim()); setEditId(null); };
  useEffect(() => { if (editId && inputRef.current) inputRef.current.focus(); }, [editId]);

  return (
    <div style={{ background:T.dark?'rgba(5,8,15,.98)':'#1a1d6e',
      borderBottom:`1px solid ${T.dark?'rgba(99,102,241,.25)':'#2d35b0'}`,
      display:'flex', alignItems:'center', gap:0, padding:'0 14px',
      height:36, flexShrink:0, overflowX:'auto', WebkitAppRegion:'no-drag' }}>
      {portfolios.map((p, i) => {
        const color  = PORT_COLORS[i % PORT_COLORS.length];
        const active = p.id === activeId;
        const hover  = hovId === p.id && !active;
        return (
          <div key={p.id} onClick={() => onSwitch(p.id)}
            onMouseEnter={() => setHovId(p.id)} onMouseLeave={() => setHovId(null)}
            style={{ display:'flex', alignItems:'center', gap:7, height:36, padding:'0 14px',
              cursor:'pointer', flexShrink:0, position:'relative', userSelect:'none',
              borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
              background: active ? `${color}15` : hover ? 'rgba(255,255,255,.04)' : 'transparent',
              transition:'all .15s' }}>
            <div style={{ width:7, height:7, flexShrink:0,
              background: active ? color : 'transparent',
              border:`1px solid ${active ? color : 'rgba(200,218,255,.2)'}`,
              boxShadow: active && T.dark ? `0 0 8px ${color}, 0 0 16px ${color}50` : 'none',
              transition:'all .15s' }} />
            {editId === p.id
              ? <input ref={inputRef} value={editName} onChange={e => setEditName(e.target.value)}
                  onBlur={commit} onClick={e => e.stopPropagation()}
                  onKeyDown={e => { if(e.key==='Enter')commit(); if(e.key==='Escape')setEditId(null); }}
                  style={{ width:100, padding:'2px 6px', background:'rgba(255,255,255,.06)',
                    color:'#e0e7ff', fontSize:11, fontFamily:"'DM Mono',monospace",
                    fontWeight:600, border:`1px solid ${color}`, outline:'none' }} />
              : <span onDoubleClick={e => startEdit(p, e)}
                  style={{ fontSize:11, fontFamily:"'DM Mono',monospace", fontWeight:active?700:400,
                    color:active?'#e8f0ff':'rgba(180,200,255,.4)', whiteSpace:'nowrap',
                    letterSpacing:'.04em', textTransform:'uppercase',
                    textShadow:active&&T.dark?`0 0 8px rgba(200,210,255,.5)`:'none',
                    transition:'all .15s' }}>{p.name}</span>
            }
            <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", fontWeight:700,
              padding:'1px 5px', color:active?color:'rgba(180,200,255,.25)',
              border:`1px solid ${active?color+'50':'rgba(180,200,255,.1)'}`,
              background:active?`${color}10`:'transparent', letterSpacing:'.04em',
              boxShadow:active&&T.dark?`0 0 6px ${color}30`:'none', transition:'all .15s' }}>
              {p.holdings.length}
            </span>
            {portfolios.length > 1 && (hover || active) && editId !== p.id && (
              <button onClick={e => { e.stopPropagation(); onDelete(p.id); }}
                style={{ background:'none', border:'none', cursor:'pointer',
                  color:'rgba(200,218,255,.25)', padding:'1px 3px',
                  display:'flex', alignItems:'center', lineHeight:1, transition:'all .1s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ff2965'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(200,218,255,.25)'}>
                <Ic.X />
              </button>
            )}
          </div>
        );
      })}
      <button onClick={onAdd}
        style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 10px', marginLeft:8,
          border:'1px solid rgba(99,102,241,.3)', background:'none',
          color:'rgba(160,180,255,.4)', cursor:'pointer', fontSize:10, flexShrink:0,
          fontFamily:"'DM Mono',monospace", letterSpacing:'.06em', transition:'all .13s' }}
        onMouseEnter={e => { e.currentTarget.style.color='#a5b4fc'; e.currentTarget.style.borderColor='rgba(99,102,241,.7)'; }}
        onMouseLeave={e => { e.currentTarget.style.color='rgba(160,180,255,.4)'; e.currentTarget.style.borderColor='rgba(99,102,241,.3)'; }}>
        <Ic.Plus /> NEW PORTFOLIO
      </button>
      <span style={{ marginLeft:'auto', fontSize:8, color:'rgba(160,180,255,.15)',
        flexShrink:0, fontFamily:"'DM Mono',monospace", letterSpacing:'.1em' }}>
        DOUBLE-CLICK TO RENAME
      </span>
    </div>
  );
}

// ── CSV IMPORT MODAL ──────────────────────────────────────────────────────────
function CSVImportModal({ onImport, onClose, market, T }) {
  const [rows,   setRows]   = useState([]);
  const [errs,   setErrs]   = useState([]);
  const [drag,   setDrag]   = useState(false);
  const [parsed, setParsed] = useState(false);
  const fileRef = useRef();
  const isIN = market === 'IN';
  const accentColor = isIN ? T.inColor : T.cyan;

  const findCol = (headers, ...names) => {
    for (const n of names) {
      const i = headers.findIndex(h => h.toLowerCase().replace(/[\s_]/g, '') === n.toLowerCase().replace(/[\s_]/g, ''));
      if (i >= 0) return i;
    }
    return -1;
  };

  const parseCSV = text => {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { setErrs(['CSV must have a header row and at least one data row.']); return; }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const iSym  = findCol(headers,'symbol','ticker','scrip','stock');
    const iName = findCol(headers,'name','stock','company','companyname');
    const iQty  = findCol(headers,'qty','quantity','shares','units');
    const iBuy  = findCol(headers,'buyprice','avgbuyprice','purchaseprice','cost','avgcost','averageprice','buyingprice');
    const iTgt  = findCol(headers,'analysttarget','target','targetprice','pricetarget');
    const e = [];
    if (iSym < 0) e.push('Cannot find "Symbol" column');
    if (iQty < 0) e.push('Cannot find "Qty" column');
    if (iBuy < 0) e.push('Cannot find "Buy Price" column');
    if (e.length) { setErrs(e); return; }
    const p = [], w = [];
    lines.slice(1).forEach((line, i) => {
      const cells = []; let cur = '', inQ = false;
      for (const ch of line + ',') {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      const sym  = cells[iSym]?.replace(/^"|"$/g, '').trim().toUpperCase();
      const name = iName >= 0 ? cells[iName]?.replace(/^"|"$/g, '').trim() : sym;
      const qty  = parseFloat(cells[iQty]?.replace(/[^0-9.-]/g, ''));
      const buy  = parseFloat(cells[iBuy]?.replace(/[^0-9.-]/g, ''));
      const tgt  = iTgt >= 0 ? parseFloat(cells[iTgt]?.replace(/[^0-9.-]/g, '')) : NaN;
      if (!sym) { w.push(`Row ${i+2}: empty symbol — skipped`); return; }
      if (isNaN(qty)||qty<=0) { w.push(`Row ${i+2}: invalid qty — skipped`); return; }
      if (isNaN(buy)||buy<=0) { w.push(`Row ${i+2}: invalid buy price — skipped`); return; }
      p.push({ id:Date.now()+i, symbol:sym, name:name||sym,
        qty:parseFloat(qty.toFixed(8)), buyPrice:buy,
        analystTarget:isNaN(tgt)?null:tgt });
    });
    if (!p.length) { setErrs([...e, 'No valid rows found.', ...w]); return; }
    setErrs(w); setRows(p); setParsed(true);
  };

  const handleFile = f => {
    if (!f) return;
    if (!f.name.endsWith('.csv') && f.type !== 'text/csv') { setErrs(['Please upload a .csv file.']); return; }
    const r = new FileReader();
    r.onload = e => parseCSV(e.target.result);
    r.readAsText(f);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, display:'flex', alignItems:'center',
      justifyContent:'center', background:'rgba(2,4,8,.85)', backdropFilter:'blur(6px)' }}>
      <div style={{ background:T.surface, border:`1px solid ${accentColor}50`, width:620,
        maxWidth:'95vw', maxHeight:'88vh', display:'flex', flexDirection:'column',
        boxShadow:`0 0 40px ${accentColor}30, 0 24px 64px rgba(0,0,0,.7)`, position:'relative' }}>
        <Corner pos="TL" color={accentColor} size={14} thickness={2} />
        <Corner pos="TR" color={accentColor} size={14} thickness={2} />
        <Corner pos="BL" color={accentColor} size={14} thickness={2} />
        <Corner pos="BR" color={accentColor} size={14} thickness={2} />
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
          background:`linear-gradient(90deg,transparent,${accentColor},transparent)` }} />

        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${accentColor}40`,
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, border:`1px solid ${accentColor}60`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:accentColor, background:`${accentColor}10` }}><Ic.Upload /></div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:T.text, fontFamily:"'Orbitron',monospace", letterSpacing:'.04em' }}>
                IMPORT {isIN ? 'INDIAN (NSE/BSE)' : 'US (NYSE/NASDAQ)'}
              </div>
              <div style={{ fontSize:10, color:T.text2, fontFamily:"'DM Mono',monospace", marginTop:1 }}>Append holdings → Active Portfolio</div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:'transparent', border:`1px solid ${T.border}`, cursor:'pointer',
              color:T.text2, padding:'5px 7px', display:'flex', alignItems:'center', transition:'all .1s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#ff2965'; e.currentTarget.style.color='#ff2965'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.text2; }}>
            <Ic.X />
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:18, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:T.surface2, border:`1px solid ${accentColor}40`, padding:'10px 14px', position:'relative' }}>
            <Corner pos="TL" color={accentColor} size={8} />
            <div style={{ fontWeight:700, color:T.text, marginBottom:8, display:'flex', alignItems:'center',
              gap:6, fontSize:11, fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'.06em' }}>
              <Ic.File /> Required Columns
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px' }}>
              {[['Symbol *','RELIANCE.NS / TCS.NS / AAPL…'],['Qty *','10, 2.5, 0.00000001…'],
                ['Buy Price *','2800, 150.50…'],['Name','Company name (optional)'],
                ['Analyst Target','3200, 220… (optional)']].map(([k,v]) => (
                <div key={k} style={{ display:'flex', gap:8, padding:'3px 0', fontSize:11 }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", color:accentColor, fontWeight:700, minWidth:120, fontSize:10, letterSpacing:'.04em' }}>{k}</span>
                  <span style={{ color:T.text2, fontFamily:"'DM Mono',monospace", fontSize:10 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:8, fontSize:9, color:T.muted, fontFamily:"'DM Mono',monospace", letterSpacing:'.04em' }}>
              * COLUMN ORDER DOESN'T MATTER · EXPORTED CSVs ARE AUTO-COMPATIBLE
            </div>
          </div>

          {!parsed && (
            <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
              onClick={()=>fileRef.current.click()}
              style={{ border:`2px dashed ${drag?accentColor:T.border}`, padding:'32px 24px',
                textAlign:'center', cursor:'pointer', background:drag?`${accentColor}08`:T.surface2,
                transition:'all .15s', position:'relative' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📁</div>
              <div style={{ fontSize:13, fontWeight:700, color:drag?accentColor:T.text, marginBottom:6,
                fontFamily:"'DM Mono',monospace", letterSpacing:'.04em', textTransform:'uppercase' }}>
                {drag ? 'DROP TO IMPORT' : 'DRAG & DROP CSV or CLICK TO BROWSE'}
              </div>
              <div style={{ fontSize:11, color:T.text2, fontFamily:"'DM Mono',monospace" }}>
                {isIN ? 'NSE / BSE symbols (e.g. TCS.NS)' : 'NYSE / NASDAQ symbols (e.g. AAPL)'}
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display:'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
          )}

          {errs.length > 0 && (
            <div style={{ background:T.warnBg, border:`1px solid ${T.warning}50`, padding:'10px 14px' }}>
              {errs.map((e, i) => (
                <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start',
                  fontSize:11, color:T.warning, marginBottom:i<errs.length-1?4:0, fontFamily:"'DM Mono',monospace" }}>
                  <span style={{ flexShrink:0, marginTop:1 }}><Ic.Alert /></span>{e}
                </div>
              ))}
            </div>
          )}

          {parsed && rows.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:T.success, marginBottom:8,
                display:'flex', alignItems:'center', gap:6, fontFamily:"'DM Mono',monospace",
                textTransform:'uppercase', letterSpacing:'.06em',
                textShadow: T.dark ? `0 0 8px ${T.success}60` : 'none' }}>
                ▶ {rows.length} HOLDING{rows.length!==1?'S':''} READY TO IMPORT
              </div>
              <div style={{ border:`1px solid ${T.border}`, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:T.surface2 }}>
                      {['Symbol','Name','Qty','Buy Price','Analyst Target'].map(h => (
                        <th key={h} style={{ padding:'7px 10px', textAlign:'left', color:T.muted,
                          fontWeight:700, fontSize:8, textTransform:'uppercase', letterSpacing:'.1em',
                          borderBottom:`1px solid ${T.border}`, fontFamily:"'DM Mono',monospace" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ background:i%2?T.surface2:T.surface }}>
                        <td style={{ padding:'6px 10px', fontFamily:"'DM Mono',monospace", fontWeight:700, color:accentColor, borderBottom:`1px solid ${T.border}` }}>{r.symbol}</td>
                        <td style={{ padding:'6px 10px', color:T.text2, borderBottom:`1px solid ${T.border}`, fontFamily:"'DM Mono',monospace", maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</td>
                        <td style={{ padding:'6px 10px', fontFamily:"'DM Mono',monospace", color:T.text, borderBottom:`1px solid ${T.border}` }}>{fmtQty(r.qty)}</td>
                        <td style={{ padding:'6px 10px', fontFamily:"'DM Mono',monospace", color:T.text, borderBottom:`1px solid ${T.border}` }}>{r.buyPrice}</td>
                        <td style={{ padding:'6px 10px', fontFamily:"'DM Mono',monospace", color:r.analystTarget?T.success:T.muted, borderBottom:`1px solid ${T.border}` }}>{r.analystTarget ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:'12px 18px', borderTop:`1px solid ${accentColor}40`,
          display:'flex', gap:8, justifyContent:'flex-end', alignItems:'center', background:T.surface2 }}>
          {parsed && <span style={{ fontSize:10, color:T.text2, flex:1, fontFamily:"'DM Mono',monospace", letterSpacing:'.03em' }}>Existing holdings will NOT be removed</span>}
          <button onClick={onClose}
            style={{ padding:'7px 16px', border:`1px solid ${T.border}`, background:'transparent',
              color:T.text2, cursor:'pointer', fontSize:11, fontWeight:500,
              fontFamily:"'DM Mono',monospace", letterSpacing:'.06em', transition:'all .1s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#ff2965'; e.currentTarget.style.color='#ff2965'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.text2; }}>
            CANCEL
          </button>
          {!parsed
            ? <button onClick={() => fileRef.current.click()}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 18px',
                  border:`1px solid ${accentColor}`, background:`${accentColor}15`, color:accentColor,
                  cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:"'DM Mono',monospace",
                  letterSpacing:'.06em', transition:'all .12s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow=`0 0 20px ${accentColor}50`}
                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                <Ic.Upload /> CHOOSE FILE
              </button>
            : <button onClick={() => { onImport(rows); onClose(); }} disabled={!rows.length}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 20px',
                  border:`1px solid ${T.success}`, background:`${T.success}15`, color:T.success,
                  cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:"'DM Mono',monospace",
                  letterSpacing:'.06em', transition:'all .12s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow=`0 0 20px ${T.success}50`}
                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                <Ic.Check /> IMPORT {rows.length}
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// ── HOLDINGS SECTION ──────────────────────────────────────────────────────────
function Section({ title, flag, accent, rows, currency, targets, onSaveTarget, onRemove,
  fetchPrices, loading, error, lastUpdated, compact, onImportCSV, addHolding, T }) {

  // Default: allocation descending
  const [sort,    setSort]    = useState({col:'allocPct', dir:'desc'});
  const [filter,  setFilter]  = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({symbol:'', name:'', qty:'', buyPrice:''});
  const [srch,    setSrch]    = useState('');
  const [results, setResults] = useState([]);
  const [busyS,   setBusyS]   = useState(false);
  const [focused, setFocused] = useState(false);
  const timer = useRef(null);

  const totalSect  = rows.reduce((s, r) => s+(r.curValue??r.invested), 0) || 1;
  const totalInv   = rows.reduce((s, r) => s+r.invested, 0);
  const totalCur   = rows.reduce((s, r) => s+(r.curValue??r.invested), 0);
  const totalGain  = totalCur - totalInv;
  const totalGainP = totalInv ? (totalGain / totalInv)*100 : 0;
  const dayTotal   = rows.reduce((s, r) => s+(r.dayPL??0), 0);

  const aug = useMemo(() => rows.map(r => ({...r, allocPct:((r.curValue??r.invested)/totalSect)*100})), [rows, totalSect]);
  const srt = useMemo(() => sortRows(aug, sort.col, sort.dir), [aug, sort]);
  const flt = useMemo(() => filter.trim()
    ? srt.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()) || r.symbol.toLowerCase().includes(filter.toLowerCase()))
    : srt
  , [srt, filter]);

  const onSort = col => setSort(p => ({ col, dir: p.col===col ? (p.dir==='asc'?'desc':'asc') : 'desc' }));

  const doSearch = q => {
    setSrch(q); clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setBusyS(true);
      try {
        const res  = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`, {headers:{Accept:'application/json'}});
        const json = await res.json();
        setResults((json?.quotes??[]).filter(r => r.symbol && r.quoteType!=='OPTION').slice(0,7));
      } catch { setResults([]); }
      setBusyS(false);
    }, 300);
  };

  const selectResult = r => {
    setForm(p => ({...p, symbol:r.symbol, name:r.longname||r.shortname||r.symbol}));
    setSrch(r.longname||r.shortname||r.symbol); setResults([]);
  };

  const doAdd = () => {
    const sym = form.symbol.trim().toUpperCase();
    if (!sym || !form.qty || !form.buyPrice) return;
    addHolding({ id:Date.now(), symbol:sym, name:form.name.trim()||sym,
      qty:parseFloat(parseFloat(form.qty).toFixed(8)), buyPrice:parseFloat(form.buyPrice) });
    setForm({symbol:'', name:'', qty:'', buyPrice:''}); setSrch(''); setResults([]); setShowAdd(false);
  };

  const csvExport = () => {
    const h = ['Stock','Symbol','Qty','Buy Price','Invested','LTP','Day Chg%','Day P&L','Current Value','P&L','P&L %','Alloc %','Analyst Target','Upside %'];
    const body = rows.map(r => {
      const tgt = targets[r.id];
      const up  = (tgt!=null&&r.curPrice!=null) ? ((tgt-r.curPrice)/r.curPrice*100) : null;
      return [r.name,r.symbol,fmtQty(r.qty),r.buyPrice,r.invested.toFixed(2),
        r.curPrice?.toFixed(2)??'',r.dayChange?.toFixed(2)??'',r.dayPL?.toFixed(2)??'',
        r.curValue?.toFixed(2)??'',r.gain?.toFixed(2)??'',r.gainPct?.toFixed(2)??'',
        ((r.curValue??r.invested)/totalSect*100).toFixed(2),tgt?.toFixed(2)??'',up?.toFixed(2)??''];
    });
    const csv = [h, ...body].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),
      download:`portfolio_${currency}_${new Date().toISOString().slice(0,10)}.csv`
    });
    a.click();
  };

  const rp   = compact ? '5px 10px' : '8px 10px';
  const tdB  = { padding:rp, borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap', transition:'background .06s' };
  const tdN  = { ...tdB, fontFamily:"'DM Mono',monospace", textAlign:'right' };
  const inpS = { padding:'7px 10px', border:`1px solid ${T.border}`, background:T.surface2,
    color:T.text, fontSize:12, outline:'none', width:'100%', boxSizing:'border-box',
    fontFamily:"'DM Mono',monospace", transition:'border-color .12s, box-shadow .12s' };
  const inpFocus = { borderColor:accent, boxShadow:`0 0 0 2px ${accent}20, 0 0 8px ${accent}20` };

  const BtnRow = ({ children, onClick, col, disabled }) => {
    const [hov, setHov] = useState(false);
    return (
      <button onClick={onClick} disabled={disabled}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', fontSize:11, fontWeight:600,
          cursor:'pointer', transition:'all .12s', fontFamily:"'DM Mono',monospace", letterSpacing:'.04em',
          border:`1px solid ${col?col+'50':T.border}`,
          background: hov ? (col?`${col}15`:T.surface3) : 'transparent',
          color: hov ? (col||T.text) : T.text2,
          boxShadow: hov && col && T.dark ? `0 0 10px ${col}30` : 'none',
          transform: hov && !disabled ? 'translateY(-1px)' : 'none' }}>
        {children}
      </button>
    );
  };

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, marginBottom:12,
      position:'relative', overflow:'hidden',
      boxShadow:T.dark?`0 0 30px rgba(0,0,0,.5), inset 0 1px 0 ${accent}15`:'0 2px 12px rgba(0,0,0,.08)' }}>
      <Corner pos="TL" color={accent} size={12} thickness={1.5} />
      <Corner pos="TR" color={accent} size={12} thickness={1.5} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:`linear-gradient(90deg,transparent 0%,${accent} 20%,${accent} 80%,transparent 100%)` }} />

      {/* Header */}
      <div style={{ padding:'10px 16px', borderBottom:`1px solid ${T.border}`,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background: T.dark ? `linear-gradient(90deg,${accent}12 0%,transparent 50%)` : `${accent}06`,
        flexWrap:'wrap', gap:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:17, lineHeight:1 }}>{flag}</span>
          <span style={{ fontSize:12, fontWeight:700, color:T.text, fontFamily:"'Orbitron',monospace",
            letterSpacing:'.04em', textShadow:T.dark?`0 0 10px ${accent}60`:'none' }}>
            {title.toUpperCase()}
          </span>
          <span style={{ fontSize:9, color:accent, fontFamily:"'DM Mono',monospace",
            border:`1px solid ${accent}40`, padding:'1px 7px', letterSpacing:'.08em' }}>
            {rows.length} HOLDINGS
          </span>
          {lastUpdated && (
            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:T.muted, fontFamily:"'DM Mono',monospace" }}>
              <span style={{ width:5, height:5, background:T.success, display:'inline-block',
                animation:'pulse 1.5s infinite', boxShadow:T.dark?`0 0 6px ${T.success}`:'none' }} />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
              color:T.muted, pointerEvents:'none', fontSize:10 }}><Ic.Search /></span>
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="FILTER…"
              style={{ ...inpS, width:115, paddingLeft:24, padding:'5px 8px 5px 24px', fontSize:10, letterSpacing:'.04em' }}
              onFocus={e => Object.assign(e.target.style, inpFocus)}
              onBlur={e => { e.target.style.borderColor=T.border; e.target.style.boxShadow='none'; }} />
          </div>
          <BtnRow onClick={csvExport} col={T.cyan}><Ic.Dl /> EXPORT</BtnRow>
          <BtnRow onClick={onImportCSV} col={accent}><Ic.Upload /> IMPORT</BtnRow>
          <BtnRow onClick={fetchPrices} disabled={loading} col={T.text2}>
            <Ic.Refresh s={loading} />{loading ? '…' : 'REFRESH'}
          </BtnRow>
          <button onClick={() => setShowAdd(v => !v)}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 14px',
              fontSize:11, fontWeight:700, cursor:'pointer',
              fontFamily:"'DM Mono',monospace", letterSpacing:'.06em',
              border:`1px solid ${accent}`, background:`${accent}15`, color:accent,
              boxShadow:T.dark?`0 0 12px ${accent}30`:'none', transition:'all .12s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow=`0 0 20px ${accent}50, 0 0 40px ${accent}20`}
            onMouseLeave={e => e.currentTarget.style.boxShadow=T.dark?`0 0 12px ${accent}30`:'none'}>
            <Ic.Plus /> ADD
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',
        gap:6, padding:'8px 12px', borderBottom:`1px solid ${T.border}`,
        background:T.dark?T.surface2:'#f8faff' }}>
        <Stat T={T} label="Invested"      value={fmt(totalInv, currency)} accentColor={T.muted} />
        <Stat T={T} label="Current Value" value={fmt(totalCur, currency)} accentColor={T.cyan} />
        <Stat T={T} label="Overall P&L"
          value={`${totalGain>=0?'+':''}${fmt(Math.abs(totalGain),currency)}`}
          sub={fmtPct(totalGainP)} vc={gColor(totalGain,T)} accentColor={gColor(totalGain,T)} />
        <Stat T={T} label="Today's P&L"
          value={`${dayTotal>=0?'+':''}${fmt(Math.abs(dayTotal),currency)}`}
          vc={gColor(dayTotal,T)} accentColor={gColor(dayTotal,T)} />
        <Stat T={T} label="Win / Loss"
          value={`${rows.filter(r=>(r.gain??0)>0).length} / ${rows.filter(r=>(r.gain??0)<0).length}`}
          accentColor={accent} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
          background:T.dangerBg, color:T.danger, fontSize:11,
          borderBottom:`1px solid ${T.danger}30`, fontFamily:"'DM Mono',monospace" }}>
          <Ic.Alert />⚠ {error}
        </div>
      )}

      {/* Add Form — NO buy date field */}
      {showAdd && (
        <div style={{ padding:'10px 14px', borderBottom:`1px solid ${T.border}`,
          background:T.surface2, animation:'fadeIn .15s ease' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr .65fr .8fr auto', gap:8, alignItems:'end' }}>
            <div>
              <div style={{ fontSize:8, color:T.muted, fontWeight:700, marginBottom:4,
                textTransform:'uppercase', letterSpacing:'.1em', fontFamily:"'DM Mono',monospace" }}>
                Search {currency==='INR' ? 'NSE / BSE' : 'NYSE / NASDAQ'}
              </div>
              <div style={{ position:'relative' }}>
                <input value={srch} onChange={e => doSearch(e.target.value)} autoFocus
                  onFocus={e => { setFocused(true); Object.assign(e.target.style, inpFocus); }}
                  onBlur={e => { setTimeout(()=>setFocused(false),200); e.target.style.borderColor=T.border; e.target.style.boxShadow='none'; }}
                  placeholder={currency==='INR' ? 'e.g. TCS, RELIANCE.NS…' : 'e.g. AAPL, Tesla…'}
                  style={{ ...inpS, border:`1px solid ${accent}`, boxShadow:`0 0 8px ${accent}20` }} />
                {busyS && (
                  <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                    fontSize:10, color:T.muted, animation:'pulse 1s infinite' }}>…</span>
                )}
                {focused && results.length > 0 && (
                  <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:999,
                    background:T.surface, border:`1px solid ${accent}50`,
                    boxShadow:`0 0 20px ${accent}30`, overflow:'hidden' }}>
                    {results.map((r, i) => (
                      <div key={r.symbol} onMouseDown={() => selectResult(r)}
                        style={{ padding:'8px 12px', cursor:'pointer', display:'flex',
                          justifyContent:'space-between', alignItems:'center',
                          borderBottom: i < results.length-1 ? `1px solid ${T.border}` : 'none',
                          transition:'background .08s' }}
                        onMouseEnter={e => e.currentTarget.style.background=T.surface3}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <div>
                          <span style={{ fontWeight:700, fontSize:12, color:accent,
                            fontFamily:"'DM Mono',monospace", letterSpacing:'.04em' }}>{r.symbol}</span>
                          <span style={{ fontSize:11, color:T.text2, marginLeft:8 }}>{r.longname||r.shortname||''}</span>
                        </div>
                        {r.exchDisp && (
                          <span style={{ fontSize:9, background:`${accent}18`, color:accent,
                            padding:'2px 6px', fontWeight:700, letterSpacing:'.06em',
                            fontFamily:"'DM Mono',monospace" }}>{r.exchDisp}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {form.symbol && (
                <div style={{ fontSize:9, color:T.success, marginTop:3, fontWeight:700,
                  fontFamily:"'DM Mono',monospace", letterSpacing:'.04em',
                  display:'flex', alignItems:'center', gap:4,
                  textShadow:T.dark?`0 0 8px ${T.success}60`:'none' }}>
                  ▶ {form.symbol} — {form.name}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize:8, color:T.muted, fontWeight:700, marginBottom:4,
                textTransform:'uppercase', letterSpacing:'.1em', fontFamily:"'DM Mono',monospace" }}>
                Qty (Fractional)
              </div>
              <input type="number" step="0.00000001" value={form.qty} placeholder="10.5"
                onChange={e => setForm(p => ({...p, qty:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && doAdd()}
                style={inpS}
                onFocus={e => Object.assign(e.target.style, inpFocus)}
                onBlur={e => { e.target.style.borderColor=T.border; e.target.style.boxShadow='none'; }} />
            </div>
            <div>
              <div style={{ fontSize:8, color:T.muted, fontWeight:700, marginBottom:4,
                textTransform:'uppercase', letterSpacing:'.1em', fontFamily:"'DM Mono',monospace" }}>
                Buy Price ({currency==='INR'?'₹':'$'})
              </div>
              <input type="number" step="0.01" value={form.buyPrice}
                placeholder={currency==='INR' ? '2800' : '150'}
                onChange={e => setForm(p => ({...p, buyPrice:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && doAdd()}
                style={inpS}
                onFocus={e => Object.assign(e.target.style, inpFocus)}
                onBlur={e => { e.target.style.borderColor=T.border; e.target.style.boxShadow='none'; }} />
            </div>
            <div style={{ display:'flex', gap:5 }}>
              <button onClick={doAdd} disabled={!form.symbol||!form.qty||!form.buyPrice}
                style={{ padding:'7px 18px', border:`1px solid ${accent}`, background:`${accent}15`,
                  color:accent, cursor:'pointer', fontSize:12, fontWeight:700,
                  fontFamily:"'DM Mono',monospace", letterSpacing:'.06em',
                  boxShadow:T.dark?`0 0 12px ${accent}30`:'none', transition:'all .12s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow=`0 0 20px ${accent}50`}
                onMouseLeave={e => e.currentTarget.style.boxShadow=T.dark?`0 0 12px ${accent}30`:'none'}>
                ADD
              </button>
              <button onClick={() => { setShowAdd(false); setSrch(''); setResults([]); setForm({symbol:'',name:'',qty:'',buyPrice:''}); }}
                style={{ padding:'7px 10px', border:`1px solid ${T.border}`, background:'transparent',
                  color:T.text2, cursor:'pointer', fontSize:12, transition:'all .1s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#ff2965'; e.currentTarget.style.color='#ff2965'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.text2; }}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table — no Buy Date column */}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
          <thead>
            <tr>
              <SortTh T={T} label="STOCK"    col="name"      sort={sort} onSort={onSort} minW={130} sticky />
              <SortTh T={T} label="QTY"      col="qty"       sort={sort} onSort={onSort} right minW={72} />
              <SortTh T={T} label="BUY"      col="buyPrice"  sort={sort} onSort={onSort} right minW={82} />
              <SortTh T={T} label="INVESTED" col="invested"  sort={sort} onSort={onSort} right minW={96} />
              <SortTh T={T} label="LTP"      col="curPrice"  sort={sort} onSort={onSort} right minW={96} />
              <SortTh T={T} label="DAY%"     col="dayChange" sort={sort} onSort={onSort} right minW={72} />
              <SortTh T={T} label="DAY P&L"  col="dayPL"     sort={sort} onSort={onSort} right minW={100} />
              <SortTh T={T} label="VALUE"    col="curValue"  sort={sort} onSort={onSort} right minW={96} />
              <SortTh T={T} label="P&L"      col="gain"      sort={sort} onSort={onSort} right minW={108} />
              <SortTh T={T} label="P&L %"    col="gainPct"   sort={sort} onSort={onSort} right minW={80} />
              <SortTh T={T} label="ALLOC %"  col="allocPct"  sort={sort} onSort={onSort} right minW={96} />
              <th style={{ padding:'0 10px', height:32,
                background:T.dark?'rgba(6,10,20,.95)':T.surface2,
                borderBottom:`1px solid ${T.border}`, color:T.muted,
                fontSize:9, textTransform:'uppercase', letterSpacing:'.1em',
                fontWeight:700, fontFamily:"'DM Mono',monospace", minWidth:140 }}>
                ANALYST TARGET
              </th>
              <th style={{ padding:'0 8px', height:32, background:T.dark?'rgba(6,10,20,.95)':T.surface2,
                borderBottom:`1px solid ${T.border}`, width:34 }} />
            </tr>
          </thead>
          <tbody>
            {!flt.length && (
              <tr><td colSpan={13} style={{ padding:28, textAlign:'center', color:T.muted, fontSize:11,
                fontFamily:"'DM Mono',monospace", letterSpacing:'.04em' }}>
                {filter ? '[ NO MATCHES ]' : `[ NO ${currency==='INR'?'INDIAN':'US'} HOLDINGS — CLICK ADD ]`}
              </td></tr>
            )}
            {flt.map((r, i) => (
              <tr key={r.id}
                style={{ background:T.surface, borderLeft:'2px solid transparent', transition:'all .08s' }}
                onMouseEnter={e => { e.currentTarget.style.background=T.surface3; e.currentTarget.style.borderLeftColor=accent; }}
                onMouseLeave={e => { e.currentTarget.style.background=T.surface; e.currentTarget.style.borderLeftColor='transparent'; }}>
                {/* Stock — sticky */}
                <td style={{ ...tdB, background:'inherit', position:'sticky', left:0, zIndex:1, borderRight:`1px solid ${T.border}` }}>
                  <div style={{ fontWeight:700, fontFamily:"'DM Mono',monospace", color:accent, fontSize:11,
                    letterSpacing:'.04em', textShadow:T.dark?`0 0 8px ${accent}40`:'none' }}>{short(r.symbol)}</div>
                  <div style={{ fontSize:9, color:T.muted, maxWidth:140, overflow:'hidden',
                    textOverflow:'ellipsis', marginTop:1, letterSpacing:'.02em' }}>{r.name}</div>
                </td>
                <td style={{ ...tdN, color:T.text2 }}>{fmtQty(r.qty)}</td>
                <td style={{ ...tdN, color:T.text2 }}>{fmt(r.buyPrice, currency)}</td>
                <td style={{ ...tdN, color:T.text }}>{fmt(r.invested, currency)}</td>
                <td style={{ ...tdN }}>
                  {r.curPrice != null
                    ? <b style={{ color:T.cyan, textShadow:T.dark?`0 0 8px ${T.cyan}40`:'none' }}>{fmt(r.curPrice, currency)}</b>
                    : <span style={{ color:T.muted, fontSize:9, animation:'pulse 2s infinite', letterSpacing:'.06em' }}>LIVE…</span>
                  }
                </td>
                <td style={{ ...tdN }}><Badge val={r.dayChange} pct T={T} /></td>
                <td style={{ ...tdN }}><Badge val={r.dayPL} currency={currency} T={T} /></td>
                <td style={{ ...tdN, color:T.text }}>{r.curValue != null ? fmt(r.curValue, currency) : '—'}</td>
                <td style={{ ...tdN }}><Badge val={r.gain} currency={currency} T={T} /></td>
                <td style={{ ...tdN }}><Badge val={r.gainPct} pct T={T} /></td>
                {/* Alloc bar */}
                <td style={{ ...tdB, textAlign:'right' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:5 }}>
                    <div style={{ width:42, height:3, background:T.border, flexShrink:0 }}>
                      <div style={{ width:`${Math.min(r.allocPct,100)}%`, height:'100%',
                        background:accent, boxShadow:T.dark?`0 0 4px ${accent}`:'none',
                        transition:'width .3s' }} />
                    </div>
                    <span style={{ fontSize:10, color:T.text2, fontFamily:"'DM Mono',monospace",
                      fontWeight:600, minWidth:34 }}>{r.allocPct.toFixed(1)}%</span>
                  </div>
                </td>
                {/* Analyst Target */}
                <td style={{ ...tdB }}>
                  <TargetCell id={r.id} target={targets[r.id]??null} curPrice={r.curPrice}
                    currency={currency} onSave={onSaveTarget} T={T} />
                </td>
                <td style={{ ...tdB, padding:'5px 7px' }}>
                  <button onClick={() => onRemove(r.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:T.muted,
                      padding:'3px 5px', display:'flex', alignItems:'center', transition:'all .1s' }}
                    onMouseEnter={e => { e.currentTarget.style.color='#ff2965'; e.currentTarget.style.textShadow='0 0 8px #ff296560'; }}
                    onMouseLeave={e => { e.currentTarget.style.color=T.muted; e.currentTarget.style.textShadow='none'; }}
                    title="Remove">
                    <Ic.Trash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TWEAKS PANEL ──────────────────────────────────────────────────────────────
function TweaksPanel({ tweaks, onUpdate, T }) {
  return (
    <div style={{ position:'fixed', bottom:16, right:16, background:T.surface,
      border:`1px solid ${T.border}`, padding:18, width:260, zIndex:1000,
      boxShadow:T.dark?`0 0 30px rgba(99,102,241,.2), 0 16px 48px rgba(0,0,0,.7)`:'0 8px 32px rgba(0,0,0,.2)' }}>
      <Corner pos="TL" color={T.accent} size={12} thickness={1.5} />
      <Corner pos="TR" color={T.accent} size={12} thickness={1.5} />
      <Corner pos="BL" color={T.accent} size={12} thickness={1.5} />
      <Corner pos="BR" color={T.accent} size={12} thickness={1.5} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:`linear-gradient(90deg,transparent,${T.accent},transparent)` }} />
      <div style={{ fontWeight:700, fontSize:11, color:T.accent, marginBottom:14,
        display:'flex', alignItems:'center', gap:7, fontFamily:"'Orbitron',monospace",
        letterSpacing:'.06em', textShadow:T.dark?`0 0 10px ${T.accent}60`:'none' }}>
        <Ic.Gear /> SYSTEM CONFIG
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
        {[{label:'DARK MODE',key:'darkMode'},{label:'COMPACT ROWS',key:'compactRows'},{label:'P&L CHARTS',key:'showCharts'}].map(({label,key}) => (
          <label key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            fontSize:10, color:T.text, cursor:'pointer',
            fontFamily:"'DM Mono',monospace", letterSpacing:'.06em' }}>
            {label}
            <div onClick={() => onUpdate(key, !tweaks[key])}
              style={{ width:36, height:18, background:tweaks[key]?T.accent:T.surface3, position:'relative',
                cursor:'pointer', transition:'background .2s',
                border:`1px solid ${tweaks[key]?T.accent:T.border}`,
                boxShadow:tweaks[key]&&T.dark?`0 0 8px ${T.accent}50`:'none' }}>
              <div style={{ position:'absolute', top:2,
                left:tweaks[key]?'calc(100% - 15px)':2,
                width:12, height:12, background:'#fff',
                transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.4)' }} />
            </div>
          </label>
        ))}
        <label style={{ display:'flex', flexDirection:'column', gap:5, fontSize:10,
          color:T.text, fontFamily:"'DM Mono',monospace", letterSpacing:'.06em' }}>
          <span style={{ display:'flex', justifyContent:'space-between' }}>
            AUTO-REFRESH
            <b style={{ color:T.accent, textShadow:T.dark?`0 0 8px ${T.accent}60`:'none' }}>{tweaks.autoRefreshMins} MIN</b>
          </span>
          <input type="range" min={1} max={30} step={1} value={tweaks.autoRefreshMins}
            onChange={e => onUpdate('autoRefreshMins', parseInt(e.target.value))} />
        </label>
        <label style={{ display:'flex', flexDirection:'column', gap:5, fontSize:10,
          color:T.text, fontFamily:"'DM Mono',monospace", letterSpacing:'.06em' }}>
          <span style={{ display:'flex', justifyContent:'space-between' }}>
            GLOW INTENSITY <b style={{ color:T.accent }}>{tweaks.glowIntensity}%</b>
          </span>
          <input type="range" min={0} max={100} step={10} value={tweaks.glowIntensity}
            onChange={e => onUpdate('glowIntensity', parseInt(e.target.value))} />
        </label>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tweaks,     setTweaks]     = useState(() => { try { const s=localStorage.getItem('pm_tweaks'); return s?{...TWEAK_DEFAULTS,...JSON.parse(s)}:TWEAK_DEFAULTS; } catch { return TWEAK_DEFAULTS; } });
  const [showTweaks, setShowTweaks] = useState(false);
  const [importModal,setImportModal]= useState(null); // null | 'IN' | 'US'
  const T = useMemo(() => mkT(tweaks.darkMode, tweaks.glowIntensity), [tweaks.darkMode, tweaks.glowIntensity]);

  const [portfolios, setPortfolios] = useState(() => { try { const s=localStorage.getItem('pm_portfolios'); return s?JSON.parse(s):DEFAULT_PORTFOLIOS; } catch { return DEFAULT_PORTFOLIOS; } });
  const [activeId,   setActiveId]   = useState(() => { try { const s=localStorage.getItem('pm_activeId'); return s?JSON.parse(s):1; } catch { return 1; } });
  const [prices,      setPrices]      = useState({});
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updateAvail, setUpdateAvail] = useState(false);

  const activePf   = useMemo(() => portfolios.find(p => p.id===activeId) || portfolios[0], [portfolios, activeId]);
  const holdings   = activePf?.holdings ?? [];
  const targets    = activePf?.targets  ?? {};

  const setHoldings = fn => setPortfolios(ps => ps.map(p => p.id===activeId ? {...p, holdings:typeof fn==='function'?fn(p.holdings):fn} : p));
  const setTargets  = fn => setPortfolios(ps => ps.map(p => p.id===activeId ? {...p, targets: typeof fn==='function'?fn(p.targets) :fn} : p));

  const addPortfolio    = () => { const id=Date.now(), n=portfolios.length+1; setPortfolios(ps=>[...ps,{id,name:`Portfolio ${n}`,holdings:[],targets:{}}]); setActiveId(id); };
  const renamePortfolio = (id,name) => setPortfolios(ps => ps.map(p => p.id===id ? {...p,name} : p));
  const deletePortfolio = id => { if (portfolios.length<=1) return; const r=portfolios.filter(p=>p.id!==id); setPortfolios(r); if (activeId===id) setActiveId(r[0].id); };

  const addHolding  = h => setHoldings(p => [...p, h]);
  const removeHold  = id => setHoldings(p => p.filter(h => h.id !== id));
  const saveTarget  = (id, val) => setTargets(p => val==null ? Object.fromEntries(Object.entries(p).filter(([k])=>+k!==id)) : {...p,[id]:val});
  const importHoldings = rows => {
    const nt = {};
    const nh = rows.map(({analystTarget,...h}) => { if (analystTarget!=null) nt[h.id]=analystTarget; return h; });
    setHoldings(p => [...p, ...nh]);
    if (Object.keys(nt).length) setTargets(p => ({...p,...nt}));
  };

  useEffect(() => { localStorage.setItem('pm_portfolios', JSON.stringify(portfolios)); }, [portfolios]);
  useEffect(() => { localStorage.setItem('pm_activeId',   JSON.stringify(activeId));   }, [activeId]);
  useEffect(() => { localStorage.setItem('pm_tweaks',     JSON.stringify(tweaks));     }, [tweaks]);

  // Auto-updater listener
  useEffect(() => {
    if (window.electronAPI?.onUpdateAvailable) {
      window.electronAPI.onUpdateAvailable(() => setUpdateAvail(true));
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    if (!holdings.length) return;
    setLoading(true); setError(null);
    const out = {};
    await Promise.all(holdings.map(async h => {
      try {
        const res  = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(h.symbol)}?interval=1d&range=1d`, {headers:{Accept:'application/json'}});
        if (!res.ok) throw new Error();
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          out[h.symbol] = { current:meta.regularMarketPrice, prev:meta.chartPreviousClose??meta.regularMarketPrice, currency:meta.currency??(isUS(h.symbol)?'USD':'INR') };
        } else { out[h.symbol] = null; }
      } catch { out[h.symbol] = null; }
    }));
    if (holdings.length && !Object.values(out).some(Boolean)) {
      setError('Live prices unavailable (CORS / network). Showing calculated values.');
    }
    setPrices(out); setLastUpdated(new Date()); setLoading(false);
  }, [holdings]);

  useEffect(() => {
    fetchPrices();
    const t = setInterval(fetchPrices, (tweaks.autoRefreshMins||5)*60*1000);
    return () => clearInterval(t);
  }, [fetchPrices, tweaks.autoRefreshMins]);

  const rows = useMemo(() => holdings.map(h => {
    const p   = prices[h.symbol];
    const cur = p?.currency ?? (isUS(h.symbol) ? 'USD' : 'INR');
    const cp  = p?.current ?? null;
    const inv = parseFloat((h.buyPrice*h.qty).toFixed(8));
    const cv  = cp != null ? parseFloat((cp*h.qty).toFixed(2)) : null;
    const g   = cv != null ? cv - inv : null;
    const gp  = g  != null ? (g/inv)*100 : null;
    const dc  = p ? ((p.current-p.prev)/p.prev)*100 : null;
    const dp  = dc != null && cv != null ? (dc/100)*cv : null;
    return { ...h, currency:cur, curPrice:cp, invested:inv, curValue:cv, gain:g, gainPct:gp, dayChange:dc, dayPL:dp };
  }), [holdings, prices]);

  const inRows = useMemo(() => rows.filter(r => r.currency==='INR'), [rows]);
  const usRows = useMemo(() => rows.filter(r => r.currency==='USD'), [rows]);
  const inPie  = useMemo(() => inRows.map(r => ({name:short(r.symbol),value:r.curValue??r.invested})), [inRows]);
  const usPie  = useMemo(() => usRows.map(r => ({name:short(r.symbol),value:r.curValue??r.invested})), [usRows]);

  const gainIN  = inRows.reduce((s,r)=>s+(r.gain??0), 0),  gainUS  = usRows.reduce((s,r)=>s+(r.gain??0), 0);
  const dayIN   = inRows.reduce((s,r)=>s+(r.dayPL??0), 0), dayUS   = usRows.reduce((s,r)=>s+(r.dayPL??0), 0);
  const totalIN = inRows.reduce((s,r)=>s+(r.curValue??r.invested), 0);
  const totalUS = usRows.reduce((s,r)=>s+(r.curValue??r.invested), 0);
  const invIN   = inRows.reduce((s,r)=>s+r.invested, 0);
  const invUS   = usRows.reduce((s,r)=>s+r.invested, 0);

  const sharedProps = { fetchPrices, loading, error, lastUpdated, targets, onSaveTarget:saveTarget, onRemove:removeHold, compact:tweaks.compactRows, T };

  // Window controls (Electron)
  const winMin   = () => window.electronAPI?.minimize();
  const winMax   = () => window.electronAPI?.maximize();
  const winClose = () => window.electronAPI?.close();

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:T.bg, height:'100vh',
      display:'flex', flexDirection:'column', color:T.text, userSelect:'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=DM+Sans:opsz,wght@9..40,300..700&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin   { to   { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(99,102,241,.35); border-radius:2px; }
        ::-webkit-scrollbar-track { background:transparent; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
        input[type=range] { width:100%; accent-color:#6366f1; }
        button:disabled { opacity:.35; cursor:not-allowed !important; }
        tr:hover td { background:${T.surface3} !important; }
        tr:hover td:first-child { border-left-color:${T.accent} !important; }
      `}</style>

      {/* ── Title Bar (draggable for Electron) ── */}
      <div style={{ background:T.dark?'#03050c':'#13166b',
        borderBottom:`1px solid ${T.dark?'rgba(99,102,241,.3)':'#252ec0'}`,
        height:48, flexShrink:0, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'0 16px', position:'relative', overflow:'hidden',
        WebkitAppRegion:'drag' }}>
        {/* Scanline */}
        {T.dark && <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.08) 2px,rgba(0,0,0,.08) 4px)', pointerEvents:'none', zIndex:0 }} />}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
          background:'linear-gradient(90deg,transparent 0%,rgba(99,102,241,.8) 50%,transparent 100%)', zIndex:1 }} />

        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:12, zIndex:2, WebkitAppRegion:'no-drag' }}>
          <div style={{ width:34, height:34, background:'linear-gradient(135deg,#4f46e5,#818cf8)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:T.dark?'0 0 16px rgba(99,102,241,.7)':'none', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700,
              color:'#e0e7ff', letterSpacing:'.06em',
              textShadow:T.dark?'0 0 12px rgba(160,170,255,.6)':'none' }}>
              PORTFOLIO MANAGER
            </div>
            <div style={{ fontSize:8, color:'rgba(160,170,255,.4)', fontFamily:"'DM Mono',monospace",
              letterSpacing:'.14em', marginTop:1 }}>
              ARUN VERMA · v3.0 · {new Date().toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>

        {/* P&L pills */}
        <div style={{ display:'flex', gap:8, alignItems:'center', zIndex:2, WebkitAppRegion:'no-drag' }}>
          {inRows.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 12px',
              background:'rgba(255,255,255,.04)', border:`1px solid rgba(255,140,26,.3)`, position:'relative' }}>
              <Corner pos="TL" color={T.inColor} size={6} />
              <Corner pos="BR" color={T.inColor} size={6} />
              <span style={{ fontSize:10, color:'rgba(200,210,255,.4)', fontFamily:"'DM Mono',monospace" }}>🇮🇳</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:12,
                color:gColor(gainIN,T), textShadow:T.dark?`0 0 8px ${gColor(gainIN,T)}60`:'none' }}>
                {gainIN>=0?'+':''}₹{Math.abs(gainIN).toLocaleString('en-IN',{maximumFractionDigits:0})}
              </span>
              <div style={{ width:1, height:14, background:'rgba(255,255,255,.08)' }} />
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:gColor(dayIN,T) }}>
                {dayIN>=0?'+':''}₹{Math.abs(dayIN).toLocaleString('en-IN',{maximumFractionDigits:0})} today
              </span>
            </div>
          )}
          {usRows.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 12px',
              background:'rgba(255,255,255,.04)', border:`1px solid rgba(0,217,255,.3)`, position:'relative' }}>
              <Corner pos="TL" color={T.cyan} size={6} />
              <Corner pos="BR" color={T.cyan} size={6} />
              <span style={{ fontSize:10, color:'rgba(200,210,255,.4)', fontFamily:"'DM Mono',monospace" }}>🇺🇸</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:12,
                color:gColor(gainUS,T), textShadow:T.dark?`0 0 8px ${gColor(gainUS,T)}60`:'none' }}>
                {gainUS>=0?'+':''}${Math.abs(gainUS).toLocaleString('en-US',{maximumFractionDigits:0})}
              </span>
              <div style={{ width:1, height:14, background:'rgba(255,255,255,.08)' }} />
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:gColor(dayUS,T) }}>
                {dayUS>=0?'+':''}${Math.abs(dayUS).toLocaleString('en-US',{maximumFractionDigits:0})} today
              </span>
            </div>
          )}
        </div>

        {/* Controls + Win Buttons */}
        <div style={{ display:'flex', gap:5, alignItems:'center', zIndex:2, WebkitAppRegion:'no-drag' }}>
          {updateAvail && (
            <button onClick={() => window.electronAPI?.installUpdate()}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', fontSize:9,
                border:`1px solid ${T.success}`, background:`${T.success}15`, color:T.success,
                cursor:'pointer', fontFamily:"'DM Mono',monospace", letterSpacing:'.06em',
                animation:'pulse 2s infinite', boxShadow:`0 0 10px ${T.success}40` }}>
              <Ic.Update /> UPDATE AVAILABLE
            </button>
          )}
          {[
            {icon:tweaks.darkMode?<Ic.Sun/>:<Ic.Moon/>, label:tweaks.darkMode?'LIGHT':'DARK', onClick:()=>setTweaks(p=>({...p,darkMode:!p.darkMode}))},
            {icon:<Ic.Gear/>, label:'CONFIG', onClick:()=>setShowTweaks(v=>!v), active:showTweaks},
          ].map(({icon,label,onClick,active}) => (
            <button key={label} onClick={onClick}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px',
                border:`1px solid ${active?T.accent+'80':'rgba(99,102,241,.25)'}`,
                background: active ? `${T.accent}15` : 'rgba(255,255,255,.04)',
                color: active ? T.accent : 'rgba(180,195,255,.6)',
                cursor:'pointer', fontSize:9, fontWeight:700,
                fontFamily:"'DM Mono',monospace", letterSpacing:'.06em', transition:'all .12s',
                boxShadow: active && T.dark ? `0 0 10px ${T.accent}40` : 'none' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,.15)'; e.currentTarget.style.color='#c7d2fe'; }}
              onMouseLeave={e => { e.currentTarget.style.background=active?`${T.accent}15`:'rgba(255,255,255,.04)'; e.currentTarget.style.color=active?T.accent:'rgba(180,195,255,.6)'; }}>
              {icon}{label}
            </button>
          ))}
          {/* Win controls */}
          <div style={{ display:'flex', marginLeft:8, gap:2 }}>
            {[
              {icon:<Ic.Minimize/>, fn:winMin,  title:'Minimise'},
              {icon:<Ic.Maximize/>, fn:winMax,  title:'Maximise'},
              {icon:<Ic.X/>,        fn:winClose,title:'Close', danger:true},
            ].map(({icon,fn,title,danger}) => (
              <button key={title} onClick={fn} title={title}
                style={{ width:28, height:28, background:'transparent',
                  border:'none', cursor:'pointer', color:'rgba(180,200,255,.45)',
                  display:'flex', alignItems:'center', justifyContent:'center', transition:'all .1s' }}
                onMouseEnter={e => { e.currentTarget.style.background=danger?'rgba(255,41,101,.25)':'rgba(255,255,255,.1)'; e.currentTarget.style.color=danger?'#ff2965':'#e0e7ff'; }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(180,200,255,.45)'; }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Portfolio Tab Bar ── */}
      <PortfolioTabBar
        portfolios={portfolios} activeId={activeId}
        onSwitch={setActiveId} onAdd={addPortfolio}
        onRename={renamePortfolio} onDelete={deletePortfolio} T={T} />

      {/* ── Main Layout ── */}
      <div style={{ flex:1, overflow:'hidden', display:'grid',
        gridTemplateColumns:'minmax(0,1fr) 272px', gap:10, padding:10 }}>

        {/* Tables */}
        <div style={{ overflowY:'auto', paddingRight:2 }}>
          <Section title="Indian Portfolio" flag="🇮🇳" accent={T.inColor}
            rows={inRows} currency="INR" addHolding={addHolding}
            onImportCSV={() => setImportModal('IN')} {...sharedProps} />
          <Section title="US Portfolio" flag="🇺🇸" accent={T.usColor}
            rows={usRows} currency="USD" addHolding={addHolding}
            onImportCSV={() => setImportModal('US')} {...sharedProps} />
          {tweaks.showCharts && inRows.length > 0 && <div style={{ marginBottom:10 }}><PLBarChart rows={inRows} currency="INR" T={T} /></div>}
          {tweaks.showCharts && usRows.length > 0 && <div style={{ marginBottom:10 }}><PLBarChart rows={usRows} currency="USD" T={T} /></div>}
        </div>

        {/* Sidebar */}
        <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:9 }}>

          {/* Portfolio Summary */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, overflow:'hidden',
            position:'relative', boxShadow:T.dark?`0 0 20px rgba(0,0,0,.5)`:'none' }}>
            <Corner pos="TL" color={T.accent} size={10} />
            <Corner pos="BR" color={T.accent} size={10} />
            <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
              background:`linear-gradient(90deg,transparent,${T.accent},transparent)` }} />
            <div style={{ padding:'8px 14px', borderBottom:`1px solid ${T.border}`,
              display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:6, height:6, background:T.accent,
                boxShadow:T.dark?`0 0 6px ${T.accent}, 0 0 12px ${T.accent}50`:'none' }} />
              <span style={{ fontSize:10, fontWeight:700, color:T.text,
                fontFamily:"'Orbitron',monospace", letterSpacing:'.06em',
                textShadow:T.dark?`0 0 8px ${T.accent}40`:'none' }}>
                {activePf?.name?.toUpperCase()}
              </span>
            </div>
            <div style={{ padding:'8px 12px' }}>
              {[
                {l:'HOLDINGS', v:holdings.length, vc:null},
                {l:'🇮🇳 INDIAN', v:inRows.length, vc:null},
                {l:'🇺🇸 US',     v:usRows.length, vc:null},
                {l:'WINNERS', v:rows.filter(r=>(r.gain??0)>0).length, vc:T.success},
                {l:'LOSERS',  v:rows.filter(r=>(r.gain??0)<0).length, vc:T.danger},
                null,
                {l:'🇮🇳 INVESTED',  v:fmt(invIN,'INR'),   vc:null},
                {l:'🇮🇳 CURRENT',   v:fmt(totalIN,'INR'),  vc:null},
                {l:'🇮🇳 TOTAL P&L', v:`${gainIN>=0?'+':''}${fmt(Math.abs(gainIN),'INR')}`, vc:gColor(gainIN,T)},
                {l:'🇮🇳 TODAY',     v:`${dayIN>=0?'+':''}${fmt(Math.abs(dayIN),'INR')}`,   vc:gColor(dayIN,T)},
                null,
                {l:'🇺🇸 INVESTED',  v:fmt(invUS,'USD'),   vc:null},
                {l:'🇺🇸 CURRENT',   v:fmt(totalUS,'USD'),  vc:null},
                {l:'🇺🇸 TOTAL P&L', v:`${gainUS>=0?'+':''}${fmt(Math.abs(gainUS),'USD')}`, vc:gColor(gainUS,T)},
                {l:'🇺🇸 TODAY',     v:`${dayUS>=0?'+':''}${fmt(Math.abs(dayUS),'USD')}`,   vc:gColor(dayUS,T)},
              ].map((row, i) => row === null
                ? <div key={i} style={{ height:1, background:T.border, margin:'5px 0', opacity:.5 }} />
                : <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0',
                    fontSize:10, borderBottom:`1px solid ${T.border}`, fontFamily:"'DM Mono',monospace" }}>
                    <span style={{ color:T.muted, letterSpacing:'.04em' }}>{row.l}</span>
                    <span style={{ fontWeight:700, color:row.vc||T.text, letterSpacing:'.02em',
                      textShadow:row.vc&&T.dark?`0 0 6px ${row.vc}40`:'none' }}>{row.v}</span>
                  </div>
              )}
            </div>
          </div>

          {inPie.length > 0 && <DonutChart T={T} title="🇮🇳 ALLOCATION" data={inPie} currency="INR" offset={0} />}
          {usPie.length > 0 && <DonutChart T={T} title="🇺🇸 ALLOCATION" data={usPie} currency="USD" offset={6} />}

          {/* Analyst Targets sidebar */}
          {(() => {
            const tRows = rows.filter(r => targets[r.id] != null && r.curPrice != null);
            if (!tRows.length) return null;
            return (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, overflow:'hidden',
                position:'relative', boxShadow:T.dark?`0 0 20px rgba(0,0,0,.5)`:'none' }}>
                <Corner pos="TL" color={T.warning} size={10} />
                <Corner pos="BR" color={T.warning} size={10} />
                <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
                  background:`linear-gradient(90deg,transparent,${T.warning},transparent)` }} />
                <div style={{ padding:'8px 14px', borderBottom:`1px solid ${T.border}`,
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:T.text,
                    fontFamily:"'Orbitron',monospace", letterSpacing:'.06em' }}>ANALYST TARGETS</span>
                  <span style={{ fontSize:9, color:T.muted, fontFamily:"'DM Mono',monospace",
                    border:`1px solid ${T.border}`, padding:'1px 6px', letterSpacing:'.06em' }}>{tRows.length} SET</span>
                </div>
                <div style={{ padding:'8px 12px' }}>
                  {tRows
                    .sort((a,b) => ((targets[b.id]-b.curPrice)/b.curPrice) - ((targets[a.id]-a.curPrice)/a.curPrice))
                    .map(r => {
                      const tgt = targets[r.id];
                      const up  = ((tgt - r.curPrice) / r.curPrice) * 100;
                      const col = up>=20?T.success:up>=0?'#00cc6a':up>=-10?T.warning:T.danger;
                      return (
                        <div key={r.id} style={{ display:'flex', justifyContent:'space-between',
                          alignItems:'center', padding:'5px 0', borderBottom:`1px solid ${T.border}`, fontSize:10 }}>
                          <div>
                            <div style={{ fontWeight:700, fontFamily:"'DM Mono',monospace", color:T.accent,
                              fontSize:10, letterSpacing:'.06em', textShadow:T.dark?`0 0 6px ${T.accent}40`:'none' }}>
                              {short(r.symbol)}
                            </div>
                            <div style={{ fontSize:8, color:T.muted, fontFamily:"'DM Mono',monospace", marginTop:1 }}>
                              {fmt(r.curPrice,r.currency)} → {fmt(tgt,r.currency)}
                            </div>
                          </div>
                          <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px',
                            border:`1px solid ${col}50`, background:`${col}12`, color:col,
                            fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700,
                            boxShadow:T.dark?`0 0 6px ${col}30`:'none' }}>
                            {up>=0?'▲':'▼'} {Math.abs(up).toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {showTweaks  && <TweaksPanel tweaks={tweaks} onUpdate={(k,v)=>setTweaks(p=>({...p,[k]:v}))} T={T} />}
      {importModal && <CSVImportModal market={importModal} onImport={importHoldings} onClose={()=>setImportModal(null)} T={T} />}
    </div>
  );
}
