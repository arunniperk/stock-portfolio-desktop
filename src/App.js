import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { isUS, short, fmtQty, fmt, fmtDual, fmtBig, fmtPct, gColor, sortRows } from './utils';
import { mkT, PIE, PORT_COLORS, DEF_PF, TWEAK_DEF } from './theme';
import { Ic } from './icons';
import { callGroq, callGemini, callAI, extractJSON } from './ai';
import { useYahooSearch, useNotes } from './hooks';
import { getItemSync, setItemSync } from './storage';
import './mobile.css';

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







import { NvBtn, NvInput, Badge, SortTh } from './components/ui';
import { TargetCell, UnpledgedQtyCell, StatCard } from './components/cells';

import { PriceChart } from './components/PriceChart';

// ── STOCK DETAIL VIEW ─────────────────────────────────────────────────────────
import { StockDetailView } from './components/StockDetailView';
import { DonutChart, PLBarChart } from './components/charts';
import { CSVImportModal, AISetupModal } from './components/modals';
import { AIAnalysis } from './components/AIAnalysis';

// ── HOLDINGS TABLE ────────────────────────────────────────────────────────────
import { Section } from './components/Section';
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

function BottomNav({activeId, activeModule, onSwitch, T, NAV, MOD_NAV}) {
  const items = [
    {id: 'IN', label: 'Indian', icon: <Ic.India/>},
    {id: 'US', label: 'US', icon: <Ic.US/>},
    {id: 'watchlist', label: 'Watch', icon: '👁'},
    {id: 'news', label: 'News', icon: '📰'},
    {id: 'alerts', label: 'Alerts', icon: '🔔'},
  ];
  return (
    <div className="bottom-nav" style={{height:60, background:T.sidebar, borderTop:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-around', position:'fixed', bottom:0, left:0, right:0, zIndex:1000}}>
      {items.map(item => {
        const isActive = (item.id === 'IN' || item.id === 'US') ? (!activeModule && activeId === item.id) : (activeModule === item.id);
        const color = isActive ? T.accent : T.text3;
        return (
          <div key={item.id} onClick={() => onSwitch(item.id)} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', color}}>
            <div style={{fontSize:18, display:'flex'}}>{item.icon}</div>
            <div style={{fontSize:10, fontWeight:isActive?700:400}}>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// Lazy-loaded modules for better startup speed
const NotesModule     = lazy(() => import('./modules').then(m => ({ default: m.NotesModule })));
const AlertsModule    = lazy(() => import('./modules').then(m => ({ default: m.AlertsModule })));
const SectorModule    = lazy(() => import('./modules').then(m => ({ default: m.SectorModule })));
const BenchmarkModule = lazy(() => import('./modules').then(m => ({ default: m.BenchmarkModule })));
const NewsModule      = lazy(() => import('./modules').then(m => ({ default: m.NewsModule })));
const HistoryModule   = lazy(() => import('./modules').then(m => ({ default: m.HistoryModule })));
const WatchlistModule = lazy(() => import('./modules').then(m => ({ default: m.WatchlistModule })));
const WatchlistHistoryModule = lazy(() => import('./modules').then(m => ({ default: m.WatchlistHistoryModule })));

function AppInner() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [tweaks,setTweaks]=useState(TWEAK_DEF);
  const [portfolios,setPortfolios]=useState(DEF_PF);
  const [activeId,setActiveId]=useState(1);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [rightSidebarCollapsed,setRightSidebarCollapsed]=useState(false);
  const [groqKey,setGroqKey]=useState('');
  const [geminiKey,setGeminiKey]=useState('');
  const [primaryAI,setPrimaryAI]=useState('groq');
  const [history,setHistory]=useState([]);

  useEffect(() => {
    // Run after initial mount to keep the UI thread responsive
    setTimeout(() => {
      try {
        const sTweaks = getItemSync('pm_tweaks');
        if(sTweaks) setTweaks({...TWEAK_DEF, ...JSON.parse(sTweaks)});
        
        const sPfs = getItemSync('pm_portfolios');
        if(sPfs) setPortfolios(JSON.parse(sPfs));
        
        const sActive = getItemSync('pm_activeId');
        if(sActive) setActiveId(JSON.parse(sActive));
        
        setSidebarCollapsed(JSON.parse(getItemSync('pm_sidebar_collapsed') || 'false'));
        setRightSidebarCollapsed(JSON.parse(getItemSync('pm_right_sidebar_collapsed') || 'false'));
        setGroqKey(getItemSync('pm_groq_key') || '');
        setGeminiKey(getItemSync('pm_gemini_key') || '');
        setPrimaryAI(getItemSync('pm_primary_ai') || 'groq');
        setHistory(JSON.parse(getItemSync('pm_portfolio_history') || '[]'));
        
        const gKey = getItemSync('pm_groq_key');
        const gmKey = getItemSync('pm_gemini_key');
        setShowAISetup(gKey === null && gmKey === null);
      } catch(e) {
        console.error("Storage load error:", e);
      } finally {
        setIsLoaded(true);
      }
    }, 0);
  }, []);

  const [aiAnalyses,setAiAnalyses]=useState({});
  const [usdInr,setUsdInr]=useState(null);
  const [showAISetup,setShowAISetup]=useState(false);

  const [showSettings,setShowSettings]=useState(false);
  const [importModal,setImportModal]=useState(null);
  const T=useMemo(()=>mkT(tweaks.darkMode),[tweaks.darkMode]);
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
  const isElectron = !!window.electronAPI;
  const isCapacitor = false;
  const isMobile = window.innerWidth < 768;

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
    setItemSync('pm_groq_key',gk);
    setItemSync('pm_gemini_key',gmk);
    setItemSync('pm_primary_ai',prim);
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
  useEffect(()=>{setItemSync('pm_portfolios',JSON.stringify(portfolios));},[portfolios]);
  useEffect(()=>{setItemSync('pm_activeId',JSON.stringify(activeId));},[activeId]);
  useEffect(()=>{setItemSync('pm_sidebar_collapsed',JSON.stringify(sidebarCollapsed));},[sidebarCollapsed]);
  useEffect(()=>{setItemSync('pm_right_sidebar_collapsed',JSON.stringify(rightSidebarCollapsed));},[rightSidebarCollapsed]);
  useEffect(()=>{setItemSync('pm_tweaks',JSON.stringify(tweaks));},[tweaks]);
  useEffect(()=>{setItemSync('pm_portfolio_history',JSON.stringify(history));},[history]);
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
  const allRows=useMemo(()=>{
    return portfolios.flatMap(p=>p.holdings.map(h=>{
      const pr=prices[h.symbol],cur=pr?.currency??(isUS(h.symbol)?'USD':'INR'),cp=pr?.current??null;
      const inv=parseFloat((h.buyPrice*h.qty).toFixed(8)),cv=cp!=null?parseFloat((cp*h.qty).toFixed(2)):null;
      return{...h,currency:cur,curPrice:cp,invested:inv,curValue:cv,gain:cv?cv-inv:null,pfName:p.name};
    }));
  },[portfolios,prices]);

  const uniqueHoldings=useMemo(()=>{
    const map=new Map();
    allRows.forEach(h=>{ if(!map.has(h.symbol)) map.set(h.symbol, h); });
    return Array.from(map.values());
  },[allRows]);

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
    {id:'notes',     label:'Notes',    icon:'📝', color:'#10b981'},
    {id:'alerts',    label:'Alerts',   icon:'🔔', color:'#ef4444'},
    {id:'sectors',   label:'Sectors',  icon:'🏭', color:'#6366f1'},
    {id:'news',      label:'News',     icon:'📰', color:'#8b5cf6'},
    {id:'benchmark', label:'Benchmark',icon:'📊', color:'#00b4d8'},
    {id:'history',   label:'History',  icon:'📈', color:'#f97316'},
  ];

  if(!isLoaded) return <div style={{height:'100vh',background:T.bg,display:'flex',alignItems:'center',justifyContent:'center',color:T.accent,fontSize:20,fontWeight:700,fontFamily:'Orbitron, sans-serif',letterSpacing:'.1em',textShadow:`0 0 20px ${T.accent}60`}}>ORBITRON PORTFOLIO...</div>;

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
      <div className="title-bar" style={{background:T.sidebar,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',borderBottom:`1px solid ${T.border}`,WebkitAppRegion:isCapacitor?'none':'drag',position:'relative',zIndex:100}}>
        <div className="title-bar-logo" style={{display:'flex',alignItems:'center',gap:12,WebkitAppRegion:'no-drag'}}>
          <button onClick={()=>setSidebarCollapsed(v=>!v)} style={{background:'none',border:'none',color:T.text3,cursor:'pointer',padding:4,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:4,transition:'all .1s'}} onMouseEnter={e=>e.currentTarget.style.color=T.accent} onMouseLeave={e=>e.currentTarget.style.color=T.text3}>
            <Ic.Menu/>
          </button>
          <div style={{width:32,height:32,borderRadius:8,background:T.accent,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,letterSpacing:'-.01em'}}>Portfolio Manager</div>
            <div style={{fontSize:10,color:T.text3,marginTop:1}}>Arun Verma · v4.5.2</div>
          </div>
        </div>

        {/* P&L pills */}
        <div className="pnl-pills" style={{display:'flex',gap:10,alignItems:'center',WebkitAppRegion:'no-drag'}}>
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
        <div className="title-bar-controls" style={{display:'flex',gap:6,alignItems:'center',WebkitAppRegion:'no-drag'}}>
          {updateAvail&&<NvBtn onClick={()=>window.electronAPI?.installUpdate()} variant="primary" T={T}><Ic.Update/> Update Ready</NvBtn>}
          <button onClick={()=>setTweaks(p=>({...p,darkMode:!p.darkMode}))} style={{padding:'7px 8px',borderRadius:6,border:`1px solid ${T.border}`,background:'transparent',color:T.text3,cursor:'pointer',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}>
            {tweaks.darkMode?<Ic.Sun/>:<Ic.Moon/>}
          </button>
          <button onClick={()=>setShowSettings(v=>!v)} style={{padding:'7px 8px',borderRadius:6,border:`1px solid ${showSettings?T.accent:T.border}`,background:showSettings?T.accentBg:'transparent',color:showSettings?T.accent:T.text3,cursor:'pointer',display:'flex',transition:'all .1s'}}>
            <Ic.Settings/>
          </button>
          <button onClick={()=>setRightSidebarCollapsed(v=>!v)} style={{padding:'7px 8px',borderRadius:6,border:`1px solid ${T.border}`,background:'transparent',color:T.text3,cursor:'pointer',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}>
            <Ic.Menu/>
          </button>
          <div style={{display:isElectron?'flex':'none',marginLeft:4,gap:1}}>
            {[{icon:<Ic.Minimize size={14}/>,fn:()=>window.electronAPI?.minimize(),d:false},{icon:<Ic.Maximize size={14}/>,fn:()=>window.electronAPI?.maximize(),d:false},{icon:<Ic.X size={14}/>,fn:()=>window.electronAPI?.close(),d:true}].map(({icon,fn,d},i)=>(
              <button key={i} onClick={fn} style={{width:32,height:32,background:'transparent',border:'none',cursor:'pointer',color:T.text3,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.background=d?'rgba(244,67,54,.2)':T.surface3;e.currentTarget.style.color=d?T.danger:T.text;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=T.text3;}}>{icon}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body: Left Nav + Content ── */}
      <div className="main-container" style={{flex:1,overflow:'hidden',display:'flex',minHeight:0}}>

        {/* Left Sidebar */}
        <div style={{width:sidebarCollapsed?0:152,background:T.sidebar,borderRight:sidebarCollapsed?'none':`1px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden',transition:'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'}}>
          <div style={{width:152,display:'flex',flexDirection:'column',height:'100%',overflowY:'auto'}}>
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
          {MOD_NAV.map(mod=>{
            const isA=activeModule===mod.id;
            return(
              <div key={mod.id} style={{position:'relative'}}>
                <button onClick={()=>{setActiveModule(isA?null:mod.id);}} style={{width:'100%',display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'12px 4px',background:isA?T.accentBg:'transparent',border:'none',borderRadius:8,color:isA?T.accent:T.text3,cursor:'pointer',transition:'all .15s',position:'relative'}} onMouseEnter={e=>{if(!isA)e.currentTarget.style.background=T.surface4;}} onMouseLeave={e=>{if(!isA)e.currentTarget.style.background='transparent';}}>
                  <span style={{fontSize:14}}>{mod.icon}</span>
                  <span style={{fontSize:12,fontWeight:isA?600:400}}>{mod.label}</span>
                </button>
                {isA&&<button onClick={(e)=>{e.stopPropagation();setActiveModule(null);}} style={{position:'absolute',top:4,right:4,background:T.surface4,border:`1px solid ${T.accent}`,color:T.accent,cursor:'pointer',padding:4,display:'flex',borderRadius:6,boxShadow:'0 2px 8px rgba(0,0,0,0.2)',zIndex:10}} onMouseEnter={e=>e.currentTarget.style.background=T.accentBg} onMouseLeave={e=>e.currentTarget.style.background=T.surface4}><Ic.X size={14}/></button>}
              </div>
            );
          })}
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
        </div>

        {/* Main Content */}
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',minHeight:0}}>
          <Suspense fallback={<div style={{padding:40,color:T.text3}}>Loading module...</div>}>
            {activeModule==='watchlist'&&<WatchlistModule T={T} usdInr={usdInr} onClose={()=>setActiveModule(null)}/>}
            {activeModule==='notes'&&<NotesModule T={T} holdings={holdings} onClose={()=>setActiveModule(null)}/>}
            {activeModule==='alerts'&&<AlertsModule T={T} prices={prices} holdings={uniqueHoldings} onClose={()=>setActiveModule(null)}/>}
            {activeModule==='sectors'&&<SectorModule T={T} rows={allRows} prices={prices} usdInr={usdInr} onClose={()=>setActiveModule(null)}/>}
            {activeModule==='news'&&<NewsModule T={T} holdings={uniqueHoldings} onClose={()=>setActiveModule(null)}/>}
            {activeModule==='benchmark'&&<BenchmarkModule T={T} rows={rows} inRows={inRows} usRows={usRows} usdInr={usdInr} history={history} onClose={()=>setActiveModule(null)}/>}
            {activeModule==='history'&&<HistoryModule T={T} rows={allRows} history={history} setHistory={setHistory} onClose={()=>setActiveModule(null)}/>}
          </Suspense>
          {!activeModule&&activeStock?(
            <StockDetailView symbol={activeStock} holding={rows.find(r=>r.symbol===activeStock)} detail={stockDetails[activeStock]} prices={prices} targets={targets} onSaveTarget={saveTarget} onRefresh={()=>fetchStockDetail(activeStock,stockDetails[activeStock]?.range||'3mo')} onRangeChange={(sym,range)=>fetchStockDetail(sym,range)} groqKey={groqKey} geminiKey={geminiKey} primaryAI={primaryAI} aiAnalysis={aiAnalyses[activeStock]} onAIRefresh={(prov)=>{const r=rows.find(r=>r.symbol===activeStock);fetchAIAnalysis(activeStock,r,r?.curPrice,r?.currency,prov);}} T={T}/>
          ):(!activeModule&&(
            <>
              {/* Portfolio sub-tabs */}
              <PortfolioTabs portfolios={portfolios} activeId={activeId} onSwitch={setActiveId} onAdd={addPortfolio} onRename={renamePortfolio} onDelete={deletePortfolio} T={T}/>
              {/* Main grid */}
              <div className="main-grid" style={{flex:1,overflow:'hidden',display:'grid',gridTemplateColumns:rightSidebarCollapsed?'1fr 0px':'minmax(0,1fr) clamp(220px,20vw,280px)',gap:0,transition:'grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1)'}}>
                <div style={{overflowY:'auto',padding:20}}>
                  {mainTab==='IN'&&<Section title="Indian Equity" flag="🇮🇳" accent={T.inColor} rows={inRows} currency="INR" onImportCSV={()=>setImportModal('IN')} onRowClick={openStockTab} {...sharedProps}/>}
                  {mainTab==='US'&&<Section title="US Equity" flag="🇺🇸" accent={T.usColor} rows={usRows} currency="USD" usdInr={usdInr} onImportCSV={()=>setImportModal('US')} onRowClick={openStockTab} {...sharedProps}/>}
                </div>
                <div className="right-sidebar" style={{overflowY:'auto',padding:rightSidebarCollapsed?0:'20px 16px 20px 0',borderLeft:rightSidebarCollapsed?'none':`1px solid ${T.border}`,overflow:'hidden',opacity:rightSidebarCollapsed?0:1,transition:'opacity 0.2s'}}>
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
      {isMobile && <BottomNav activeId={mainTab} activeModule={activeModule} onSwitch={(id) => {if(id==='IN'||id==='US'){setMainTab(id);setActiveModule(null);}else{setActiveModule(id);}}} T={T} NAV={NAV} MOD_NAV={MOD_NAV}/>}
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
