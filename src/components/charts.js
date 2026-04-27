import React, { useState, useMemo } from 'react';
import { PIE } from '../theme';
import { fmt, short } from '../utils';

// ── DONUT CHART ───────────────────────────────────────────────────────────────
export function DonutChart({title,data,currency,offset=0,T}) {
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
export function PLBarChart({rows,currency,T}) {
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
