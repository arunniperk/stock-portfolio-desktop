import React, { useMemo } from 'react';
import { isUS, short, fmt, fmtBig, fmtPct, gColor, fmtQty } from '../utils';
import { Badge, NvBtn } from './ui';
import { TargetCell } from './cells';
import { Ic } from '../icons';
import { PriceChart } from './PriceChart';
import { AIAnalysis } from './AIAnalysis';

export function StockDetailView({symbol,holding,detail,prices,targets,onSaveTarget,onRefresh,onRangeChange,groqKey,geminiKey,primaryAI,aiAnalysis,onAIRefresh,T}) {
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
