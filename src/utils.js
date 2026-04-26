// ── FORMATTING & HELPERS ─────────────────────────────────────────────────────
export const isUS    = s => !s.endsWith('.NS') && !s.endsWith('.BO');
export const short   = s => s.replace('.NS','').replace('.BO','');
export const fmtQty  = v => v==null?'—':parseFloat(v.toFixed(8)).toString();

export const fmt = (v,cur='INR') => {
  if(v==null||isNaN(v))return'—';
  return(cur==='USD'?'$':'₹')+Math.abs(v).toLocaleString(cur==='USD'?'en-US':'en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
};

export const fmtDual = (v, fx) => {
  if(v==null||isNaN(v)||!fx) return fmt(v,'USD');
  const sign=v>=0?'+':'−';
  const abs=Math.abs(v);
  const usd=`${sign}$${abs.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const inr=`₹${(abs*fx).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
  return `${usd}  ≈ ${inr}`;
};

export const fmtBig = (v,cur='INR') => {
  if(v==null||isNaN(v))return'—';
  const s=cur==='USD'?'$':'₹';
  if(cur==='USD'){
    if(Math.abs(v)>=1e12)return`${s}${(v/1e12).toFixed(2)}T`;
    if(Math.abs(v)>=1e9) return`${s}${(v/1e9).toFixed(2)}B`;
    if(Math.abs(v)>=1e6) return`${s}${(v/1e6).toFixed(2)}M`;
    return fmt(v,cur);
  }
  if(Math.abs(v)>=1e12)return`${s}${(v/1e12).toFixed(2)}T`;
  if(Math.abs(v)>=1e9) return`${s}${(v/1e9).toFixed(2)}B`;
  if(Math.abs(v)>=1e7) return`${s}${(v/1e7).toFixed(2)}Cr`;
  if(Math.abs(v)>=1e5) return`${s}${(v/1e5).toFixed(2)}L`;
  return fmt(v,cur);
};

export const fmtPct  = v => v==null||isNaN(v)?'—':`${v>=0?'+':''}${v.toFixed(2)}%`;
export const gColor  = (v,T) => v==null||isNaN(v)?T.text2:v>=0?T.success:T.danger;

export const sortRows = (rows,col,dir) => [...rows].sort((a,b)=>{
  let va=a[col],vb=b[col];
  if(va==null&&vb==null)return 0;if(va==null)return dir==='asc'?1:-1;if(vb==null)return dir==='asc'?-1:1;
  if(typeof va==='string')va=va.toLowerCase();if(typeof vb==='string')vb=vb.toLowerCase();
  return dir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0);
});

// Yahoo Finance search helper (used by useYahooSearch hook)
export async function yahooSearch(query) {
  const quotes = [];
  for (const host of ['query1','query2']) {
    try {
      const res = await fetch(
        `https://${host}.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&lang=en-US`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const json = await res.json();
        const found = (json?.quotes ?? []).filter(r => r.symbol && r.quoteType !== 'OPTION').slice(0, 7);
        if (found.length) return found;
      }
    } catch { /* fallback to next host */ }
  }
  return quotes;
}
