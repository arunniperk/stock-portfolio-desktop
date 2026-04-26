// ── AI PROVIDERS ──────────────────────────────────────────────────────────────
export const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'llama-3.3-70b-versatile';
export const GEMINI_URL = key =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

export async function callGroq(apiKey, prompt) {
  if (!apiKey) throw new Error('No Groq key');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
    body: JSON.stringify({model:GROQ_MODEL,messages:[{role:'user',content:prompt}],temperature:0.3,max_tokens:1024}),
  });
  if (!res.ok) {const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
  return (await res.json())?.choices?.[0]?.message?.content||'';
}

export async function callGemini(apiKey, prompt) {
  if (!apiKey) throw new Error('No Gemini key');
  const res = await fetch(GEMINI_URL(apiKey), {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:1024}}),
  });
  if (!res.ok) {const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text||'';
}

export async function callAI(groqKey, geminiKey, primary, prompt) {
  const order = primary==='groq'
    ? [{key:groqKey,fn:callGroq,name:'Groq'},{key:geminiKey,fn:callGemini,name:'Gemini'}]
    : [{key:geminiKey,fn:callGemini,name:'Gemini'},{key:groqKey,fn:callGroq,name:'Groq'}];
  let lastErr;
  for (const {key,fn,name} of order) {
    if (!key) continue;
    try {return {text:await fn(key,prompt),usedProvider:name};} catch(e){lastErr=e;}
  }
  throw lastErr||new Error('No AI provider configured');
}

export function extractJSON(text) {
  try {
    const m=text.match(/```(?:json)?\s*([\s\S]*?)```/)||text.match(/(\{[\s\S]*\})/);
    return m?JSON.parse(m[1].trim()):JSON.parse(text.trim());
  } catch {return null;}
}
