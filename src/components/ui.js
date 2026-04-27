import React, { useState } from 'react';
import { fmtPct, fmt } from '../utils';
import { Ic } from '../icons';

export const NvBtn = ({children,onClick,variant='ghost',disabled,style:sx={}}) => {
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

export const NvInput = ({value,onChange,onKeyDown,onFocus:onFocusProp,onBlur:onBlurProp,placeholder,type='text',style:sx={},autoFocus,T}) => {
  const [f,sF]=useState(false);
  return <input autoFocus={autoFocus} type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder}
    onFocus={e=>{sF(true);onFocusProp&&onFocusProp(e);}} onBlur={e=>{sF(false);onBlurProp&&onBlurProp(e);}}
    style={{padding:'8px 12px',background:T.surface3,border:`1px solid ${f?T.accent:T.border2}`,borderRadius:6,
      color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit',
      transition:'border-color .15s',caretColor:T.accent,...sx}}/>;
};

export const Badge = ({val,pct,currency,T,size='sm'}) => {
  if(val==null||isNaN(val))return<span style={{color:T.text3,fontSize:size==='sm'?11:13}}>—</span>;
  const pos=val>=0,col=pos?T.success:T.danger,bg=pos?T.successBg:T.dangerBg;
  return<span style={{display:'inline-flex',alignItems:'center',padding:size==='sm'?'2px 7px':'3px 10px',background:bg,
    color:col,fontSize:size==='sm'?11:13,fontWeight:700,borderRadius:4,whiteSpace:'nowrap'}}>
    {pct?fmtPct(val):`${pos?'+':'−'}${fmt(Math.abs(val),currency)}`}
  </span>;
};

export function SortTh({label,col,sort,onSort,T,right=false,minW,sticky=false}) {
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
