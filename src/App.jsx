import React, { useState, useEffect, useRef } from "react";

const SUPABASE_URL  = "https://swczwblrtwcyfklhapzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Y3p3YmxydHdjeWZrbGhhcHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjA2ODQsImV4cCI6MjA4ODgzNjY4NH0.9TMDFzKRvisg0_UkxNFvjxmje3prwdwvz-P3H7cLiPY";
const SESSION_KEY = "gi_am_session";

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const auth = {
  signIn: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers:{ apikey:SUPABASE_ANON_KEY, "Content-Type":"application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Credenciais inválidas");
    return data;
  },
  signOut: async (token) => {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method:"POST", headers:{ apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${token}` },
    });
  },
  getUser: async (token) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers:{ apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  },
};

// ─── API ──────────────────────────────────────────────────────────────────────
async function sbFetch(path, options = {}) {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  const token = session?.access_token || SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: { apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${token}`,
      "Content-Type":"application/json", Prefer:options.prefer||"", ...options.headers },
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  getAssets:         () => sbFetch("/gi_am_assets?select=*&order=created_at.desc"),
  getFamilies:       () => sbFetch("/gi_am_families?select=*&order=name.asc"),
  getLocalizacoes:   () => sbFetch("/gi_am_localizacoes?select=*&order=nome.asc"),
  getUtilizadores:   () => sbFetch("/gi_am_utilizadores?select=*&order=nome.asc"),
  addAsset:          (d)    => sbFetch("/gi_am_assets",                   {method:"POST",  prefer:"return=representation", body:JSON.stringify(d)}),
  updateAsset:       (id,d) => sbFetch(`/gi_am_assets?id=eq.${id}`,      {method:"PATCH", prefer:"return=representation", body:JSON.stringify(d)}),
  deleteAsset:       (id)   => sbFetch(`/gi_am_assets?id=eq.${id}`,      {method:"DELETE"}),
  addFamily:         (name) => sbFetch("/gi_am_families",                 {method:"POST",  prefer:"return=representation", body:JSON.stringify({name})}),
  deleteFamily:      (id)   => sbFetch(`/gi_am_families?id=eq.${id}`,    {method:"DELETE"}),
  addLocalizacao:    (nome) => sbFetch("/gi_am_localizacoes",             {method:"POST",  prefer:"return=representation", body:JSON.stringify({nome})}),
  deleteLocalizacao: (id)   => sbFetch(`/gi_am_localizacoes?id=eq.${id}`,{method:"DELETE"}),
  addUtilizador:     (d)    => sbFetch("/gi_am_utilizadores",             {method:"POST",  prefer:"return=representation", body:JSON.stringify(d)}),
  updateUtilizador:  (id,d) => sbFetch(`/gi_am_utilizadores?id=eq.${id}`,{method:"PATCH", prefer:"return=representation", body:JSON.stringify(d)}),
  deleteUtilizador:  (id)   => sbFetch(`/gi_am_utilizadores?id=eq.${id}`,{method:"DELETE"}),
  uploadPhoto: async (file) => {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY)||"null");
    const token = session?.access_token || SUPABASE_ANON_KEY;
    const filename = `${Date.now()}.${file.name.split(".").pop()}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${filename}`, {
      method:"POST", headers:{ apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${token}`, "Content-Type":file.type }, body:file,
    });
    if (!res.ok) throw new Error("Upload falhou");
    return `${SUPABASE_URL}/storage/v1/object/public/photos/${filename}`;
  },
};

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const C = {
  bg:      "#1c2128",
  surf:    "#252d35",
  surf2:   "#2e3740",
  surf3:   "#333F48",   // Cinzento Escuro GI
  border:  "#333F48",
  border2: "#3d4a55",
  yellow:  "#e0cb4b",   // Amarelo GI
  yellowL: "rgba(224,203,75,0.12)",
  gray:    "#8d9190",   // Cinzento GI
  text:    "#f2f3f5",
  textS:   "#8d9190",
  textD:   "#556070",
  red:     "#e05252",
  redL:    "rgba(224,82,82,0.12)",
  green:   "#4cba80",
  greenL:  "rgba(76,186,128,0.12)",
};
const F  = "'Outfit', system-ui, sans-serif";
const FM = "'Outfit', monospace";

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#1c2128"/><rect x="2" y="2" width="28" height="28" rx="5" fill="none" stroke="#e0cb4b" stroke-width="1.5"/><rect x="5" y="5" width="9" height="9" rx="2" fill="none" stroke="#e0cb4b" stroke-width="1.5"/><rect x="7" y="7" width="5" height="5" rx="1" fill="#e0cb4b"/><rect x="18" y="5" width="9" height="9" rx="2" fill="none" stroke="#e0cb4b" stroke-width="1.5"/><rect x="20" y="7" width="5" height="5" rx="1" fill="#e0cb4b"/><rect x="5" y="18" width="9" height="9" rx="2" fill="none" stroke="#e0cb4b" stroke-width="1.5"/><rect x="7" y="20" width="5" height="5" rx="1" fill="#e0cb4b"/><rect x="19" y="18" width="4" height="4" rx="1" fill="#e0cb4b"/><rect x="24" y="18" width="4" height="4" rx="1" fill="#8d9190"/><rect x="19" y="23" width="4" height="4" rx="1" fill="#8d9190"/><rect x="24" y="23" width="4" height="4" rx="1" fill="#e0cb4b"/></svg>`;

const APP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#1c2128"/><rect x="2.5" y="2.5" width="43" height="43" rx="8" fill="none" stroke="#e0cb4b" stroke-width="2"/><rect x="7" y="7" width="13" height="13" rx="3" fill="none" stroke="#e0cb4b" stroke-width="2"/><rect x="10" y="10" width="7" height="7" rx="1.5" fill="#e0cb4b"/><rect x="28" y="7" width="13" height="13" rx="3" fill="none" stroke="#e0cb4b" stroke-width="2"/><rect x="31" y="10" width="7" height="7" rx="1.5" fill="#e0cb4b"/><rect x="7" y="28" width="13" height="13" rx="3" fill="none" stroke="#e0cb4b" stroke-width="2"/><rect x="10" y="31" width="7" height="7" rx="1.5" fill="#e0cb4b"/><rect x="29" y="28" width="6" height="6" rx="1.5" fill="#e0cb4b"/><rect x="37" y="28" width="6" height="6" rx="1.5" fill="#8d9190"/><rect x="29" y="36" width="6" height="6" rx="1.5" fill="#8d9190"/><rect x="37" y="36" width="6" height="6" rx="1.5" fill="#e0cb4b"/></svg>`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{height:100%;-webkit-text-size-adjust:100%}
body{height:100%;min-height:100vh;background:${C.bg};color:${C.text};font-family:${F};font-weight:400;-webkit-font-smoothing:antialiased}
input,select,textarea,button{font-family:${F}}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:${C.border2};border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:${C.textD}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
`;

// ─── BREAKPOINT HOOK ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const PATHS = {
  assets:   "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01 20.73 6.96M12 22.08V12",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  tags:     "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  pin:      "M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6",
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  plus:     "M12 5v14M5 12h14",
  x:        "M18 6L6 18M6 6l12 12",
  search:   "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  edit:     "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  back:     "M19 12H5M12 19l-7-7 7-7",
  logout:   "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  chevR:    "M9 18l6-6-6-6",
  filter:   "M22 3H2l8 9.46V19l4 2v-8.54L22 3",
  grid:     "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  list:     "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
};

const Ico = ({ n, s=20, c="currentColor", w=1.8 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]}/>
  </svg>
);

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name:"", family_id:"", photo_url:"",
  modelo:"", serial:"", cpu:"", memoria:"", hdd:"", gpu:"", so:"",
  ms365:null, localizacao:"",
  monitor_marca:"", monitor_modelo:"", monitor_polegadas:"", monitor_quantidade:"",
  dominio:"", grupo_trabalho:"", observacoes:"", utilizador_id:"",
};

const Avatar = ({ src, name, size=36, round=false }) => {
  const ini = name ? name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() : "?";
  return (
    <div style={{ width:size, height:size, borderRadius:round?"50%":7, overflow:"hidden",
      flexShrink:0, background:C.surf3, border:`1px solid ${C.border2}`,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      {src
        ? <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
        : <span style={{ fontSize:size*.34, fontWeight:600, color:C.yellow }}>{ini}</span>
      }
    </div>
  );
};

const Badge = ({ label }) => (
  <span style={{ padding:"2px 8px", borderRadius:4, background:C.yellowL,
    color:C.yellow, border:`1px solid rgba(224,203,75,0.22)`,
    fontSize:11, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase" }}>
    {label}
  </span>
);

const Spinner = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:64 }}>
    <div style={{ width:28, height:28, border:`2px solid ${C.border2}`, borderTop:`2px solid ${C.yellow}`, borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
  </div>
);

const Toast = ({ msg, type }) => (
  <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", zIndex:9999,
    background:type==="error"?C.red:C.yellow, color:type==="error"?"#fff":C.bg,
    padding:"10px 20px", borderRadius:24, fontSize:13, fontWeight:600,
    boxShadow:"0 4px 20px rgba(0,0,0,0.4)", animation:"fadeUp .2s ease", whiteSpace:"nowrap" }}>
    {type==="error"?"✕  ":"✓  "}{msg}
  </div>
);

const SH = ({ label }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, margin:"20px 0 12px" }}>
    <div style={{ width:3, height:14, background:C.yellow, borderRadius:2, flexShrink:0 }}/>
    <span style={{ fontSize:11, fontWeight:600, color:C.yellow, textTransform:"uppercase", letterSpacing:"0.1em" }}>{label}</span>
    <div style={{ flex:1, height:1, background:`linear-gradient(to right,${C.border2},transparent)` }}/>
  </div>
);

const IS = (err) => ({
  width:"100%", padding:"10px 13px", background:C.surf2,
  border:`1.5px solid ${err?C.red:C.border2}`, borderRadius:8,
  color:C.text, fontSize:14, outline:"none", transition:"border-color .15s",
});
const LS = { display:"block", fontSize:11, fontWeight:600, color:C.textD,
  textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 };

// ─── SIDEBAR (DESKTOP) ────────────────────────────────────────────────────────
const SIDEBAR_W = 220;

function Sidebar({ active, onNav, onLogout }) {
  const items = [
    { id:"assets",   icon:"assets",   label:"Ativos" },
    { id:"settings", icon:"settings", label:"Definições" },
  ];
  return (
    <div style={{ width:SIDEBAR_W, minWidth:SIDEBAR_W, background:C.surf,
      borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column",
      height:"100vh", position:"sticky", top:0, flexShrink:0 }}>

      {/* Logo */}
      <div style={{ padding:"20px 18px 16px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
          <div dangerouslySetInnerHTML={{ __html: APP_ICON_SVG }} style={{ width:36, height:36, flexShrink:0 }}/>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, letterSpacing:"-0.01em", lineHeight:1.1 }}>TechFlow</div>
            <div style={{ fontSize:10, color:C.textS, letterSpacing:"0.06em", marginTop:2 }}>Gráfica Ideal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"10px 10px 0" }}>
        <p style={{ fontSize:10, fontWeight:600, color:C.textD, letterSpacing:"0.12em",
          textTransform:"uppercase", padding:"6px 8px 8px" }}>Menu</p>
        {items.map(item => {
          const active_ = active === item.id;
          return (
            <button key={item.id} onClick={()=>onNav(item.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                padding:"10px 12px", borderRadius:8, border:"none", cursor:"pointer",
                marginBottom:2, textAlign:"left", transition:"all .15s",
                background:active_?C.yellowL:"transparent",
                color:active_?C.yellow:C.textS,
                borderLeft:active_?`3px solid ${C.yellow}`:"3px solid transparent" }}
              onMouseEnter={e=>{ if(!active_){ e.currentTarget.style.background=C.surf2; e.currentTarget.style.color=C.text; }}}
              onMouseLeave={e=>{ if(!active_){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.textS; }}}>
              <Ico n={item.icon} s={18} c={active_?C.yellow:C.textS}/>
              <span style={{ fontSize:14, fontWeight:active_?600:400 }}>{item.label}</span>
              {active_ && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:C.yellow }}/>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:"10px 10px 16px", borderTop:`1px solid ${C.border}` }}>
        <button onClick={onLogout}
          style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
            padding:"10px 12px", borderRadius:8, border:"none", cursor:"pointer",
            background:"transparent", color:C.textS, textAlign:"left", transition:"all .15s" }}
          onMouseEnter={e=>{ e.currentTarget.style.background=C.redL; e.currentTarget.style.color=C.red; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.textS; }}>
          <Ico n="logout" s={17} c="currentColor"/>
          <span style={{ fontSize:14, fontWeight:400 }}>Sair</span>
        </button>
        <p style={{ fontSize:10, color:C.textD, padding:"8px 12px 0", letterSpacing:"0.06em" }}>v2.0 · 2025</p>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV (MOBILE) ──────────────────────────────────────────────────────
function BottomNav({ active, onNav }) {
  const items = [
    { id:"assets",   icon:"assets",   label:"Ativos" },
    { id:"settings", icon:"settings", label:"Definições" },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:200,
      background:C.surf, borderTop:`1px solid ${C.border}`,
      display:"flex", paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
      {items.map(item => {
        const active_ = active === item.id;
        return (
          <button key={item.id} onClick={()=>onNav(item.id)}
            style={{ flex:1, padding:"10px 0 8px", border:"none", cursor:"pointer",
              background:"transparent", display:"flex", flexDirection:"column",
              alignItems:"center", gap:3, color:active_?C.yellow:C.textS,
              position:"relative", transition:"color .15s" }}>
            {active_ && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
              width:24, height:2, background:C.yellow, borderRadius:"0 0 2px 2px" }}/>}
            <Ico n={item.icon} s={22} c={active_?C.yellow:C.textS}/>
            <span style={{ fontSize:10, fontWeight:active_?600:400 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function TopBar({ title, onBack, action, isMobile }) {
  return (
    <div style={{ position:"sticky", top:0, zIndex:100, background:C.surf,
      borderBottom:`1px solid ${C.border}`, height:60,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 24px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {onBack && (
          <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer",
            padding:6, borderRadius:8, color:C.yellow, display:"flex", alignItems:"center",
            marginLeft:-6 }}>
            <Ico n="back" s={20} c={C.yellow}/>
          </button>
        )}
        <h1 style={{ fontSize:isMobile?17:20, fontWeight:700, color:C.text, letterSpacing:"-0.01em" }}>{title}</h1>
      </div>
      {action && <div style={{ display:"flex", alignItems:"center", gap:8 }}>{action}</div>}
    </div>
  );
}

// ─── MODAL / SHEET ────────────────────────────────────────────────────────────
// Desktop: centrado; Mobile: bottom sheet
function Modal({ onClose, children, title, isMobile }) {
  if (isMobile) {
    return (
      <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
        onClick={onClose}>
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(3px)" }}/>
        <div style={{ position:"relative", background:C.surf, borderRadius:"18px 18px 0 0",
          maxHeight:"92vh", display:"flex", flexDirection:"column", animation:"slideUp .25s ease",
          paddingBottom:"env(safe-area-inset-bottom,16px)" }}
          onClick={e=>e.stopPropagation()}>
          <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
            <div style={{ width:36, height:4, background:C.border2, borderRadius:2 }}/>
          </div>
          {title && (
            <div style={{ padding:"4px 20px 14px", display:"flex", alignItems:"center",
              justifyContent:"space-between", borderBottom:`1px solid ${C.border}` }}>
              <h2 style={{ fontSize:17, fontWeight:700, color:C.text }}>{title}</h2>
              <button onClick={onClose} style={{ background:C.surf2, border:`1px solid ${C.border2}`,
                color:C.textS, borderRadius:8, width:30, height:30, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Ico n="x" s={14}/>
              </button>
            </div>
          )}
          <div style={{ overflowY:"auto", flex:1 }}>{children}</div>
        </div>
      </div>
    );
  }
  // Desktop modal
  return (
    <div style={{ position:"fixed", inset:0, zIndex:500,
      background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      animation:"fadeIn .2s" }}
      onClick={onClose}>
      <div style={{ background:C.surf, borderRadius:12, width:"100%", maxWidth:620,
        border:`1px solid ${C.border}`, boxShadow:"0 24px 60px rgba(0,0,0,0.5)",
        overflow:"hidden", maxHeight:"88vh", display:"flex", flexDirection:"column",
        animation:"fadeUp .2s ease" }}
        onClick={e=>e.stopPropagation()}>
        {title && (
          <div style={{ padding:"18px 24px 14px", borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:C.surf3, flexShrink:0 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:C.text }}>{title}</h2>
            <button onClick={onClose} style={{ background:"transparent", border:`1px solid ${C.border2}`,
              color:C.textS, borderRadius:6, width:30, height:30, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ico n="x" s={14}/>
            </button>
          </div>
        )}
        <div style={{ overflowY:"auto", flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── ASSET FORM ───────────────────────────────────────────────────────────────
function AssetForm({ asset, families, localizacoes, utilizadores, onSave, onClose, showToast, isMobile }) {
  const [form,      setForm]      = useState({...EMPTY_FORM, family_id:families[0]?.id||"", ...asset});
  const [preview,   setPreview]   = useState(asset?.photo_url||null);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [errors,    setErrors]    = useState({});
  const fileRef = useRef();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handlePhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); r.onload = ev => setPreview(ev.target.result); r.readAsDataURL(file);
    setUploading(true);
    try { const url = await api.uploadPhoto(file); set("photo_url", url); }
    catch { showToast("Erro no upload","error"); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.name.trim()) { setErrors({name:true}); return; }
    setSaving(true);
    try {
      const p = {
        name:form.name, family_id:form.family_id||null, photo_url:form.photo_url||null,
        modelo:form.modelo||null, serial:form.serial||null, cpu:form.cpu||null,
        memoria:form.memoria||null, hdd:form.hdd||null, gpu:form.gpu||null, so:form.so||null,
        ms365:form.ms365===true?true:form.ms365===false?false:null,
        localizacao:form.localizacao||null,
        monitor_marca:form.monitor_marca||null, monitor_modelo:form.monitor_modelo||null,
        monitor_polegadas:form.monitor_polegadas||null, monitor_quantidade:form.monitor_quantidade||null,
        dominio:form.dominio||null, grupo_trabalho:form.grupo_trabalho||null,
        observacoes:form.observacoes||null, utilizador_id:form.utilizador_id||null,
      };
      const res = asset?.id ? await api.updateAsset(asset.id, p) : await api.addAsset(p);
      onSave(res[0]);
    } catch(err) { showToast("Erro: "+(err.message||""),"error"); }
    finally { setSaving(false); }
  };

  const iP = (k) => ({
    value:form[k]||"", onChange:e=>set(k,e.target.value),
    style:IS(errors[k]),
    onFocus:e=>e.target.style.borderColor=C.yellow,
    onBlur:e=>e.target.style.borderColor=errors[k]?C.red:C.border2,
  });

  const padding = isMobile ? "16px 20px 24px" : "20px 24px 24px";
  const gridCols = isMobile ? "1fr" : "1fr 1fr";

  const content = (
    <div style={{ padding }}>
      {/* Foto + Nome */}
      <div style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:16 }}>
        <div style={{ flexShrink:0 }}>
          <div style={{ width:72, height:88, borderRadius:10, overflow:"hidden",
            border:`1.5px dashed ${C.border2}`, background:C.surf2, cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}
            onClick={()=>fileRef.current.click()}>
            {preview
              ? <img src={preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
              : <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.textD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS.assets}/></svg><span style={{ fontSize:9, color:C.textD, fontWeight:600, letterSpacing:"0.1em" }}>FOTO</span></>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }}/>
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
          <div>
            <label style={LS}>Nome / Designação *</label>
            <input {...iP("name")} placeholder="Ex: PC-RECEÇÃO-01"/>
            {errors.name && <span style={{ fontSize:11, color:C.red, marginTop:3, display:"block" }}>Campo obrigatório</span>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:10 }}>
            <div>
              <label style={LS}>Família</label>
              <select value={form.family_id||""} onChange={e=>set("family_id",e.target.value)} style={{ ...IS(), cursor:"pointer" }}>
                <option value="">— Sem família —</option>
                {families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Atribuído a</label>
              <select value={form.utilizador_id||""} onChange={e=>set("utilizador_id",e.target.value)} style={{ ...IS(), cursor:"pointer" }}>
                <option value="">— Não atribuído —</option>
                {utilizadores.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <SH label="Computador"/>
      <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:10 }}>
        {[
          { k:"modelo",  l:"Modelo",            full:true,  ph:"Ex: HP EliteBook 840 G9" },
          { k:"serial",  l:"Número de Série",   full:true,  ph:"Ex: 5CG24818B4" },
          { k:"cpu",     l:"CPU",               full:false, ph:"Ex: Intel Core i7-1255U" },
          { k:"memoria", l:"Memória RAM",        full:false, ph:"Ex: 16GB DDR5" },
          { k:"hdd",     l:"HDD / SSD",          full:false, ph:"Ex: 512GB NVMe" },
          { k:"gpu",     l:"GPU",               full:false, ph:"Ex: Intel Iris Xe" },
          { k:"so",      l:"Sistema Operativo", full:true,  ph:"Ex: Windows 11 Pro" },
        ].map(f=>(
          <div key={f.k} style={ (!isMobile && f.full) ? {gridColumn:"1/-1"} : {} }>
            <label style={LS}>{f.l}</label>
            <input {...iP(f.k)} placeholder={f.ph}/>
          </div>
        ))}
      </div>

      <SH label="Software"/>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 14px", background:C.surf2, borderRadius:8, border:`1px solid ${C.border}` }}>
        <span style={{ fontSize:14, color:C.textS }}>Microsoft 365</span>
        <div style={{ display:"flex", borderRadius:6, overflow:"hidden", border:`1px solid ${C.border2}` }}>
          {[["true","Sim",C.green,C.greenL],["false","Não",C.red,C.redL],["null","N/D",C.textD,C.surf3]].map(([val,label,col,bg])=>{
            const active = String(form.ms365)===val;
            return (
              <button key={val} onClick={()=>set("ms365",val==="true"?true:val==="false"?false:null)}
                style={{ padding:"6px 14px", border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                  letterSpacing:"0.04em", transition:"all .15s",
                  background:active?bg:C.surf2, color:active?col:C.textD }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <SH label="Localização"/>
      <select value={form.localizacao||""} onChange={e=>set("localizacao",e.target.value)}
        style={{ ...IS(), cursor:"pointer" }}>
        <option value="">— Selecionar —</option>
        {localizacoes.map(l=><option key={l.id} value={l.nome}>{l.nome}</option>)}
      </select>

      <SH label="Monitor"/>
      <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:10 }}>
        {[
          { k:"monitor_marca",     l:"Marca",     ph:"Ex: LG" },
          { k:"monitor_modelo",    l:"Modelo",    ph:"Ex: 27UK850" },
          { k:"monitor_polegadas", l:"Polegadas", ph:"27\"" },
          { k:"monitor_quantidade",l:"Qtd.",      ph:"1" },
        ].map(f=>(
          <div key={f.k}>
            <label style={LS}>{f.l}</label>
            <input {...iP(f.k)} placeholder={f.ph}/>
          </div>
        ))}
      </div>

      <SH label="Rede"/>
      <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:10 }}>
        {[
          { k:"dominio",        l:"Domínio",           ph:"empresa.local" },
          { k:"grupo_trabalho", l:"Grupo de Trabalho", ph:"WORKGROUP" },
        ].map(f=>(
          <div key={f.k}>
            <label style={LS}>{f.l}</label>
            <input {...iP(f.k)} placeholder={f.ph}/>
          </div>
        ))}
      </div>

      <SH label="Observações"/>
      <textarea value={form.observacoes||""} onChange={e=>set("observacoes",e.target.value)} rows={3}
        placeholder="Notas adicionais..." style={{ ...IS(), resize:"vertical", lineHeight:1.6 }}
        onFocus={e=>e.target.style.borderColor=C.yellow}
        onBlur={e=>e.target.style.borderColor=C.border2}/>

      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:10,
          border:`1.5px solid ${C.border2}`, background:"transparent", color:C.textS,
          cursor:"pointer", fontSize:14, fontWeight:600 }}>Cancelar</button>
        <button onClick={submit} disabled={saving||uploading} style={{ flex:2, padding:"11px",
          borderRadius:10, border:"none", background:C.yellow, color:C.bg,
          cursor:"pointer", fontSize:14, fontWeight:700, opacity:saving?0.7:1, transition:"opacity .2s" }}>
          {saving?"A guardar...": asset?.id?"Guardar Alterações":"Adicionar Ativo"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal onClose={onClose} title={asset?.id?"Editar Ativo":"Novo Ativo"} isMobile={isMobile}>
      {content}
    </Modal>
  );
}

// ─── ASSET DETAIL ─────────────────────────────────────────────────────────────
// Desktop: painel deslizante lateral; Mobile: página própria
function AssetDetail({ asset, families, utilizadores, onEdit, onDelete, onClose, isMobile }) {
  const familyName = families.find(f=>f.id===asset.family_id)?.name||null;
  const utilizador = utilizadores?.find(u=>u.id===asset.utilizador_id)||null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const Row = ({ label, value, mono }) => !value ? null : (
    <div style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
      <span style={{ fontSize:11, fontWeight:600, color:C.textD, textTransform:"uppercase",
        letterSpacing:"0.08em", minWidth:110, flexShrink:0, paddingTop:1 }}>{label}</span>
      <span style={{ fontSize:13, color:C.text, fontFamily:mono?FM:F, fontWeight:400, lineHeight:1.4 }}>{value}</span>
    </div>
  );

  const sections = [
    { title:"Computador", rows:[["Modelo",asset.modelo],["Nº Série",asset.serial,true],["CPU",asset.cpu],["RAM",asset.memoria],["HDD / SSD",asset.hdd],["GPU",asset.gpu],["S.O.",asset.so]] },
    { title:"Software",   rows:[["Microsoft 365",asset.ms365===true?"Sim":asset.ms365===false?"Não":null]] },
    { title:"Monitor",    rows:[["Marca",asset.monitor_marca],["Modelo",asset.monitor_modelo],["Polegadas",asset.monitor_polegadas],["Qtd.",asset.monitor_quantidade]] },
    { title:"Rede",       rows:[["Domínio",asset.dominio],["Grupo de Trabalho",asset.grupo_trabalho]] },
  ];

  const content = (
    <>
      {/* Identificação */}
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`,
        display:"flex", gap:14, alignItems:"flex-start" }}>
        <div style={{ width:72, height:88, borderRadius:8, overflow:"hidden",
          border:`1px solid ${C.border2}`, background:C.surf2, flexShrink:0 }}>
          {asset.photo_url
            ? <img src={asset.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
            : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Avatar name={asset.name} size={48}/>
              </div>
          }
        </div>
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:C.text, letterSpacing:"-0.01em", marginBottom:8 }}>{asset.name}</h2>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
            {familyName && <Badge label={familyName}/>}
            {asset.localizacao && <span style={{ fontSize:12, color:C.textS }}>📍 {asset.localizacao}</span>}
          </div>
        </div>
      </div>

      {/* Atribuído a */}
      <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, background:C.surf2 }}>
        <p style={{ fontSize:10, fontWeight:600, color:C.yellow, textTransform:"uppercase",
          letterSpacing:"0.1em", marginBottom:8 }}>Atribuído a</p>
        {utilizador ? (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Avatar src={utilizador.photo_url} name={utilizador.nome} size={36} round/>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{utilizador.nome}</div>
              {utilizador.email && <div style={{ fontSize:12, color:C.textS, marginTop:1 }}>{utilizador.email}</div>}
              {utilizador.telefone && <div style={{ fontSize:11, color:C.textD }}>{utilizador.telefone}</div>}
            </div>
          </div>
        ) : <span style={{ fontSize:13, color:C.textD, fontStyle:"italic" }}>Não atribuído</span>}
      </div>

      {/* Secções */}
      <div style={{ padding:"4px 20px 20px" }}>
        {sections.map(sec => {
          const hasData = sec.rows.some(([,v])=>v!=null&&v!==false&&v!=="");
          if (!hasData) return null;
          return (
            <div key={sec.title}>
              <SH label={sec.title}/>
              {sec.rows.map(([label,value,mono])=> value!=null&&value!==""&&value!==false
                ? <Row key={label} label={label} value={String(value)} mono={mono}/> : null)}
            </div>
          );
        })}
        {asset.observacoes && (
          <>
            <SH label="Observações"/>
            <p style={{ fontSize:13, color:C.textS, lineHeight:1.8, padding:"10px 13px",
              background:C.surf2, borderRadius:8, border:`1px solid ${C.border}` }}>
              {asset.observacoes}
            </p>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`,
        display:"flex", gap:8, background:C.surf3, flexShrink:0 }}>
        <button onClick={onEdit} style={{ flex:1, padding:"9px", borderRadius:8,
          background:C.surf2, border:`1px solid ${C.border2}`, color:C.textS,
          cursor:"pointer", fontSize:12, fontWeight:600, letterSpacing:"0.03em",
          display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          <Ico n="edit" s={13} c={C.textS}/> Editar
        </button>
        <button onClick={()=>setConfirmDelete(true)} style={{ flex:1, padding:"9px", borderRadius:8,
          background:C.redL, border:`1px solid rgba(224,82,82,0.3)`, color:C.red,
          cursor:"pointer", fontSize:12, fontWeight:600, letterSpacing:"0.03em",
          display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          <Ico n="trash" s={13} c={C.red}/> Remover
        </button>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <Modal onClose={()=>setConfirmDelete(false)} isMobile={isMobile}>
          <div style={{ padding:"28px 24px", textAlign:"center" }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:C.redL,
              border:`1px solid ${C.red}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <Ico n="trash" s={20} c={C.red}/>
            </div>
            <h3 style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:8 }}>Remover Ativo</h3>
            <p style={{ fontSize:13, color:C.textS, lineHeight:1.7, marginBottom:22 }}>
              Tens a certeza que queres remover<br/>
              <strong style={{ color:C.text }}>{asset.name}</strong>?<br/>
              <span style={{ fontSize:11, color:C.textD }}>Esta ação não pode ser desfeita.</span>
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setConfirmDelete(false)} style={{ flex:1, padding:"11px",
                borderRadius:10, border:`1.5px solid ${C.border2}`, background:"transparent",
                color:C.textS, cursor:"pointer", fontSize:14, fontWeight:600 }}>Cancelar</button>
              <button onClick={onDelete} style={{ flex:1, padding:"11px", borderRadius:10,
                border:"none", background:C.red, color:"#fff",
                cursor:"pointer", fontSize:14, fontWeight:700 }}>Remover</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );

  if (isMobile) {
    // Mobile: full page
    return (
      <div style={{ position:"fixed", inset:0, zIndex:300, background:C.bg, overflowY:"auto",
        animation:"slideIn .2s ease" }}>
        <TopBar title={asset.name} onBack={onClose} isMobile={isMobile}
          action={
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={onEdit} style={{ background:C.surf2, border:`1px solid ${C.border2}`,
                color:C.textS, borderRadius:7, padding:"6px 10px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:500 }}>
                <Ico n="edit" s={14} c={C.textS}/> Editar
              </button>
            </div>
          }/>
        {content}
      </div>
    );
  }

  // Desktop: slide-in panel
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300,
      background:"rgba(0,0,0,0.4)", animation:"fadeIn .2s" }}
      onClick={onClose}>
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:400, background:C.surf,
        borderLeft:`1px solid ${C.border}`, display:"flex", flexDirection:"column",
        animation:"slideIn .22s ease", overflowY:"hidden" }}
        onClick={e=>e.stopPropagation()}>
        {/* Panel header */}
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background:C.surf3, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:3, height:16, background:C.yellow, borderRadius:2 }}/>
            <span style={{ fontSize:11, fontWeight:600, color:C.yellow,
              textTransform:"uppercase", letterSpacing:"0.12em" }}>Detalhe do Ativo</span>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:`1px solid ${C.border2}`,
            color:C.textS, borderRadius:6, width:28, height:28, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Ico n="x" s={13}/>
          </button>
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>{content}</div>
      </div>
    </div>
  );
}

// ─── ASSETS PAGE ──────────────────────────────────────────────────────────────
function AssetsPage({ assets, families, localizacoes, utilizadores, loading, onSaveAsset, onDeleteAsset, showToast, isMobile }) {
  const [search,       setSearch]       = useState("");
  const [filterFamily, setFilterFamily] = useState("all");
  const [view,         setView]         = useState("list");
  const [editingAsset, setEditingAsset] = useState(null);
  const [detailAsset,  setDetailAsset]  = useState(null);
  const [showForm,     setShowForm]     = useState(false);
  const [showFilter,   setShowFilter]   = useState(false);

  const getFamilyName = id => families.find(f=>f.id===id)?.name||"—";

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const ms = !q || [a.name,a.serial,a.localizacao,a.modelo].some(v=>v?.toLowerCase().includes(q));
    const mf = filterFamily==="all" || a.family_id===filterFamily;
    return ms && mf;
  });

  const handleSave = (saved) => {
    onSaveAsset(saved, editingAsset);
    setShowForm(false); setEditingAsset(null);
    showToast(editingAsset?"Ativo atualizado.":"Ativo adicionado.");
  };

  const handleDelete = async (asset) => {
    await onDeleteAsset(asset);
    setDetailAsset(null);
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
      <TopBar title="TechFlow" isMobile={isMobile}
        action={
          <>
            {!isMobile && (
              <div style={{ display:"flex", border:`1px solid ${C.border2}`, borderRadius:6, overflow:"hidden" }}>
                {[["list","list"],["grid","grid"]].map(([v,icon])=>(
                  <button key={v} onClick={()=>setView(v)}
                    style={{ padding:"6px 10px", border:"none", cursor:"pointer",
                      background:view===v?C.yellowL:C.surf2, color:view===v?C.yellow:C.textD,
                      display:"flex", alignItems:"center", transition:"all .15s" }}>
                    <Ico n={icon} s={15} c={view===v?C.yellow:C.textD}/>
                  </button>
                ))}
              </div>
            )}
            <button onClick={()=>{ setEditingAsset(null); setShowForm(true); }}
              style={{ background:C.yellow, border:"none", color:C.bg,
                borderRadius:8, padding:isMobile?"7px 14px":"8px 18px", cursor:"pointer",
                fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:5,
                transition:"opacity .15s" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <Ico n="plus" s={15} c={C.bg}/> Novo Ativo
            </button>
          </>
        }/>

      {/* Toolbar */}
      <div style={{ padding:"12px 24px 8px", background:C.surf,
        borderBottom:`1px solid ${C.border}`, display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ flex:1, position:"relative" }}>
          <div style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
            <Ico n="search" s={15} c={C.textD}/>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Pesquisar ativos..."
            style={{ ...IS(), paddingLeft:34, fontSize:13 }}
            onFocus={e=>e.target.style.borderColor=C.yellow}
            onBlur={e=>e.target.style.borderColor=C.border2}/>
        </div>
        {!isMobile && (
          <select value={filterFamily} onChange={e=>setFilterFamily(e.target.value)}
            style={{ ...IS(), width:"auto", minWidth:160, cursor:"pointer", fontSize:13 }}>
            <option value="all">Todas as famílias</option>
            {families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        {isMobile && (
          <button onClick={()=>setShowFilter(true)} style={{ background:C.surf2, border:`1px solid ${C.border2}`,
            color:C.textS, borderRadius:8, padding:"9px 12px", cursor:"pointer", display:"flex", alignItems:"center" }}>
            <Ico n="filter" s={17} c={C.textS}/>
          </button>
        )}
        <span style={{ fontSize:11, color:C.textD, whiteSpace:"nowrap", flexShrink:0 }}>
          {filtered.length} reg.
        </span>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:isMobile?"12px 16px":"20px 24px" }}>
        {loading ? <Spinner/> : filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <Ico n="assets" s={48} c={C.border2}/>
            <p style={{ marginTop:14, fontSize:15, color:C.textS, fontWeight:500 }}>Nenhum ativo encontrado</p>
          </div>
        ) : view==="list" || isMobile ? (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filtered.map((asset,i) => {
              const utilizador = utilizadores.find(u=>u.id===asset.utilizador_id)||null;
              return (
                <div key={asset.id} onClick={()=>setDetailAsset(asset)}
                  style={{ background:C.surf, borderRadius:10, border:`1px solid ${C.border}`,
                    padding:"12px 14px", display:"flex", gap:12, alignItems:"center",
                    cursor:"pointer", transition:"border-color .15s",
                    animation:`fadeUp .25s ease ${Math.min(i,.8)*.04}s both` }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.yellow}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  <Avatar src={asset.photo_url} name={asset.name} size={42}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:3 }}>{asset.name}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                      {asset.family_id && <Badge label={getFamilyName(asset.family_id)}/>}
                      {asset.modelo && <span style={{ fontSize:12, color:C.textS }}>{asset.modelo}</span>}
                    </div>
                    {asset.localizacao && <div style={{ fontSize:11, color:C.textD, marginTop:3 }}>📍 {asset.localizacao}</div>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
                    {utilizador && <Avatar src={utilizador.photo_url} name={utilizador.nome} size={24} round/>}
                    {!isMobile && (
                      <div style={{ display:"flex", gap:5 }} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>{ setEditingAsset(asset); setShowForm(true); }}
                          style={{ background:C.surf2, border:`1px solid ${C.border2}`, color:C.textS,
                            borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex" }}>
                          <Ico n="edit" s={13}/>
                        </button>
                        <button onClick={()=>{ setDetailAsset(asset); }}
                          style={{ background:C.surf3, border:`1px solid ${C.border2}`, color:C.textS,
                            borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex" }}>
                          <Ico n="chevR" s={13}/>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Desktop grid
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
            {filtered.map((asset,i) => {
              const utilizador = utilizadores.find(u=>u.id===asset.utilizador_id)||null;
              return (
                <div key={asset.id} onClick={()=>setDetailAsset(asset)}
                  style={{ background:C.surf, borderRadius:10, border:`1px solid ${C.border}`,
                    overflow:"hidden", cursor:"pointer", transition:"border-color .2s, transform .2s",
                    animation:`fadeUp .25s ease ${Math.min(i,.8)*.04}s both` }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.yellow; e.currentTarget.style.transform="translateY(-2px)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform="translateY(0)"; }}>
                  <div style={{ height:100, background:C.surf2, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                    {asset.photo_url
                      ? <img src={asset.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
                      : <Avatar name={asset.name} size={44}/>
                    }
                    {asset.family_id && <div style={{ position:"absolute", top:6, right:6 }}><Badge label={getFamilyName(asset.family_id)}/></div>}
                  </div>
                  <div style={{ padding:"10px 12px" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:2 }}>{asset.name}</div>
                    {asset.modelo && <div style={{ fontSize:11, color:C.textS }}>{asset.modelo}</div>}
                    {utilizador && (
                      <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:7,
                        paddingTop:7, borderTop:`1px solid ${C.border}` }}>
                        <Avatar src={utilizador.photo_url} name={utilizador.nome} size={16} round/>
                        <span style={{ fontSize:10, color:C.textS }}>{utilizador.nome}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail */}
      {detailAsset && (
        <AssetDetail asset={assets.find(a=>a.id===detailAsset.id)||detailAsset}
          families={families} utilizadores={utilizadores} isMobile={isMobile}
          onEdit={()=>{ setEditingAsset(assets.find(a=>a.id===detailAsset.id)||detailAsset); setShowForm(true); setDetailAsset(null); }}
          onDelete={()=>handleDelete(detailAsset)}
          onClose={()=>setDetailAsset(null)}/>
      )}

      {/* Form */}
      {showForm && (
        <AssetForm asset={editingAsset} families={families} localizacoes={localizacoes}
          utilizadores={utilizadores} onSave={handleSave} isMobile={isMobile}
          onClose={()=>{ setShowForm(false); setEditingAsset(null); }} showToast={showToast}/>
      )}

      {/* Mobile filter sheet */}
      {showFilter && (
        <Modal onClose={()=>setShowFilter(false)} title="Filtros" isMobile={true}>
          <div style={{ padding:"16px 20px 24px" }}>
            <label style={LS}>Família</label>
            <select value={filterFamily} onChange={e=>{ setFilterFamily(e.target.value); setShowFilter(false); }}
              style={{ ...IS(), cursor:"pointer", marginBottom:14 }}>
              <option value="all">Todas as famílias</option>
              {families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button onClick={()=>{ setFilterFamily("all"); setShowFilter(false); }}
              style={{ width:"100%", padding:"12px", borderRadius:10, border:`1.5px solid ${C.border2}`,
                background:"transparent", color:C.textS, cursor:"pointer", fontSize:14, fontWeight:600 }}>
              Limpar Filtros
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage({ families, localizacoes, utilizadores, onUpdate, showToast, onLogout, isMobile }) {
  const [section, setSection] = useState(null);
  const [showUForm, setShowUForm] = useState(false);
  const [editingU, setEditingU] = useState(null);
  const [uForm, setUForm] = useState({ nome:"", email:"", telefone:"", photo_url:"" });
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [addErr, setAddErr] = useState("");
  const fileRef = useRef();

  const currentList = section==="families" ? families : section==="localizacoes" ? localizacoes : [];
  const nameKey = section==="families" ? "name" : "nome";

  const addItem = async () => {
    if (!newVal.trim()) { setAddErr("Campo obrigatório"); return; }
    if (currentList.find(i=>i[nameKey].toLowerCase()===newVal.trim().toLowerCase())) { setAddErr("Já existe"); return; }
    try {
      if (section==="families") {
        const res = await api.addFamily(newVal.trim()); onUpdate("families",[...families,res[0]]);
      } else {
        const res = await api.addLocalizacao(newVal.trim()); onUpdate("localizacoes",[...localizacoes,res[0]]);
      }
      setNewVal(""); setAddErr(""); showToast("Adicionado.");
    } catch { showToast("Erro ao adicionar","error"); }
  };

  const removeItem = async (item) => {
    try {
      if (section==="families") { await api.deleteFamily(item.id); onUpdate("families",families.filter(f=>f.id!==item.id)); }
      else { await api.deleteLocalizacao(item.id); onUpdate("localizacoes",localizacoes.filter(l=>l.id!==item.id)); }
      showToast("Removido.");
    } catch { showToast("Erro","error"); }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); r.onload = ev => setPreview(ev.target.result); r.readAsDataURL(file);
    setUploading(true);
    try { const url = await api.uploadPhoto(file); setUForm(f=>({...f,photo_url:url})); }
    catch { showToast("Erro no upload","error"); }
    finally { setUploading(false); }
  };

  const saveU = async () => {
    if (!uForm.nome.trim()) { showToast("Nome obrigatório","error"); return; }
    setSaving(true);
    try {
      const payload = { nome:uForm.nome, email:uForm.email||null, telefone:uForm.telefone||null, photo_url:uForm.photo_url||null };
      if (editingU) {
        const res = await api.updateUtilizador(editingU.id, payload);
        onUpdate("utilizadores", utilizadores.map(u=>u.id===editingU.id?res[0]:u));
      } else {
        const res = await api.addUtilizador(payload);
        onUpdate("utilizadores", [...utilizadores, res[0]]);
      }
      setShowUForm(false); setEditingU(null);
      showToast(editingU?"Utilizador atualizado.":"Utilizador adicionado.");
    } catch(err) { showToast("Erro: "+(err.message||""),"error"); }
    finally { setSaving(false); }
  };

  const openAddU  = () => { setUForm({nome:"",email:"",telefone:"",photo_url:""}); setPreview(null); setEditingU(null); setShowUForm(true); };
  const openEditU = u => { setUForm({nome:u.nome||"",email:u.email||"",telefone:u.telefone||"",photo_url:u.photo_url||""}); setPreview(u.photo_url||null); setEditingU(u); setShowUForm(true); };
  const removeU = async (u) => {
    try { await api.deleteUtilizador(u.id); onUpdate("utilizadores",utilizadores.filter(x=>x.id!==u.id)); showToast("Removido."); }
    catch { showToast("Erro","error"); }
  };

  const MENU = [
    { id:"families",     label:"Famílias",    count:families.length },
    { id:"localizacoes", label:"Localizações",count:localizacoes.length },
    { id:"utilizadores", label:"Utilizadores",count:utilizadores.length },
  ];

  const padding = isMobile ? "16px" : "20px 24px";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
      <TopBar title={section ? MENU.find(m=>m.id===section)?.label||"Definições" : "Definições"}
        isMobile={isMobile}
        onBack={section?()=>{ setSection(null); setNewVal(""); setAddErr(""); }:undefined}/>

      <div style={{ flex:1, overflowY:"auto", padding }}>
        {!section ? (
          <>
            {MENU.map((item,i) => (
              <div key={item.id} onClick={()=>setSection(item.id)}
                style={{ background:C.surf, borderRadius:10, border:`1px solid ${C.border}`,
                  padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center",
                  justifyContent:"space-between", cursor:"pointer",
                  animation:`fadeUp .2s ease ${i*.06}s both` }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.border2}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{item.label}</div>
                  <div style={{ fontSize:12, color:C.textS, marginTop:2 }}>{item.count} registo(s)</div>
                </div>
                <Ico n="chevR" s={16} c={C.textD}/>
              </div>
            ))}
            <button onClick={onLogout}
              style={{ width:"100%", marginTop:16, padding:"13px", borderRadius:10,
                background:C.redL, border:`1px solid rgba(224,82,82,0.22)`,
                color:C.red, cursor:"pointer", fontSize:14, fontWeight:600,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <Ico n="logout" s={17} c={C.red}/> Sair
            </button>
          </>
        ) : section==="utilizadores" ? (
          <>
            <button onClick={openAddU} style={{ width:"100%", padding:"11px", borderRadius:10,
              background:C.yellow, border:"none", color:C.bg, cursor:"pointer",
              fontSize:14, fontWeight:700, marginBottom:12,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Ico n="plus" s={16} c={C.bg}/> Adicionar Utilizador
            </button>
            {utilizadores.map(u=>(
              <div key={u.id} style={{ background:C.surf, borderRadius:10, border:`1px solid ${C.border}`,
                padding:"11px 13px", marginBottom:7, display:"flex", alignItems:"center", gap:11 }}>
                <Avatar src={u.photo_url} name={u.nome} size={40} round/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{u.nome}</div>
                  {u.email && <div style={{ fontSize:12, color:C.textS }}>{u.email}</div>}
                  {u.telefone && <div style={{ fontSize:11, color:C.textD }}>{u.telefone}</div>}
                </div>
                <div style={{ display:"flex", gap:5 }}>
                  <button onClick={()=>openEditU(u)} style={{ background:C.surf2, border:`1px solid ${C.border2}`,
                    color:C.textS, borderRadius:7, padding:"6px", cursor:"pointer", display:"flex" }}>
                    <Ico n="edit" s={14} c={C.textS}/>
                  </button>
                  <button onClick={()=>removeU(u)} style={{ background:C.redL, border:"none",
                    color:C.red, borderRadius:7, padding:"6px", cursor:"pointer", display:"flex" }}>
                    <Ico n="trash" s={14} c={C.red}/>
                  </button>
                </div>
              </div>
            ))}
            {showUForm && (
              <Modal onClose={()=>{ setShowUForm(false); setEditingU(null); }}
                title={editingU?"Editar Utilizador":"Novo Utilizador"} isMobile={isMobile}>
                <div style={{ padding:"16px 20px 24px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                    <div style={{ width:56, height:56, borderRadius:"50%", overflow:"hidden",
                      border:`2px dashed ${C.border2}`, background:C.surf2, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
                      onClick={()=>fileRef.current.click()}>
                      {preview ? <img src={preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <Ico n="users" s={22} c={C.textD}/>}
                    </div>
                    <div>
                      <button onClick={()=>fileRef.current.click()} disabled={uploading}
                        style={{ padding:"7px 12px", borderRadius:7, background:C.surf3,
                          border:`1px solid ${C.border2}`, color:C.textS, cursor:"pointer", fontSize:12 }}>
                        {uploading?"A carregar...":"Escolher imagem"}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }}/>
                    </div>
                  </div>
                  {[{k:"nome",l:"Nome *",ph:"Ex: João Silva",type:"text"},{k:"email",l:"Email",ph:"joao@empresa.pt",type:"email"},{k:"telefone",l:"Telefone",ph:"+351 912 345 678",type:"text"}].map(f=>(
                    <div key={f.k} style={{ marginBottom:11 }}>
                      <label style={LS}>{f.l}</label>
                      <input type={f.type} value={uForm[f.k]} onChange={e=>setUForm(x=>({...x,[f.k]:e.target.value}))}
                        placeholder={f.ph} style={IS()}
                        onFocus={e=>e.target.style.borderColor=C.yellow}
                        onBlur={e=>e.target.style.borderColor=C.border2}/>
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:10, marginTop:16 }}>
                    <button onClick={()=>{ setShowUForm(false); setEditingU(null); }}
                      style={{ flex:1, padding:"11px", borderRadius:10, border:`1.5px solid ${C.border2}`,
                        background:"transparent", color:C.textS, cursor:"pointer", fontSize:14, fontWeight:600 }}>Cancelar</button>
                    <button onClick={saveU} disabled={saving||uploading}
                      style={{ flex:2, padding:"11px", borderRadius:10, border:"none",
                        background:C.yellow, color:C.bg, cursor:"pointer", fontSize:14, fontWeight:700, opacity:saving?0.7:1 }}>
                      {saving?"A guardar...":editingU?"Guardar":"Adicionar"}
                    </button>
                  </div>
                </div>
              </Modal>
            )}
          </>
        ) : (
          // Famílias / Localizações
          <>
            <div style={{ display:"flex", gap:10, marginBottom:8 }}>
              <input value={newVal} onChange={e=>{ setNewVal(e.target.value); setAddErr(""); }}
                onKeyDown={e=>e.key==="Enter"&&addItem()}
                placeholder={section==="families"?"Ex: Computador":"Ex: Gabinete Informática"}
                style={{ ...IS(!!addErr), flex:1, fontSize:13 }}
                onFocus={e=>e.target.style.borderColor=C.yellow}
                onBlur={e=>e.target.style.borderColor=addErr?C.red:C.border2}/>
              <button onClick={addItem} style={{ padding:"10px 18px", borderRadius:8,
                background:C.yellow, border:"none", color:C.bg, cursor:"pointer",
                fontWeight:700, fontSize:16, flexShrink:0 }}>+</button>
            </div>
            {addErr && <p style={{ color:C.red, fontSize:12, marginBottom:10 }}>{addErr}</p>}
            {currentList.map(item=>(
              <div key={item.id} style={{ background:C.surf, borderRadius:9, border:`1px solid ${C.border}`,
                padding:"12px 13px", marginBottom:7, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:14, color:C.text }}>{item[nameKey]}</span>
                <button onClick={()=>removeItem(item)} style={{ background:C.redL, border:"none",
                  color:C.red, borderRadius:7, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                  Remover
                </button>
              </div>
            ))}
            {currentList.length===0 && (
              <p style={{ textAlign:"center", color:C.textD, fontSize:13, padding:"32px 0" }}>Nenhum registo.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email,    setEmail]    = useState("sergiohenriques@graficaideal.pt");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const submit = async () => {
    if (!email||!password) { setError("Preenche o email e a password."); return; }
    setLoading(true); setError("");
    try {
      const session = await auth.signIn(email, password);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onLogin(session);
    } catch(err) { setError(err.message||"Email ou password incorretos."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", fontFamily:F, padding:"24px 20px" }}>
      <style>{CSS}</style>

      {/* Logo */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, marginBottom:36 }}>
        <div dangerouslySetInnerHTML={{ __html: APP_ICON_SVG }} style={{ width:60, height:60 }}/>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28, fontWeight:700, color:C.text, letterSpacing:"-0.02em", lineHeight:1 }}>TechFlow</div>
          <div style={{ fontSize:12, color:C.textS, letterSpacing:"0.06em", marginTop:5 }}>Gráfica Ideal</div>
        </div>
      </div>

      {/* Card */}
      <div style={{ background:C.surf, borderRadius:20, width:"100%", maxWidth:400,
        border:`1px solid ${C.border}`, boxShadow:"0 20px 60px rgba(0,0,0,0.4)",
        overflow:"hidden", animation:"fadeUp .3s ease" }}>
        <div style={{ padding:"24px 24px 8px" }}>
          <h2 style={{ fontSize:22, fontWeight:700, color:C.text, letterSpacing:"-0.01em" }}>Entrar</h2>
          <p style={{ fontSize:13, color:C.textS, marginTop:4 }}>Acesso restrito a utilizadores autorizados.</p>
        </div>
        <div style={{ padding:"16px 24px 28px", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={LS}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="utilizador@graficaideal.pt"
              style={IS(!!error)} onFocus={e=>e.target.style.borderColor=C.yellow}
              onBlur={e=>e.target.style.borderColor=error?C.red:C.border2}/>
          </div>
          <div>
            <label style={LS}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••"
              style={IS(!!error)} onFocus={e=>e.target.style.borderColor=C.yellow}
              onBlur={e=>e.target.style.borderColor=error?C.red:C.border2}/>
          </div>
          {error && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 13px",
              background:C.redL, borderRadius:10, border:`1px solid rgba(224,82,82,0.3)` }}>
              <Ico n="x" s={13} c={C.red}/>
              <span style={{ fontSize:13, color:C.red }}>{error}</span>
            </div>
          )}
          <button onClick={submit} disabled={loading}
            style={{ width:"100%", padding:"13px", borderRadius:12, border:"none",
              background:C.yellow, color:C.bg, cursor:"pointer", fontSize:15, fontWeight:700,
              opacity:loading?0.7:1, transition:"opacity .2s", marginTop:2 }}>
            {loading?"A entrar...":"Entrar"}
          </button>
        </div>
      </div>

      <p style={{ marginTop:28, fontSize:11, color:C.textD, letterSpacing:"0.08em" }}>
        TechFlow · GI · {new Date().getFullYear()}
      </p>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [session,      setSession]      = useState(() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)||"null"); } catch { return null; } });
  const [authChecking, setAuthChecking] = useState(true);
  const [assets,       setAssets]       = useState([]);
  const [families,     setFamilies]     = useState([]);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("assets");
  const [toast,        setToast]        = useState(null);
  const isMobile = useIsMobile();

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null), 2800); };

  // Favicon + title
  useEffect(() => {
    document.title = "TechFlow · GI";
    const b64 = btoa(unescape(encodeURIComponent(FAVICON)));
    const link = document.querySelector("link[rel*='icon']") || document.createElement("link");
    link.type = "image/svg+xml"; link.rel = "icon";
    link.href = `data:image/svg+xml;base64,${b64}`;
    if (!document.querySelector("link[rel*='icon']")) document.head.appendChild(link);
  }, []);

  // Auth check
  useEffect(() => {
    (async () => {
      const stored = JSON.parse(localStorage.getItem(SESSION_KEY)||"null");
      if (!stored?.access_token) { setSession(null); setAuthChecking(false); setLoading(false); return; }
      const user = await auth.getUser(stored.access_token);
      if (!user) { localStorage.removeItem(SESSION_KEY); setSession(null); setAuthChecking(false); setLoading(false); return; }
      setSession(stored); setAuthChecking(false);
    })();
  }, []);

  // Load data
  useEffect(() => {
    if (!session) return;
    Promise.all([api.getAssets(), api.getFamilies(), api.getLocalizacoes(), api.getUtilizadores()])
      .then(([a,f,l,u]) => { setAssets(a||[]); setFamilies(f||[]); setLocalizacoes(l||[]); setUtilizadores(u||[]); })
      .catch(err => showToast("Erro ao carregar: "+(err.message||""),"error"))
      .finally(() => setLoading(false));
  }, [session]);

  const handleLogout = async () => {
    if (session?.access_token) await auth.signOut(session.access_token);
    localStorage.removeItem(SESSION_KEY);
    setSession(null); setAssets([]); setFamilies([]); setLocalizacoes([]); setUtilizadores([]);
  };

  const handleSaveAsset = (saved, wasEditing) => {
    setAssets(prev => wasEditing ? prev.map(a=>a.id===saved.id?saved:a) : [saved,...prev]);
  };

  const handleDeleteAsset = async (asset) => {
    try { await api.deleteAsset(asset.id); setAssets(prev=>prev.filter(a=>a.id!==asset.id)); showToast("Ativo removido."); }
    catch { showToast("Erro ao remover","error"); }
  };

  const handleSettingsUpdate = (type, updated) => {
    if (type==="families") setFamilies(updated);
    else if (type==="localizacoes") setLocalizacoes(updated);
    else if (type==="utilizadores") setUtilizadores(updated);
  };

  // Guards
  if (authChecking) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{CSS}</style><Spinner/>
    </div>
  );
  if (!session) return <Login onLogin={s=>setSession(s)}/>;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:F, overflow:"hidden" }}>
      <style>{CSS}</style>

      {/* Desktop sidebar */}
      {!isMobile && <Sidebar active={tab} onNav={setTab} onLogout={handleLogout}/>}

      {/* Main content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden",
        paddingBottom: isMobile ? 60 : 0 }}>
        {tab==="assets" && (
          <AssetsPage
            assets={assets} families={families} localizacoes={localizacoes}
            utilizadores={utilizadores} loading={loading} isMobile={isMobile}
            onSaveAsset={handleSaveAsset} onDeleteAsset={handleDeleteAsset}
            showToast={showToast}/>
        )}
        {tab==="settings" && (
          <SettingsPage
            families={families} localizacoes={localizacoes} utilizadores={utilizadores}
            onUpdate={handleSettingsUpdate} showToast={showToast}
            onLogout={handleLogout} isMobile={isMobile}/>
        )}
      </div>

      {/* Mobile bottom nav */}
      {isMobile && <BottomNav active={tab} onNav={setTab}/>}

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}