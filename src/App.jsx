import React, { useState, useEffect, useRef } from "react";

const SUPABASE_URL  = "https://swczwblrtwcyfklhapzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Y3p3YmxydHdjeWZrbGhhcHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjA2ODQsImV4cCI6MjA4ODgzNjY4NH0.9TMDFzKRvisg0_UkxNFvjxmje3prwdwvz-P3H7cLiPY";
const PIN_KEY         = "gi_am_pin";
const PIN_ENABLED_KEY = "gi_am_pin_enabled";
const DEFAULT_PIN     = "0501";

// ─── API ──────────────────────────────────────────────────────────────────────
async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: { apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${SUPABASE_ANON_KEY}`,
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
  updateFamily:      (id,d) => sbFetch(`/gi_am_families?id=eq.${id}`,    {method:"PATCH", prefer:"return=representation", body:JSON.stringify(d)}),
  deleteFamily:      (id)   => sbFetch(`/gi_am_families?id=eq.${id}`,    {method:"DELETE"}),
  addLocalizacao:    (nome) => sbFetch("/gi_am_localizacoes",             {method:"POST",  prefer:"return=representation", body:JSON.stringify({nome})}),
  deleteLocalizacao: (id)   => sbFetch(`/gi_am_localizacoes?id=eq.${id}`,{method:"DELETE"}),
  getMarcas:         ()     => sbFetch("/gi_am_marcas?select=*&order=nome.asc"),
  addMarca:          (nome) => sbFetch("/gi_am_marcas",                   {method:"POST",  prefer:"return=representation", body:JSON.stringify({nome})}),
  deleteMarca:       (id)   => sbFetch(`/gi_am_marcas?id=eq.${id}`,      {method:"DELETE"}),
  getTarifarios:          ()     => sbFetch("/gi_am_tarifarios?select=*&order=nome.asc"),
  addTarifario:           (nome) => sbFetch("/gi_am_tarifarios",                        {method:"POST",  prefer:"return=representation", body:JSON.stringify({nome})}),
  deleteTarifario:        (id)   => sbFetch(`/gi_am_tarifarios?id=eq.${id}`,           {method:"DELETE"}),
  getSistemasOperativos:  ()     => sbFetch("/gi_am_sistemas_operativos?select=*&order=nome.asc"),
  addSistemaOperativo:    (nome) => sbFetch("/gi_am_sistemas_operativos",               {method:"POST",  prefer:"return=representation", body:JSON.stringify({nome})}),
  deleteSistemaOperativo: (id)   => sbFetch(`/gi_am_sistemas_operativos?id=eq.${id}`,  {method:"DELETE"}),
  getAssetsWithSO:        (nome) => sbFetch(`/gi_am_assets?so=eq.${encodeURIComponent(nome)}&select=id,name`),
  addUtilizador:     (d)    => sbFetch("/gi_am_utilizadores",             {method:"POST",  prefer:"return=representation", body:JSON.stringify(d)}),
  updateUtilizador:  (id,d) => sbFetch(`/gi_am_utilizadores?id=eq.${id}`,{method:"PATCH", prefer:"return=representation", body:JSON.stringify(d)}),
  deleteUtilizador:  (id)   => sbFetch(`/gi_am_utilizadores?id=eq.${id}`,{method:"DELETE"}),
  uploadPhoto: async (file) => {
    const filename = `${Date.now()}.${file.name.split(".").pop()}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${filename}`, {
      method:"POST", headers:{ apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${SUPABASE_ANON_KEY}`, "Content-Type":file.type }, body:file,
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

const SECTIONS = [
  { id:"credenciais",      label:"Credenciais" },
  { id:"localizacao",      label:"Localização" },
  { id:"computador",       label:"Hardware" },
  { id:"software",         label:"Software" },
  { id:"monitor",          label:"Monitor" },
  { id:"rede",             label:"Rede" },
  { id:"dados_principais", label:"Dados Principais" },
  { id:"equipamento",      label:"Equipamento" },
  { id:"tarifario",        label:"Tarifário" },
  { id:"observacoes",      label:"Observações" },
];

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><style>.s{stroke:#333F48}@media(prefers-color-scheme:dark){.s{stroke:#f2f3f5}}</style><rect class="s" x="12" y="14" width="40" height="26" rx="8" stroke-width="3"/><circle cx="32" cy="27" r="3" fill="#8d9190"/><path d="M18 46C24 40,40 52,46 46" stroke="#e0cb4b" stroke-width="3" stroke-linecap="round"/></svg>`;

const APP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="12" y="14" width="40" height="26" rx="8" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="27" r="3" fill="#8d9190"/><path d="M18 46C24 40,40 52,46 46" stroke="#e0cb4b" stroke-width="3" stroke-linecap="round"/></svg>`;

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
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
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
  check:    "M20 6L9 17l-5-5",
  list:     "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  copy:     "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
  eye:      "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7M12 15a3 3 0 100-6 3 3 0 000 6",
  eyeOff:   "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
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
  credentials:[],
  // Smartphone
  telefone_numero:"",
  equip_marca:"", equip_modelo:"", equip_serial:"", equip_imei1:"", equip_imei2:"",
  equip_data_compra:"", equip_data_entrega:"",
  tarif_nome:"", tarif_cartao:"", tarif_pin:"", tarif_puk:"", tarif_plafond:"",
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
const SIDEBAR_W = 160;

function Sidebar({ active, onNav, onLock }) {
  const items = [
    { id:"assets",   icon:"assets",   label:"Ativos" },
    { id:"settings", icon:"settings", label:"Definições" },
  ];
  return (
    <div style={{ width:SIDEBAR_W, minWidth:SIDEBAR_W, background:C.surf,
      borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column",
      height:"100vh", position:"sticky", top:0, flexShrink:0 }}>

      {/* Logo */}
      <div style={{ padding:"16px 14px 14px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div dangerouslySetInnerHTML={{ __html: APP_ICON_SVG }} style={{ width:34, height:34, flexShrink:0 }}/>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, letterSpacing:"-0.01em", lineHeight:1.1 }}>TechFlow</div>
            <div style={{ fontSize:10, fontWeight:700, color:C.yellow, letterSpacing:"0.08em", marginTop:2 }}>GI</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"10px 8px 0" }}>
        <p style={{ fontSize:10, fontWeight:600, color:C.textD, letterSpacing:"0.12em",
          textTransform:"uppercase", padding:"4px 6px 8px" }}>Menu</p>
        {items.map(item => {
          const active_ = active === item.id;
          return (
            <button key={item.id} onClick={()=>onNav(item.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:9,
                padding:"9px 10px", borderRadius:8, border:"none", cursor:"pointer",
                marginBottom:2, textAlign:"left", transition:"all .15s",
                background:active_?C.yellowL:"transparent",
                color:active_?C.yellow:C.textS,
                borderLeft:active_?`3px solid ${C.yellow}`:"3px solid transparent" }}
              onMouseEnter={e=>{ if(!active_){ e.currentTarget.style.background=C.surf2; e.currentTarget.style.color=C.text; }}}
              onMouseLeave={e=>{ if(!active_){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.textS; }}}>
              <Ico n={item.icon} s={17} c={active_?C.yellow:"currentColor"}/>
              <span style={{ fontSize:13, fontWeight:active_?600:400 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:"10px 8px 16px", borderTop:`1px solid ${C.border}` }}>
        {localStorage.getItem(PIN_ENABLED_KEY)!=="false" && (
          <button onClick={onLock}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:9,
              padding:"9px 10px", borderRadius:8, border:"none", cursor:"pointer",
              background:"transparent", color:C.textS, textAlign:"left", transition:"all .15s" }}
            onMouseEnter={e=>{ e.currentTarget.style.background=C.surf2; e.currentTarget.style.color=C.text; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.textS; }}>
            <Ico n="logout" s={16} c="currentColor"/>
            <span style={{ fontSize:13 }}>Bloquear</span>
          </button>
        )}
        <p style={{ fontSize:10, color:C.textD, padding:"6px 10px 0", letterSpacing:"0.06em" }}>v2.0 · 2025</p>
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
function Modal({ onClose, children, title, action, isMobile }) {
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
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                {action}
                <button onClick={onClose} style={{ background:C.surf2, border:`1px solid ${C.border2}`,
                  color:C.textS, borderRadius:8, width:30, height:30, cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Ico n="x" s={14}/>
                </button>
              </div>
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
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              {action}
              <button onClick={onClose} style={{ background:"transparent", border:`1px solid ${C.border2}`,
                color:C.textS, borderRadius:6, width:30, height:30, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Ico n="x" s={14}/>
              </button>
            </div>
          </div>
        )}
        <div style={{ overflowY:"auto", flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── ASSET FORM ───────────────────────────────────────────────────────────────
function AssetForm({ asset, families, localizacoes, utilizadores, marcas, tarifarios, sistemasOperativos, onAddMarca, onAddTarifario, onAddSO, onSave, onClose, showToast, isMobile }) {
  const [form,           setForm]           = useState({...EMPTY_FORM, family_id:families[0]?.id||"", ...asset, credentials:asset?.credentials||[]});
  const [preview,        setPreview]        = useState(asset?.photo_url||null);
  const [uploading,      setUploading]      = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [errors,         setErrors]         = useState({});
  const [newMarcaMode,   setNewMarcaMode]   = useState(false);
  const [newMarcaVal,    setNewMarcaVal]    = useState("");
  const [newTarifMode,   setNewTarifMode]   = useState(false);
  const [newTarifVal,    setNewTarifVal]    = useState("");
  const [newSOMode,      setNewSOMode]      = useState(false);
  const [newSOVal,       setNewSOVal]       = useState("");
  const [showPwds,       setShowPwds]       = useState(new Set());
  const [copiedFormCred, setCopiedFormCred] = useState(null);
  const copyFormTimers = useRef({});
  const fileRef = useRef();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const addCred    = () => setForm(f=>({...f, credentials:[...(f.credentials||[]), {label:"",username:"",password:""}]}));
  const removeCred = idx => setForm(f=>({...f, credentials:(f.credentials||[]).filter((_,i)=>i!==idx)}));
  const setCred    = (idx,k,v) => setForm(f=>({...f, credentials:(f.credentials||[]).map((c,i)=>i===idx?{...c,[k]:v}:c)}));
  const toggleShowPwd = idx => setShowPwds(p=>{ const n=new Set(p); n.has(idx)?n.delete(idx):n.add(idx); return n; });
  const copyCredPwd = (idx, pwd) => {
    navigator.clipboard.writeText(pwd).catch(()=>{});
    setCopiedFormCred(idx);
    clearTimeout(copyFormTimers.current[idx]);
    copyFormTimers.current[idx] = setTimeout(()=>{
      navigator.clipboard.writeText("").catch(()=>{});
      setCopiedFormCred(c=>c===idx?null:c);
    }, 10000);
  };

  const saveMarca = async () => {
    if (!newMarcaVal.trim()) return;
    try {
      const res = await api.addMarca(newMarcaVal.trim());
      onAddMarca(res[0]);
      set("equip_marca", res[0].nome);
      setNewMarcaMode(false); setNewMarcaVal("");
    } catch { showToast("Erro ao criar marca","error"); }
  };

  const saveTarif = async () => {
    if (!newTarifVal.trim()) return;
    try {
      const res = await api.addTarifario(newTarifVal.trim());
      onAddTarifario(res[0]);
      set("tarif_nome", res[0].nome);
      setNewTarifMode(false); setNewTarifVal("");
    } catch { showToast("Erro ao criar tarifário","error"); }
  };

  const saveSO = async () => {
    if (!newSOVal.trim()) return;
    try {
      const res = await api.addSistemaOperativo(newSOVal.trim());
      onAddSO(res[0]);
      set("so", res[0].nome);
      setNewSOMode(false); setNewSOVal("");
    } catch { showToast("Erro ao criar S.O.","error"); }
  };

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
        telefone_numero:form.telefone_numero||null,
        equip_marca:form.equip_marca||null, equip_modelo:form.equip_modelo||null,
        equip_serial:form.equip_serial||null, equip_imei1:form.equip_imei1||null,
        equip_imei2:form.equip_imei2||null,
        equip_data_compra:form.equip_data_compra||null,
        equip_data_entrega:form.equip_data_entrega||null,
        tarif_nome:form.tarif_nome||null, tarif_cartao:form.tarif_cartao||null,
        tarif_pin:form.tarif_pin||null, tarif_puk:form.tarif_puk||null,
        tarif_plafond:form.tarif_plafond||null,
        credentials:(()=>{ const c=(form.credentials||[]).filter(c=>c.username||c.password); return c.length?c:null; })(),
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

  const selectedFamily = families.find(f => f.id === form.family_id);
  const allowedSecs = selectedFamily?.sections ?? SECTIONS.map(s => s.id);
  const showSec = id => !form.family_id || allowedSecs.includes(id);

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

      {/* Sections rendered in family-defined order */}
      {(() => {
        const sectionContent = {
          credenciais: (
            <>
              <SH label="Credenciais"/>
              {(form.credentials||[]).map((cred, idx) => (
                <div key={idx} style={{ background:C.surf2, borderRadius:8, border:`1px solid ${C.border}`, padding:"12px", marginBottom:8 }}>
                  <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:8, marginBottom:8 }}>
                    <div>
                      <label style={LS}>Etiqueta</label>
                      <input value={cred.label||""} onChange={e=>setCred(idx,"label",e.target.value)}
                        placeholder="Ex: Admin" style={IS()}
                        onFocus={e=>e.target.style.borderColor=C.yellow}
                        onBlur={e=>e.target.style.borderColor=C.border2}/>
                    </div>
                    <div>
                      <label style={LS}>Username</label>
                      <input value={cred.username||""} onChange={e=>setCred(idx,"username",e.target.value)}
                        placeholder="Ex: admin@empresa.pt" style={IS()}
                        onFocus={e=>e.target.style.borderColor=C.yellow}
                        onBlur={e=>e.target.style.borderColor=C.border2}/>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                    <div style={{ flex:1 }}>
                      <label style={LS}>Password</label>
                      <div style={{ position:"relative" }}>
                        <input type={showPwds.has(idx)?"text":"password"} value={cred.password||""}
                          onChange={e=>setCred(idx,"password",e.target.value)}
                          placeholder="••••••••" style={{ ...IS(), paddingRight:76 }}
                          onFocus={e=>e.target.style.borderColor=C.yellow}
                          onBlur={e=>e.target.style.borderColor=C.border2}/>
                        <div style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", display:"flex", gap:2 }}>
                          <button type="button" onClick={()=>toggleShowPwd(idx)}
                            style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 5px", borderRadius:4, display:"flex", alignItems:"center" }}>
                            <Ico n={showPwds.has(idx)?"eyeOff":"eye"} s={14} c={C.textD}/>
                          </button>
                          <button type="button" onClick={()=>copyCredPwd(idx, cred.password||"")}
                            title="Copiar password (limpa clipboard em 10s)"
                            style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 5px", borderRadius:4, display:"flex", alignItems:"center" }}>
                            <Ico n="copy" s={14} c={copiedFormCred===idx?C.green:C.textD}/>
                          </button>
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={()=>removeCred(idx)}
                      style={{ padding:"0 10px", height:38, borderRadius:8, border:"none", flexShrink:0,
                        background:C.redL, color:C.red, cursor:"pointer", display:"flex", alignItems:"center" }}>
                      <Ico n="x" s={14} c={C.red}/>
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addCred}
                style={{ width:"100%", padding:"9px", borderRadius:8, border:`1.5px dashed ${C.border2}`,
                  background:"transparent", color:C.textD, cursor:"pointer", fontSize:13, fontWeight:600,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <Ico n="plus" s={14} c={C.textD}/> Adicionar credencial
              </button>
            </>
          ),
          computador: (
            <>
              <SH label="Hardware"/>
              <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:10 }}>
                {[
                  { k:"modelo",  l:"Modelo",          full:true,  ph:"Ex: HP EliteBook 840 G9" },
                  { k:"serial",  l:"Número de Série", full:true,  ph:"Ex: 5CG24818B4" },
                  { k:"cpu",     l:"CPU",             full:false, ph:"Ex: Intel Core i7-1255U" },
                  { k:"memoria", l:"Memória RAM",     full:false, ph:"Ex: 16GB DDR5" },
                  { k:"hdd",     l:"HDD / SSD",       full:false, ph:"Ex: 512GB NVMe" },
                  { k:"gpu",     l:"GPU",             full:false, ph:"Ex: Intel Iris Xe" },
                ].map(f=>(
                  <div key={f.k} style={ (!isMobile && f.full) ? {gridColumn:"1/-1"} : {} }>
                    <label style={LS}>{f.l}</label>
                    <input {...iP(f.k)} placeholder={f.ph}/>
                  </div>
                ))}
              </div>
            </>
          ),
          software: (
            <>
              <SH label="Software"/>
              <div style={{ marginBottom:10 }}>
                <label style={LS}>Sistema Operativo</label>
                {newSOMode ? (
                  <div style={{ display:"flex", gap:8 }}>
                    <input value={newSOVal} onChange={e=>setNewSOVal(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&saveSO()}
                      placeholder="Ex: Windows 11 Pro" autoFocus
                      style={{ ...IS(), flex:1 }}
                      onFocus={e=>e.target.style.borderColor=C.yellow}
                      onBlur={e=>e.target.style.borderColor=C.border2}/>
                    <button onClick={saveSO} style={{ padding:"0 14px", borderRadius:8, border:"none",
                      background:C.yellow, color:C.bg, cursor:"pointer", fontWeight:700, fontSize:13, flexShrink:0 }}>Criar</button>
                    <button onClick={()=>{ setNewSOMode(false); setNewSOVal(""); }}
                      style={{ padding:"0 10px", borderRadius:8, border:`1px solid ${C.border2}`,
                      background:"transparent", color:C.textS, cursor:"pointer", flexShrink:0 }}>✕</button>
                  </div>
                ) : (
                  <select value={form.so||""} onChange={e=>{ if(e.target.value==="__new__"){ setNewSOMode(true); } else { set("so",e.target.value); }}} style={{ ...IS(), cursor:"pointer" }}>
                    <option value="">— Selecionar —</option>
                    {(sistemasOperativos||[]).map(s=><option key={s.id} value={s.nome}>{s.nome}</option>)}
                    <option value="__new__">＋ Adicionar novo S.O....</option>
                  </select>
                )}
              </div>
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
            </>
          ),
          localizacao: (
            <>
              <SH label="Localização"/>
              <select value={form.localizacao||""} onChange={e=>set("localizacao",e.target.value)}
                style={{ ...IS(), cursor:"pointer" }}>
                <option value="">— Selecionar —</option>
                {localizacoes.map(l=><option key={l.id} value={l.nome}>{l.nome}</option>)}
              </select>
            </>
          ),
          monitor: (
            <>
              <SH label="Monitor"/>
              <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:10 }}>
                {[
                  { k:"monitor_marca",      l:"Marca",     ph:"Ex: LG" },
                  { k:"monitor_modelo",     l:"Modelo",    ph:"Ex: 27UK850" },
                  { k:"monitor_polegadas",  l:"Polegadas", ph:"27\"" },
                  { k:"monitor_quantidade", l:"Qtd.",      ph:"1" },
                ].map(f=>(
                  <div key={f.k}>
                    <label style={LS}>{f.l}</label>
                    <input {...iP(f.k)} placeholder={f.ph}/>
                  </div>
                ))}
              </div>
            </>
          ),
          rede: (
            <>
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
            </>
          ),
          dados_principais: (
            <>
              <SH label="Dados Principais"/>
              <div>
                <label style={LS}>Número</label>
                <input {...iP("telefone_numero")} placeholder="Ex: +351 912 345 678"/>
              </div>
            </>
          ),
          equipamento: (
            <>
              <SH label="Equipamento"/>
              <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:10 }}>
                <div style={ !isMobile ? {gridColumn:"1/-1"} : {} }>
                  <label style={LS}>Marca</label>
                  {newMarcaMode ? (
                    <div style={{ display:"flex", gap:8 }}>
                      <input value={newMarcaVal} onChange={e=>setNewMarcaVal(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&saveMarca()}
                        placeholder="Nome da marca..." autoFocus
                        style={{ ...IS(), flex:1 }}
                        onFocus={e=>e.target.style.borderColor=C.yellow}
                        onBlur={e=>e.target.style.borderColor=C.border2}/>
                      <button onClick={saveMarca} style={{ padding:"0 14px", borderRadius:8, border:"none",
                        background:C.yellow, color:C.bg, cursor:"pointer", fontWeight:700, fontSize:13, flexShrink:0 }}>Criar</button>
                      <button onClick={()=>{ setNewMarcaMode(false); setNewMarcaVal(""); }}
                        style={{ padding:"0 10px", borderRadius:8, border:`1px solid ${C.border2}`,
                        background:"transparent", color:C.textS, cursor:"pointer", flexShrink:0 }}>✕</button>
                    </div>
                  ) : (
                    <select value={form.equip_marca||""} onChange={e=>{ if(e.target.value==="__new__"){ setNewMarcaMode(true); } else { set("equip_marca",e.target.value); }}} style={{ ...IS(), cursor:"pointer" }}>
                      <option value="">— Selecionar —</option>
                      {marcas.map(m=><option key={m.id} value={m.nome}>{m.nome}</option>)}
                      <option value="__new__">＋ Criar nova marca...</option>
                    </select>
                  )}
                </div>
                {[
                  { k:"equip_modelo",  l:"Modelo",           ph:"Ex: iPhone 15 Pro" },
                  { k:"equip_serial",  l:"Número de Série",  ph:"Ex: F2LXX1234567" },
                  { k:"equip_imei1",   l:"IMEI 1",           ph:"Ex: 351234567890123" },
                  { k:"equip_imei2",   l:"IMEI 2",           ph:"Ex: 351234567890124" },
                ].map(f=>(
                  <div key={f.k}>
                    <label style={LS}>{f.l}</label>
                    <input {...iP(f.k)} placeholder={f.ph}/>
                  </div>
                ))}
                <div>
                  <label style={LS}>Data de Compra</label>
                  <input type="date" value={form.equip_data_compra||""} onChange={e=>set("equip_data_compra",e.target.value)}
                    style={{ ...IS(), cursor:"pointer", colorScheme:"dark" }}
                    onFocus={e=>e.target.style.borderColor=C.yellow}
                    onBlur={e=>e.target.style.borderColor=C.border2}/>
                </div>
                <div>
                  <label style={LS}>Data de Entrega</label>
                  <input type="date" value={form.equip_data_entrega||""} onChange={e=>set("equip_data_entrega",e.target.value)}
                    style={{ ...IS(), cursor:"pointer", colorScheme:"dark" }}
                    onFocus={e=>e.target.style.borderColor=C.yellow}
                    onBlur={e=>e.target.style.borderColor=C.border2}/>
                </div>
              </div>
            </>
          ),
          tarifario: (
            <>
              <SH label="Tarifário"/>
              <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:10 }}>
                <div style={ !isMobile ? {gridColumn:"1/-1"} : {} }>
                  <label style={LS}>Tarifário</label>
                  {newTarifMode ? (
                    <div style={{ display:"flex", gap:8 }}>
                      <input value={newTarifVal} onChange={e=>setNewTarifVal(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&saveTarif()}
                        placeholder="Nome do tarifário..." autoFocus
                        style={{ ...IS(), flex:1 }}
                        onFocus={e=>e.target.style.borderColor=C.yellow}
                        onBlur={e=>e.target.style.borderColor=C.border2}/>
                      <button onClick={saveTarif} style={{ padding:"0 14px", borderRadius:8, border:"none",
                        background:C.yellow, color:C.bg, cursor:"pointer", fontWeight:700, fontSize:13, flexShrink:0 }}>Criar</button>
                      <button onClick={()=>{ setNewTarifMode(false); setNewTarifVal(""); }}
                        style={{ padding:"0 10px", borderRadius:8, border:`1px solid ${C.border2}`,
                        background:"transparent", color:C.textS, cursor:"pointer", flexShrink:0 }}>✕</button>
                    </div>
                  ) : (
                    <select value={form.tarif_nome||""} onChange={e=>{ if(e.target.value==="__new__"){ setNewTarifMode(true); } else { set("tarif_nome",e.target.value); }}} style={{ ...IS(), cursor:"pointer" }}>
                      <option value="">— Selecionar —</option>
                      {tarifarios.map(t=><option key={t.id} value={t.nome}>{t.nome}</option>)}
                      <option value="__new__">＋ Criar novo tarifário...</option>
                    </select>
                  )}
                </div>
                {[
                  { k:"tarif_cartao",  l:"Nº Cartão",        ph:"Ex: 89351000012345678" },
                  { k:"tarif_pin",     l:"PIN original",     ph:"••••" },
                  { k:"tarif_puk",     l:"PUK",              ph:"Ex: 12345678" },
                  { k:"tarif_plafond", l:"Plafond de Dados", ph:"Ex: 20GB" },
                ].map(f=>(
                  <div key={f.k}>
                    <label style={LS}>{f.l}</label>
                    <input {...iP(f.k)} placeholder={f.ph}/>
                  </div>
                ))}
              </div>
            </>
          ),
          observacoes: (
            <>
              <SH label="Observações"/>
              <textarea value={form.observacoes||""} onChange={e=>set("observacoes",e.target.value)} rows={3}
                placeholder="Notas adicionais..." style={{ ...IS(), resize:"vertical", lineHeight:1.6 }}
                onFocus={e=>e.target.style.borderColor=C.yellow}
                onBlur={e=>e.target.style.borderColor=C.border2}/>
            </>
          ),
        };
        return allowedSecs.map(id =>
          sectionContent[id] ? <React.Fragment key={id}>{sectionContent[id]}</React.Fragment> : null
        );
      })()}

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
    <Modal onClose={onClose} title={asset?.id?"Editar Ativo":"Novo Ativo"} isMobile={isMobile}
      action={
        <button onClick={submit} disabled={saving||uploading} title="Gravar"
          style={{ background:C.yellow, border:"none", color:C.bg, borderRadius:6,
            width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center",
            justifyContent:"center", opacity:(saving||uploading)?0.6:1 }}>
          <Ico n="check" s={14} c={C.bg}/>
        </button>
      }>
      {content}
    </Modal>
  );
}

// ─── ASSET DETAIL ─────────────────────────────────────────────────────────────
// Desktop: painel deslizante lateral; Mobile: página própria
function AssetDetail({ asset, families, utilizadores, onEdit, onDelete, onClose, isMobile }) {
  const family = families.find(f=>f.id===asset.family_id)||null;
  const familyName = family?.name||null;
  const utilizador = utilizadores?.find(u=>u.id===asset.utilizador_id)||null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allowedSecs = family?.sections ?? SECTIONS.map(s=>s.id);
  const showSec = id => allowedSecs.includes(id);

  const [copiedCredIdx, setCopiedCredIdx] = useState(null);
  const credCopyTimer = useRef(null);
  useEffect(() => () => clearTimeout(credCopyTimer.current), []);
  const copyCredDetail = (idx, pwd) => {
    navigator.clipboard.writeText(pwd).catch(()=>{});
    setCopiedCredIdx(idx);
    clearTimeout(credCopyTimer.current);
    credCopyTimer.current = setTimeout(()=>{
      navigator.clipboard.writeText("").catch(()=>{});
      setCopiedCredIdx(null);
    }, 10000);
  };

  const Row = ({ label, value, mono }) => !value ? null : (
    <div style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
      <span style={{ fontSize:11, fontWeight:600, color:C.textD, textTransform:"uppercase",
        letterSpacing:"0.08em", minWidth:110, flexShrink:0, paddingTop:1 }}>{label}</span>
      <span style={{ fontSize:13, color:C.text, fontFamily:mono?FM:F, fontWeight:400, lineHeight:1.4 }}>{value}</span>
    </div>
  );

  const fmtDate = v => { if (!v) return null; const [y,m,d]=v.split("-"); return `${d}/${m}/${y}`; };

  const sectionDefs = {
    localizacao:      { title:"Localização",      rows:[["Localização",asset.localizacao]] },
    computador:       { title:"Hardware",          rows:[["Modelo",asset.modelo],["Nº Série",asset.serial,true],["CPU",asset.cpu],["RAM",asset.memoria],["HDD / SSD",asset.hdd],["GPU",asset.gpu]] },
    software:         { title:"Software",         rows:[["S.O.",asset.so],["Microsoft 365",asset.ms365===true?"Sim":asset.ms365===false?"Não":null]] },
    monitor:          { title:"Monitor",          rows:[["Marca",asset.monitor_marca],["Modelo",asset.monitor_modelo],["Polegadas",asset.monitor_polegadas],["Qtd.",asset.monitor_quantidade]] },
    rede:             { title:"Rede",             rows:[["Domínio",asset.dominio],["Grupo de Trabalho",asset.grupo_trabalho]] },
    dados_principais: { title:"Dados Principais", rows:[["Número",asset.telefone_numero]] },
    equipamento:      { title:"Equipamento",      rows:[["Marca",asset.equip_marca],["Modelo",asset.equip_modelo],["Nº Série",asset.equip_serial,true],["IMEI 1",asset.equip_imei1,true],["IMEI 2",asset.equip_imei2,true],["Data Compra",fmtDate(asset.equip_data_compra)],["Data Entrega",fmtDate(asset.equip_data_entrega)]] },
    tarifario:        { title:"Tarifário",        rows:[["Tarifário",asset.tarif_nome],["Nº Cartão",asset.tarif_cartao,true],["PIN original",asset.tarif_pin,true],["PUK",asset.tarif_puk,true],["Plafond Dados",asset.tarif_plafond]] },
  };

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
            {showSec("localizacao") && asset.localizacao && <span style={{ fontSize:12, color:C.textS }}>📍 {asset.localizacao}</span>}
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

      {/* Secções em ordem definida pela família */}
      <div style={{ padding:"4px 20px 20px" }}>
        {allowedSecs.map(id => {
          if (id === "credenciais") {
            const creds = asset.credentials || [];
            if (!creds.length) return null;
            return (
              <div key={id}>
                <SH label="Credenciais"/>
                {creds.map((cred, idx) => (
                  <div key={idx} style={{ background:C.surf2, borderRadius:8, border:`1px solid ${C.border}`, padding:"12px 14px", marginBottom:8 }}>
                    {cred.label && (
                      <div style={{ fontSize:10, fontWeight:700, color:C.yellow, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                        {cred.label}
                      </div>
                    )}
                    {cred.username && (
                      <div style={{ display:"flex", gap:12, padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
                        <span style={{ fontSize:11, fontWeight:600, color:C.textD, textTransform:"uppercase", letterSpacing:"0.08em", minWidth:80, flexShrink:0 }}>Username</span>
                        <span style={{ fontSize:13, color:C.text, fontFamily:FM }}>{cred.username}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", gap:12, padding:"6px 0", alignItems:"center" }}>
                      <span style={{ fontSize:11, fontWeight:600, color:C.textD, textTransform:"uppercase", letterSpacing:"0.08em", minWidth:80, flexShrink:0 }}>Password</span>
                      <span style={{ fontSize:16, color:C.textD, flex:1, letterSpacing:"0.15em" }}>{"•".repeat(Math.min((cred.password||"").length||8, 12))}</span>
                      {cred.password && (
                        <button onClick={()=>copyCredDetail(idx, cred.password)}
                          style={{ background:copiedCredIdx===idx?C.greenL:C.surf3,
                            border:`1px solid ${copiedCredIdx===idx?C.green:C.border2}`,
                            borderRadius:6, padding:"5px 10px", cursor:"pointer",
                            color:copiedCredIdx===idx?C.green:C.textS, flexShrink:0,
                            display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, transition:"all .2s" }}>
                          <Ico n="copy" s={12} c={copiedCredIdx===idx?C.green:C.textS}/>
                          {copiedCredIdx===idx?"Copiado!":"Copiar"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          if (id === "observacoes") {
            if (!asset.observacoes) return null;
            return (
              <div key={id}>
                <SH label="Observações"/>
                <p style={{ fontSize:13, color:C.textS, lineHeight:1.8, padding:"10px 13px",
                  background:C.surf2, borderRadius:8, border:`1px solid ${C.border}` }}>
                  {asset.observacoes}
                </p>
              </div>
            );
          }
          const def = sectionDefs[id];
          if (!def) return null;
          const hasData = def.rows.some(([,v])=>v!=null&&v!==false&&v!=="");
          if (!hasData) return null;
          return (
            <div key={id}>
              <SH label={def.title}/>
              {def.rows.map(([label,value,mono])=> value!=null&&value!==""&&value!==false
                ? <Row key={label} label={label} value={String(value)} mono={mono}/> : null)}
            </div>
          );
        })}
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

  // Desktop: centered modal
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300,
      background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      animation:"fadeIn .2s" }}
      onClick={onClose}>
      <div style={{ background:C.surf, borderRadius:12, width:"100%", maxWidth:520,
        border:`1px solid ${C.border}`, boxShadow:"0 24px 60px rgba(0,0,0,0.5)",
        overflow:"hidden", maxHeight:"88vh", display:"flex", flexDirection:"column",
        animation:"fadeUp .2s ease" }}
        onClick={e=>e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ padding:"18px 24px 14px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background:C.surf3, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:3, height:16, background:C.yellow, borderRadius:2 }}/>
            <span style={{ fontSize:11, fontWeight:600, color:C.yellow,
              textTransform:"uppercase", letterSpacing:"0.12em" }}>Detalhe do Ativo</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button onClick={onEdit} title="Editar"
              style={{ background:"transparent", border:`1px solid ${C.border2}`,
                color:C.textS, borderRadius:6, width:28, height:28, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ico n="edit" s={13}/>
            </button>
            <button onClick={()=>setConfirmDelete(true)} title="Remover"
              style={{ background:"transparent", border:`1px solid rgba(224,82,82,0.35)`,
                color:C.red, borderRadius:6, width:28, height:28, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ico n="trash" s={13} c={C.red}/>
            </button>
            <button onClick={onClose} title="Fechar"
              style={{ background:"transparent", border:`1px solid ${C.border2}`,
                color:C.textS, borderRadius:6, width:28, height:28, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ico n="x" s={13}/>
            </button>
          </div>
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>{content}</div>
      </div>
    </div>
  );
}

// ─── ASSET TABLE (desktop list) ───────────────────────────────────────────────
const TBL_COL_ORDER   = "gi_am_col_order";
const TBL_COL_WIDTHS  = "gi_am_col_widths_v2";
const TBL_SORT        = "gi_am_col_sort";
const TBL_COL_VISIBLE = "gi_am_col_visible";
const DEFAULT_VISIBLE = ["name","family","modelo","serial","localizacao","so","utilizador"];

const ALL_COLS = [
  // Geral
  { id:"name",            label:"Nome",             section:"base",             defW:220, alwaysOn:true },
  { id:"family",          label:"Família",           section:"base",             defW:130 },
  { id:"utilizador",      label:"Utilizador",        section:"base",             defW:165 },
  // Localização
  { id:"localizacao",     label:"Localização",       section:"localizacao",      defW:155 },
  // Hardware
  { id:"modelo",          label:"Modelo",            section:"computador",       defW:150 },
  { id:"serial",          label:"Nº Série",          section:"computador",       defW:130 },
  { id:"cpu",             label:"CPU",               section:"computador",       defW:140 },
  { id:"memoria",         label:"RAM",               section:"computador",       defW:100 },
  { id:"hdd",             label:"HDD / SSD",         section:"computador",       defW:120 },
  { id:"gpu",             label:"GPU",               section:"computador",       defW:130 },
  // Software
  { id:"so",              label:"S.O.",              section:"software",         defW:110 },
  { id:"ms365",           label:"Microsoft 365",     section:"software",         defW:110 },
  // Monitor
  { id:"monitor_marca",   label:"Monitor (Marca)",   section:"monitor",          defW:130 },
  { id:"monitor_modelo",  label:"Monitor (Modelo)",  section:"monitor",          defW:140 },
  // Rede
  { id:"dominio",         label:"Domínio",           section:"rede",             defW:130 },
  { id:"grupo_trabalho",  label:"Grupo Trabalho",    section:"rede",             defW:130 },
  // Dados Principais
  { id:"telefone_numero", label:"Nº Telefone",       section:"dados_principais", defW:130 },
  // Equipamento
  { id:"equip_marca",     label:"Marca",             section:"equipamento",      defW:120 },
  { id:"equip_modelo",    label:"Modelo (Equip.)",   section:"equipamento",      defW:140 },
  { id:"equip_serial",    label:"Série (Equip.)",    section:"equipamento",      defW:140 },
  { id:"equip_imei1",     label:"IMEI 1",            section:"equipamento",      defW:150 },
  // Tarifário
  { id:"tarif_nome",      label:"Tarifário",         section:"tarifario",        defW:130 },
];

const COL_SECTION_LABELS = {
  base:"Geral", localizacao:"Localização", computador:"Hardware",
  software:"Software", monitor:"Monitor", rede:"Rede",
  dados_principais:"Dados Principais", equipamento:"Equipamento", tarifario:"Tarifário",
};

function AssetTable({ rows, families, utilizadores, onEdit, onDetail }) {
  const getFam  = id => families.find(f=>f.id===id)?.name||"";
  const getUtil = id => utilizadores.find(u=>u.id===id)||null;

  const [visible] = useState(() => {
    try { const s=JSON.parse(localStorage.getItem(TBL_COL_VISIBLE)); if(Array.isArray(s)&&s.length) return new Set(s); } catch {}
    return new Set(DEFAULT_VISIBLE);
  });
  const [order, setOrder] = useState(() => {
    try { const s=JSON.parse(localStorage.getItem(TBL_COL_ORDER)); if(Array.isArray(s)&&s.length) return s; } catch {}
    return DEFAULT_VISIBLE.slice();
  });
  const [widths, setWidths] = useState(() => {
    try { const s=JSON.parse(localStorage.getItem(TBL_COL_WIDTHS)); if(s&&typeof s==="object") return s; } catch {}
    return {};
  });
  const [sort, setSort] = useState(() => {
    try { const s=JSON.parse(localStorage.getItem(TBL_SORT)); if(s) return s; } catch {}
    return { col:"name", dir:"asc" };
  });
  const [dragSrc, setDragSrc] = useState(null);
  const [dragTgt, setDragTgt] = useState(null);

  // Build visible cols: respects drag order; appends any newly-visible cols at end
  const cols = (() => {
    const ordered = order.filter(id => visible.has(id));
    const extra   = [...visible].filter(id => !ordered.includes(id));
    return [...ordered, ...extra].map(id => ALL_COLS.find(c=>c.id===id)).filter(Boolean);
  })();

  // colW returns a flex weight (relative, not pixels) — columns distribute proportionally
  const colW = col => widths[col.id] || col.defW;
  const cs   = w   => ({ flex:`${w} ${w} 0`, minWidth:50, overflow:"hidden", boxSizing:"border-box" });

  const sortVal = (a, col) => {
    if (col==="family")    return getFam(a.family_id).toLowerCase();
    if (col==="utilizador") return getUtil(a.utilizador_id)?.nome?.toLowerCase()||"";
    return (a[col]||"").toLowerCase();
  };
  const sorted = [...rows].sort((a,b) => {
    const va=sortVal(a,sort.col), vb=sortVal(b,sort.col);
    return sort.dir==="asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const doSort = colId => {
    const s = sort.col===colId ? {col:colId,dir:sort.dir==="asc"?"desc":"asc"} : {col:colId,dir:"asc"};
    setSort(s); localStorage.setItem(TBL_SORT, JSON.stringify(s));
  };

  const startResize = (e, colId) => {
    e.preventDefault(); e.stopPropagation();
    const col = ALL_COLS.find(c => c.id === colId);
    const w0  = colW(col);
    const px0 = e.currentTarget.parentElement.getBoundingClientRect().width;
    const x0  = e.clientX;
    const onMove = ev => {
      const newPx = Math.max(50, px0 + ev.clientX - x0);
      setWidths(p => ({...p, [colId]: Math.round(w0 * newPx / px0)}));
    };
    const onUp   = ()  => {
      document.removeEventListener("mousemove",onMove);
      document.removeEventListener("mouseup",onUp);
      setWidths(p => { localStorage.setItem(TBL_COL_WIDTHS,JSON.stringify(p)); return p; });
    };
    document.addEventListener("mousemove",onMove);
    document.addEventListener("mouseup",onUp);
  };

  const dropCol = tgt => {
    if (!dragSrc||dragSrc===tgt) { setDragSrc(null); setDragTgt(null); return; }
    const o=[...order], fi=o.indexOf(dragSrc), ti=o.indexOf(tgt);
    o.splice(fi,1); o.splice(ti,0,dragSrc);
    setOrder(o); localStorage.setItem(TBL_COL_ORDER,JSON.stringify(o));
    setDragSrc(null); setDragTgt(null);
  };

  const txt = (v, mono=false) => (
    <span style={{ fontSize:mono?11:12, fontFamily:mono?FM:undefined, color:mono?C.textD:C.textS,
      display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
      {v||"—"}
    </span>
  );

  const renderCell = (colId, asset) => {
    switch(colId) {
      case "name": return (
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:C.text,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{asset.name}</div>
          {asset.serial && <div style={{ fontSize:10, fontFamily:FM, color:C.textD, marginTop:1,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{asset.serial}</div>}
        </div>
      );
      case "family":
        return asset.family_id
          ? <Badge label={getFam(asset.family_id)}/>
          : <span style={{ fontSize:12, color:C.textD }}>—</span>;
      case "utilizador": {
        const u=getUtil(asset.utilizador_id);
        return u
          ? <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
              <Avatar src={u.photo_url} name={u.nome} size={22} round/>
              <span style={{ fontSize:11, color:C.textS, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.nome}</span>
            </div>
          : <span style={{ fontSize:12, color:C.textD }}>—</span>;
      }
      case "localizacao":
        return <span style={{ fontSize:12, color:C.textD, display:"block",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {asset.localizacao ? `📍 ${asset.localizacao}` : "—"}
        </span>;
      case "modelo":        return txt(asset.modelo);
      case "serial":        return txt(asset.serial, true);
      case "so":            return txt(asset.so);
      case "cpu":           return txt(asset.cpu);
      case "memoria":       return txt(asset.memoria);
      case "hdd":           return txt(asset.hdd);
      case "gpu":           return txt(asset.gpu);
      case "ms365":
        return <span style={{ fontSize:12, color: asset.ms365===true?C.yellow:asset.ms365===false?C.textD:C.textD }}>
          {asset.ms365===true?"Sim":asset.ms365===false?"Não":"—"}
        </span>;
      case "monitor_marca":   return txt(asset.monitor_marca);
      case "monitor_modelo":  return txt(asset.monitor_modelo);
      case "dominio":         return txt(asset.dominio);
      case "grupo_trabalho":  return txt(asset.grupo_trabalho);
      case "telefone_numero": return txt(asset.telefone_numero, true);
      case "equip_marca":     return txt(asset.equip_marca);
      case "equip_modelo":    return txt(asset.equip_modelo);
      case "equip_serial":    return txt(asset.equip_serial, true);
      case "equip_imei1":     return txt(asset.equip_imei1, true);
      case "tarif_nome":      return txt(asset.tarif_nome);
      default: return null;
    }
  };

  return (
    <div style={{ background:C.surf, borderRadius:10, border:`1px solid ${C.border}`, overflow:"hidden" }}>
      <div style={{ width:"100%" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"stretch", background:C.surf3,
          borderBottom:`1px solid ${C.border}` }}>
          <div style={{ flex:"0 0 44px", width:44 }}/>
          {cols.map(col => {
            const w=colW(col), isSort=sort.col===col.id, isDrop=dragTgt===col.id, isDrag=dragSrc===col.id;
            return (
              <div key={col.id}
                draggable
                onDragStart={e=>{ e.dataTransfer.effectAllowed="move"; setDragSrc(col.id); }}
                onDragOver={e=>{ e.preventDefault(); setDragTgt(col.id); }}
                onDrop={()=>dropCol(col.id)}
                onDragEnd={()=>{ setDragSrc(null); setDragTgt(null); }}
                onClick={()=>doSort(col.id)}
                title={`${col.label} — clique para ordenar, arraste para mover`}
                style={{ ...cs(w), position:"relative", display:"flex", alignItems:"center",
                  padding:"8px 20px 8px 8px", cursor:"pointer", userSelect:"none",
                  opacity:isDrag?0.4:1,
                  background:isDrop?C.surf2:isSort?"rgba(224,203,75,0.06)":"transparent",
                  borderLeft:`2px solid ${isDrop?C.yellow:"transparent"}`,
                  transition:"background .1s, opacity .1s" }}>
                <span style={{ fontSize:10, fontWeight:600,
                  color:isSort?C.yellow:C.textD,
                  textTransform:"uppercase", letterSpacing:"0.08em",
                  flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {col.label}
                </span>
                {isSort && <span style={{ fontSize:11, color:C.yellow, marginLeft:2, flexShrink:0 }}>
                  {sort.dir==="asc"?"↑":"↓"}
                </span>}
                {/* Resize handle */}
                <div
                  onMouseDown={e=>startResize(e,col.id)}
                  onClick={e=>e.stopPropagation()}
                  title="Arrastar para redimensionar"
                  style={{ position:"absolute", right:0, top:0, bottom:0, width:5, cursor:"col-resize", zIndex:3 }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.border2}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}/>
              </div>
            );
          })}
          <div style={{ flex:"0 0 76px", width:76 }}/>
        </div>

        {/* ── Rows ── */}
        {sorted.map((asset,i) => (
          <div key={asset.id} onClick={()=>onDetail(asset)}
            style={{ display:"flex", alignItems:"center", cursor:"pointer",
              borderBottom:i<sorted.length-1?`1px solid ${C.border}`:"none",
              transition:"background .12s",
              animation:`fadeUp .2s ease ${Math.min(i,.8)*.03}s both` }}
            onMouseEnter={e=>e.currentTarget.style.background=C.surf2}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{ flex:"0 0 44px", width:44, padding:"8px 6px 8px 14px" }}>
              <Avatar src={asset.photo_url} name={asset.name} size={28}/>
            </div>
            {cols.map(col => (
              <div key={col.id} style={{ ...cs(colW(col)), padding:"8px 8px" }}>
                {renderCell(col.id, asset)}
              </div>
            ))}
            <div style={{ flex:"0 0 76px", width:76, display:"flex", gap:4,
              justifyContent:"flex-end", padding:"8px 10px 8px 0" }}
              onClick={e=>e.stopPropagation()}>
              <button onClick={()=>onEdit(asset)}
                style={{ background:C.surf2, border:`1px solid ${C.border2}`, color:C.textS,
                  borderRadius:6, padding:"5px 7px", cursor:"pointer", display:"flex" }}>
                <Ico n="edit" s={13}/>
              </button>
              <button onClick={()=>onDetail(asset)}
                style={{ background:C.surf3, border:`1px solid ${C.border2}`, color:C.textS,
                  borderRadius:6, padding:"5px 7px", cursor:"pointer", display:"flex" }}>
                <Ico n="chevR" s={13}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ASSETS PAGE ──────────────────────────────────────────────────────────────
function AssetsPage({ assets, families, localizacoes, utilizadores, marcas, tarifarios, sistemasOperativos, onAddMarca, onAddTarifario, onAddSO, loading, onSaveAsset, onDeleteAsset, showToast, isMobile }) {
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
      <TopBar title="Ativos" isMobile={isMobile}
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
          isMobile ? (
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
                    {utilizador && <Avatar src={utilizador.photo_url} name={utilizador.nome} size={24} round/>}
                  </div>
                );
              })}
            </div>
          ) : (
            <AssetTable
              rows={filtered}
              families={families}
              utilizadores={utilizadores}
              onEdit={asset=>{ setEditingAsset(asset); setShowForm(true); }}
              onDetail={setDetailAsset}/>
          )
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
          utilizadores={utilizadores} marcas={marcas} tarifarios={tarifarios}
          sistemasOperativos={sistemasOperativos}
          onAddMarca={onAddMarca} onAddTarifario={onAddTarifario} onAddSO={onAddSO}
          onSave={handleSave} isMobile={isMobile}
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
function SettingsPage({ families, localizacoes, utilizadores, marcas, tarifarios, sistemasOperativos, assets, onUpdate, showToast, onLock, isMobile }) {
  const [section, setSection] = useState(null);
  const [showUForm, setShowUForm] = useState(false);
  const [editingU, setEditingU] = useState(null);
  const [uForm, setUForm] = useState({ nome:"", email:"", telefone:"", photo_url:"" });
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [addErr, setAddErr] = useState("");
  const [editingFamily,  setEditingFamily]  = useState(null);
  const [familySections, setFamilySections] = useState([]);
  const [soDeleteBlock,  setSoDeleteBlock]  = useState(null);
  // Security
  const [pinEnabled,    setPinEnabled]    = useState(() => localStorage.getItem(PIN_ENABLED_KEY) !== "false");
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [cpStep,        setCpStep]        = useState(1);
  const [cpPin1,        setCpPin1]        = useState([]);
  const [cpPin2,        setCpPin2]        = useState([]);
  const [cpShake,       setCpShake]       = useState(false);
  const cpRef = useRef([]);
  const fileRef = useRef();

  const cpPush = d => {
    const cur = cpRef.current;
    if (cur.length >= 4 || cpShake) return;
    const next = [...cur, d];
    cpRef.current = next;
    if (cpStep===1) setCpPin1([...next]); else setCpPin2([...next]);
    if (next.length === 4) {
      if (cpStep===1) {
        cpRef.current=[]; setCpStep(2); setCpPin2([]);
      } else {
        if (cpPin1.join("")===next.join("")) {
          localStorage.setItem(PIN_KEY, next.join(""));
          closeCpModal(); showToast("PIN atualizado.");
        } else {
          setCpShake(true);
          setTimeout(()=>{ cpRef.current=[]; setCpPin2([]); setCpShake(false); }, 700);
        }
      }
    }
  };
  const cpPop = () => { if(cpShake) return; const n=cpRef.current.slice(0,-1); cpRef.current=n; if(cpStep===1) setCpPin1([...n]); else setCpPin2([...n]); };
  const closeCpModal = () => { setShowChangePIN(false); setCpStep(1); setCpPin1([]); setCpPin2([]); cpRef.current=[]; setCpShake(false); };
  const togglePin = val => { setPinEnabled(val); localStorage.setItem(PIN_ENABLED_KEY, val?"true":"false"); showToast(val?"PIN ativado.":"PIN desativado."); };

  const openEditFamily = f => {
    setEditingFamily(f);
    setFamilySections(f.sections ?? SECTIONS.map(s=>s.id));
  };

  const saveFamily = async () => {
    try {
      const res = await api.updateFamily(editingFamily.id, { sections: familySections });
      onUpdate("families", families.map(f => f.id===editingFamily.id ? res[0] : f));
      setEditingFamily(null);
      showToast("Família atualizada.");
    } catch { showToast("Erro ao guardar","error"); }
  };

  const toggleSec = id => setFamilySections(prev =>
    prev.includes(id) ? prev.filter(s=>s!==id) : [...prev, id]
  );
  const moveSec = (id, dir) => setFamilySections(prev => {
    const idx = prev.indexOf(id);
    if (idx === -1) return prev;
    const next = [...prev];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return next;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    return next;
  });

  const currentList = section==="families" ? families : section==="localizacoes" ? localizacoes : section==="marcas" ? marcas : section==="tarifarios" ? tarifarios : section==="sistemas_operativos" ? sistemasOperativos : [];
  const nameKey = section==="families" ? "name" : "nome";

  const addItem = async () => {
    if (!newVal.trim()) { setAddErr("Campo obrigatório"); return; }
    if (currentList.find(i=>i[nameKey].toLowerCase()===newVal.trim().toLowerCase())) { setAddErr("Já existe"); return; }
    try {
      if (section==="families") {
        const res = await api.addFamily(newVal.trim()); onUpdate("families",[...families,res[0]]);
      } else if (section==="localizacoes") {
        const res = await api.addLocalizacao(newVal.trim()); onUpdate("localizacoes",[...localizacoes,res[0]]);
      } else if (section==="marcas") {
        const res = await api.addMarca(newVal.trim()); onUpdate("marcas",[...marcas,res[0]]);
      } else if (section==="tarifarios") {
        const res = await api.addTarifario(newVal.trim()); onUpdate("tarifarios",[...tarifarios,res[0]]);
      } else if (section==="sistemas_operativos") {
        const res = await api.addSistemaOperativo(newVal.trim()); onUpdate("sistemas_operativos",[...sistemasOperativos,res[0]].sort((a,b)=>a.nome.localeCompare(b.nome)));
      }
      setNewVal(""); setAddErr(""); showToast("Adicionado.");
    } catch { showToast("Erro ao adicionar","error"); }
  };

  const removeItem = async (item) => {
    if (section==="sistemas_operativos") {
      try {
        const assocs = await api.getAssetsWithSO(item.nome);
        if (assocs && assocs.length) { setSoDeleteBlock({ item, assets: assocs }); return; }
        await api.deleteSistemaOperativo(item.id);
        onUpdate("sistemas_operativos", sistemasOperativos.filter(s=>s.id!==item.id));
        showToast("Removido.");
      } catch { showToast("Erro","error"); }
      return;
    }
    try {
      if (section==="families") { await api.deleteFamily(item.id); onUpdate("families",families.filter(f=>f.id!==item.id)); }
      else if (section==="localizacoes") { await api.deleteLocalizacao(item.id); onUpdate("localizacoes",localizacoes.filter(l=>l.id!==item.id)); }
      else if (section==="marcas") { await api.deleteMarca(item.id); onUpdate("marcas",marcas.filter(m=>m.id!==item.id)); }
      else if (section==="tarifarios") { await api.deleteTarifario(item.id); onUpdate("tarifarios",tarifarios.filter(t=>t.id!==item.id)); }
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

  const [colVisible, setColVisible] = useState(() => {
    try { const s=JSON.parse(localStorage.getItem(TBL_COL_VISIBLE)); if(Array.isArray(s)&&s.length) return new Set(s); } catch {}
    return new Set(DEFAULT_VISIBLE);
  });

  const toggleCol = id => {
    if (ALL_COLS.find(c=>c.id===id)?.alwaysOn) return;
    setColVisible(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(TBL_COL_VISIBLE, JSON.stringify([...next]));
      return next;
    });
  };

  const MENU = [
    { id:"families",            label:"Famílias",           count:families.length,            sub:null },
    { id:"localizacoes",        label:"Localizações",        count:localizacoes.length,        sub:null },
    { id:"marcas",              label:"Marcas",              count:marcas.length,              sub:null },
    { id:"tarifarios",          label:"Tarifários",          count:tarifarios.length,          sub:null },
    { id:"sistemas_operativos", label:"Sistemas Operativos", count:sistemasOperativos.length,  sub:null },
    { id:"utilizadores",        label:"Utilizadores",        count:utilizadores.length,        sub:null },
    { id:"colunas",      label:"Colunas da Lista", count:null,                sub:"Configurar colunas visíveis" },
    { id:"seguranca",    label:"Segurança",        count:null,                sub:"PIN e acesso" },
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
                  <div style={{ fontSize:12, color:C.textS, marginTop:2 }}>{item.count!==null?`${item.count} registo(s)`:item.sub}</div>
                </div>
                <Ico n="chevR" s={16} c={C.textD}/>
              </div>
            ))}
            {pinEnabled && (
              <button onClick={onLock}
                style={{ width:"100%", marginTop:16, padding:"13px", borderRadius:10,
                  background:C.surf2, border:`1px solid ${C.border2}`,
                  color:C.textS, cursor:"pointer", fontSize:14, fontWeight:600,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <Ico n="logout" s={17} c={C.textS}/> Bloquear
              </button>
            )}
          </>
        ) : section==="colunas" ? (
          <>
            <p style={{ fontSize:13, color:C.textS, marginBottom:16, lineHeight:1.6 }}>
              Seleciona as colunas que aparecem na vista em modo de lista. A coluna <strong style={{ color:C.text }}>Nome</strong> está sempre visível.
            </p>
            {Object.entries(
              ALL_COLS.reduce((acc, col) => {
                if (!acc[col.section]) acc[col.section] = [];
                acc[col.section].push(col);
                return acc;
              }, {})
            ).map(([sec, cols]) => (
              <div key={sec} style={{ marginBottom:18 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.yellow, textTransform:"uppercase",
                  letterSpacing:"0.12em", marginBottom:8 }}>{COL_SECTION_LABELS[sec]||sec}</div>
                {cols.map(col => {
                  const on = colVisible.has(col.id);
                  const locked = !!col.alwaysOn;
                  return (
                    <div key={col.id} onClick={()=>!locked&&toggleCol(col.id)}
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"10px 14px", borderRadius:8, marginBottom:6,
                        border:`1.5px solid ${on?C.yellow:C.border2}`,
                        background:on?C.yellowL:C.surf2,
                        cursor:locked?"default":"pointer", opacity:locked?0.6:1,
                        transition:"all .15s" }}>
                      <span style={{ fontSize:13, fontWeight:on?600:400, color:on?C.yellow:C.text }}>
                        {col.label}
                        {locked && <span style={{ fontSize:10, color:C.textD, marginLeft:6, fontWeight:400 }}>(sempre visível)</span>}
                      </span>
                      <div style={{ width:18, height:18, borderRadius:5,
                        border:`2px solid ${on?C.yellow:C.border2}`,
                        background:on?C.yellow:"transparent",
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {on && <span style={{ color:C.bg, fontSize:11, fontWeight:800 }}>✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        ) : section==="seguranca" ? (
          <>
            {/* PIN toggle */}
            <div style={{ background:C.surf, borderRadius:10, border:`1px solid ${C.border}`,
              padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>Pedir PIN no arranque</div>
                <div style={{ fontSize:12, color:C.textS, marginTop:2 }}>Protege o acesso à aplicação</div>
              </div>
              <div style={{ display:"flex", borderRadius:20, overflow:"hidden", border:`1px solid ${C.border2}` }}>
                {[[true,"Ativo",C.green,C.greenL],[false,"Inativo",C.textD,C.surf3]].map(([val,label,col,bg])=>(
                  <button key={String(val)} onClick={()=>togglePin(val)}
                    style={{ padding:"7px 16px", border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                      background:pinEnabled===val?bg:C.surf2, color:pinEnabled===val?col:C.textD, transition:"all .15s" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Change PIN */}
            <div style={{ background:C.surf, borderRadius:10, border:`1px solid ${C.border}`,
              padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>PIN de acesso</div>
                <div style={{ fontSize:12, color:C.textS, marginTop:2 }}>{"●".repeat(4)}</div>
              </div>
              <button onClick={()=>{ setShowChangePIN(true); setCpStep(1); setCpPin1([]); setCpPin2([]); cpRef.current=[]; }}
                style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${C.border2}`,
                  background:C.surf2, color:C.textS, cursor:"pointer", fontSize:13, fontWeight:600 }}>
                Alterar PIN
              </button>
            </div>

            {/* Change PIN modal */}
            {showChangePIN && (
              <Modal onClose={closeCpModal} title="Alterar PIN" isMobile={isMobile}>
                <div style={{ padding:"16px 20px 28px", display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <p style={{ fontSize:13, color:C.textS, marginBottom:20, textAlign:"center" }}>
                    {cpStep===1?"Introduz o novo PIN":"Confirma o novo PIN"}
                  </p>
                  <div style={{ display:"flex", gap:16, marginBottom:28, animation:cpShake?"shake .55s ease":"none" }}>
                    {[0,1,2,3].map(i => {
                      const cur = cpStep===1?cpPin1:cpPin2;
                      return (
                        <div key={i} style={{ width:13, height:13, borderRadius:"50%", transition:"all .15s",
                          background:i<cur.length?(cpShake?C.red:C.yellow):"transparent",
                          border:`2px solid ${i<cur.length?(cpShake?C.red:C.yellow):C.border2}` }}/>
                      );
                    })}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,60px)", gap:10 }}>
                    {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((n,i)=>n===""?<div key={i}/>:(
                      <button key={i} onClick={()=>n==="⌫"?cpPop():cpPush(n)}
                        style={{ width:60, height:60, borderRadius:"50%", border:`1.5px solid ${C.border2}`,
                          background:C.surf2, color:n==="⌫"?C.textS:C.text,
                          fontSize:n==="⌫"?18:22, fontWeight:500, cursor:"pointer", fontFamily:F,
                          display:"flex", alignItems:"center", justifyContent:"center", transition:"all .1s" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.yellow;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border2;}}>
                        {n}
                      </button>
                    ))}
                  </div>
                  {cpShake && <p style={{ marginTop:16, fontSize:13, color:C.red, fontWeight:600 }}>Os PINs não coincidem</p>}
                  <button onClick={closeCpModal} style={{ marginTop:20, padding:"10px 24px", borderRadius:10,
                    border:`1.5px solid ${C.border2}`, background:"transparent", color:C.textS,
                    cursor:"pointer", fontSize:14, fontWeight:600 }}>Cancelar</button>
                </div>
              </Modal>
            )}
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
                placeholder={section==="families"?"Ex: Computador":section==="marcas"?"Ex: Apple":section==="tarifarios"?"Ex: NOS Empresas 20GB":"Ex: Gabinete Informática"}
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
                <div>
                  <span style={{ fontSize:14, color:C.text }}>{item[nameKey]}</span>
                  {section==="families" && (
                    <div style={{ fontSize:11, color:C.textD, marginTop:2 }}>
                      {(item.sections ?? SECTIONS.map(s=>s.id)).map(id => SECTIONS.find(s=>s.id===id)?.label).filter(Boolean).join(", ") || "Sem secções"}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {section==="families" && (
                    <button onClick={()=>openEditFamily(item)} style={{ background:C.surf2, border:`1px solid ${C.border2}`,
                      color:C.textS, borderRadius:7, padding:"5px 10px", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                      Secções
                    </button>
                  )}
                  <button onClick={()=>removeItem(item)} style={{ background:C.redL, border:"none",
                    color:C.red, borderRadius:7, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
            {currentList.length===0 && (
              <p style={{ textAlign:"center", color:C.textD, fontSize:13, padding:"32px 0" }}>Nenhum registo.</p>
            )}
            {soDeleteBlock && (
              <Modal onClose={()=>setSoDeleteBlock(null)} title="Não é possível remover" isMobile={isMobile}>
                <div style={{ padding:"20px 24px 24px" }}>
                  <p style={{ fontSize:13, color:C.textS, lineHeight:1.7, marginBottom:14 }}>
                    O sistema operativo <strong style={{ color:C.yellow }}>"{soDeleteBlock.item.nome}"</strong> está associado {soDeleteBlock.assets.length===1?"ao seguinte ativo":"aos seguintes ativos"}:
                  </p>
                  <div style={{ background:C.surf2, borderRadius:8, border:`1px solid ${C.border}`, overflow:"hidden", marginBottom:20 }}>
                    {soDeleteBlock.assets.map((a,i) => (
                      <div key={a.id} style={{ padding:"10px 14px", fontSize:13, color:C.text, fontWeight:500,
                        borderBottom:i<soDeleteBlock.assets.length-1?`1px solid ${C.border}`:"none" }}>
                        {a.name}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize:12, color:C.textD, marginBottom:18, lineHeight:1.6 }}>
                    Para eliminar este S.O., primeiro remove-o dos ativos acima.
                  </p>
                  <button onClick={()=>setSoDeleteBlock(null)} style={{ width:"100%", padding:"11px", borderRadius:10,
                    border:"none", background:C.yellow, color:C.bg, cursor:"pointer", fontSize:14, fontWeight:700 }}>
                    Entendido
                  </button>
                </div>
              </Modal>
            )}
            {editingFamily && (
              <Modal onClose={()=>setEditingFamily(null)} title={`Secções · ${editingFamily.name}`} isMobile={isMobile}>
                <div style={{ padding:"16px 20px 24px" }}>
                  <p style={{ fontSize:13, color:C.textS, marginBottom:4 }}>
                    Ativa/desativa e ordena as secções desta família. A ordem aqui definida é a ordem de apresentação nos detalhes do ativo.
                  </p>
                  {familySections.length > 0 && (
                    <p style={{ fontSize:11, color:C.textD, marginBottom:14 }}>Secções ativas — usa ↑ ↓ para reordenar</p>
                  )}
                  {/* Enabled sections in order */}
                  {familySections.map((id, idx) => {
                    const s = SECTIONS.find(sec=>sec.id===id);
                    if (!s) return null;
                    return (
                      <div key={id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                        <div onClick={()=>toggleSec(id)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-between",
                          padding:"10px 14px", borderRadius:8, cursor:"pointer",
                          border:`1.5px solid ${C.yellow}`, background:C.yellowL, transition:"all .15s" }}>
                          <span style={{ fontSize:14, fontWeight:600, color:C.yellow }}>{s.label}</span>
                          <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${C.yellow}`,
                            background:C.yellow, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <span style={{ color:C.bg, fontSize:11, fontWeight:800 }}>✓</span>
                          </div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          <button onClick={()=>moveSec(id,-1)} disabled={idx===0}
                            style={{ width:28, height:28, borderRadius:6, border:`1px solid ${C.border2}`,
                              background:C.surf2, color:idx===0?C.textD:C.yellow, cursor:idx===0?"default":"pointer",
                              display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>↑</button>
                          <button onClick={()=>moveSec(id,1)} disabled={idx===familySections.length-1}
                            style={{ width:28, height:28, borderRadius:6, border:`1px solid ${C.border2}`,
                              background:C.surf2, color:idx===familySections.length-1?C.textD:C.yellow,
                              cursor:idx===familySections.length-1?"default":"pointer",
                              display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>↓</button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Disabled sections */}
                  {SECTIONS.filter(s=>!familySections.includes(s.id)).length > 0 && (
                    <p style={{ fontSize:11, color:C.textD, margin:"14px 0 8px" }}>Secções inativas</p>
                  )}
                  {SECTIONS.filter(s=>!familySections.includes(s.id)).map(s => (
                    <div key={s.id} onClick={()=>toggleSec(s.id)}
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"10px 14px", borderRadius:8, marginBottom:6, cursor:"pointer",
                        border:`1.5px solid ${C.border2}`, background:C.surf2, transition:"all .15s" }}>
                      <span style={{ fontSize:14, fontWeight:400, color:C.textS }}>{s.label}</span>
                      <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${C.border2}`,
                        background:"transparent" }}/>
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:10, marginTop:16 }}>
                    <button onClick={()=>setEditingFamily(null)} style={{ flex:1, padding:"11px", borderRadius:10,
                      border:`1.5px solid ${C.border2}`, background:"transparent", color:C.textS,
                      cursor:"pointer", fontSize:14, fontWeight:600 }}>Cancelar</button>
                    <button onClick={saveFamily} style={{ flex:2, padding:"11px", borderRadius:10,
                      border:"none", background:C.yellow, color:C.bg,
                      cursor:"pointer", fontSize:14, fontWeight:700 }}>Guardar</button>
                  </div>
                </div>
              </Modal>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── PIN SCREEN ───────────────────────────────────────────────────────────────
function PinScreen({ onUnlock }) {
  const [digits, setDigits] = useState([]);
  const [shake,  setShake]  = useState(false);
  const digRef = useRef([]);
  const pin = localStorage.getItem(PIN_KEY) || DEFAULT_PIN;

  const push = d => {
    if (digRef.current.length >= 4 || shake) return;
    const next = [...digRef.current, d];
    digRef.current = next;
    setDigits([...next]);
    if (next.length === 4) {
      if (next.join("") === pin) {
        setTimeout(onUnlock, 120);
      } else {
        setShake(true);
        setTimeout(() => { digRef.current = []; setDigits([]); setShake(false); }, 700);
      }
    }
  };

  const pop = () => {
    if (shake) return;
    const next = digRef.current.slice(0,-1);
    digRef.current = next; setDigits([...next]);
  };

  useEffect(() => {
    const h = e => {
      if (e.key>="0"&&e.key<="9") push(e.key);
      else if (e.key==="Backspace") pop();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const NUMS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", fontFamily:F, padding:"24px 20px" }}>
      <style>{CSS}</style>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, marginBottom:44 }}>
        <div dangerouslySetInnerHTML={{ __html: APP_ICON_SVG }} style={{ width:60, height:60 }}/>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28, fontWeight:700, color:C.text, letterSpacing:"-0.02em", lineHeight:1 }}>TechFlow</div>
          <div style={{ fontSize:12, fontWeight:700, color:C.yellow, letterSpacing:"0.06em", marginTop:5 }}>GI</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:18, marginBottom:40, animation:shake?"shake .55s ease":"none" }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{ width:14, height:14, borderRadius:"50%", transition:"all .15s",
            background:i<digits.length?(shake?C.red:C.yellow):"transparent",
            border:`2px solid ${i<digits.length?(shake?C.red:C.yellow):C.border2}` }}/>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,72px)", gap:12 }}>
        {NUMS.map((n,i)=> n===""?<div key={i}/>:(
          <button key={i} onClick={()=>n==="⌫"?pop():push(n)}
            style={{ width:72, height:72, borderRadius:"50%", border:`1.5px solid ${C.border2}`,
              background:C.surf, color:n==="⌫"?C.textS:C.text,
              fontSize:n==="⌫"?22:26, fontWeight:500, cursor:"pointer", fontFamily:F,
              display:"flex", alignItems:"center", justifyContent:"center", transition:"all .1s" }}
            onMouseEnter={e=>{e.currentTarget.style.background=C.surf2;e.currentTarget.style.borderColor=C.yellow;}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.surf;e.currentTarget.style.borderColor=C.border2;}}
            onMouseDown={e=>e.currentTarget.style.transform="scale(0.91)"}
            onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
            {n}
          </button>
        ))}
      </div>

      <p style={{ marginTop:28, fontSize:13, fontWeight:shake?600:400, letterSpacing:"0.02em",
        color:shake?C.red:C.textD, transition:"color .15s" }}>
        {shake?"PIN incorreto":"Introduz o PIN"}
      </p>
      <p style={{ marginTop:32, fontSize:11, color:C.textD, letterSpacing:"0.08em" }}>
        TechFlow · GI · {new Date().getFullYear()}
      </p>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const pinEnabled = () => localStorage.getItem(PIN_ENABLED_KEY) !== "false";

  const [pinOk,        setPinOk]        = useState(() => !pinEnabled());
  const [assets,       setAssets]       = useState([]);
  const [families,     setFamilies]     = useState([]);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);
  const [marcas,              setMarcas]              = useState([]);
  const [tarifarios,          setTarifarios]          = useState([]);
  const [sistemasOperativos,  setSistemasOperativos]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("assets");
  const [toast,        setToast]        = useState(null);
  const isMobile = useIsMobile();

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null), 2800); };

  useEffect(() => {
    document.title = "TechFlow · GI";
    const b64 = btoa(unescape(encodeURIComponent(FAVICON)));
    const link = document.querySelector("link[rel*='icon']") || document.createElement("link");
    link.type = "image/svg+xml"; link.rel = "icon";
    link.href = `data:image/svg+xml;base64,${b64}`;
    if (!document.querySelector("link[rel*='icon']")) document.head.appendChild(link);
  }, []);

  useEffect(() => {
    Promise.all([api.getAssets(), api.getFamilies(), api.getLocalizacoes(), api.getUtilizadores(), api.getMarcas(), api.getTarifarios(), api.getSistemasOperativos()])
      .then(([a,f,l,u,m,t,so]) => { setAssets(a||[]); setFamilies(f||[]); setLocalizacoes(l||[]); setUtilizadores(u||[]); setMarcas(m||[]); setTarifarios(t||[]); setSistemasOperativos(so||[]); })
      .catch(err => showToast("Erro ao carregar: "+(err.message||""),"error"))
      .finally(() => setLoading(false));
  }, []);

  const handleLock = () => { if (pinEnabled()) setPinOk(false); };

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
    else if (type==="marcas") setMarcas(updated);
    else if (type==="tarifarios") setTarifarios(updated);
    else if (type==="sistemas_operativos") setSistemasOperativos(updated);
  };

  const handleAddMarca     = item => setMarcas(prev => [...prev, item].sort((a,b)=>a.nome.localeCompare(b.nome)));
  const handleAddTarifario = item => setTarifarios(prev => [...prev, item].sort((a,b)=>a.nome.localeCompare(b.nome)));
  const handleAddSO        = item => setSistemasOperativos(prev => [...prev, item].sort((a,b)=>a.nome.localeCompare(b.nome)));

  if (!pinOk) return <PinScreen onUnlock={()=>setPinOk(true)}/>;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:F, overflow:"hidden" }}>
      <style>{CSS}</style>
      {!isMobile && <Sidebar active={tab} onNav={setTab} onLock={handleLock}/>}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden",
        paddingBottom: isMobile ? 60 : 0 }}>
        {tab==="assets" && (
          <AssetsPage
            assets={assets} families={families} localizacoes={localizacoes}
            utilizadores={utilizadores} marcas={marcas} tarifarios={tarifarios}
            sistemasOperativos={sistemasOperativos}
            onAddMarca={handleAddMarca} onAddTarifario={handleAddTarifario} onAddSO={handleAddSO}
            loading={loading} isMobile={isMobile}
            onSaveAsset={handleSaveAsset} onDeleteAsset={handleDeleteAsset}
            showToast={showToast}/>
        )}
        {tab==="settings" && (
          <SettingsPage
            families={families} localizacoes={localizacoes} utilizadores={utilizadores}
            marcas={marcas} tarifarios={tarifarios} sistemasOperativos={sistemasOperativos}
            assets={assets}
            onUpdate={handleSettingsUpdate} showToast={showToast}
            onLock={handleLock} isMobile={isMobile}/>
        )}
      </div>
      {isMobile && <BottomNav active={tab} onNav={setTab}/>}
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}