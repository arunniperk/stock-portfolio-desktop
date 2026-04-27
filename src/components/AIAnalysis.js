import React from 'react';
import { Ic } from '../icons';
import { NvBtn } from './ui';

export function AIAnalysis({symbol,holding,analysis,groqKey,geminiKey,primaryAI,onRefresh,T}) {
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
