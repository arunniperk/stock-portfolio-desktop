import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { isUS, short, fmtQty, fmt, fmtDual, fmtBig, fmtPct, gColor, sortRows } from './utils';
import { mkT, PIE, PORT_COLORS, DEF_PF, TWEAK_DEF } from './theme';
import { Ic } from './icons';
import { callGroq, callGemini, callAI, extractJSON } from './ai';
import { useYahooSearch, useNotes } from './hooks';

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


// Theme, icons, utils, AI imported from separate modules
// ── REMOVED: mkT moved to theme.js ──
// Theme, icons, utils, AI providers: imported from ./theme, ./icons, ./utils, ./ai







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
              {l:'Free Qty',v:holding.unpledgedQty!=null?fmtQty(holding.unpledgedQty):'—',vc:holding.unpledgedQty!=null&&holding.unpledgedQty<holding.qty?T.warning:null},
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
              {[['Symbol *','RELIANCE.NS / AAPL'],['Qty *','10, 2.5'],['Buy Price *','2800, 150'],['Name','Optional']].map(([k,v])=>(
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
function Section({title,flag,accent,rows,currency,usdInr,onSaveUnpledged,onRemove,fetchPrices,loading,error,lastUpdated,compact,onImportCSV,addHolding,onRowClick,T}) {
  const [sort,setSort]=useState({col:'allocPct',dir:'desc'});
  const [filter,setFilter]=useState('');
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({symbol:'',name:'',qty:'',buyPrice:''});
  const {srch,setSrch,results,setResults,busyS,focused,setFocused,doSearch,clearSearch}=useYahooSearch();
  const totalSect=rows.reduce((s,r)=>s+(r.curValue??r.invested),0)||1;
  const totalInv=rows.reduce((s,r)=>s+r.invested,0),totalCur=rows.reduce((s,r)=>s+(r.curValue??r.invested),0);
  const totalGain=totalCur-totalInv,totalGainP=totalInv?(totalGain/totalInv)*100:0,dayTotal=rows.reduce((s,r)=>s+(r.dayPL??0),0);
  const aug=useMemo(()=>rows.map(r=>({...r,allocPct:((r.curValue??r.invested)/totalSect)*100})),[rows,totalSect]);
  const srt=useMemo(()=>sortRows(aug,sort.col,sort.dir),[aug,sort]);
  const flt=useMemo(()=>filter.trim()?srt.filter(r=>r.name.toLowerCase().includes(filter.toLowerCase())||r.symbol.toLowerCase().includes(filter.toLowerCase())):srt,[srt,filter]);
  const onSort=col=>setSort(p=>({col,dir:p.col===col?(p.dir==='asc'?'desc':'asc'):'desc'}));
  // doSearch: provided by useYahooSearch hook
  const selectResult=r=>{setForm(p=>({...p,symbol:r.symbol,name:r.longname||r.shortname||r.symbol}));setSrch(r.longname||r.shortname||r.symbol);setResults([]);};
  const doAdd=()=>{const sym=form.symbol.trim().toUpperCase();if(!sym||!form.qty||!form.buyPrice)return;addHolding({id:Date.now(),symbol:sym,name:form.name.trim()||sym,qty:parseFloat(parseFloat(form.qty).toFixed(8)),buyPrice:parseFloat(form.buyPrice),unpledgedQty:null});setForm({symbol:'',name:'',qty:'',buyPrice:''});setSrch('');setResults([]);setShowAdd(false);};
  const buildExportData=()=>{
    const h=['Stock','Symbol','Qty','Free Qty','Buy Price','Invested','LTP','Day %','Day P&L','Value','P&L','P&L %','Alloc %'];
    const body=rows.map(r=>{
      return[r.name,r.symbol,fmtQty(r.qty),r.unpledgedQty!=null?fmtQty(r.unpledgedQty):'',r.buyPrice,r.invested.toFixed(2),r.curPrice?.toFixed(2)??'',r.dayChange?.toFixed(2)??'',r.dayPL?.toFixed(2)??'',r.curValue?.toFixed(2)??'',r.gain?.toFixed(2)??'',r.gainPct?.toFixed(2)??'',((r.curValue??r.invested)/totalSect*100).toFixed(2)];});
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
                <th style={{padding:'10px 12px',background:T.surface2,borderBottom:`1px solid ${T.border}`,color:T.text3,fontSize:11,fontWeight:600,textAlign:'right',minWidth:72,whiteSpace:'nowrap'}}>Free Qty</th>
                <SortTh T={T} label="Buy Price"      col="buyPrice"  sort={sort} onSort={onSort} right minW={90}/>
                <SortTh T={T} label="Invested"       col="invested"  sort={sort} onSort={onSort} right minW={100}/>
                <SortTh T={T} label="LTP"            col="curPrice"  sort={sort} onSort={onSort} right minW={100}/>
                <SortTh T={T} label="Day %"          col="dayChange" sort={sort} onSort={onSort} right minW={75}/>
                <SortTh T={T} label="Day P&L"        col="dayPL"     sort={sort} onSort={onSort} right minW={100}/>
                <SortTh T={T} label="Value"          col="curValue"  sort={sort} onSort={onSort} right minW={100}/>
                <SortTh T={T} label="P&L"            col="gain"      sort={sort} onSort={onSort} right minW={110}/>
                <SortTh T={T} label="P&L %"          col="gainPct"   sort={sort} onSort={onSort} right minW={76}/>
                <SortTh T={T} label="Alloc %"        col="allocPct"  sort={sort} onSort={onSort} right minW={90}/>
                <th style={{padding:'10px 12px',background:T.surface2,borderBottom:`1px solid ${T.border}`,width:40}}/>
              </tr>
            </thead>
            <tbody>
              {!flt.length&&<tr><td colSpan={12} style={{padding:32,textAlign:'center',color:T.text3,fontSize:13}}>{filter?'No matches found.':`No ${currency==='INR'?'Indian':'US'} holdings yet — click Add Holding.`}</td></tr>}
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



// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: NOTES PER STOCK ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Storage: pm_notes = { "SYMBOL": "note text" }
// Also exports useNote() for StockDetailView inline note

// useNotes: imported from ./hooks

function NotesModule({T,holdings}) {
  const {notes,saveNote}=useNotes();
  const [editSym,setEditSym]=useState(null);
  const [editText,setEditText]=useState('');
  const [filter,setFilter]=useState('');

  const allSymbols=[...new Set([...Object.keys(notes),...(holdings||[]).map(h=>h.symbol)])].filter(s=>!filter||s.includes(filter.toUpperCase())||(notes[s]||'').toLowerCase().includes(filter.toLowerCase()));

  const INP={padding:'8px 12px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};

  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Stock Notes</div>
          <div style={{fontSize:13,color:T.text3}}>{Object.keys(notes).length} note{Object.keys(notes).length!==1?'s':''}</div>
        </div>
        <div style={{position:'relative'}}><span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.text3,pointerEvents:'none'}}><Ic.Search/></span><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter stocks…" style={{...INP,width:180,paddingLeft:30}}/></div>
      </div>

      {!allSymbols.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No notes yet. Click any stock detail tab to add notes.</div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
        {allSymbols.map(sym=>{
          const holding=(holdings||[]).find(h=>h.symbol===sym);
          const note=notes[sym]||'';
          const isEdit=editSym===sym;
          return(
            <div key={sym} style={{background:T.surface2,borderRadius:8,border:`1px solid ${note?T.border:T.border}`,padding:16,display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontWeight:700,color:T.accent,fontSize:13}}>{short(sym)}</div>
                  {holding&&<div style={{fontSize:11,color:T.text3}}>{holding.name}</div>}
                </div>
                <div style={{display:'flex',gap:6}}>
                  {!isEdit&&<button onClick={()=>{setEditSym(sym);setEditText(note);}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'4px 8px',display:'flex',alignItems:'center',gap:4,fontSize:11,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.Pencil/> Edit</button>}
                  {note&&!isEdit&&<button onClick={()=>saveNote(sym,'')} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'4px 8px',display:'flex',alignItems:'center',fontSize:11,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.danger;e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.Trash/></button>}
                </div>
              </div>
              {isEdit?(
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={4} style={{...INP,resize:'vertical',lineHeight:1.6}} placeholder="Investment rationale, risks, targets…" autoFocus/>
                  <div style={{display:'flex',gap:8}}>
                    <NvBtn onClick={()=>{saveNote(sym,editText);setEditSym(null);}} variant="primary" T={T}><Ic.Check/> Save</NvBtn>
                    <NvBtn onClick={()=>setEditSym(null)} T={T}><Ic.X/> Cancel</NvBtn>
                  </div>
                </div>
              ):(
                <div style={{fontSize:12,color:note?T.text:T.text3,lineHeight:1.7,fontStyle:note?'normal':'italic',minHeight:40,whiteSpace:'pre-wrap'}}>{note||'No note. Click Edit to add.'}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: PRICE ALERTS ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Storage: pm_alerts = [{id,symbol,name,direction,price,currency,triggered,triggeredAt}]
// Alerts are checked whenever prices refresh

function AlertsModule({T,prices,holdings}) {
  const [alerts,setAlerts]=useState(()=>{try{return JSON.parse(localStorage.getItem('pm_alerts')||'[]');}catch{return [];}});
  const [form,setForm]=useState({symbol:'',name:'',direction:'above',price:'',currency:'INR'});
  const [showAdd,setShowAdd]=useState(false);
  const {srch,setSrch,results,setResults,focused,setFocused,busyS,doSearch,clearSearch}=useYahooSearch();

  useEffect(()=>{localStorage.setItem('pm_alerts',JSON.stringify(alerts));},[alerts]);

  // Check alerts against current prices
  useEffect(()=>{
    if(!prices||!alerts.length)return;
    let changed=false;
    const updated=alerts.map(a=>{
      if(a.triggered)return a;
      const p=prices[a.symbol]?.current;
      if(!p)return a;
      const hit=(a.direction==='above'&&p>=a.price)||(a.direction==='below'&&p<=a.price);
      if(hit){
        changed=true;
        // Browser notification
        if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
          new Notification(`Price Alert: ${short(a.symbol)}`,{body:`${short(a.symbol)} is ${a.direction} ${a.currency==='USD'?'$':'₹'}${a.price} — currently ${a.currency==='USD'?'$':'₹'}${p.toFixed(2)}`,icon:''});
        }
        return{...a,triggered:true,triggeredAt:Date.now()};
      }
      return a;
    });
    if(changed){setAlerts(updated);localStorage.setItem('pm_alerts',JSON.stringify(updated));}
  },[prices]);

  // Request notification permission
  useEffect(()=>{
    if(typeof Notification!=='undefined'&&Notification.permission==='default'){
      Notification.requestPermission();
    }
  },[]);

  // doSearch: provided by useYahooSearch hook

  const addAlert=()=>{
    if(!form.symbol||!form.price)return;
    setAlerts(p=>[{id:Date.now(),symbol:form.symbol,name:form.name||form.symbol,direction:form.direction,price:parseFloat(form.price),currency:form.currency,triggered:false,triggeredAt:null,createdAt:Date.now()},...p]);
    setForm({symbol:'',name:'',direction:'above',price:'',currency:'INR'});setSrch('');setResults([]);setShowAdd(false);
  };
  const removeAlert=id=>setAlerts(p=>p.filter(a=>a.id!==id));
  const resetAlert=id=>setAlerts(p=>p.map(a=>a.id===id?{...a,triggered:false,triggeredAt:null}:a));

  const active=alerts.filter(a=>!a.triggered);
  const triggered=alerts.filter(a=>a.triggered);
  const INP={padding:'8px 12px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};
  const tdS={padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontSize:12};

  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Price Alerts</div>
          <div style={{fontSize:13,color:T.text3}}>{active.length} active · {triggered.length} triggered</div>
        </div>
        <NvBtn onClick={()=>setShowAdd(v=>!v)} variant="primary" T={T}><Ic.Plus/> New Alert</NvBtn>
      </div>

      {showAdd&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Create Price Alert</div>
          {/* Quick-add from portfolio */}
          {holdings?.length>0&&!form.symbol&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:6,textTransform:'uppercase',letterSpacing:'.05em'}}>Quick pick from portfolio</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {holdings.filter(h=>!alerts.some(a=>a.symbol===h.symbol&&!a.triggered)).map(h=>(
                  <button key={h.symbol} onClick={()=>{setForm(p=>({...p,symbol:h.symbol,name:h.name,currency:isUS(h.symbol)?'USD':'INR'}));setSrch(h.name);}} style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${T.border2}`,background:T.surface3,color:T.text2,cursor:'pointer',fontSize:11,fontWeight:600,transition:'all .12s',display:'flex',alignItems:'center',gap:4}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.color=T.text2;}}>{short(h.symbol)}</button>
                ))}
              </div>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'2fr 0.8fr 0.8fr 0.6fr auto',gap:10,alignItems:'end'}}>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Stock</div>
              <div style={{position:'relative'}}>
                <input value={srch} onChange={e=>doSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),200)} placeholder="Search stock…" style={INP} autoFocus/>
                {focused&&results.length>0&&(
                  <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:9999,background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,.3)',overflow:'hidden'}}>
                    {results.map((r,i)=><div key={r.symbol} onMouseDown={()=>{setForm(p=>({...p,symbol:r.symbol,name:r.longname||r.shortname||r.symbol,currency:isUS(r.symbol)?'USD':'INR'}));setSrch(r.longname||r.shortname||r.symbol);setResults([]);}} style={{padding:'9px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',borderBottom:i<results.length-1?`1px solid ${T.border}`:'none',transition:'background .08s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{fontWeight:700,color:T.accent,marginRight:8}}>{r.symbol}</span><span style={{fontSize:11,color:T.text3}}>{r.longname||r.shortname}</span>
                    </div>)}
                  </div>
                )}
              </div>
              {form.symbol&&<div style={{fontSize:11,color:T.accent,marginTop:3}}>✓ {form.symbol}</div>}
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Direction</div>
              <select value={form.direction} onChange={e=>setForm(p=>({...p,direction:e.target.value}))} style={{...INP}}>
                <option value="above">Above ▲</option>
                <option value="below">Below ▼</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Price ({form.currency==='USD'?'$':'₹'})</div>
              <input type="number" value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))} placeholder="e.g. 2800" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Mkt</div>
              <select value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))} style={{...INP}}>
                <option value="INR">🇮🇳 INR</option>
                <option value="USD">🇺🇸 USD</option>
              </select>
            </div>
            <div style={{display:'flex',gap:6}}>
              <NvBtn onClick={addAlert} variant="primary" disabled={!form.symbol||!form.price} T={T}><Ic.Plus/> Add</NvBtn>
              <NvBtn onClick={()=>{setShowAdd(false);setSrch('');setResults([]);}} T={T}><Ic.X/></NvBtn>
            </div>
          </div>
        </div>
      )}

      {!alerts.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No alerts set. Add a price alert to get notified when a stock crosses your target.</div>}

      {active.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.accent,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Active Alerts</span>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:T.surface3}}>{['Stock','Direction','Alert Price','Current Price','Distance','Created',''].map(h=><th key={h} style={{...tdS,color:T.text3,fontSize:10,fontWeight:700}}>{h}</th>)}</tr></thead>
            <tbody>{active.map((a,i)=>{
              const cp=prices[a.symbol]?.current;
              const dist=cp?((a.direction==='above'?a.price-cp:cp-a.price)/cp*100):null;
              const near=dist!=null&&dist<5&&dist>=0;
              return(
                <tr key={a.id} style={{background:near?(a.currency==='INR'?T.warnBg:T.warnBg):i%2===0?T.surface2:T.surface3}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=near?T.warnBg:i%2===0?T.surface2:T.surface3}>
                  <td style={{...tdS}}><div style={{fontWeight:700,color:T.accent}}>{short(a.symbol)}</div><div style={{fontSize:10,color:T.text3}}>{a.name}</div></td>
                  <td style={{...tdS}}><span style={{padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:700,background:a.direction==='above'?T.successBg:T.dangerBg,color:a.direction==='above'?T.success:T.danger}}>{a.direction==='above'?'▲ Above':'▼ Below'}</span></td>
                  <td style={{...tdS,fontWeight:700,color:T.text}}>{a.currency==='USD'?'$':'₹'}{a.price.toLocaleString()}</td>
                  <td style={{...tdS,color:T.cyan}}>{cp?`${a.currency==='USD'?'$':'₹'}${cp.toFixed(2)}`:'—'}</td>
                  <td style={{...tdS}}>{dist!=null?<span style={{fontWeight:700,color:near?T.warning:T.text3}}>{dist>=0?`${dist.toFixed(1)}% away`:'⚡ Within range'}</span>:'—'}</td>
                  <td style={{...tdS,color:T.text3,fontSize:11}}>{new Date(a.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
                  <td style={{...tdS}}><button onClick={()=>removeAlert(a.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'3px 6px',borderRadius:4,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.color=T.text3;}}><Ic.Trash/></button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {triggered.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.success}40`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.success,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Triggered Alerts</span>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <tbody>{triggered.map((a,i)=>(
              <tr key={a.id} style={{background:i%2===0?T.surface2:T.surface3}}>
                <td style={{...tdS}}><div style={{fontWeight:700,color:T.accent}}>{short(a.symbol)}</div></td>
                <td style={{...tdS,color:T.text3}}>{a.direction==='above'?'▲':'▼'} {a.currency==='USD'?'$':'₹'}{a.price}</td>
                <td style={{...tdS}}><span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:T.successBg,color:T.success}}>✓ TRIGGERED</span></td>
                <td style={{...tdS,color:T.text3,fontSize:11}}>{a.triggeredAt?new Date(a.triggeredAt).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}</td>
                <td style={{...tdS,display:'flex',gap:6}}>
                  <NvBtn onClick={()=>resetAlert(a.id)} T={T}>Reset</NvBtn>
                  <button onClick={()=>removeAlert(a.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'3px 6px',borderRadius:4}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3}><Ic.Trash/></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Portfolio Stocks — quick-set alerts for all holdings */}
      {holdings?.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:3,height:16,background:T.cyan,borderRadius:2}}/>
              <span style={{fontSize:13,fontWeight:700,color:T.text}}>Portfolio Stocks</span>
              <span style={{fontSize:11,color:T.text3,background:T.surface3,padding:'2px 8px',borderRadius:10,fontWeight:600}}>{holdings.length}</span>
            </div>
            <span style={{fontSize:11,color:T.text3}}>Set alerts directly from your holdings</span>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:T.surface3}}>{['Stock','LTP','Buy Price','Day %','Alert Status','Quick Set'].map(h=><th key={h} style={{...tdS,color:T.text3,fontSize:10,fontWeight:700,textAlign:h==='Stock'?'left':'right'}}>{h}</th>)}</tr></thead>
            <tbody>{holdings.map((h,i)=>{
              const cp=prices[h.symbol]?.current;
              const prev=prices[h.symbol]?.prev;
              const dayPct=cp&&prev?((cp-prev)/prev*100):null;
              const cur=isUS(h.symbol)?'USD':'INR';
              const sym=cur==='USD'?'$':'₹';
              const hasActive=alerts.some(a=>a.symbol===h.symbol&&!a.triggered);
              const activeAlert=alerts.find(a=>a.symbol===h.symbol&&!a.triggered);
              return(
                <tr key={h.symbol} style={{background:i%2===0?T.surface2:T.surface3,transition:'background .08s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                  <td style={{...tdS,textAlign:'left'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:28,height:28,borderRadius:6,background:isUS(h.symbol)?'rgba(0,180,216,.12)':'rgba(255,152,0,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:isUS(h.symbol)?T.usColor:T.inColor,flexShrink:0}}>{short(h.symbol).slice(0,2)}</div>
                      <div><div style={{fontWeight:700,color:T.text,fontSize:12}}>{short(h.symbol)}</div><div style={{fontSize:10,color:T.text3,maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.name}</div></div>
                    </div>
                  </td>
                  <td style={{...tdS,textAlign:'right',fontWeight:700,color:T.text}}>{cp?`${sym}${cp.toFixed(2)}`:'—'}</td>
                  <td style={{...tdS,textAlign:'right',color:T.text2}}>{sym}{h.buyPrice.toFixed(2)}</td>
                  <td style={{...tdS,textAlign:'right'}}>{dayPct!=null?<span style={{fontWeight:700,color:dayPct>=0?T.success:T.danger}}>{dayPct>=0?'+':''}{dayPct.toFixed(2)}%</span>:'—'}</td>
                  <td style={{...tdS,textAlign:'right'}}>{hasActive?<span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:T.accentBg,color:T.accent}}>{activeAlert.direction==='above'?'▲':'▼'} {sym}{activeAlert.price}</span>:<span style={{fontSize:10,color:T.text3}}>No alert</span>}</td>
                  <td style={{...tdS,textAlign:'right'}}>
                    <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                      {cp&&!hasActive&&<>
                        <button onClick={()=>{setAlerts(p=>[{id:Date.now(),symbol:h.symbol,name:h.name,direction:'above',price:Math.round(cp*1.05*100)/100,currency:cur,triggered:false,triggeredAt:null,createdAt:Date.now()},...p]);}} style={{padding:'3px 8px',borderRadius:5,border:`1px solid ${T.success}40`,background:T.successBg,color:T.success,cursor:'pointer',fontSize:10,fontWeight:700,transition:'all .1s'}} onMouseEnter={e=>e.currentTarget.style.background=T.success+'30'} onMouseLeave={e=>e.currentTarget.style.background=T.successBg} title={`Alert above ${sym}${(cp*1.05).toFixed(0)} (+5%)`}>▲ +5%</button>
                        <button onClick={()=>{setAlerts(p=>[{id:Date.now()+1,symbol:h.symbol,name:h.name,direction:'below',price:Math.round(cp*0.95*100)/100,currency:cur,triggered:false,triggeredAt:null,createdAt:Date.now()},...p]);}} style={{padding:'3px 8px',borderRadius:5,border:`1px solid ${T.danger}40`,background:T.dangerBg,color:T.danger,cursor:'pointer',fontSize:10,fontWeight:700,transition:'all .1s'}} onMouseEnter={e=>e.currentTarget.style.background=T.danger+'30'} onMouseLeave={e=>e.currentTarget.style.background=T.dangerBg} title={`Alert below ${sym}${(cp*0.95).toFixed(0)} (-5%)`}>▼ -5%</button>
                        <button onClick={()=>{setShowAdd(true);setForm({symbol:h.symbol,name:h.name,direction:'above',price:'',currency:cur});setSrch(h.name);}} style={{padding:'3px 8px',borderRadius:5,border:`1px solid ${T.border2}`,background:'transparent',color:T.text3,cursor:'pointer',fontSize:10,fontWeight:600,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.color=T.text3;}}>Custom</button>
                      </>}
                      {hasActive&&<button onClick={()=>removeAlert(activeAlert.id)} style={{padding:'3px 8px',borderRadius:5,border:`1px solid ${T.danger}40`,background:'transparent',color:T.text3,cursor:'pointer',fontSize:10,fontWeight:600,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.color=T.text3;}} title="Remove alert"><Ic.Trash/></button>}
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: SECTOR ALLOCATION ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Fetches sector from Yahoo Finance v10 quoteSummary assetProfile
// Storage: pm_sectors = { SYMBOL: { sector, industry } }

function SectorModule({T,rows,prices,usdInr}) {
  const [sectorMap,setSectorMap]=useState(()=>{try{return JSON.parse(localStorage.getItem('pm_sectors')||'{}');}catch{return {};}});
  const [loading,setLoading]=useState(false);
  const [manualEdit,setManualEdit]=useState(null);
  const [editVal,setEditVal]=useState('');

  useEffect(()=>{localStorage.setItem('pm_sectors',JSON.stringify(sectorMap));},[sectorMap]);

  const fetchSectors=async()=>{
    setLoading(true);
    const toFetch=rows.filter(r=>!sectorMap[r.symbol]);
    await Promise.all(toFetch.map(async r=>{
      try{
        const res=await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(r.symbol)}?modules=assetProfile`,{headers:{Accept:'application/json'}});
        if(res.ok){const j=await res.json();const p=j?.quoteSummary?.result?.[0]?.assetProfile;if(p?.sector){setSectorMap(prev=>({...prev,[r.symbol]:{sector:p.sector,industry:p.industry||p.sector}}));}}
      }catch{}
    }));
    setLoading(false);
  };

  // Group rows by sector — all values in INR (USD converted via usdInr)
  const toINR=(val,cur)=>cur==='USD'&&usdInr?val*usdInr:val;
  const grouped=useMemo(()=>{
    const map={};
    rows.forEach(r=>{
      const sec=sectorMap[r.symbol]?.sector||'Uncategorised';
      if(!map[sec])map[sec]={sector:sec,holdings:[],totalValue:0,totalInvested:0,totalGain:0};
      const cur=r.currency||'INR';
      const val=toINR(r.curValue??r.invested,cur);
      map[sec].holdings.push(r);
      map[sec].totalValue+=val;
      map[sec].totalInvested+=toINR(r.invested,cur);
      map[sec].totalGain+=toINR(r.gain??0,cur);
    });
    return Object.values(map).sort((a,b)=>b.totalValue-a.totalValue);
  },[rows,sectorMap,usdInr]);

  const totalValue=rows.reduce((s,r)=>s+toINR(r.curValue??r.invested,r.currency||'INR'),0)||1;

  const SEC_COLORS=['#6366f1','#76b900','#00b4d8','#f59e0b','#ef4444','#a855f7','#06b6d4','#f97316','#10b981','#ec4899'];

  const CX=110,CY=110,OUTER=100,INNER=50;
  const segs=useMemo(()=>{
    let cum=0;
    return grouped.map((g,i)=>{
      const frac=g.totalValue/totalValue;
      const s=cum+0.005,e=cum+frac-0.005;cum+=frac;
      const sa=(s*2*Math.PI)-Math.PI/2,ea=(e*2*Math.PI)-Math.PI/2;
      const x1=CX+OUTER*Math.cos(sa),y1=CY+OUTER*Math.sin(sa),x2=CX+OUTER*Math.cos(ea),y2=CY+OUTER*Math.sin(ea);
      const xi=CX+INNER*Math.cos(ea),yi=CY+INNER*Math.sin(ea),xi2=CX+INNER*Math.cos(sa),yi2=CY+INNER*Math.sin(sa);
      return{...g,frac,color:SEC_COLORS[i%SEC_COLORS.length],path:`M${x1} ${y1} A${OUTER} ${OUTER} 0 ${frac>.5?1:0} 1 ${x2} ${y2} L${xi} ${yi} A${INNER} ${INNER} 0 ${frac>.5?1:0} 0 ${xi2} ${yi2}Z`};
    });
  },[grouped,totalValue]);

  const [hover,setHover]=useState(null);
  const INP={padding:'7px 10px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',fontFamily:'inherit'};

  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Sector Allocation</div>
          <div style={{fontSize:13,color:T.text3}}>{grouped.length} sectors · {rows.length} holdings</div>
        </div>
        <NvBtn onClick={fetchSectors} disabled={loading} T={T}><Ic.Refresh s={loading}/>{loading?'Fetching sectors…':'Refresh Sectors'}</NvBtn>
      </div>

      {rows.length===0&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No holdings found. Add stocks to your portfolio first.</div>}

      {rows.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:20,alignItems:'start'}}>
          {/* Donut */}
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16}}>
            <svg width={220} height={220} style={{display:'block',margin:'0 auto'}}>
              {segs.map((s,i)=>(
                <path key={i} d={s.path} fill={s.color} opacity={hover===null||hover===i?1:.25} style={{cursor:'pointer',transition:'opacity .15s'}} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}/>
              ))}
              <text x={CX} y={CY-8} textAnchor="middle" fontSize={11} fill={T.text3} fontFamily="inherit">{hover!==null?segs[hover]?.sector:'All'}</text>
              <text x={CX} y={CY+12} textAnchor="middle" fontSize={16} fontWeight="700" fill={T.text} fontFamily="inherit">{hover!==null?`${(segs[hover]?.frac*100).toFixed(1)}%`:segs.length}</text>
            </svg>
          </div>
          {/* Legend + detail */}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {grouped.map((g,i)=>(
              <div key={g.sector} style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:'12px 16px',opacity:hover===null||hover===i?1:.4,transition:'opacity .15s'}} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:10,height:10,borderRadius:2,background:SEC_COLORS[i%SEC_COLORS.length],flexShrink:0}}/>
                    <span style={{fontWeight:700,color:T.text,fontSize:13}}>{g.sector}</span>
                    <span style={{fontSize:11,color:T.text3,background:T.surface3,padding:'1px 7px',borderRadius:10}}>{g.holdings.length} stock{g.holdings.length!==1?'s':''}</span>
                  </div>
                  <div style={{display:'flex',gap:20}}>
                    <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3}}>Allocation</div><div style={{fontWeight:700,color:T.text}}>{(g.totalValue/totalValue*100).toFixed(1)}%</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3}}>Value</div><div style={{fontWeight:700,color:T.cyan}}>₹{g.totalValue.toLocaleString('en-IN',{maximumFractionDigits:0})}</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3}}>P&L</div><div style={{fontWeight:700,color:g.totalGain>=0?T.success:T.danger}}>{g.totalGain>=0?'+':'−'}₹{Math.abs(g.totalGain).toLocaleString('en-IN',{maximumFractionDigits:0})}</div></div>
                  </div>
                </div>
                {/* Allocation bar */}
                <div style={{height:4,background:T.surface4,borderRadius:2,marginBottom:8}}>
                  <div style={{width:`${(g.totalValue/totalValue*100).toFixed(1)}%`,height:'100%',background:SEC_COLORS[i%SEC_COLORS.length],borderRadius:2}}/>
                </div>
                {/* Holdings chips */}
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {g.holdings.map(h=>(
                    <div key={h.symbol} style={{display:'flex',alignItems:'center',gap:5,background:T.surface3,borderRadius:6,padding:'3px 10px'}}>
                      <span style={{fontSize:11,fontWeight:600,color:T.text}}>{short(h.symbol)}</span>
                      {manualEdit===h.symbol
                          ?<div style={{display:'flex',gap:4,alignItems:'center'}}>
                            <input value={editVal} onChange={e=>setEditVal(e.target.value)} placeholder="Sector" style={{...INP,width:100,padding:'2px 6px'}} autoFocus onKeyDown={e=>{if(e.key==='Enter'&&editVal.trim()){setSectorMap(p=>({...p,[h.symbol]:{sector:editVal.trim(),industry:editVal.trim()}}));setManualEdit(null);}if(e.key==='Escape')setManualEdit(null);}}/>
                            <button onClick={()=>{if(editVal.trim()){setSectorMap(p=>({...p,[h.symbol]:{sector:editVal.trim(),industry:editVal.trim()}}));setManualEdit(null);}}} style={{background:'none',border:'none',cursor:'pointer',color:T.success,padding:2}}><Ic.Check/></button>
                            <button onClick={()=>setManualEdit(null)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:2}}><Ic.X/></button>
                          </div>
                          :<button onClick={()=>{setManualEdit(h.symbol);setEditVal(sectorMap[h.symbol]?.sector||'');}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:1,fontSize:10}} title="Change sector"><Ic.Pencil/></button>
                      }
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{fontSize:11,color:T.text3}}>Sector data from Yahoo Finance. Click "Refresh Sectors" to fetch. Set manually for any missing stocks.</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: BENCHMARK COMPARISON ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function BenchmarkModule({T,rows,inRows,usRows,usdInr}) {
  const [benchData,setBenchData]=useState({});
  const [loading,setLoading]=useState(false);
  const [range,setRange]=useState('3mo');
  const [hover,setHover]=useState(null);
  const svgRef=useRef();

  const RANGES=[{v:'1mo',l:'1M'},{v:'3mo',l:'3M'},{v:'6mo',l:'6M'},{v:'1y',l:'1Y'}];
  const BENCHES=[
    {sym:'^NSEI',label:'Nifty 50',color:'#f59e0b'},
    {sym:'^GSPC',label:'S&P 500',color:'#00b4d8'},
  ];

  // Compute portfolio returns for each market
  const inReturn=useMemo(()=>{
    if(!inRows?.length)return null;
    const inv=inRows.reduce((s,r)=>s+r.invested,0);
    const cur=inRows.reduce((s,r)=>s+(r.curValue??r.invested),0);
    return inv?((cur-inv)/inv)*100:null;
  },[inRows]);
  const usReturn=useMemo(()=>{
    if(!usRows?.length)return null;
    const inv=usRows.reduce((s,r)=>s+r.invested,0);
    const cur=usRows.reduce((s,r)=>s+(r.curValue??r.invested),0);
    return inv?((cur-inv)/inv)*100:null;
  },[usRows]);

  const fetchBench=useCallback(async()=>{
    setLoading(true);
    const out={};
    await Promise.all(BENCHES.map(async b=>{
      try{
        const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(b.sym)}?interval=1d&range=${range}`,{headers:{Accept:'application/json'}});
        if(r.ok){const j=await r.json();const res=j?.chart?.result?.[0];const ts=res?.timestamp||[];const q=res?.indicators?.quote?.[0]||{};const closes=ts.map((t,i)=>({date:t*1000,close:q.close?.[i]})).filter(d=>d.close!=null);out[b.sym]=closes;}
      }catch{}
    }));
    setBenchData(out);setLoading(false);
  },[range]);

  useEffect(()=>{fetchBench();},[fetchBench]);

  // Combined portfolio return (all holdings, USD converted to INR)
  const portfolioReturn=useMemo(()=>{
    if(!rows.length)return null;
    const toINR=(v,cur)=>cur==='USD'&&usdInr?v*usdInr:v;
    const totalInvested=rows.reduce((s,r)=>s+toINR(r.invested,r.currency||'INR'),0);
    const totalCurrent=rows.reduce((s,r)=>s+toINR(r.curValue??r.invested,r.currency||'INR'),0);
    if(!totalInvested)return null;
    return((totalCurrent-totalInvested)/totalInvested)*100;
  },[rows,usdInr]);

  // Normalize benchmark series to % return from start
  const normalized=useMemo(()=>{
    const out={};
    BENCHES.forEach(b=>{
      const s=benchData[b.sym];if(!s||!s.length)return;
      const base=s[0].close;
      out[b.sym]=s.map(d=>({date:d.date,pct:(d.close/base-1)*100}));
    });
    return out;
  },[benchData]);

  // SVG chart — include portfolio returns in the Y-axis range
  const allSeries=Object.values(normalized);
  const extraPcts=[inReturn,usReturn].filter(v=>v!=null);
  const allPcts=[...allSeries.flatMap(s=>s.map(d=>d.pct)).filter(Boolean),...extraPcts];
  const minP=Math.min(...allPcts,-5),maxP=Math.max(...allPcts,5);
  const range_=maxP-minP||10;
  const dates=allSeries[0]?.map(d=>d.date)||[];
  const VW=700,VH=200,PAD={t:16,r:16,b:32,l:52};
  const W=VW-PAD.l-PAD.r,H=VH-PAD.t-PAD.b;
  const xOf=i=>PAD.l+(i/(dates.length-1||1))*W;
  const yOf=p=>PAD.t+H-((p-minP)/range_)*H;
  const yZero=yOf(0);

  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Benchmark Comparison</div>
          <div style={{fontSize:13,color:T.text3}}>Index performance vs your portfolio period</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {RANGES.map(r=>(
            <button key={r.v} onClick={()=>setRange(r.v)} style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${range===r.v?T.accent:T.border2}`,background:range===r.v?T.accentBg:'transparent',color:range===r.v?T.accent:T.text2,cursor:'pointer',fontSize:12,fontWeight:range===r.v?700:400,transition:'all .12s'}}>{r.l}</button>
          ))}
          <NvBtn onClick={fetchBench} disabled={loading} T={T}><Ic.Refresh s={loading}/></NvBtn>
        </div>
      </div>

      {/* Chart */}
      <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:'16px 12px'}}>
        {loading?<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:T.text3}}>Loading benchmark data…</div>:
        !allSeries.length?<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:T.text3}}>No data available</div>:(
          <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{width:'100%',height:'auto',display:'block'}} onMouseMove={e=>{if(!svgRef.current)return;const rect=svgRef.current.getBoundingClientRect();const sx=((e.clientX-rect.left)/rect.width)*VW;const i=Math.max(0,Math.min(dates.length-1,Math.round(((sx-PAD.l)/W)*(dates.length-1))));setHover(i);}} onMouseLeave={()=>setHover(null)}>
            {/* Zero line */}
            <line x1={PAD.l} y1={yZero} x2={PAD.l+W} y2={yZero} stroke={T.border} strokeWidth="1"/>
            <text x={PAD.l-4} y={yZero+4} fontSize={8} fill={T.text3} fontFamily="inherit" textAnchor="end">0%</text>
            {/* Grid */}
            {[-10,-5,5,10,15,20].map(p=>(p>minP&&p<maxP)&&(
              <g key={p}><line x1={PAD.l} y1={yOf(p)} x2={PAD.l+W} y2={yOf(p)} stroke={T.border} strokeWidth="0.5" strokeDasharray="3 3"/><text x={PAD.l-4} y={yOf(p)+4} fontSize={8} fill={T.text3} fontFamily="inherit" textAnchor="end">{p}%</text></g>
            ))}
            {/* Benchmark lines */}
            {BENCHES.map(b=>{
              const s=normalized[b.sym];if(!s)return null;
              const path=s.map((d,i)=>`${i===0?'M':'L'}${xOf(i).toFixed(1)},${yOf(d.pct).toFixed(1)}`).join(' ');
              return<path key={b.sym} d={path} fill="none" stroke={b.color} strokeWidth="2"/>;
            })}
            {/* Portfolio return lines (dashed) */}
            {inReturn!=null&&dates.length>0&&(
              <g>
                <line x1={PAD.l} y1={yOf(inReturn)} x2={PAD.l+W} y2={yOf(inReturn)} stroke="#ff9800" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.8"/>
                <rect x={PAD.l+W-78} y={yOf(inReturn)-8} width={76} height={16} rx={3} fill="#ff9800" opacity="0.15"/>
                <text x={PAD.l+W-4} y={yOf(inReturn)+4} fontSize={9} fill="#ff9800" fontFamily="inherit" textAnchor="end" fontWeight="700">🇮🇳 {inReturn>=0?'+':''}{inReturn.toFixed(1)}%</text>
              </g>
            )}
            {usReturn!=null&&dates.length>0&&(
              <g>
                <line x1={PAD.l} y1={yOf(usReturn)} x2={PAD.l+W} y2={yOf(usReturn)} stroke="#00b4d8" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.8"/>
                <rect x={PAD.l+4} y={yOf(usReturn)-8} width={76} height={16} rx={3} fill="#00b4d8" opacity="0.15"/>
                <text x={PAD.l+8} y={yOf(usReturn)+4} fontSize={9} fill="#00b4d8" fontFamily="inherit" fontWeight="700">🇺🇸 {usReturn>=0?'+':''}{usReturn.toFixed(1)}%</text>
              </g>
            )}
            {/* X axis dates */}
            {dates.filter((_,i)=>i%Math.max(1,Math.floor(dates.length/6))===0).map((d,i)=>{
              const idx=dates.indexOf(d);
              return<text key={i} x={xOf(idx)} y={PAD.t+H+14} fontSize={8} fill={T.text3} fontFamily="inherit" textAnchor="middle">{new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</text>;
            })}
            {/* Hover */}
            {hover!==null&&dates[hover]&&(
              <g>
                <line x1={xOf(hover)} y1={PAD.t} x2={xOf(hover)} y2={PAD.t+H} stroke={T.border2} strokeWidth="0.8"/>
                <rect x={Math.min(xOf(hover)+8,VW-130)} y={PAD.t+4} width={135} height={(BENCHES.length+(inReturn!=null?1:0)+(usReturn!=null?1:0))*18+20} rx={4} fill={T.surface2} stroke={T.border2} strokeWidth="0.8"/>
                <text x={Math.min(xOf(hover)+14,VW-124)} y={PAD.t+16} fontSize={8} fill={T.text3} fontFamily="inherit">{new Date(dates[hover]).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</text>
                {BENCHES.map((b,i)=>{const s=normalized[b.sym];const pt=s?.[hover];return pt?<text key={b.sym} x={Math.min(xOf(hover)+14,VW-124)} y={PAD.t+30+i*18} fontSize={10} fill={b.color} fontFamily="inherit" fontWeight="700">{b.label}: {pt.pct>=0?'+':''}{pt.pct.toFixed(2)}%</text>:null;})}
                {inReturn!=null&&<text x={Math.min(xOf(hover)+14,VW-124)} y={PAD.t+30+BENCHES.length*18} fontSize={10} fill="#ff9800" fontFamily="inherit" fontWeight="700">🇮🇳 Portfolio: {inReturn>=0?'+':''}{inReturn.toFixed(2)}%</text>}
                {usReturn!=null&&<text x={Math.min(xOf(hover)+14,VW-124)} y={PAD.t+30+(BENCHES.length+(inReturn!=null?1:0))*18} fontSize={10} fill="#00b4d8" fontFamily="inherit" fontWeight="700">🇺🇸 Portfolio: {usReturn>=0?'+':''}{usReturn.toFixed(2)}%</text>}
              </g>
            )}
          </svg>
        )}
        {/* Legend */}
        <div style={{display:'flex',gap:20,justifyContent:'center',marginTop:8}}>
          {BENCHES.map(b=>{const s=normalized[b.sym];const last=s?.[s.length-1]?.pct;return(
            <div key={b.sym} style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:20,height:2,background:b.color,borderRadius:1}}/>
              <span style={{fontSize:12,color:T.text2}}>{b.label}</span>
              {last!=null&&<span style={{fontSize:12,fontWeight:700,color:last>=0?T.success:T.danger}}>{last>=0?'+':''}{last.toFixed(2)}%</span>}
            </div>
          );})}
          {inReturn!=null&&(
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:20,height:2,background:'#ff9800',borderRadius:1,opacity:.5}}/>
              <span style={{fontSize:12,color:T.text2}}>🇮🇳 Portfolio</span>
              <span style={{fontSize:12,fontWeight:700,color:inReturn>=0?T.success:T.danger}}>{inReturn>=0?'+':''}{inReturn.toFixed(2)}%</span>
            </div>
          )}
          {usReturn!=null&&(
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:20,height:2,background:'#00b4d8',borderRadius:1,opacity:.5}}/>
              <span style={{fontSize:12,color:T.text2}}>🇺🇸 Portfolio</span>
              <span style={{fontSize:12,fontWeight:700,color:usReturn>=0?T.success:T.danger}}>{usReturn>=0?'+':''}{usReturn.toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Performance table */}
      {allSeries.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Performance Summary</span>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:T.surface3}}>{['Index','Start','Current','Return','High','Low'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',color:T.text3,fontWeight:700,fontSize:11,borderBottom:`1px solid ${T.border}`}}>{h}</th>)}</tr></thead>
            <tbody>
              {inReturn!=null&&(
                <tr style={{background:'rgba(255,152,0,.08)'}}>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:12}}>🇮🇳</span><span style={{fontWeight:700,color:T.inColor}}>Indian Portfolio</span></div></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text2}}>₹{inRows.reduce((s,r)=>s+r.invested,0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.cyan,fontWeight:700}}>₹{inRows.reduce((s,r)=>s+(r.curValue??r.invested),0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontWeight:700,color:inReturn>=0?T.success:T.danger}}>{inReturn>=0?'+':''}{inReturn.toFixed(2)}%</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text3}}>vs Nifty 50</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text3}}>{(()=>{const s=normalized['^NSEI'];return s?`${s[s.length-1]?.pct>=0?'+':''}${s[s.length-1]?.pct?.toFixed(2)}%`:'—';})()}</td>
                </tr>
              )}
              {usReturn!=null&&(
                <tr style={{background:'rgba(0,180,216,.08)'}}>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:12}}>🇺🇸</span><span style={{fontWeight:700,color:T.usColor}}>US Portfolio</span></div></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text2}}>${usRows.reduce((s,r)=>s+r.invested,0).toLocaleString('en-US',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.cyan,fontWeight:700}}>${usRows.reduce((s,r)=>s+(r.curValue??r.invested),0).toLocaleString('en-US',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontWeight:700,color:usReturn>=0?T.success:T.danger}}>{usReturn>=0?'+':''}{usReturn.toFixed(2)}%</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text3}}>vs S&P 500</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text3}}>{(()=>{const s=normalized['^GSPC'];return s?`${s[s.length-1]?.pct>=0?'+':''}${s[s.length-1]?.pct?.toFixed(2)}%`:'—';})()}</td>
                </tr>
              )}
              {BENCHES.map((b,i)=>{
              const s=normalized[b.sym];const raw=benchData[b.sym];if(!s||!raw)return null;
              const ret=s[s.length-1]?.pct??0;const hi=Math.max(...s.map(d=>d.pct));const lo=Math.min(...s.map(d=>d.pct));
              return(
                <tr key={b.sym} style={{background:i%2===0?T.surface2:T.surface3}}>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:8,height:8,borderRadius:2,background:b.color}}/><span style={{fontWeight:700,color:T.text}}>{b.label}</span></div></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text2}}>{raw[0]?.close?.toFixed(2)}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.cyan,fontWeight:700}}>{raw[raw.length-1]?.close?.toFixed(2)}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontWeight:700,color:ret>=0?T.success:T.danger}}>{ret>=0?'+':''}{ret.toFixed(2)}%</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.success}}>+{hi.toFixed(2)}%</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.danger}}>{lo.toFixed(2)}%</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: SCREENER ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Fetches key fundamentals from Yahoo v10 quoteSummary for all portfolio stocks.
// Links to Screener.in (Indian) and Yahoo Finance (US).

function ScreenerModule({T,holdings,prices}) {
  const [data,setData]=useState({});
  const [loading,setLoading]=useState(false);
  const [sort,setSort]=useState({col:'symbol',dir:'asc'});
  const [filter,setFilter]=useState('all'); // all | IN | US

  const fetchAll=useCallback(async()=>{
    if(!holdings.length)return;
    setLoading(true);
    const out={};
    await Promise.all(holdings.map(async h=>{
      try{
        const r=await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(h.symbol)}?modules=summaryDetail,defaultKeyStatistics,financialData,price`,{headers:{Accept:'application/json'}});
        if(!r.ok)return;
        const j=await r.json();const res=j?.quoteSummary?.result?.[0];if(!res)return;
        const sd=res.summaryDetail||{},ks=res.defaultKeyStatistics||{},fd=res.financialData||{},pr=res.price||{};
        out[h.symbol]={
          name:h.name,symbol:h.symbol,isUS:isUS(h.symbol),
          currency:pr.currency||'INR',
          marketCap:pr.marketCap?.raw||sd.marketCap?.raw||null,
          pe:sd.trailingPE?.raw||ks.trailingPE?.raw||null,
          forwardPE:sd.forwardPE?.raw||ks.forwardPE?.raw||null,
          pb:ks.priceToBook?.raw||null,
          eps:ks.trailingEps?.raw||fd.trailingEps?.raw||null,
          divYield:(sd.dividendYield?.raw||0)*100,
          roe:fd.returnOnEquity?.raw!=null?(fd.returnOnEquity.raw*100):null,
          debtToEquity:fd.debtToEquity?.raw||null,
          fiftyTwoWeekHigh:sd.fiftyTwoWeekHigh?.raw||null,
          fiftyTwoWeekLow:sd.fiftyTwoWeekLow?.raw||null,
          beta:sd.beta?.raw||ks.beta?.raw||null,
          curPrice:prices[h.symbol]?.current||null,
          revenueGrowth:fd.revenueGrowth?.raw!=null?(fd.revenueGrowth.raw*100):null,
          profitMargin:fd.profitMargins?.raw!=null?(fd.profitMargins.raw*100):null,
          targetMean:fd.targetMeanPrice?.raw||null,
          recommendation:fd.recommendationKey||null,
        };
      }catch{}
    }));
    setData(out);setLoading(false);
  },[holdings,prices]);

  useEffect(()=>{fetchAll();},[]);

  const rows=useMemo(()=>{
    let arr=Object.values(data);
    if(filter==='IN')arr=arr.filter(r=>!r.isUS);
    if(filter==='US')arr=arr.filter(r=>r.isUS);
    return sortRows(arr,sort.col,sort.dir);
  },[data,filter,sort]);

  const onSort=col=>setSort(p=>({col,dir:p.col===col&&p.dir==='asc'?'desc':'asc'}));
  const thS={padding:'8px 10px',fontSize:11,fontWeight:700,color:T.text3,cursor:'pointer',whiteSpace:'nowrap',borderBottom:`1px solid ${T.border}`,background:T.surface2,textAlign:'right',userSelect:'none'};
  const tdS={padding:'8px 10px',fontSize:12,borderBottom:`1px solid ${T.border}`,textAlign:'right',color:T.text2};
  const arrow=col=>sort.col===col?(sort.dir==='asc'?' ▲':' ▼'):'';

  const screenerLink=r=>r.isUS
    ?`https://finance.yahoo.com/quote/${encodeURIComponent(r.symbol)}/`
    :`https://www.screener.in/company/${short(r.symbol)}/consolidated/`;

  const fmtMC=r=>{
    const v=r.marketCap;if(!v)return'—';
    if(r.isUS){
      if(v>=1e12)return`$${(v/1e12).toFixed(2)}T`;
      if(v>=1e9)return`$${(v/1e9).toFixed(1)}B`;
      return`$${(v/1e6).toFixed(0)}M`;
    }
    if(v>=1e12)return`₹${(v/1e12).toFixed(2)}T`;
    if(v>=1e7)return`₹${(v/1e7).toFixed(0)}Cr`;
    return`₹${(v/1e5).toFixed(0)}L`;
  };

  const fmtN=(v,d=2)=>v==null?'—':v.toFixed(d);
  const fmtP=(v)=>v==null?'—':`${v.toFixed(1)}%`;

  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Screener</div>
          <div style={{fontSize:13,color:T.text3}}>Fundamentals for {holdings.length} holdings · Click any stock to open on {filter==='US'?'Yahoo Finance':'Screener.in'}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {['all','IN','US'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${filter===f?T.accent:T.border2}`,background:filter===f?T.accentBg:'transparent',color:filter===f?T.accent:T.text2,cursor:'pointer',fontSize:12,fontWeight:filter===f?700:400}}>{f==='all'?'All':f==='IN'?'🇮🇳 Indian':'🇺🇸 US'}</button>
          ))}
          <NvBtn onClick={fetchAll} disabled={loading} T={T}><Ic.Refresh s={loading}/></NvBtn>
        </div>
      </div>

      <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
        {loading&&!rows.length?<div style={{padding:40,textAlign:'center',color:T.text3}}>Fetching fundamentals…</div>:(
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>
              <th onClick={()=>onSort('symbol')} style={{...thS,textAlign:'left',position:'sticky',left:0,zIndex:1,background:T.surface2,minWidth:130}}>Stock{arrow('symbol')}</th>
              <th onClick={()=>onSort('marketCap')} style={thS}>Mkt Cap{arrow('marketCap')}</th>
              <th onClick={()=>onSort('pe')} style={thS}>PE{arrow('pe')}</th>
              <th onClick={()=>onSort('forwardPE')} style={thS}>Fwd PE{arrow('forwardPE')}</th>
              <th onClick={()=>onSort('pb')} style={thS}>PB{arrow('pb')}</th>
              <th onClick={()=>onSort('eps')} style={thS}>EPS{arrow('eps')}</th>
              <th onClick={()=>onSort('roe')} style={thS}>ROE{arrow('roe')}</th>
              <th onClick={()=>onSort('debtToEquity')} style={thS}>D/E{arrow('debtToEquity')}</th>
              <th onClick={()=>onSort('divYield')} style={thS}>Div %{arrow('divYield')}</th>
              <th onClick={()=>onSort('profitMargin')} style={thS}>Margin{arrow('profitMargin')}</th>
              <th onClick={()=>onSort('revenueGrowth')} style={thS}>Rev Gr{arrow('revenueGrowth')}</th>
              <th onClick={()=>onSort('beta')} style={thS}>Beta{arrow('beta')}</th>
              <th onClick={()=>onSort('fiftyTwoWeekLow')} style={thS}>52W Low{arrow('fiftyTwoWeekLow')}</th>
              <th onClick={()=>onSort('fiftyTwoWeekHigh')} style={thS}>52W High{arrow('fiftyTwoWeekHigh')}</th>
              <th onClick={()=>onSort('recommendation')} style={thS}>Rating{arrow('recommendation')}</th>
            </tr></thead>
            <tbody>
              {!rows.length&&<tr><td colSpan={15} style={{padding:32,textAlign:'center',color:T.text3}}>No data. Click refresh to load fundamentals.</td></tr>}
              {rows.map((r,i)=>{
                const cur=r.curPrice;const hi=r.fiftyTwoWeekHigh;const lo=r.fiftyTwoWeekLow;
                const fromHi=cur&&hi?((cur-hi)/hi*100):null;
                const fromLo=cur&&lo?((cur-lo)/lo*100):null;
                const ratingColor={buy:T.success,strong_buy:T.success,hold:T.warning,sell:T.danger,strong_sell:T.danger,underperform:T.danger,outperform:T.success}[r.recommendation]||T.text3;
                return(
                <tr key={r.symbol} style={{background:i%2===0?'transparent':T.surface3,cursor:'pointer',transition:'background .08s'}} onClick={()=>window.open(screenerLink(r),'_blank')} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':T.surface3}>
                  <td style={{...tdS,textAlign:'left',position:'sticky',left:0,background:'inherit',zIndex:1,borderRight:`1px solid ${T.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:28,height:28,borderRadius:6,background:r.isUS?'rgba(0,180,216,.12)':'rgba(255,152,0,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:r.isUS?T.usColor:T.inColor,flexShrink:0}}>{short(r.symbol).slice(0,2)}</div>
                      <div><div style={{fontWeight:700,color:T.text,fontSize:12}}>{short(r.symbol)}</div><div style={{fontSize:10,color:T.text3,maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</div></div>
                    </div>
                  </td>
                  <td style={tdS}><span style={{color:T.text,fontWeight:600}}>{fmtMC(r)}</span></td>
                  <td style={{...tdS,color:r.pe!=null&&r.pe<25?T.success:r.pe!=null&&r.pe>40?T.danger:T.text2}}>{fmtN(r.pe,1)}</td>
                  <td style={tdS}>{fmtN(r.forwardPE,1)}</td>
                  <td style={{...tdS,color:r.pb!=null&&r.pb<3?T.success:r.pb!=null&&r.pb>10?T.danger:T.text2}}>{fmtN(r.pb,1)}</td>
                  <td style={tdS}>{fmtN(r.eps,1)}</td>
                  <td style={{...tdS,color:r.roe!=null&&r.roe>15?T.success:r.roe!=null&&r.roe<10?T.danger:T.text2}}>{fmtP(r.roe)}</td>
                  <td style={{...tdS,color:r.debtToEquity!=null&&r.debtToEquity>100?T.danger:T.text2}}>{fmtN(r.debtToEquity,0)}</td>
                  <td style={{...tdS,color:r.divYield>2?T.success:T.text2}}>{fmtP(r.divYield)}</td>
                  <td style={{...tdS,color:r.profitMargin!=null&&r.profitMargin>15?T.success:T.text2}}>{fmtP(r.profitMargin)}</td>
                  <td style={{...tdS,color:r.revenueGrowth!=null&&r.revenueGrowth>10?T.success:r.revenueGrowth!=null&&r.revenueGrowth<0?T.danger:T.text2}}>{fmtP(r.revenueGrowth)}</td>
                  <td style={tdS}>{fmtN(r.beta,2)}</td>
                  <td style={tdS}><div>{r.isUS?'$':'\u20b9'}{fmtN(r.fiftyTwoWeekLow,0)}</div>{fromLo!=null&&<div style={{fontSize:9,color:T.success}}>+{fromLo.toFixed(0)}%</div>}</td>
                  <td style={tdS}><div>{r.isUS?'$':'\u20b9'}{fmtN(r.fiftyTwoWeekHigh,0)}</div>{fromHi!=null&&<div style={{fontSize:9,color:T.danger}}>{fromHi.toFixed(0)}%</div>}</td>
                  <td style={{...tdS,fontWeight:700,color:ratingColor,textTransform:'uppercase',fontSize:10}}>{r.recommendation||'—'}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: NEWS FEED ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Fetches latest news from Yahoo Finance for portfolio stocks + market indices.

function NewsModule({T,holdings}) {
  const [news,setNews]=useState([]);
  const [loading,setLoading]=useState(false);
  const [filter,setFilter]=useState('all'); // all | portfolio | market
  const [expandedId,setExpandedId]=useState(null);

  const fetchNews=useCallback(async()=>{
    setLoading(true);
    const allNews=[];
    const seen=new Set();

    // Fetch news for portfolio stocks (batch in groups to avoid rate limits)
    const symbols=[...holdings.map(h=>h.symbol),'NIFTY','S&P 500','Indian economy','US markets'].slice(0,12);
    await Promise.all(symbols.map(async (sym,idx)=>{
      try{
        await new Promise(r=>setTimeout(r,idx*100)); // stagger requests
        const q=sym.includes(' ')?sym:short(sym);
        const host=idx%2===0?'query1':'query2';
        const r=await fetch(`https://${host}.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=0&newsCount=6&lang=en-US`,{headers:{Accept:'application/json'}});
        if(!r.ok)return;
        const j=await r.json();
        const items=(j?.news||[]).filter(n=>n.title&&n.link).map(n=>({
          id:n.uuid||n.link,
          title:n.title,
          link:n.link,
          publisher:n.publisher||'',
          publishedAt:n.providerPublishTime?n.providerPublishTime*1000:null,
          thumbnail:n.thumbnail?.resolutions?.[0]?.url||null,
          relatedSymbol:sym.includes(' ')?null:sym,
          isMarket:sym.includes(' '),
          snippet:n.title,
        }));
        items.forEach(n=>{if(!seen.has(n.id)){seen.add(n.id);allNews.push(n);}});
      }catch{}
    }));

    // Sort by publish time (newest first)
    allNews.sort((a,b)=>(b.publishedAt||0)-(a.publishedAt||0));
    setNews(allNews);setLoading(false);
  },[holdings]);

  useEffect(()=>{fetchNews();},[]);

  const filtered=useMemo(()=>{
    if(filter==='portfolio')return news.filter(n=>!n.isMarket);
    if(filter==='market')return news.filter(n=>n.isMarket);
    return news;
  },[news,filter]);

  const timeAgo=ts=>{
    if(!ts)return'';
    const diff=Date.now()-ts;
    const mins=Math.floor(diff/60000);
    if(mins<60)return`${mins}m ago`;
    const hrs=Math.floor(mins/60);
    if(hrs<24)return`${hrs}h ago`;
    const days=Math.floor(hrs/24);
    return`${days}d ago`;
  };

  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>News Feed</div>
          <div style={{fontSize:13,color:T.text3}}>{filtered.length} articles · Portfolio stocks + market news</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {[['all','All'],['portfolio','Portfolio'],['market','Market']].map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k)} style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${filter===k?T.accent:T.border2}`,background:filter===k?T.accentBg:'transparent',color:filter===k?T.accent:T.text2,cursor:'pointer',fontSize:12,fontWeight:filter===k?700:400}}>{l}</button>
          ))}
          <NvBtn onClick={fetchNews} disabled={loading} T={T}><Ic.Refresh s={loading}/></NvBtn>
        </div>
      </div>

      {loading&&!news.length?<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>Fetching latest news…</div>:(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {!filtered.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No news found. Try refreshing.</div>}
          {filtered.map(n=>(
            <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none',background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:'14px 16px',display:'flex',gap:14,alignItems:'flex-start',cursor:'pointer',transition:'all .12s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.background=T.surface3;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.surface2;}}>
              {n.thumbnail&&<img src={n.thumbnail} alt="" style={{width:80,height:56,objectFit:'cover',borderRadius:6,flexShrink:0,background:T.surface4}} onError={e=>{e.target.style.display='none';}}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,lineHeight:1.4,marginBottom:4}}>{n.title}</div>
                <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                  {n.relatedSymbol&&<span style={{padding:'2px 8px',borderRadius:4,background:isUS(n.relatedSymbol)?'rgba(0,180,216,.12)':'rgba(255,152,0,.12)',color:isUS(n.relatedSymbol)?T.usColor:T.inColor,fontSize:10,fontWeight:700}}>{short(n.relatedSymbol)}</span>}
                  {n.publisher&&<span style={{fontSize:11,color:T.text3}}>{n.publisher}</span>}
                  {n.publishedAt&&<span style={{fontSize:11,color:T.text3}}>{timeAgo(n.publishedAt)}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: HISTORICAL PORTFOLIO VALUE ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Auto-snapshots on every price refresh. Storage: pm_portfolio_history

function HistoryModule({T,rows}) {
  const [history,setHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem('pm_portfolio_history')||'[]');}catch{return [];}});
  const svgRef=useRef();
  const [hover,setHover]=useState(null);

  // Called externally on each price refresh to save snapshot
  useEffect(()=>{
    if(!rows.length)return;
    const inrVal=rows.filter(r=>r.currency==='INR').reduce((s,r)=>s+(r.curValue??r.invested),0);
    const usdVal=rows.filter(r=>r.currency==='USD').reduce((s,r)=>s+(r.curValue??r.invested),0);
    const today=new Date().toISOString().slice(0,10);
    setHistory(prev=>{
      const existing=prev.find(p=>p.date===today);
      let updated;
      if(existing){updated=prev.map(p=>p.date===today?{...p,inrVal,usdVal}:p);}
      else{updated=[...prev,{date:today,inrVal,usdVal}].slice(-365);}
      localStorage.setItem('pm_portfolio_history',JSON.stringify(updated));
      return updated;
    });
  },[rows]);

  const data=useMemo(()=>history.filter(h=>h.inrVal>0).sort((a,b)=>a.date.localeCompare(b.date)),[history]);

  const VW=700,VH=200,PAD={t:16,r:16,b:32,l:80};
  const W=VW-PAD.l-PAD.r,H=VH-PAD.t-PAD.b;
  const vals=data.map(d=>d.inrVal);
  const minV=Math.min(...vals)*0.99,maxV=Math.max(...vals)*1.01,rangeV=(maxV-minV)||1;
  const xOf=i=>PAD.l+(i/(data.length-1||1))*W;
  const yOf=v=>PAD.t+H-((v-minV)/rangeV)*H;

  if(!data.length)return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{fontSize:20,fontWeight:700,color:T.text}}>Portfolio History</div>
      <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No history yet. Snapshots are saved automatically each time prices refresh. Come back tomorrow!</div>
    </div>
  );

  const linePath=data.map((d,i)=>`${i===0?'M':'L'}${xOf(i).toFixed(1)},${yOf(d.inrVal).toFixed(1)}`).join(' ');
  const areaPath=linePath+` L${xOf(data.length-1).toFixed(1)},${PAD.t+H} L${PAD.l},${PAD.t+H} Z`;
  const isUp=vals[vals.length-1]>=vals[0];
  const lc=isUp?T.success:T.danger;
  const gain=vals[vals.length-1]-vals[0];
  const gainPct=(gain/vals[0])*100;

  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Portfolio History</div>
          <div style={{fontSize:13,color:T.text3}}>{data.length} daily snapshots</div>
        </div>
        <div style={{display:'flex',gap:16}}>
          <div style={{textAlign:'right'}}><div style={{fontSize:11,color:T.text3}}>Current Value</div><div style={{fontSize:18,fontWeight:700,color:T.text}}>₹{vals[vals.length-1].toLocaleString('en-IN',{maximumFractionDigits:0})}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:11,color:T.text3}}>Since Start</div><div style={{fontSize:18,fontWeight:700,color:lc}}>{gain>=0?'+':'−'}₹{Math.abs(gain).toLocaleString('en-IN',{maximumFractionDigits:0})} ({gainPct>=0?'+':''}{gainPct.toFixed(2)}%)</div></div>
        </div>
      </div>

      <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:'16px 12px'}}>
        <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{width:'100%',height:'auto',display:'block',cursor:'crosshair'}} onMouseMove={e=>{if(!svgRef.current)return;const rect=svgRef.current.getBoundingClientRect();const sx=((e.clientX-rect.left)/rect.width)*VW;const i=Math.max(0,Math.min(data.length-1,Math.round(((sx-PAD.l)/W)*(data.length-1))));setHover(i);}} onMouseLeave={()=>setHover(null)}>
          <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lc} stopOpacity="0.2"/><stop offset="100%" stopColor={lc} stopOpacity="0"/></linearGradient></defs>
          {[0.25,0.5,0.75,1].map(f=>{const v=minV+rangeV*f;return(<g key={f}><line x1={PAD.l} y1={yOf(v)} x2={PAD.l+W} y2={yOf(v)} stroke={T.border} strokeWidth="0.5"/><text x={PAD.l-4} y={yOf(v)+4} fontSize={8} fill={T.text3} fontFamily="inherit" textAnchor="end">₹{(v/1e5).toFixed(1)}L</text></g>);})}
          <path d={areaPath} fill="url(#hg)"/>
          <path d={linePath} fill="none" stroke={lc} strokeWidth="2"/>
          {data.filter((_,i)=>i%Math.max(1,Math.floor(data.length/7))===0).map((d,i)=>{const idx=data.indexOf(d);return<text key={i} x={xOf(idx)} y={PAD.t+H+14} fontSize={8} fill={T.text3} fontFamily="inherit" textAnchor="middle">{new Date(d.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</text>;})}
          {hover!==null&&data[hover]&&(
            <g>
              <line x1={xOf(hover)} y1={PAD.t} x2={xOf(hover)} y2={PAD.t+H} stroke={T.border2} strokeWidth="0.8"/>
              <circle cx={xOf(hover)} cy={yOf(data[hover].inrVal)} r={4} fill={lc} stroke={T.surface} strokeWidth="2"/>
              <rect x={Math.min(xOf(hover)+8,VW-140)} y={PAD.t+4} width={130} height={50} rx={4} fill={T.surface2} stroke={T.border2} strokeWidth="0.8"/>
              <text x={Math.min(xOf(hover)+14,VW-134)} y={PAD.t+18} fontSize={9} fill={T.text3} fontFamily="inherit">{data[hover].date}</text>
              <text x={Math.min(xOf(hover)+14,VW-134)} y={PAD.t+34} fontSize={12} fill={T.text} fontFamily="inherit" fontWeight="700">₹{data[hover].inrVal.toLocaleString('en-IN',{maximumFractionDigits:0})}</text>
              {data[hover].usdVal>0&&<text x={Math.min(xOf(hover)+14,VW-134)} y={PAD.t+47} fontSize={9} fill={T.text3} fontFamily="inherit">+ ${data[hover].usdVal.toLocaleString('en-US',{maximumFractionDigits:0})} US</text>}
            </g>
          )}
        </svg>
      </div>

      {/* Data table */}
      <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:13,fontWeight:700,color:T.text}}>Daily Snapshots</span></div>
        <div style={{overflowX:'auto',maxHeight:300,overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead style={{position:'sticky',top:0,zIndex:2}}><tr style={{background:T.surface3}}>{['Date','IN Portfolio (₹)','US Portfolio ($)','Day Change'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',color:T.text3,fontWeight:700,fontSize:11,borderBottom:`1px solid ${T.border}`}}>{h}</th>)}</tr></thead>
            <tbody>{[...data].reverse().map((d,i)=>{
              const prev=data[data.length-2-i];const dayChg=prev?d.inrVal-prev.inrVal:null;
              return(
                <tr key={d.date} style={{background:i%2===0?T.surface2:T.surface3}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${T.border}`,color:T.text,fontWeight:600}}>{new Date(d.date).toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${T.border}`,fontWeight:700,color:T.cyan}}>₹{d.inrVal.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${T.border}`,color:T.text2}}>{d.usdVal>0?`$${d.usdVal.toLocaleString('en-US',{maximumFractionDigits:0})}`:'—'}</td>
                  <td style={{padding:'9px 14px',borderBottom:`1px solid ${T.border}`}}>{dayChg!=null?<span style={{fontWeight:700,color:dayChg>=0?T.success:T.danger}}>{dayChg>=0?'+':'−'}₹{Math.abs(dayChg).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>:'—'}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: WATCHLIST ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function WatchlistModule({T,usdInr}) {
  const [items,setItems]=useState(()=>{try{return JSON.parse(localStorage.getItem('pm_watchlist')||'[]');}catch{return [];}});
  const [wPrices,setWPrices]=useState({});
  const [wLoading,setWLoading]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({symbol:'',name:'',targetEntry:'',targetExit:'',notes:''});
  const {srch,setSrch,results,setResults,focused,setFocused,busyS,doSearch,clearSearch}=useYahooSearch();
  const [editId,setEditId]=useState(null);

  useEffect(()=>{localStorage.setItem('pm_watchlist',JSON.stringify(items));},[items]);

  const fetchWPrices=useCallback(async()=>{
    if(!items.length)return;
    setWLoading(true);
    const out={};
    await Promise.all(items.map(async item=>{
      try{
        const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.symbol)}?interval=1d&range=1d`,{headers:{Accept:'application/json'}});
        if(!r.ok)throw new Error();
        const j=await r.json();
        const meta=j?.chart?.result?.[0]?.meta;
        if(meta?.regularMarketPrice) out[item.symbol]={cur:meta.regularMarketPrice,prev:meta.chartPreviousClose??meta.regularMarketPrice,currency:meta.currency??(isUS(item.symbol)?'USD':'INR')};
      }catch{}
    }));
    setWPrices(out);setWLoading(false);
  },[items]);

  useEffect(()=>{fetchWPrices();},[fetchWPrices]);

  // doSearch: provided by useYahooSearch hook

  const addItem=()=>{
    const sym=form.symbol.trim().toUpperCase();if(!sym)return;
    if(items.find(i=>i.symbol===sym)){alert('Already in watchlist');return;}
    setItems(p=>[{id:Date.now(),symbol:sym,name:form.name||sym,targetEntry:parseFloat(form.targetEntry)||null,targetExit:parseFloat(form.targetExit)||null,notes:form.notes,addedDate:Date.now()},...p]);
    setForm({symbol:'',name:'',targetEntry:'',targetExit:'',notes:''});setSrch('');setResults([]);setShowAdd(false);
  };

  const removeItem=id=>setItems(p=>p.filter(i=>i.id!==id));
  const saveEdit=item=>setItems(p=>p.map(i=>i.id===item.id?item:i));

  const csvExport=()=>{
    const h=['Symbol','Name','Added','Target Entry','Target Exit','Current Price','Chg%','From Entry%','Notes'];
    const body=items.map(i=>{const p=wPrices[i.symbol];const cur=p?.cur;const chg=p?((p.cur-p.prev)/p.prev)*100:null;const fromEntry=cur&&i.targetEntry?((cur-i.targetEntry)/i.targetEntry)*100:null;return[i.symbol,i.name,new Date(i.addedDate).toLocaleDateString('en-IN'),i.targetEntry??'',i.targetExit??'',cur?.toFixed(2)??'',chg?.toFixed(2)??'',fromEntry?.toFixed(2)??'',i.notes??''];});
    const csv=[h,...body].map(r=>r.join(',')).join('\n');
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`watchlist_${new Date().toISOString().slice(0,10)}.csv`});a.click();
  };

  const INP={padding:'8px 12px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};
  const tdS={padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontSize:12,whiteSpace:'nowrap'};

  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Watchlist</div>
          <div style={{fontSize:13,color:T.text3}}>{items.length} stock{items.length!==1?'s':''} tracked</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <NvBtn onClick={csvExport} T={T} disabled={!items.length}><Ic.Download/> Export</NvBtn>
          <NvBtn onClick={fetchWPrices} disabled={wLoading} T={T}><Ic.Refresh s={wLoading}/> Refresh</NvBtn>
          <NvBtn onClick={()=>setShowAdd(v=>!v)} variant="primary" T={T}><Ic.Plus/> Add Stock</NvBtn>
        </div>
      </div>

      {/* Add form */}
      {showAdd&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Add to Watchlist</div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Search Stock</div>
              <div style={{position:'relative'}}>
                <input value={srch} onChange={e=>doSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),200)} placeholder="e.g. INFY, AAPL…" style={INP} autoFocus/>
                {busyS&&<span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:T.text3,fontSize:11}}>…</span>}
                {focused&&results.length>0&&(
                  <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:9999,background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,.3)',overflow:'hidden'}}>
                    {results.map((r,i)=>(
                      <div key={r.symbol} onMouseDown={()=>{setForm(p=>({...p,symbol:r.symbol,name:r.longname||r.shortname||r.symbol}));setSrch(r.longname||r.shortname||r.symbol);setResults([]);}} style={{padding:'9px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:i<results.length-1?`1px solid ${T.border}`:'none',transition:'background .08s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div><span style={{fontWeight:700,color:T.accent,marginRight:8}}>{r.symbol}</span><span style={{fontSize:11,color:T.text3}}>{r.longname||r.shortname}</span></div>
                        {r.exchDisp&&<span style={{fontSize:10,color:T.text3}}>{r.exchDisp}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {form.symbol&&<div style={{fontSize:11,color:T.accent,marginTop:4}}>✓ {form.symbol} — {form.name}</div>}
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Target Entry</div>
              <input type="number" value={form.targetEntry} onChange={e=>setForm(p=>({...p,targetEntry:e.target.value}))} placeholder="Buy at…" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Target Exit</div>
              <input type="number" value={form.targetExit} onChange={e=>setForm(p=>({...p,targetExit:e.target.value}))} placeholder="Sell at…" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Notes</div>
              <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Rationale…" style={INP}/>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <NvBtn onClick={addItem} variant="primary" disabled={!form.symbol} T={T}><Ic.Plus/> Add</NvBtn>
            <NvBtn onClick={()=>{setShowAdd(false);setSrch('');setResults([]);setForm({symbol:'',name:'',targetEntry:'',targetExit:'',notes:''});}} T={T}><Ic.X/></NvBtn>
          </div>
        </div>
      )}

      {/* Table */}
      {!items.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No stocks in watchlist. Click Add Stock to start tracking.</div>}
      {items.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface3}}>
                {['Symbol','Added','Current','Day %','Target Entry','Vs Entry','Target Exit','Vs Exit','Notes',''].map(h=>(
                  <th key={h} style={{...tdS,color:T.text3,fontWeight:700,fontSize:11,textAlign:h===''?'center':'left'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {items.map((item,i)=>{
                  const p=wPrices[item.symbol];
                  const cur=p?.cur??null;
                  const currency=p?.currency??(isUS(item.symbol)?'USD':'INR');
                  const dayChg=p?((p.cur-p.prev)/p.prev)*100:null;
                  const vsEntry=cur&&item.targetEntry?((cur-item.targetEntry)/item.targetEntry)*100:null;
                  const vsExit=cur&&item.targetExit?((cur-item.targetExit)/item.targetExit)*100:null;
                  const nearEntry=vsEntry!=null&&Math.abs(vsEntry)<5;
                  const hitExit=vsExit!=null&&vsExit>=0;
                  const isEdit=editId===item.id;
                  return(
                    <tr key={item.id} style={{background:hitExit?T.successBg:nearEntry?T.warnBg:i%2===0?T.surface2:T.surface3}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surface4}
                      onMouseLeave={e=>e.currentTarget.style.background=hitExit?T.successBg:nearEntry?T.warnBg:i%2===0?T.surface2:T.surface3}>
                      <td style={{...tdS}}>
                        <div style={{fontWeight:700,color:T.accent}}>{short(item.symbol)}</div>
                        <div style={{fontSize:10,color:T.text3,maxWidth:110,overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</div>
                        {hitExit&&<span style={{fontSize:9,background:T.success,color:'#000',padding:'1px 5px',borderRadius:3,fontWeight:700}}>TARGET HIT</span>}
                        {nearEntry&&!hitExit&&<span style={{fontSize:9,background:T.warning,color:'#000',padding:'1px 5px',borderRadius:3,fontWeight:700}}>NEAR ENTRY</span>}
                      </td>
                      <td style={{...tdS,color:T.text3,fontSize:11}}>{new Date(item.addedDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                      <td style={{...tdS,fontWeight:700,color:T.cyan}}>
                        {cur!=null?fmt(cur,currency):<span style={{color:T.text3,animation:'pulse 2s infinite'}}>Live…</span>}
                        {cur!=null&&currency==='USD'&&usdInr&&<div style={{fontSize:9,color:T.text3}}>≈ ₹{(cur*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}</div>}
                      </td>
                      <td style={{...tdS}}>
                        {dayChg!=null?<span style={{fontWeight:700,color:dayChg>=0?T.success:T.danger}}>{dayChg>=0?'+':''}{dayChg.toFixed(2)}%</span>:<span style={{color:T.text3}}>—</span>}
                      </td>
                      <td style={{...tdS,color:T.text2}}>{item.targetEntry?fmt(item.targetEntry,currency):'—'}</td>
                      <td style={{...tdS}}>
                        {vsEntry!=null?<span style={{fontWeight:700,color:vsEntry<=0?T.success:T.warning}}>{vsEntry>=0?'+':''}{vsEntry.toFixed(1)}%</span>:<span style={{color:T.text3}}>—</span>}
                      </td>
                      <td style={{...tdS,color:T.text2}}>{item.targetExit?fmt(item.targetExit,currency):'—'}</td>
                      <td style={{...tdS}}>
                        {vsExit!=null?<span style={{fontWeight:700,color:vsExit>=0?T.success:T.danger}}>{vsExit>=0?'+':''}{vsExit.toFixed(1)}%</span>:<span style={{color:T.text3}}>—</span>}
                      </td>
                      <td style={{...tdS,color:T.text3,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis'}}>{item.notes||'—'}</td>
                      <td style={{...tdS,textAlign:'center'}}>
                        <button onClick={()=>removeItem(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'3px 6px',borderRadius:4,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.color=T.danger;e.currentTarget.style.background=T.dangerBg;}} onMouseLeave={e=>{e.currentTarget.style.color=T.text3;e.currentTarget.style.background='none';}} title="Remove"><Ic.Trash/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: BUY LOTS TRACKER ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function LotsModule({T,prices}) {
  const [lots,setLots]=useState(()=>{try{return JSON.parse(localStorage.getItem('pm_lots')||'[]');}catch{return [];}});
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({symbol:'',name:'',qty:'',buyPrice:'',buyDate:new Date().toISOString().slice(0,10),currency:'INR',notes:''});
  const {srch,setSrch,results,setResults,focused,setFocused,busyS,doSearch,clearSearch}=useYahooSearch();
  const [filter,setFilter]=useState('');

  useEffect(()=>{localStorage.setItem('pm_lots',JSON.stringify(lots));},[lots]);

  // doSearch: provided by useYahooSearch hook

  const addLot=()=>{
    const sym=form.symbol.trim().toUpperCase();
    if(!sym||!form.qty||!form.buyPrice||!form.buyDate)return;
    setLots(p=>[{id:Date.now(),symbol:sym,name:form.name||sym,qty:parseFloat(form.qty),buyPrice:parseFloat(form.buyPrice),buyDate:form.buyDate,currency:form.currency,notes:form.notes},...p]);
    setForm(f=>({...f,symbol:'',name:'',qty:'',buyPrice:'',notes:''}));setSrch('');setResults([]);setShowAdd(false);
  };
  const removeLot=id=>setLots(p=>p.filter(l=>l.id!==id));

  // Group lots by symbol, compute weighted avg
  const grouped=useMemo(()=>{
    const map={};
    lots.filter(l=>!filter||l.symbol.includes(filter.toUpperCase())||l.name.toLowerCase().includes(filter.toLowerCase())).forEach(l=>{
      if(!map[l.symbol])map[l.symbol]={symbol:l.symbol,name:l.name,currency:l.currency,lots:[],totalQty:0,totalInvested:0};
      const g=map[l.symbol];
      g.lots.push(l);g.totalQty+=l.qty;g.totalInvested+=l.qty*l.buyPrice;
    });
    return Object.values(map).map(g=>({...g,avgBuy:g.totalInvested/g.totalQty})).sort((a,b)=>a.symbol.localeCompare(b.symbol));
  },[lots,filter]);

  const curPrice=sym=>{const p=prices[sym];return p?.current??null;};

  const csvExport=()=>{
    const h=['Symbol','Name','Lot Date','Qty','Buy Price','Invested','Current Price','Current Value','P&L','P&L%','Holding Days','Notes'];
    const body=lots.map(l=>{const cp=curPrice(l.symbol);const invested=l.qty*l.buyPrice;const curVal=cp?cp*l.qty:null;const pnl=curVal?curVal-invested:null;const pnlPct=pnl&&invested?pnl/invested*100:null;const days=Math.floor((Date.now()-new Date(l.buyDate))/86400000);return[l.symbol,l.name,l.buyDate,l.qty,l.buyPrice,invested.toFixed(2),cp?.toFixed(2)??'',curVal?.toFixed(2)??'',pnl?.toFixed(2)??'',pnlPct?.toFixed(2)??'',days,l.notes??''];});
    const csv=[h,...body].map(r=>r.join(',')).join('\n');
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`lots_${new Date().toISOString().slice(0,10)}.csv`});a.click();
  };

  const INP={padding:'8px 12px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};
  const tdS={padding:'9px 12px',borderBottom:`1px solid ${T.border}`,fontSize:12,whiteSpace:'nowrap'};

  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Buy Lots Tracker</div>
          <div style={{fontSize:13,color:T.text3}}>{lots.length} lot{lots.length!==1?'s':''} across {grouped.length} stock{grouped.length!==1?'s':''}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{position:'relative'}}><span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.text3,pointerEvents:'none'}}><Ic.Search/></span><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter…" style={{...INP,width:140,paddingLeft:30}}/></div>
          <NvBtn onClick={csvExport} T={T} disabled={!lots.length}><Ic.Download/> Export</NvBtn>
          <NvBtn onClick={()=>setShowAdd(v=>!v)} variant="primary" T={T}><Ic.Plus/> Add Lot</NvBtn>
        </div>
      </div>

      {/* Add form */}
      {showAdd&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Record Buy Transaction</div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 0.7fr 0.8fr 0.8fr 0.6fr auto',gap:10,alignItems:'end'}}>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Stock</div>
              <div style={{position:'relative'}}>
                <input value={srch} onChange={e=>doSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),200)} placeholder="Search stock…" style={INP} autoFocus/>
                {focused&&results.length>0&&(
                  <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:9999,background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,.3)',overflow:'hidden'}}>
                    {results.map((r,i)=>(
                      <div key={r.symbol} onMouseDown={()=>{setForm(p=>({...p,symbol:r.symbol,name:r.longname||r.shortname||r.symbol,currency:isUS(r.symbol)?'USD':'INR'}));setSrch(r.longname||r.shortname||r.symbol);setResults([]);}} style={{padding:'9px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',borderBottom:i<results.length-1?`1px solid ${T.border}`:'none',transition:'background .08s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div><span style={{fontWeight:700,color:T.accent,marginRight:8}}>{r.symbol}</span><span style={{fontSize:11,color:T.text3}}>{r.longname||r.shortname}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {form.symbol&&<div style={{fontSize:11,color:T.accent,marginTop:3}}>✓ {form.symbol}</div>}
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Qty</div>
              <input type="number" value={form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value}))} placeholder="10" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Buy Price</div>
              <input type="number" value={form.buyPrice} onChange={e=>setForm(p=>({...p,buyPrice:e.target.value}))} placeholder="2800" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Buy Date</div>
              <input type="date" value={form.buyDate} onChange={e=>setForm(p=>({...p,buyDate:e.target.value}))} style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Notes</div>
              <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional" style={INP}/>
            </div>
            <div style={{display:'flex',gap:6}}>
              <NvBtn onClick={addLot} variant="primary" disabled={!form.symbol||!form.qty||!form.buyPrice} T={T}><Ic.Plus/> Add</NvBtn>
              <NvBtn onClick={()=>{setShowAdd(false);setSrch('');setResults([]);}} T={T}><Ic.X/></NvBtn>
            </div>
          </div>
        </div>
      )}

      {!lots.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No lots recorded yet. Add individual buy transactions to track weighted average cost.</div>}

      {/* Grouped by stock */}
      {grouped.map(g=>{
        const cp=curPrice(g.symbol);
        const curVal=cp?cp*g.totalQty:null;
        const pnl=curVal?curVal-g.totalInvested:null;
        const pnlPct=pnl?pnl/g.totalInvested*100:null;
        return(
          <div key={g.symbol} style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
            {/* Stock header */}
            <div style={{padding:'12px 16px',background:T.surface3,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontWeight:700,color:T.accent,fontSize:14}}>{short(g.symbol)}</span>
                <span style={{fontSize:12,color:T.text3}}>{g.name}</span>
                <span style={{fontSize:11,color:T.text3,background:T.surface4,padding:'2px 8px',borderRadius:10}}>{g.lots.length} lot{g.lots.length!==1?'s':''}</span>
              </div>
              <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3,marginBottom:2}}>Total Qty</div><div style={{fontWeight:700,color:T.text}}>{g.totalQty}</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3,marginBottom:2}}>Avg Buy</div><div style={{fontWeight:700,color:T.text}}>{fmt(g.avgBuy,g.currency)}</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3,marginBottom:2}}>Invested</div><div style={{fontWeight:700,color:T.text}}>{fmt(g.totalInvested,g.currency)}</div></div>
                {cp&&<div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3,marginBottom:2}}>Current</div><div style={{fontWeight:700,color:T.cyan}}>{fmt(cp,g.currency)}</div></div>}
                {pnl!=null&&<div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3,marginBottom:2}}>P&L</div><div style={{fontWeight:700,color:pnl>=0?T.success:T.danger}}>{pnl>=0?'+':'−'}{fmt(Math.abs(pnl),g.currency)} ({pnlPct?.toFixed(1)}%)</div></div>}
              </div>
            </div>
            {/* Individual lots */}
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface4}}>
                {['Buy Date','Qty','Buy Price','Invested','Current Value','P&L','P&L %','Days Held','Notes',''].map(h=>(
                  <th key={h} style={{...tdS,color:T.text3,fontWeight:600,fontSize:10}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {g.lots.map((lot,i)=>{
                  const cp2=curPrice(lot.symbol);
                  const inv=lot.qty*lot.buyPrice;
                  const cv=cp2?cp2*lot.qty:null;
                  const pnl2=cv?cv-inv:null;
                  const pnlP=pnl2?pnl2/inv*100:null;
                  const days=Math.floor((Date.now()-new Date(lot.buyDate))/86400000);
                  return(
                    <tr key={lot.id} style={{background:i%2===0?T.surface2:T.surface3}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                      <td style={{...tdS,color:T.text}}>{new Date(lot.buyDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td style={{...tdS,color:T.text2}}>{lot.qty}</td>
                      <td style={{...tdS,color:T.text2}}>{fmt(lot.buyPrice,lot.currency)}</td>
                      <td style={{...tdS,color:T.text}}>{fmt(inv,lot.currency)}</td>
                      <td style={{...tdS,color:T.cyan}}>{cv?fmt(cv,lot.currency):'—'}</td>
                      <td style={{...tdS}}>{pnl2!=null?<span style={{fontWeight:700,color:pnl2>=0?T.success:T.danger}}>{pnl2>=0?'+':'−'}{fmt(Math.abs(pnl2),lot.currency)}</span>:'—'}</td>
                      <td style={{...tdS}}>{pnlP!=null?<span style={{fontWeight:700,color:pnlP>=0?T.success:T.danger}}>{pnlP>=0?'+':''}{pnlP.toFixed(2)}%</span>:'—'}</td>
                      <td style={{...tdS,color:days>=365?T.success:T.warning}}><span style={{fontWeight:600}}>{days}d</span><span style={{fontSize:10,marginLeft:4,color:T.text3}}>{days>=365?'LTCG':'STCG'}</span></td>
                      <td style={{...tdS,color:T.text3}}>{lot.notes||'—'}</td>
                      <td style={{...tdS,textAlign:'center'}}><button onClick={()=>removeLot(lot.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'3px 6px',borderRadius:4,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.color=T.text3;}}><Ic.Trash/></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: TAX P&L (STCG / LTCG) ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function TaxModule({T,prices}) {
  const [lots,setLots]=useState(()=>{try{return JSON.parse(localStorage.getItem('pm_lots')||'[]');}catch{return [];}});
  const [soldLots,setSoldLots]=useState(()=>{try{return JSON.parse(localStorage.getItem('pm_sold_lots')||'[]');}catch{return [];}});
  const [showSell,setShowSell]=useState(null); // lot id
  const [sellForm,setSellForm]=useState({sellPrice:'',sellDate:new Date().toISOString().slice(0,10),qty:''});
  const FY_START=new Date('2025-04-01').getTime();
  const FY_END=new Date('2026-03-31').getTime();

  useEffect(()=>{localStorage.setItem('pm_sold_lots',JSON.stringify(soldLots));},[soldLots]);

  const recordSale=(lotId)=>{
    const lot=lots.find(l=>l.id===lotId);if(!lot)return;
    const sellQty=parseFloat(sellForm.qty)||lot.qty;
    const sellPrice=parseFloat(sellForm.sellPrice);if(!sellPrice)return;
    const days=Math.floor((new Date(sellForm.sellDate)-new Date(lot.buyDate))/86400000);
    const isLTCG=days>=365;
    const gain=(sellPrice-lot.buyPrice)*sellQty;
    const taxRate=lot.currency==='INR'?(isLTCG?0.10:0.15):(isLTCG?0.20:0.30);
    const taxable=isLTCG&&lot.currency==='INR'?Math.max(0,gain-100000):gain;
    const tax=Math.max(0,taxable*taxRate);
    setSoldLots(p=>[{id:Date.now(),symbol:lot.symbol,name:lot.name,currency:lot.currency,buyPrice:lot.buyPrice,buyDate:lot.buyDate,sellPrice,sellDate:sellForm.sellDate,qty:sellQty,gain,isLTCG,days,tax,taxRate},...p]);
    if(sellQty>=lot.qty)setLots(p=>p.filter(l=>l.id!==lotId));
    else setLots(p=>p.map(l=>l.id===lotId?{...l,qty:l.qty-sellQty}:l));
    setShowSell(null);setSellForm({sellPrice:'',sellDate:new Date().toISOString().slice(0,10),qty:''});
  };

  // Unrealized gains from open lots
  const unrealized=useMemo(()=>lots.map(l=>{
    const p=prices[l.symbol];const cp=p?.current??null;if(!cp)return null;
    const days=Math.floor((Date.now()-new Date(l.buyDate))/86400000);
    const isLTCG=days>=365;const gain=(cp-l.buyPrice)*l.qty;
    const taxRate=l.currency==='INR'?(isLTCG?0.10:0.15):(isLTCG?0.20:0.30);
    const taxable=isLTCG&&l.currency==='INR'?Math.max(0,gain-100000):gain;
    const tax=Math.max(0,taxable*taxRate);
    return{...l,cp,days,isLTCG,gain,tax,taxRate};
  }).filter(Boolean),[lots,prices]);

  const fyRealized=soldLots.filter(s=>new Date(s.sellDate).getTime()>=FY_START&&new Date(s.sellDate).getTime()<=FY_END);
  const stcgRealized=fyRealized.filter(s=>!s.isLTCG).reduce((a,s)=>a+s.gain,0);
  const ltcgRealized=fyRealized.filter(s=>s.isLTCG).reduce((a,s)=>a+s.gain,0);
  const taxRealized=fyRealized.reduce((a,s)=>a+s.tax,0);
  const stcgUnrealized=unrealized.filter(u=>!u.isLTCG).reduce((a,u)=>a+u.gain,0);
  const ltcgUnrealized=unrealized.filter(u=>u.isLTCG).reduce((a,u)=>a+u.gain,0);
  const taxUnrealized=unrealized.reduce((a,u)=>a+u.tax,0);

  const csvExport=()=>{
    const h=['Symbol','Buy Date','Sell Date','Qty','Buy Price','Sell Price','Gain/Loss','Type','Days','Tax Rate','Est. Tax'];
    const body=soldLots.map(s=>[s.symbol,s.buyDate,s.sellDate,s.qty,s.buyPrice,s.sellPrice,s.gain.toFixed(2),s.isLTCG?'LTCG':'STCG',s.days,`${(s.taxRate*100).toFixed(0)}%`,s.tax.toFixed(2)]);
    const csv=[h,...body].map(r=>r.join(',')).join('\n');
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`tax_pnl_FY2025-26_${new Date().toISOString().slice(0,10)}.csv`});a.click();
  };

  const INP={padding:'8px 12px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};
  const tdS={padding:'9px 12px',borderBottom:`1px solid ${T.border}`,fontSize:12};
  const SumCard=({label,value,sub,vc})=>(
    <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:'14px 18px'}}>
      <div style={{fontSize:11,color:T.text3,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>{label}</div>
      <div style={{fontSize:18,fontWeight:700,color:vc||T.text}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:T.text3,marginTop:4}}>{sub}</div>}
    </div>
  );

  return(
    <div style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Tax P&L — FY 2025-26</div>
          <div style={{fontSize:13,color:T.text3}}>STCG 15% · LTCG 10% (above ₹1L) · Holding &lt; 12 months = STCG</div>
        </div>
        <NvBtn onClick={csvExport} disabled={!soldLots.length} T={T}><Ic.Download/> Export ITR Data</NvBtn>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
        <SumCard label="Realized STCG" value={`${stcgRealized>=0?'+':'−'}₹${Math.abs(stcgRealized).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="Tax @ 15%" vc={stcgRealized>=0?T.success:T.danger}/>
        <SumCard label="Realized LTCG" value={`${ltcgRealized>=0?'+':'−'}₹${Math.abs(ltcgRealized).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="Tax @ 10% (above ₹1L)" vc={ltcgRealized>=0?T.success:T.danger}/>
        <SumCard label="Total Tax Liability" value={`₹${taxRealized.toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub={`${fyRealized.length} realized transactions`} vc={T.danger}/>
        <SumCard label="Unrealized STCG" value={`${stcgUnrealized>=0?'+':'−'}₹${Math.abs(stcgUnrealized).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="If sold today" vc={stcgUnrealized>=0?T.warning:T.text3}/>
        <SumCard label="Unrealized LTCG" value={`${ltcgUnrealized>=0?'+':'−'}₹${Math.abs(ltcgUnrealized).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="If sold today" vc={ltcgUnrealized>=0?T.success:T.text3}/>
        <SumCard label="Potential Tax (Unrealized)" value={`₹${taxUnrealized.toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="If all positions closed today" vc={T.warning}/>
      </div>

      {/* Open lots with sell option */}
      {lots.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.accent,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Open Lots (from Lots Tracker)</span>
            <span style={{fontSize:11,color:T.text3,marginLeft:4}}>Record a sale to calculate tax</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface3}}>
                {['Symbol','Buy Date','Qty','Buy Price','Days Held','Type','Current P&L','Est. Tax',''].map(h=>(
                  <th key={h} style={{...tdS,color:T.text3,fontWeight:600,fontSize:10}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {lots.map((lot,i)=>{
                  const u=unrealized.find(u=>u.id===lot.id);
                  const days=Math.floor((Date.now()-new Date(lot.buyDate))/86400000);
                  const isLTCG=days>=365;
                  return(
                    <tr key={lot.id} style={{background:i%2===0?T.surface2:T.surface3}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                      <td style={{...tdS,fontWeight:700,color:T.accent}}>{short(lot.symbol)}</td>
                      <td style={{...tdS,color:T.text2}}>{new Date(lot.buyDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td style={{...tdS,color:T.text}}>{lot.qty}</td>
                      <td style={{...tdS,color:T.text}}>{fmt(lot.buyPrice,lot.currency)}</td>
                      <td style={{...tdS,color:isLTCG?T.success:T.warning,fontWeight:600}}>{days}d</td>
                      <td style={{...tdS}}><span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:isLTCG?T.successBg:T.warnBg,color:isLTCG?T.success:T.warning}}>{isLTCG?'LTCG':'STCG'}</span></td>
                      <td style={{...tdS}}>{u?<span style={{fontWeight:700,color:u.gain>=0?T.success:T.danger}}>{u.gain>=0?'+':'−'}₹{Math.abs(u.gain).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>:'—'}</td>
                      <td style={{...tdS,color:T.danger,fontWeight:600}}>{u?`₹${u.tax.toLocaleString('en-IN',{maximumFractionDigits:0})}`:'—'}</td>
                      <td style={{...tdS}}>
                        {showSell===lot.id?(
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <input type="number" value={sellForm.sellPrice} onChange={e=>setSellForm(p=>({...p,sellPrice:e.target.value}))} placeholder="Sell price" style={{...INP,width:90}}/>
                            <input type="number" value={sellForm.qty} onChange={e=>setSellForm(p=>({...p,qty:e.target.value}))} placeholder={`Qty (max ${lot.qty})`} style={{...INP,width:90}}/>
                            <input type="date" value={sellForm.sellDate} onChange={e=>setSellForm(p=>({...p,sellDate:e.target.value}))} style={{...INP,width:120}}/>
                            <NvBtn onClick={()=>recordSale(lot.id)} variant="primary" disabled={!sellForm.sellPrice} T={T}>Record</NvBtn>
                            <NvBtn onClick={()=>setShowSell(null)} T={T}><Ic.X/></NvBtn>
                          </div>
                        ):(
                          <NvBtn onClick={()=>{setShowSell(lot.id);setSellForm({sellPrice:'',sellDate:new Date().toISOString().slice(0,10),qty:lot.qty});}} T={T}>Record Sale</NvBtn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Realized transactions this FY */}
      {fyRealized.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.success,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Realized Transactions — FY 2025-26</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface3}}>
                {['Symbol','Buy Date','Sell Date','Qty','Buy Price','Sell Price','Gain/Loss','Type','Days','Tax Rate','Est. Tax'].map(h=>(
                  <th key={h} style={{...tdS,color:T.text3,fontWeight:600,fontSize:10}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {fyRealized.map((s,i)=>(
                  <tr key={s.id} style={{background:i%2===0?T.surface2:T.surface3}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                    <td style={{...tdS,fontWeight:700,color:T.accent}}>{short(s.symbol)}</td>
                    <td style={{...tdS,color:T.text3}}>{new Date(s.buyDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                    <td style={{...tdS,color:T.text3}}>{new Date(s.sellDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                    <td style={{...tdS,color:T.text}}>{s.qty}</td>
                    <td style={{...tdS,color:T.text2}}>{fmt(s.buyPrice,s.currency)}</td>
                    <td style={{...tdS,color:T.text2}}>{fmt(s.sellPrice,s.currency)}</td>
                    <td style={{...tdS,fontWeight:700,color:s.gain>=0?T.success:T.danger}}>{s.gain>=0?'+':'−'}{fmt(Math.abs(s.gain),s.currency)}</td>
                    <td style={{...tdS}}><span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:s.isLTCG?T.successBg:T.warnBg,color:s.isLTCG?T.success:T.warning}}>{s.isLTCG?'LTCG':'STCG'}</span></td>
                    <td style={{...tdS,color:T.text3}}>{s.days}d</td>
                    <td style={{...tdS,color:T.text3}}>{(s.taxRate*100).toFixed(0)}%</td>
                    <td style={{...tdS,fontWeight:700,color:T.danger}}>{fmt(s.tax,s.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!lots.length&&!soldLots.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No lots recorded. Add buy transactions in the Lots Tracker to compute tax liability.</div>}
      <div style={{fontSize:11,color:T.text3,fontStyle:'italic',padding:'0 4px'}}>⚠ Estimates only. Tax rates: Equity STCG 15%, LTCG 10% (above ₹1L exemption). Consult a CA for ITR filing.</div>
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
  const pricesRef=useRef({});
  useEffect(()=>{pricesRef.current=prices;},[prices]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [lastUpdated,setLastUpdated]=useState(null);
  const [updateAvail,setUpdateAvail]=useState(false);
  const [mainTab,setMainTab]=useState('IN');
  const [activeModule,setActiveModule]=useState(null);
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
    // FIX #1: Use pricesRef to avoid stale closure / infinite re-render loop
    setPrices(prev=>{
      const merged={...prev};
      let anyNew=false;
      for(const [sym,val] of Object.entries(out)){
        if(val){merged[sym]=val;anyNew=true;}
      }
      if(!anyNew&&holdings.length){
        setError('Live prices unavailable — showing last known prices.');
      } else {
        setError(null);
      }
      return merged;
    });
    setLastUpdated(new Date());setLoading(false);
  },[holdings]); // FIX #1: removed 'prices' from deps — uses functional setPrices instead
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
  const sharedProps={fetchPrices,loading,error,lastUpdated,onSaveUnpledged:saveUnpledgedQty,onRemove:removeHolding,compact:tweaks.compactRows,addHolding,T};

  // FIX #6: SidebarContent extracted — receives T, targets, activePf, tweaks as props
  const SidebarContent=({sRows,pie,currency,usdInr,invAmt,totalAmt,gain,dayGain,offset})=>{
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
      </div>
    );
  };

  // Left sidebar nav items
  const NAV=[
    {id:'IN', label:'Indian Equity', icon:<Ic.India/>, flag:'🇮🇳', color:T.inColor},
    {id:'US', label:'US Equity',     icon:<Ic.US/>,    flag:'🇺🇸', color:T.usColor},
  ];
  const MOD_NAV=[
    {id:'watchlist', label:'Watchlist',  icon:'👁', color:'#a855f7'},
    {id:'lots',      label:'Buy Lots',  icon:'📋', color:'#06b6d4'},
    {id:'tax',       label:'Tax P&L',  icon:'🧾', color:'#f59e0b'},
    {id:'notes',     label:'Notes',    icon:'📝', color:'#10b981'},
    {id:'alerts',    label:'Alerts',   icon:'🔔', color:'#ef4444'},
    {id:'sectors',   label:'Sectors',  icon:'🏭', color:'#6366f1'},
    {id:'screener',  label:'Screener', icon:'🔍', color:'#14b8a6'},
    {id:'news',      label:'News',     icon:'📰', color:'#8b5cf6'},
    {id:'benchmark', label:'Benchmark',icon:'📊', color:'#00b4d8'},
    {id:'history',   label:'History',  icon:'📈', color:'#f97316'},
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
            <div style={{fontSize:10,color:T.text3,marginTop:1}}>Arun Verma · v4.5.1</div>
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
          <button onClick={()=>setTweaks(p=>({...p,darkMode:!p.darkMode}))} style={{padding:'7px 8px',borderRadius:6,border:`1px solid ${T.border}`,background:'transparent',color:T.text3,cursor:'pointer',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}>
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
            const isActive=!activeModule&&mainTab===nav.id;
            return(
              <button key={nav.id} onClick={()=>{setMainTab(nav.id);setActiveModule(null);}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:isActive?T.accentBg:'transparent',border:'none',borderLeft:isActive?`3px solid ${T.accent}`:'3px solid transparent',cursor:'pointer',width:'100%',textAlign:'left',color:isActive?T.accent:T.text2,transition:'all .15s',marginBottom:2}}>
                <span style={{fontSize:15}}>{nav.flag}</span>
                <span style={{fontSize:13,fontWeight:isActive?600:400}}>{nav.label}</span>
              </button>
            );
          })}
          {/* Module nav */}
          <div style={{height:1,background:T.border,margin:'8px 12px 4px'}}/>
          <div style={{padding:'8px 12px 4px',fontSize:10,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.08em'}}>Tools</div>
          {MOD_NAV.map(mod=>{const isA=activeModule===mod.id;return(
            <button key={mod.id} onClick={()=>{setActiveModule(isA?null:mod.id);}} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',background:isA?`${mod.color}18`:'transparent',border:'none',borderLeft:isA?`3px solid ${mod.color}`:'3px solid transparent',cursor:'pointer',width:'100%',textAlign:'left',color:isA?mod.color:T.text2,transition:'all .15s',marginBottom:2}}>
              <span style={{fontSize:14}}>{mod.icon}</span>
              <span style={{fontSize:12,fontWeight:isA?600:400}}>{mod.label}</span>
            </button>
          );})}
          <div style={{height:1,background:T.border,margin:'4px 12px 8px'}}/>

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
          {activeModule==='watchlist'&&<WatchlistModule T={T} usdInr={usdInr}/>}
          {activeModule==='lots'&&<LotsModule T={T} prices={prices}/>}
          {activeModule==='tax'&&<TaxModule T={T} prices={prices}/>}
          {activeModule==='notes'&&<NotesModule T={T} holdings={holdings}/>}
          {activeModule==='alerts'&&<AlertsModule T={T} prices={prices} holdings={holdings}/>}
          {activeModule==='sectors'&&<SectorModule T={T} rows={rows} prices={prices} usdInr={usdInr}/>}
          {activeModule==='screener'&&<ScreenerModule T={T} holdings={holdings} prices={prices}/>}
          {activeModule==='news'&&<NewsModule T={T} holdings={holdings}/>}
          {activeModule==='benchmark'&&<BenchmarkModule T={T} rows={rows} inRows={inRows} usRows={usRows} usdInr={usdInr}/>}
          {activeModule==='history'&&<HistoryModule T={T} rows={rows}/>}
          {!activeModule&&activeStock?(
            <StockDetailView symbol={activeStock} holding={rows.find(r=>r.symbol===activeStock)} detail={stockDetails[activeStock]} prices={prices} targets={targets} onSaveTarget={saveTarget} onRefresh={()=>fetchStockDetail(activeStock,stockDetails[activeStock]?.range||'3mo')} onRangeChange={(sym,range)=>fetchStockDetail(sym,range)} groqKey={groqKey} geminiKey={geminiKey} primaryAI={primaryAI} aiAnalysis={aiAnalyses[activeStock]} onAIRefresh={(prov)=>{const r=rows.find(r=>r.symbol===activeStock);fetchAIAnalysis(activeStock,r,r?.curPrice,r?.currency,prov);}} T={T}/>
          ):(!activeModule&&(
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
          ))}
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
