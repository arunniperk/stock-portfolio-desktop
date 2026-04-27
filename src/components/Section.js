import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useYahooSearch } from '../hooks';
import { NvBtn, NvInput, Badge, SortTh } from './ui';
import { UnpledgedQtyCell, StatCard } from './cells';
import { Ic } from '../icons';
import { fmt, fmtQty, fmtPct, sortRows, gColor, isUS, short } from '../utils';

export function Section({title,flag,accent,rows,currency,usdInr,onSaveUnpledged,onRemove,fetchPrices,loading,error,lastUpdated,compact,onImportCSV,addHolding,onRowClick,T}) {
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
      ws[addr].s={fill:{fgColor:{rgb:'1A1A2E'}},font:{color:{rgb:'76B900'},bold:true}};
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
