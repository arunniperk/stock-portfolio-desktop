import React, { useState, useRef } from 'react';
import { NvBtn, NvInput } from './ui';
import { Ic } from '../icons';
import { fmtQty } from '../utils';
import { callGroq, callGemini } from '../ai';

// ── CSV IMPORT MODAL ──────────────────────────────────────────────────────────
export function CSVImportModal({onImport,onClose,market,T}) {
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
export function AISetupModal({onSave,T}) {
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
