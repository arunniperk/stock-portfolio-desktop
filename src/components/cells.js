import React, { useState } from 'react';
import { fmt, fmtQty } from '../utils';
import { Ic } from '../icons';
import { NvInput } from './ui';

export function TargetCell({id,target,curPrice,currency,onSave,T,compact=false}) {
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

export function UnpledgedQtyCell({id,unpledgedQty,totalQty,onSave,T}) {
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

export function StatCard({label,value,sub,valueColor,T}) {
  return(
    <div style={{background:T.surface2,borderRadius:T.r,padding:'16px 18px',border:`1px solid ${T.border}`}}>
      <div style={{fontSize:11,color:T.text3,fontWeight:500,marginBottom:8,textTransform:'uppercase',letterSpacing:'.06em'}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,color:valueColor||T.text,lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:valueColor||T.text3,marginTop:4,fontWeight:600}}>{sub}</div>}
    </div>
  );
}
