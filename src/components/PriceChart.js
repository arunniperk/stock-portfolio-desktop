import React, { useState, useRef } from 'react';
import { fmt } from '../utils';

export function PriceChart({history,buyPrice,analystTarget,currency,T}) {
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
