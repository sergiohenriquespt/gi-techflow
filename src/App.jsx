import React, { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://swczwblrtwcyfklhapzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Y3p3YmxydHdjeWZrbGhhcHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjA2ODQsImV4cCI6MjA4ODgzNjY4NH0.9TMDFzKRvisg0_UkxNFvjxmje3prwdwvz-P3H7cLiPY";

// ─── AUTH ────────────────────────────────────────────────────────────────────
const auth = {
  signIn: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Erro de autenticação");
    return data;
  },
  signOut: async (token) => {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` },
    });
  },
  getUser: async (token) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  },
};

const SESSION_KEY = "gi_am_session";

// ─── API ────────────────────────────────────────────────────────────────────
async function sbFetch(path, options = {}) {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  const token = session?.access_token || SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "",
      ...options.headers,
    },
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  getAssets:        () => sbFetch("/gi_am_assets?select=*&order=created_at.desc"),
  getFamilies:      () => sbFetch("/gi_am_families?select=*&order=name.asc"),
  getLocalizacoes:  () => sbFetch("/gi_am_localizacoes?select=*&order=nome.asc"),
  getUtilizadores:  () => sbFetch("/gi_am_utilizadores?select=*&order=nome.asc"),
  addAsset:         (d) => sbFetch("/gi_am_assets", { method:"POST", prefer:"return=representation", body:JSON.stringify(d) }),
  updateAsset:      (id,d) => sbFetch(`/assets?id=eq.${id}`, { method:"PATCH", prefer:"return=representation", body:JSON.stringify(d) }),
  deleteAsset:      (id) => sbFetch(`/assets?id=eq.${id}`, { method:"DELETE" }),
  addFamily:        (name) => sbFetch("/gi_am_families", { method:"POST", prefer:"return=representation", body:JSON.stringify({ name }) }),
  deleteFamily:     (id) => sbFetch(`/families?id=eq.${id}`, { method:"DELETE" }),
  addLocalizacao:   (nome) => sbFetch("/gi_am_localizacoes", { method:"POST", prefer:"return=representation", body:JSON.stringify({ nome }) }),
  deleteLocalizacao:(id) => sbFetch(`/localizacoes?id=eq.${id}`, { method:"DELETE" }),
  addUtilizador:    (d) => sbFetch("/gi_am_utilizadores", { method:"POST", prefer:"return=representation", body:JSON.stringify(d) }),
  updateUtilizador: (id,d) => sbFetch(`/utilizadores?id=eq.${id}`, { method:"PATCH", prefer:"return=representation", body:JSON.stringify(d) }),
  deleteUtilizador: (id) => sbFetch(`/utilizadores?id=eq.${id}`, { method:"DELETE" }),
  uploadPhoto: async (file) => {
    const ext = file.name.split(".").pop();
    const filename = `${Date.now()}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${filename}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("Upload falhou");
    return `${SUPABASE_URL}/storage/v1/object/public/photos/${filename}`;
  },
};

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const T = {
  // GI Brand: #333F48 Cinzento Escuro, #e0cb4b Amarelo, #8d9190 Cinzento
  bg:        "#1a1f24",        // derivado do #333F48, mais escuro
  surface:   "#222930",        // superfície principal — cinzento escuro GI suavizado
  surface2:  "#2a333b",        // superfície secundária
  surface3:  "#323d46",        // superfície terciária / hover
  border:    "#3a454f",        // bordas subtis
  border2:   "#445058",        // bordas mais visíveis
  amber:     "#e0cb4b",        // Amarelo GI — cor de acento principal
  amberDim:  "#b8a638",        // Amarelo GI escurecido
  amberGlow: "rgba(224,203,75,0.12)",
  amberGlow2:"rgba(224,203,75,0.06)",
  text:      "#f0f2f4",        // texto principal — quase branco
  textMid:   "#8d9190",        // Cinzento GI — texto secundário
  textDim:   "#5a6370",        // texto desactivado
  red:       "#e05252",
  redDim:    "rgba(224,82,82,0.12)",
  green:     "#4caf82",
  greenDim:  "rgba(76,175,130,0.12)",
  white:     "#ffffff",
};

const FONT_DISPLAY = "'Geist', -apple-system, sans-serif";
const FONT_BODY    = "'Geist', -apple-system, sans-serif";
const FONT_MONO    = "'Geist Mono', monospace";

// ─── APP ICON ────────────────────────────────────────────────────────────────
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="20" fill="#1a1f24"/>
  <rect x="8" y="8" width="80" height="80" rx="14" fill="none" stroke="#e0cb4b" stroke-width="3"/>
  <!-- corner TL -->
  <rect x="16" y="16" width="24" height="24" rx="4" fill="none" stroke="#e0cb4b" stroke-width="2.5"/>
  <rect x="22" y="22" width="12" height="12" rx="2" fill="#e0cb4b"/>
  <!-- corner TR -->
  <rect x="56" y="16" width="24" height="24" rx="4" fill="none" stroke="#e0cb4b" stroke-width="2.5"/>
  <rect x="62" y="22" width="12" height="12" rx="2" fill="#e0cb4b"/>
  <!-- corner BL -->
  <rect x="16" y="56" width="24" height="24" rx="4" fill="none" stroke="#e0cb4b" stroke-width="2.5"/>
  <rect x="22" y="62" width="12" height="12" rx="2" fill="#e0cb4b"/>
  <!-- data dots BR -->
  <rect x="56" y="56" width="7" height="7" rx="1.5" fill="#e0cb4b"/>
  <rect x="65" y="56" width="7" height="7" rx="1.5" fill="#8d9190"/>
  <rect x="74" y="56" width="7" height="7" rx="1.5" fill="#e0cb4b"/>
  <rect x="56" y="65" width="7" height="7" rx="1.5" fill="#8d9190"/>
  <rect x="65" y="65" width="7" height="7" rx="1.5" fill="#e0cb4b"/>
  <rect x="74" y="65" width="7" height="7" rx="1.5" fill="#8d9190"/>
  <rect x="56" y="74" width="7" height="7" rx="1.5" fill="#e0cb4b"/>
  <rect x="65" y="74" width="7" height="7" rx="1.5" fill="#e0cb4b"/>
  <rect x="74" y="74" width="7" height="7" rx="1.5" fill="#8d9190"/>
  <!-- center bars -->
  <rect x="44" y="16" width="6" height="28" rx="2" fill="#8d9190"/>
  <rect x="52" y="16" width="4" height="28" rx="2" fill="#e0cb4b"/>
  <rect x="16" y="44" width="28" height="6" rx="2" fill="#8d9190"/>
  <rect x="16" y="52" width="28" height="4" rx="2" fill="#e0cb4b"/>
</svg>`;

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#1a1f24"/>
  <rect x="2" y="2" width="28" height="28" rx="5" fill="none" stroke="#e0cb4b" stroke-width="1.5"/>
  <rect x="5" y="5" width="9" height="9" rx="2" fill="none" stroke="#e0cb4b" stroke-width="1.5"/>
  <rect x="7" y="7" width="5" height="5" rx="1" fill="#e0cb4b"/>
  <rect x="18" y="5" width="9" height="9" rx="2" fill="none" stroke="#e0cb4b" stroke-width="1.5"/>
  <rect x="20" y="7" width="5" height="5" rx="1" fill="#e0cb4b"/>
  <rect x="5" y="18" width="9" height="9" rx="2" fill="none" stroke="#e0cb4b" stroke-width="1.5"/>
  <rect x="7" y="20" width="5" height="5" rx="1" fill="#e0cb4b"/>
  <rect x="19" y="18" width="4" height="4" rx="1" fill="#e0cb4b"/>
  <rect x="24" y="18" width="4" height="4" rx="1" fill="#8d9190"/>
  <rect x="19" y="23" width="4" height="4" rx="1" fill="#8d9190"/>
  <rect x="24" y="23" width="4" height="4" rx="1" fill="#e0cb4b"/>
</svg>`;

const FAVICON_DATA_URL = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+CiAgPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNyIgZmlsbD0iIzFhMWYyNCIvPgogIDxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgcng9IjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UwY2I0YiIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iOSIgaGVpZ2h0PSI5IiByeD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTBjYjRiIiBzdHJva2Utd2lkdGg9IjEuNSIvPgogIDxyZWN0IHg9IjciIHk9IjciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIHJ4PSIxIiBmaWxsPSIjZTBjYjRiIi8+CiAgPHJlY3QgeD0iMTgiIHk9IjUiIHdpZHRoPSI5IiBoZWlnaHQ9IjkiIHJ4PSIyIiBmaWxsPSJub25lIiBzdHJva2U9IiNlMGNiNGIiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgPHJlY3QgeD0iMjAiIHk9IjciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIHJ4PSIxIiBmaWxsPSIjZTBjYjRiIi8+CiAgPHJlY3QgeD0iNSIgeT0iMTgiIHdpZHRoPSI5IiBoZWlnaHQ9IjkiIHJ4PSIyIiBmaWxsPSJub25lIiBzdHJva2U9IiNlMGNiNGIiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgPHJlY3QgeD0iNyIgeT0iMjAiIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIHJ4PSIxIiBmaWxsPSIjZTBjYjRiIi8+CiAgPHJlY3QgeD0iMTkiIHk9IjE4IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiByeD0iMSIgZmlsbD0iI2UwY2I0YiIvPgogIDxyZWN0IHg9IjI0IiB5PSIxOCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgcng9IjEiIGZpbGw9IiM4ZDkxOTAiLz4KICA8cmVjdCB4PSIxOSIgeT0iMjMiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIHJ4PSIxIiBmaWxsPSIjOGQ5MTkwIi8+CiAgPHJlY3QgeD0iMjQiIHk9IjIzIiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiByeD0iMSIgZmlsbD0iI2UwY2I0YiIvPgo8L3N2Zz4=";

const AppIcon = ({ size=40, radius=10 }) => (
  <div style={{ width:size, height:size, borderRadius:radius, overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}
    dangerouslySetInnerHTML={{ __html: ICON_SVG }}/>
);

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: ${T.bg}; color: ${T.text}; font-family: ${FONT_BODY}; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: ${T.textDim}; }
input, select, textarea, button { font-family: ${FONT_BODY}; }
@keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes slideIn { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
`;

// ─── SVG ICONS ───────────────────────────────────────────────────────────────
const Icon = ({ name, size=16, color="currentColor" }) => {
  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.5" fill={color}/><circle cx="3" cy="12" r="1.5" fill={color}/><circle cx="3" cy="18" r="1.5" fill={color}/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    x:    <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    search: <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    cpu:  <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/></>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    map:  <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    tag:  <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>,
    wifi: <><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill={color}/></>,
    hdd:  <><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><circle cx="12" cy="16" r="1" fill={color}/></>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    chevronDown:  <polyline points="6 9 12 15 18 9"/>,
    package: <><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ─── EMPTY FORM ──────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name:"", family_id:"", photo_url:"",
  modelo:"", serial:"", cpu:"", memoria:"", hdd:"", gpu:"", so:"",
  ms365: null,
  localizacao:"",
  monitor_marca:"", monitor_modelo:"", monitor_polegadas:"", monitor_quantidade:"",
  dominio:"", grupo_trabalho:"",
  observacoes:"", utilizador_id:"",
};

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
const Avatar = ({ src, name, size=32, round=false }) => {
  const initials = name ? name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() : "?";
  return (
    <div style={{
      width:size, height:size, borderRadius: round ? "50%" : 6,
      overflow:"hidden", flexShrink:0, background:T.surface3,
      border:`1px solid ${T.border2}`, display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      {src
        ? <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
        : <span style={{ fontSize:size*0.32, fontWeight:600, color:T.amber, fontFamily:FONT_DISPLAY }}>{initials}</span>
      }
    </div>
  );
};

const Badge = ({ label, color }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap:4,
    padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:500,
    letterSpacing:"0.06em", textTransform:"uppercase", fontFamily:FONT_DISPLAY,
    background: color || T.amberGlow, color: color ? T.text : T.amber,
    border:`1px solid ${color ? "rgba(255,255,255,0.1)" : "rgba(240,165,0,0.2)"}`,
  }}>{label}</span>
);

const Spinner = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:80 }}>
    <div style={{ width:32, height:32, border:`2px solid ${T.border2}`, borderTop:`2px solid ${T.amber}`, borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
  </div>
);

const Toast = ({ msg, type }) => (
  <div style={{
    position:"fixed", bottom:24, right:24, zIndex:9999,
    background: type==="error" ? T.red : T.amber,
    color: type==="error" ? "#fff" : T.bg,
    padding:"11px 18px", borderRadius:8, fontSize:12, fontWeight:600,
    fontFamily:FONT_DISPLAY, letterSpacing:"0.04em",
    boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
    animation:"fadeUp 0.25s ease",
  }}>
    {type==="error" ? "✕ " : "✓ "}{msg}
  </div>
);

// ─── SECTION DIVIDER ─────────────────────────────────────────────────────────
const SectionDivider = ({ label, icon }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, margin:"24px 0 14px" }}>
    {icon && <Icon name={icon} size={12} color={T.amber}/>}
    <span style={{ fontSize:9, fontWeight:700, color:T.amber, textTransform:"uppercase", letterSpacing:"0.16em", fontFamily:FONT_DISPLAY }}>{label}</span>
    <div style={{ flex:1, height:1, background:`linear-gradient(to right, ${T.border2}, transparent)` }}/>
  </div>
);

// ─── FIELD COMPONENTS ────────────────────────────────────────────────────────
const fieldStyle = {
  width:"100%", padding:"9px 12px",
  background:T.surface, border:`1px solid ${T.border2}`,
  borderRadius:6, color:T.text, fontSize:12, fontFamily:FONT_BODY,
  outline:"none", transition:"border-color 0.15s, box-shadow 0.15s",
};
const labelStyle = {
  display:"block", fontSize:9, fontWeight:700, color:T.textDim,
  textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:5, fontFamily:FONT_DISPLAY,
};

// ─── ASSET MODAL ─────────────────────────────────────────────────────────────
function AssetModal({ asset, families, localizacoes, utilizadores, onSave, onClose, showToast }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, family_id: families[0]?.id||"", ...asset });
  const [photoPreview, setPhotoPreview] = useState(asset?.photo_url||null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handlePhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploading(true);
    try { const url = await api.uploadPhoto(file); set("photo_url", url); }
    catch { showToast("Erro no upload","error"); }
    finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    const e = {};
    if (!form.name.trim()) e.name = true;
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
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
      const res = asset?.id ? await api.updateAsset(asset.id, payload) : await api.addAsset(payload);
      onSave(res[0]);
    } catch(err) { showToast("Erro: "+(err.message||"desconhecido"),"error"); }
    finally { setSaving(false); }
  };

  const inputStyle = (err) => ({
    ...fieldStyle,
    borderColor: err ? T.red : T.border2,
    boxShadow: "none",
  });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, animation:"fadeIn 0.2s ease" }}>
      <div style={{ background:T.surface, borderRadius:12, width:"100%", maxWidth:640, border:`1px solid ${T.border}`, boxShadow:"0 32px 80px rgba(0,0,0,0.6)", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:700, color:T.text, fontFamily:FONT_DISPLAY, letterSpacing:"-0.02em" }}>{asset?.id ? "Editar Ativo" : "Novo Ativo"}</h2>
            <p style={{ fontSize:11, color:T.textMid, marginTop:2 }}>Preenche os campos relevantes para este equipamento</p>
          </div>
          <button onClick={onClose} style={{ background:T.surface2, border:`1px solid ${T.border2}`, color:T.textMid, borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="x" size={14}/>
          </button>
        </div>

        <div style={{ padding:"0 24px 24px", maxHeight:"72vh", overflowY:"auto" }}>
          {/* Identificação */}
          <SectionDivider label="Identificação" icon="package"/>
          <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
            {/* Foto */}
            <div style={{ flexShrink:0 }}>
              <div style={{ width:80, height:96, borderRadius:8, overflow:"hidden", border:`1px dashed ${T.border2}`, background:T.surface2, cursor:"pointer", position:"relative" }} onClick={()=>fileRef.current.click()}>
                {photoPreview
                  ? <img src={photoPreview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
                  : <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                      <Icon name="cpu" size={20} color={T.textDim}/>
                      <span style={{ fontSize:9, color:T.textDim, fontFamily:FONT_DISPLAY, fontWeight:600, letterSpacing:"0.08em" }}>FOTO</span>
                    </div>
                }
                <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)", transition:"background 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background="rgba(0,0,0,0.5)"; e.currentTarget.querySelector("span").style.opacity=1; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background="rgba(0,0,0,0)"; e.currentTarget.querySelector("span").style.opacity=0; }}>
                  <span style={{ opacity:0, color:"#fff", fontSize:10, fontWeight:600, fontFamily:FONT_DISPLAY, letterSpacing:"0.08em", transition:"opacity 0.2s" }}>{uploading?"...":"ALTERAR"}</span>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }}/>
            </div>
            {/* Nome + Família */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={labelStyle}>Nome / Designação *</label>
                <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Ex: PC-RECEÇÃO-01" style={inputStyle(errors.name)}
                  onFocus={e=>e.target.style.borderColor=T.amber} onBlur={e=>e.target.style.borderColor=errors.name?T.red:T.border2}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={labelStyle}>Família</label>
                  <select value={form.family_id||""} onChange={e=>set("family_id",e.target.value)} style={{ ...inputStyle(), cursor:"pointer" }}>
                    <option value="">— Sem família —</option>
                    {families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Atribuído a</label>
                  <select value={form.utilizador_id||""} onChange={e=>set("utilizador_id",e.target.value)} style={{ ...inputStyle(), cursor:"pointer" }}>
                    <option value="">— Não atribuído —</option>
                    {utilizadores.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Computador */}
          <SectionDivider label="Computador" icon="cpu"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              { k:"modelo",  l:"Modelo",           full:true,  ph:"Ex: HP EliteBook 840 G9" },
              { k:"serial",  l:"Número de Série",  full:true,  ph:"Ex: 5CG2481B84" },
              { k:"cpu",     l:"CPU",              full:false, ph:"Ex: Intel Core i7-1265U" },
              { k:"memoria", l:"Memória RAM",       full:false, ph:"Ex: 16GB DDR5" },
              { k:"hdd",     l:"HDD / SSD",         full:false, ph:"Ex: 512GB NVMe" },
              { k:"gpu",     l:"GPU",              full:false, ph:"Ex: Intel Iris Xe" },
              { k:"so",      l:"Sistema Operativo",full:true,  ph:"Ex: Windows 11 Pro 24H2" },
            ].map(f=>(
              <div key={f.k} style={ f.full ? { gridColumn:"1/-1" } : {} }>
                <label style={labelStyle}>{f.l}</label>
                <input value={form[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph} style={inputStyle()}
                  onFocus={e=>e.target.style.borderColor=T.amber} onBlur={e=>e.target.style.borderColor=T.border2}/>
              </div>
            ))}
          </div>

          {/* Software */}
          <SectionDivider label="Software" icon="package"/>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:T.surface2, borderRadius:8, border:`1px solid ${T.border}` }}>
            <span style={{ fontSize:12, color:T.textMid, fontWeight:400 }}>Microsoft 365</span>
            <div style={{ display:"flex", borderRadius:6, overflow:"hidden", border:`1px solid ${T.border2}` }}>
              {[["true","Sim",T.green,T.greenDim],["false","Não",T.red,T.redDim],["null","N/D",T.textDim,T.surface3]].map(([val,label,col,bg])=>{
                const active = String(form.ms365)===val;
                return (
                  <button key={val} onClick={()=>set("ms365", val==="true"?true:val==="false"?false:null)}
                    style={{ padding:"6px 16px", border:"none", cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:FONT_DISPLAY, letterSpacing:"0.06em",
                      background: active ? bg : T.surface2, color: active ? col : T.textDim, transition:"all 0.15s" }}>{label}</button>
                );
              })}
            </div>
          </div>

          {/* Geral */}
          <SectionDivider label="Geral" icon="map"/>
          <div>
            <label style={labelStyle}>Localização</label>
            <select value={form.localizacao||""} onChange={e=>set("localizacao",e.target.value)} style={{ ...inputStyle(), cursor:"pointer" }}>
              <option value="">— Selecionar localização —</option>
              {localizacoes.map(l=><option key={l.id} value={l.nome}>{l.nome}</option>)}
            </select>
          </div>

          {/* Monitor */}
          <SectionDivider label="Monitor" icon="monitor"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              { k:"monitor_marca",     l:"Marca",      ph:"Ex: LG" },
              { k:"monitor_modelo",    l:"Modelo",     ph:"Ex: 27UK850-W" },
              { k:"monitor_polegadas", l:"Polegadas",  ph:"Ex: 27\"" },
              { k:"monitor_quantidade",l:"Quantidade", ph:"Ex: 2" },
            ].map(f=>(
              <div key={f.k}>
                <label style={labelStyle}>{f.l}</label>
                <input value={form[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph} style={inputStyle()}
                  onFocus={e=>e.target.style.borderColor=T.amber} onBlur={e=>e.target.style.borderColor=T.border2}/>
              </div>
            ))}
          </div>

          {/* Rede */}
          <SectionDivider label="Rede" icon="wifi"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              { k:"dominio",        l:"Domínio",           ph:"Ex: empresa.local" },
              { k:"grupo_trabalho", l:"Grupo de Trabalho", ph:"Ex: WORKGROUP" },
            ].map(f=>(
              <div key={f.k}>
                <label style={labelStyle}>{f.l}</label>
                <input value={form[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph} style={inputStyle()}
                  onFocus={e=>e.target.style.borderColor=T.amber} onBlur={e=>e.target.style.borderColor=T.border2}/>
              </div>
            ))}
          </div>

          {/* Observações */}
          <SectionDivider label="Observações"/>
          <textarea value={form.observacoes||""} onChange={e=>set("observacoes",e.target.value)} rows={3}
            placeholder="Notas adicionais sobre este equipamento..."
            style={{ ...inputStyle(), resize:"vertical", lineHeight:1.7 }}
            onFocus={e=>e.target.style.borderColor=T.amber} onBlur={e=>e.target.style.borderColor=T.border2}/>
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${T.border}`, display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:20, border:`1px solid ${T.border2}`, background:"transparent", color:T.textMid, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:FONT_DISPLAY, letterSpacing:"0.02em" }}>
            CANCELAR
          </button>
          <button onClick={handleSubmit} disabled={saving||uploading} style={{ flex:2, padding:"11px", borderRadius:20, border:"none", background:T.amber, color:T.bg, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:FONT_DISPLAY, letterSpacing:"0.04em", opacity:saving?0.7:1, transition:"opacity 0.2s" }}>
            {saving ? "A GUARDAR..." : asset?.id ? "GUARDAR ALTERAÇÕES" : "ADICIONAR ATIVO"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LIST MANAGER MODAL (Famílias / Localizações) ────────────────────────────
function ListModal({ title, icon, items, nameKey, onAdd, onRemove, onClose, placeholder }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const add = async () => {
    if (!val.trim()) { setErr("Campo obrigatório"); return; }
    if (items.find(i=>i[nameKey].toLowerCase()===val.trim().toLowerCase())) { setErr("Já existe"); return; }
    setLoading(true);
    try { await onAdd(val.trim()); setVal(""); setErr(""); }
    catch { setErr("Erro ao adicionar"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center", padding:16, animation:"fadeIn 0.2s" }}>
      <div style={{ background:T.surface, borderRadius:12, width:"100%", maxWidth:440, border:`1px solid ${T.border}`, boxShadow:"0 32px 80px rgba(0,0,0,0.6)", overflow:"hidden" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Icon name={icon} size={16} color={T.amber}/>
            <h2 style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:FONT_DISPLAY }}>{title}</h2>
          </div>
          <button onClick={onClose} style={{ background:T.surface2, border:`1px solid ${T.border2}`, color:T.textMid, borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="x" size={14}/>
          </button>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ display:"flex", gap:8, marginBottom: err ? 6 : 16 }}>
            <input value={val} onChange={e=>{setVal(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&add()}
              placeholder={placeholder}
              style={{ ...fieldStyle, flex:1, borderColor: err ? T.red : T.border2 }}
              onFocus={e=>e.target.style.borderColor=T.amber} onBlur={e=>e.target.style.borderColor=err?T.red:T.border2}/>
            <button onClick={add} disabled={loading} style={{ padding:"9px 16px", borderRadius:6, background:T.amber, border:"none", color:T.bg, cursor:"pointer", fontWeight:700, fontFamily:FONT_DISPLAY, fontSize:16 }}>+</button>
          </div>
          {err && <p style={{ color:T.red, fontSize:11, marginBottom:12 }}>{err}</p>}
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:300, overflowY:"auto" }}>
            {items.length === 0 && <p style={{ textAlign:"center", color:T.textDim, fontSize:12, padding:"24px 0" }}>Nenhum registo.</p>}
            {items.map(item=>(
              <div key={item.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:T.surface2, borderRadius:8, border:`1px solid ${T.border}` }}>
                <span style={{ fontSize:13, color:T.text }}>{item[nameKey]}</span>
                <button onClick={()=>onRemove(item)} style={{ background:T.redDim, border:"none", color:T.red, borderRadius:5, padding:"4px 10px", cursor:"pointer", fontSize:10, fontWeight:600, fontFamily:FONT_DISPLAY, letterSpacing:"0.06em" }}>REMOVER</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── UTILIZADORES MODAL ───────────────────────────────────────────────────────
function UtilizadoresModal({ utilizadores, onUpdate, onClose, showToast }) {
  const [list, setList] = useState([...utilizadores]);
  const [view, setView] = useState("list"); // "list" | "form"
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome:"", email:"", telefone:"", photo_url:"" });
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const openAdd = () => { setForm({ nome:"",email:"",telefone:"",photo_url:"" }); setPreview(null); setEditing(null); setView("form"); };
  const openEdit = u => { setForm({ nome:u.nome||"",email:u.email||"",telefone:u.telefone||"",photo_url:u.photo_url||"" }); setPreview(u.photo_url||null); setEditing(u); setView("form"); };

  const handlePhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploading(true);
    try { const url = await api.uploadPhoto(file); set("photo_url",url); }
    catch { showToast("Erro no upload","error"); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.nome.trim()) { showToast("Nome obrigatório","error"); return; }
    setSaving(true);
    try {
      const payload = { nome:form.nome, email:form.email||null, telefone:form.telefone||null, photo_url:form.photo_url||null };
      if (editing) {
        const res = await api.updateUtilizador(editing.id, payload);
        const updated = list.map(u=>u.id===editing.id?res[0]:u);
        setList(updated); onUpdate(updated);
      } else {
        const res = await api.addUtilizador(payload);
        const updated = [...list, res[0]];
        setList(updated); onUpdate(updated);
      }
      setView("list");
    } catch(err) { showToast("Erro: "+(err.message||""),"error"); }
    finally { setSaving(false); }
  };

  const remove = async (u) => {
    try { await api.deleteUtilizador(u.id); const updated=list.filter(x=>x.id!==u.id); setList(updated); onUpdate(updated); }
    catch { showToast("Erro ao remover","error"); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center", padding:16, animation:"fadeIn 0.2s" }}>
      <div style={{ background:T.surface, borderRadius:12, width:"100%", maxWidth:500, border:`1px solid ${T.border}`, boxShadow:"0 32px 80px rgba(0,0,0,0.6)", overflow:"hidden", maxHeight:"80vh", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Icon name="users" size={16} color={T.amber}/>
            <h2 style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:FONT_DISPLAY }}>Utilizadores</h2>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {view==="list" && <button onClick={openAdd} style={{ padding:"7px 16px", borderRadius:16, background:T.amber, border:"none", color:T.bg, cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:FONT_DISPLAY, letterSpacing:"0.02em" }}>+ Adicionar</button>}
            <button onClick={view==="form"?()=>setView("list"):onClose} style={{ background:T.surface2, border:`1px solid ${T.border2}`, color:T.textMid, borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="x" size={14}/>
            </button>
          </div>
        </div>

        {view==="form" ? (
          <div style={{ padding:24, overflowY:"auto" }}>
            <p style={{ fontSize:12, fontWeight:700, color:T.amber, fontFamily:FONT_DISPLAY, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:20 }}>{editing?"Editar utilizador":"Novo utilizador"}</p>
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
              <div style={{ width:64, height:64, borderRadius:"50%", overflow:"hidden", border:`2px dashed ${T.border2}`, background:T.surface2, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }} onClick={()=>fileRef.current.click()}>
                {preview ? <img src={preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <Icon name="users" size={22} color={T.textDim}/>}
              </div>
              <div>
                <p style={{ fontSize:11, color:T.textMid, marginBottom:6 }}>Foto de perfil</p>
                <button onClick={()=>fileRef.current.click()} disabled={uploading} style={{ padding:"6px 12px", borderRadius:5, background:T.surface3, border:`1px solid ${T.border2}`, color:T.textMid, cursor:"pointer", fontSize:11 }}>
                  {uploading?"A carregar...":"Escolher imagem"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }}/>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { k:"nome",     l:"Nome *",   ph:"Ex: João Silva",              type:"text" },
                { k:"email",    l:"Email",    ph:"Ex: joao@empresa.pt",          type:"email" },
                { k:"telefone", l:"Telefone", ph:"Ex: +351 912 345 678",         type:"text" },
              ].map(f=>(
                <div key={f.k}>
                  <label style={labelStyle}>{f.l}</label>
                  <input type={f.type} value={form[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph}
                    style={{ ...fieldStyle, borderColor:T.border2 }}
                    onFocus={e=>e.target.style.borderColor=T.amber} onBlur={e=>e.target.style.borderColor=T.border2}/>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={()=>setView("list")} style={{ flex:1, padding:"11px", borderRadius:20, border:`1px solid ${T.border2}`, background:"transparent", color:T.textMid, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:FONT_DISPLAY }}>VOLTAR</button>
              <button onClick={save} disabled={saving||uploading} style={{ flex:2, padding:"11px", borderRadius:20, border:"none", background:T.amber, color:T.bg, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:FONT_DISPLAY, letterSpacing:"0.04em" }}>
                {saving?"A GUARDAR...":editing?"GUARDAR":"ADICIONAR"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding:16, overflowY:"auto", flex:1 }}>
            {list.length===0 && <p style={{ textAlign:"center", color:T.textDim, fontSize:12, padding:"32px 0" }}>Nenhum utilizador.</p>}
            {list.map(u=>(
              <div key={u.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:T.surface2, borderRadius:10, border:`1px solid ${T.border}`, marginBottom:8 }}>
                <Avatar src={u.photo_url} name={u.nome} size={40} round/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, color:T.text, fontSize:13, fontFamily:FONT_DISPLAY }}>{u.nome}</div>
                  {u.email && <div style={{ fontSize:11, color:T.textMid, marginTop:2 }}>{u.email}</div>}
                  {u.telefone && <div style={{ fontSize:11, color:T.textDim }}>{u.telefone}</div>}
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>openEdit(u)} style={{ background:T.surface3, border:`1px solid ${T.border2}`, color:T.textMid, borderRadius:6, padding:"5px 10px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="edit" size={13}/></button>
                  <button onClick={()=>remove(u)} style={{ background:T.redDim, border:"none", color:T.red, borderRadius:6, padding:"5px 10px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="trash" size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ asset, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)", zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center", padding:16, animation:"fadeIn 0.2s" }}>
      <div style={{ background:T.surface, borderRadius:12, width:"100%", maxWidth:360, padding:32, border:`1px solid ${T.border}`, boxShadow:"0 32px 80px rgba(0,0,0,0.6)", textAlign:"center" }}>
        <div style={{ width:48, height:48, borderRadius:"50%", background:T.redDim, border:`1px solid ${T.red}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <Icon name="trash" size={20} color={T.red}/>
        </div>
        <h3 style={{ color:T.text, fontSize:16, fontWeight:700, fontFamily:FONT_DISPLAY, marginBottom:8 }}>Remover Ativo</h3>
        <p style={{ color:T.textMid, fontSize:13, lineHeight:1.7, marginBottom:24 }}>
          Tens a certeza que queres remover<br/>
          <strong style={{ color:T.text }}>{asset.name}</strong>?<br/>
          <span style={{ fontSize:11, color:T.textDim }}>Esta ação não pode ser desfeita.</span>
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:20, border:`1px solid ${T.border2}`, background:"transparent", color:T.textMid, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:FONT_DISPLAY }}>CANCELAR</button>
          <button disabled={loading} onClick={async()=>{ setLoading(true); await onConfirm(); }}
            style={{ flex:1, padding:"11px", borderRadius:20, border:"none", background:T.red, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:FONT_DISPLAY, letterSpacing:"0.04em", opacity:loading?0.7:1 }}>
            {loading?"...":"REMOVER"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ASSET DETAIL PANEL ───────────────────────────────────────────────────────
function AssetDetail({ asset, families, utilizadores, onEdit, onDelete, onClose }) {
  const familyName = families.find(f=>f.id===asset.family_id)?.name||null;
  const utilizador = utilizadores?.find(u=>u.id===asset.utilizador_id)||null;

  const Row = ({ label, value, mono }) => !value ? null : (
    <div style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
      <span style={{ fontSize:9, fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.1em", minWidth:110, flexShrink:0, paddingTop:2, fontFamily:FONT_DISPLAY }}>{label}</span>
      <span style={{ fontSize:12, color:T.text, fontFamily: mono ? FONT_MONO : FONT_BODY, fontWeight:300 }}>{value}</span>
    </div>
  );

  const sections = [
    { title:"Computador", icon:"cpu", rows:[["Modelo",asset.modelo],["Nº Série",asset.serial,true],["CPU",asset.cpu],["RAM",asset.memoria],["HDD / SSD",asset.hdd],["GPU",asset.gpu],["S.O.",asset.so]] },
    { title:"Software", icon:"package", rows:[["Microsoft 365", asset.ms365===true?"Sim":asset.ms365===false?"Não":null]] },
    { title:"Monitor", icon:"monitor", rows:[["Marca",asset.monitor_marca],["Modelo",asset.monitor_modelo],["Polegadas",asset.monitor_polegadas],["Quantidade",asset.monitor_quantidade]] },
    { title:"Rede", icon:"wifi", rows:[["Domínio",asset.dominio],["Grupo de Trabalho",asset.grupo_trabalho]] },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:900, display:"flex", justifyContent:"flex-end", animation:"fadeIn 0.2s" }} onClick={onClose}>
      <div style={{ width:"100%", maxWidth:400, background:T.surface, borderLeft:`1px solid ${T.border}`, display:"flex", flexDirection:"column", animation:"slideIn 0.25s ease" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"20px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontSize:10, fontWeight:700, color:T.amber, fontFamily:FONT_DISPLAY, letterSpacing:"0.12em" }}>DETALHE DO ATIVO</span>
          <button onClick={onClose} style={{ background:T.surface2, border:`1px solid ${T.border2}`, color:T.textMid, borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="x" size={14}/>
          </button>
        </div>

        <div style={{ overflowY:"auto", flex:1 }}>
          {/* Identificação */}
          <div style={{ padding:"20px", borderBottom:`1px solid ${T.border}`, display:"flex", gap:16, alignItems:"flex-start" }}>
            <div style={{ width:72, height:88, borderRadius:8, overflow:"hidden", border:`1px solid ${T.border2}`, background:T.surface2, flexShrink:0 }}>
              {asset.photo_url
                ? <img src={asset.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
                : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><Avatar name={asset.name} size={48}/></div>
              }
            </div>
            <div style={{ flex:1, paddingTop:4 }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:T.text, fontFamily:FONT_DISPLAY, letterSpacing:"-0.02em", marginBottom:8 }}>{asset.name}</h3>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {familyName && <Badge label={familyName}/>}
                {asset.localizacao && (
                  <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:T.textMid }}>
                    <Icon name="map" size={11} color={T.textDim}/>{asset.localizacao}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Atribuído a */}
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.border}`, background:T.surface2 }}>
            <p style={{ fontSize:9, fontWeight:700, color:T.amber, fontFamily:FONT_DISPLAY, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Atribuído a</p>
            {utilizador ? (
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <Avatar src={utilizador.photo_url} name={utilizador.nome} size={36} round/>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text, fontFamily:FONT_DISPLAY }}>{utilizador.nome}</div>
                  {utilizador.email && <div style={{ fontSize:11, color:T.textMid, marginTop:2 }}>{utilizador.email}</div>}
                  {utilizador.telefone && <div style={{ fontSize:11, color:T.textDim }}>{utilizador.telefone}</div>}
                </div>
              </div>
            ) : <span style={{ fontSize:12, color:T.textDim, fontStyle:"italic" }}>Não atribuído</span>}
          </div>

          {/* Secções */}
          <div style={{ padding:"16px 20px" }}>
            {sections.map(sec => {
              const hasData = sec.rows.some(([,v])=>v!=null&&v!==false&&v!=="");
              if (!hasData) return null;
              return (
                <div key={sec.title} style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <Icon name={sec.icon} size={11} color={T.amber}/>
                    <span style={{ fontSize:9, fontWeight:700, color:T.amber, textTransform:"uppercase", letterSpacing:"0.12em", fontFamily:FONT_DISPLAY }}>{sec.title}</span>
                  </div>
                  {sec.rows.map(([label,value,mono])=> value!=null&&value!==""&&value!==false ? <Row key={label} label={label} value={String(value)} mono={mono}/> : null)}
                </div>
              );
            })}
            {asset.observacoes && (
              <div style={{ marginTop:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:T.amber, textTransform:"uppercase", letterSpacing:"0.12em", fontFamily:FONT_DISPLAY }}>Observações</span>
                </div>
                <p style={{ fontSize:12, color:T.textMid, lineHeight:1.8, padding:"10px 14px", background:T.surface2, borderRadius:6, border:`1px solid ${T.border}`, fontWeight:300 }}>{asset.observacoes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 20px", borderTop:`1px solid ${T.border}`, display:"flex", gap:10, flexShrink:0 }}>
          <button onClick={onEdit} style={{ flex:1, padding:"10px", borderRadius:20, background:T.surface2, border:`1px solid ${T.border2}`, color:T.textMid, cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:FONT_DISPLAY, letterSpacing:"0.02em", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <Icon name="edit" size={13}/> EDITAR
          </button>
          <button onClick={onDelete} style={{ flex:1, padding:"10px", borderRadius:20, background:T.redDim, border:`1px solid rgba(224,82,82,0.3)`, color:T.red, cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:FONT_DISPLAY, letterSpacing:"0.02em", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <Icon name="trash" size={13}/> REMOVER
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("sergiohenriques@graficaideal.pt");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!email || !password) { setError("Preenche o email e a password."); return; }
    setLoading(true); setError("");
    try {
      const session = await auth.signIn(email, password);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onLogin(session);
    } catch (err) {
      setError(err.message || "Email ou password incorretos.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_BODY, padding:16 }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ width:"100%", maxWidth:400, animation:"fadeUp 0.4s ease" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:40, justifyContent:"center" }}>
          <AppIcon size={48} radius={12}/>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:T.text, fontFamily:FONT_DISPLAY, letterSpacing:"-0.03em" }}>Asset Manager</div>
            <div style={{ fontSize:10, color:T.textDim, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:FONT_DISPLAY }}>Gráfica Ideal</div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background:T.surface, borderRadius:16, border:`1px solid ${T.border}`, padding:32, boxShadow:"0 24px 64px rgba(0,0,0,0.4)" }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:T.text, fontFamily:FONT_DISPLAY, letterSpacing:"-0.02em", marginBottom:6 }}>Entrar</h2>
          <p style={{ fontSize:12, color:T.textMid, marginBottom:28 }}>Acesso restrito a utilizadores autorizados.</p>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ display:"block", fontSize:9, fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:FONT_DISPLAY }}>Email</label>
              <input
                type="email" value={email} onChange={e=>setEmail(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                placeholder="utilizador@graficaideal.pt"
                style={{ ...fieldStyle, background:T.surface2, borderColor: error?T.red:T.border2 }}
                onFocus={e=>e.target.style.borderColor=T.amber}
                onBlur={e=>e.target.style.borderColor=error?T.red:T.border2}
              />
            </div>
            <div>
              <label style={{ display:"block", fontSize:9, fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:FONT_DISPLAY }}>Password</label>
              <input
                type="password" value={password} onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                placeholder="••••••••"
                style={{ ...fieldStyle, background:T.surface2, borderColor: error?T.red:T.border2 }}
                onFocus={e=>e.target.style.borderColor=T.amber}
                onBlur={e=>e.target.style.borderColor=error?T.red:T.border2}
              />
            </div>

            {error && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:T.redDim, borderRadius:8, border:`1px solid rgba(224,82,82,0.3)` }}>
                <Icon name="x" size={13} color={T.red}/>
                <span style={{ fontSize:12, color:T.red }}>{error}</span>
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{ width:"100%", padding:"12px", borderRadius:20, border:"none", background:T.amber, color:T.bg, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:FONT_DISPLAY, letterSpacing:"0.02em", marginTop:4, opacity:loading?0.7:1, transition:"opacity 0.2s" }}>
              {loading ? "A entrar..." : "Entrar"}
            </button>
          </div>
        </div>

        <p style={{ textAlign:"center", fontSize:11, color:T.textDim, marginTop:20, fontFamily:FONT_MONO }}>
          GI Asset Manager · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ activeSection, onSection, onLogout }) {
  const navItems = [
    { id:"assets",       icon:"package", label:"Ativos" },
    { id:"families",     icon:"tag",     label:"Famílias" },
    { id:"localizacoes", icon:"map",     label:"Localizações" },
    { id:"utilizadores", icon:"users",   label:"Utilizadores" },
  ];

  return (
    <div style={{ width:220, background:T.surface, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", flexShrink:0, height:"100vh", position:"sticky", top:0 }}>
      {/* Logo */}
      <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <AppIcon size={36} radius={8}/>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:T.text, fontFamily:FONT_DISPLAY, letterSpacing:"-0.02em" }}>Asset Manager</div>
            <div style={{ fontSize:9, color:T.textDim, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:FONT_DISPLAY }}>Gráfica Ideal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"16px 12px" }}>
        <p style={{ fontSize:10, fontWeight:500, color:T.textDim, letterSpacing:"0.05em", textTransform:"uppercase", fontFamily:FONT_DISPLAY, padding:"0 8px", marginBottom:8 }}>Menu</p>
        {navItems.map(item => {
          const active = activeSection === item.id;
          return (
            <button key={item.id} onClick={()=>onSection(item.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, border:"none", cursor:"pointer", marginBottom:2, textAlign:"left", transition:"all 0.15s",
                background: active ? T.amberGlow : "transparent",
                color: active ? T.amber : T.textMid,
              }}
              onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background=T.surface2; e.currentTarget.style.color=T.text; }}}
              onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMid; }}}>
              <Icon name={item.icon} size={16} color={active?T.amber:T.textMid}/>
              <span style={{ fontSize:13, fontWeight: active ? 600 : 400, fontFamily:FONT_DISPLAY, letterSpacing:"-0.01em" }}>{item.label}</span>
              {active && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:T.amber }}/>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:"16px 12px", borderTop:`1px solid ${T.border}` }}>
        <div style={{ fontSize:9, color:T.textDim, fontFamily:FONT_MONO, letterSpacing:"0.06em", marginBottom:10, paddingLeft:8 }}>v2.0 · 2025</div>
        {onLogout && (
          <button onClick={onLogout}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:8, border:"none", cursor:"pointer", background:"transparent", color:T.textDim, textAlign:"left", transition:"all 0.15s" }}
            onMouseEnter={e=>{ e.currentTarget.style.background=T.redDim; e.currentTarget.style.color=T.red; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textDim; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span style={{ fontSize:13, fontFamily:FONT_DISPLAY, fontWeight:400 }}>Sair</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session,      setSession]      = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  });
  const [authChecking, setAuthChecking] = useState(true);
  const [assets,       setAssets]       = useState([]);
  const [families,     setFamilies]     = useState([]);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);
  const [loading,      setLoading]      = useState(true);

  const [view,         setView]         = useState("cards"); // "cards" | "list"
  const [search,       setSearch]       = useState("");
  const [filterFamily, setFilterFamily] = useState("all");
  const [section,      setSection]      = useState("assets");

  const [modal,        setModal]        = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [deletingAsset,setDeletingAsset]= useState(null);
  const [detailAsset,  setDetailAsset]  = useState(null);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null), 3200); };

  const handleLogout = async () => {
    if (session?.access_token) await auth.signOut(session.access_token);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setAssets([]); setFamilies([]); setLocalizacoes([]); setUtilizadores([]);
  };

  useEffect(() => {
    // Set favicon
    const existingFavicon = document.querySelector("link[rel*='icon']");
    const favicon = existingFavicon || document.createElement("link");
    favicon.type = "image/svg+xml";
    favicon.rel = "icon";
    favicon.href = FAVICON_DATA_URL;
    if (!existingFavicon) document.head.appendChild(favicon);
    // Set page title
    document.title = "GI Asset Manager";
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!stored?.access_token) { setSession(null); setAuthChecking(false); setLoading(false); return; }
      const user = await auth.getUser(stored.access_token);
      if (!user) { localStorage.removeItem(SESSION_KEY); setSession(null); setAuthChecking(false); setLoading(false); return; }
      setSession(stored);
      setAuthChecking(false);
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (!session) return;
    Promise.all([api.getAssets(), api.getFamilies(), api.getLocalizacoes(), api.getUtilizadores()])
      .then(([a,f,l,u]) => { setAssets(a||[]); setFamilies(f||[]); setLocalizacoes(l||[]); setUtilizadores(u||[]); })
      .catch(err => showToast("Erro ao carregar: "+(err.message||""),"error"))
      .finally(() => setLoading(false));
  }, [session]);

  const getFamilyName = id => families.find(f=>f.id===id)?.name||"—";

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || [a.name,a.serial,a.localizacao,a.modelo].some(v=>v?.toLowerCase().includes(q));
    const matchFamily = filterFamily==="all" || a.family_id===filterFamily;
    return matchSearch && matchFamily;
  });

  const handleSaveAsset = saved => {
    setAssets(prev => prev.find(a=>a.id===saved.id) ? prev.map(a=>a.id===saved.id?saved:a) : [saved,...prev]);
    showToast(editingAsset?"Ativo atualizado.":"Ativo adicionado.");
    setModal(null); setEditingAsset(null);
  };

  const handleDelete = async () => {
    try { await api.deleteAsset(deletingAsset.id); setAssets(prev=>prev.filter(a=>a.id!==deletingAsset.id)); showToast("Ativo removido."); }
    catch { showToast("Erro ao remover","error"); }
    finally { setModal(null); setDeletingAsset(null); setDetailAsset(null); }
  };

  // Section-specific content
  const renderSectionContent = () => {
    if (section === "families") return (
      <ListModal title="Famílias" icon="tag" items={families} nameKey="name" placeholder="Ex: Computador, Servidor..."
        onAdd={async name=>{ const res=await api.addFamily(name); setFamilies(f=>[...f,res[0]]); showToast("Família adicionada."); }}
        onRemove={async item=>{ await api.deleteFamily(item.id); setFamilies(f=>f.filter(x=>x.id!==item.id)); showToast("Família removida."); }}
        onClose={()=>setSection("assets")}/>
    );
    if (section === "localizacoes") return (
      <ListModal title="Localizações" icon="map" items={localizacoes} nameKey="nome" placeholder="Ex: Escritório Lisboa — Sala 2"
        onAdd={async nome=>{ const res=await api.addLocalizacao(nome); setLocalizacoes(l=>[...l,res[0]]); showToast("Localização adicionada."); }}
        onRemove={async item=>{ await api.deleteLocalizacao(item.id); setLocalizacoes(l=>l.filter(x=>x.id!==item.id)); showToast("Localização removida."); }}
        onClose={()=>setSection("assets")}/>
    );
    if (section === "utilizadores") return (
      <UtilizadoresModal utilizadores={utilizadores} onUpdate={setUtilizadores} onClose={()=>setSection("assets")} showToast={showToast}/>
    );
    return null;
  };



  if (authChecking) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{GLOBAL_CSS}</style>
      <Spinner/>
    </div>
  );

  if (!session) return <LoginScreen onLogin={s=>{ setSession(s); }}/>;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg, fontFamily:FONT_BODY }}>
      <style>{GLOBAL_CSS}</style>

      {/* Sidebar */}
      <Sidebar activeSection={section} onSection={s=>{ setSection(s); setDetailAsset(null); }} onLogout={handleLogout}/>

      {/* Main content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:"100vh", overflow:"hidden" }}>

        {/* Top bar */}
        <div style={{ padding:"0 32px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${T.border}`, background:T.surface, flexShrink:0 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, color:T.text, fontFamily:FONT_DISPLAY, letterSpacing:"-0.03em" }}>
              {section==="assets"?"Inventário de Ativos":section==="families"?"Famílias":section==="localizacoes"?"Localizações":"Utilizadores"}
            </h1>
          </div>
          {section==="assets" && (
            <button onClick={()=>setModal("add")} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 20px", borderRadius:20, background:T.amber, border:"none", color:T.bg, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:FONT_DISPLAY, letterSpacing:"0.04em", transition:"opacity 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <Icon name="plus" size={14} color={T.bg}/> NOVO ATIVO
            </button>
          )}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>

          {section === "assets" ? (
            <>


              {/* Toolbar */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <div style={{ flex:1, position:"relative" }}>
                  <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                    <Icon name="search" size={14} color={T.textDim}/>
                  </div>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por nome, modelo, série ou localização..."
                    style={{ ...fieldStyle, paddingLeft:38, background:T.surface }}
                    onFocus={e=>e.target.style.borderColor=T.amber} onBlur={e=>e.target.style.borderColor=T.border2}/>
                </div>
                <select value={filterFamily} onChange={e=>setFilterFamily(e.target.value)}
                  style={{ ...fieldStyle, width:"auto", minWidth:160, background:T.surface, cursor:"pointer" }}>
                  <option value="all">Todas as famílias</option>
                  {families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                {/* View toggle */}
                <div style={{ display:"flex", border:`1px solid ${T.border2}`, borderRadius:8, overflow:"hidden" }}>
                  {[["cards","grid"],["list","list"]].map(([v,icon])=>(
                    <button key={v} onClick={()=>setView(v)} style={{ padding:"8px 12px", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", background: view===v?T.amberGlow:T.surface, color: view===v?T.amber:T.textDim, transition:"all 0.15s" }}>
                      <Icon name={icon} size={15} color={view===v?T.amber:T.textDim}/>
                    </button>
                  ))}
                </div>
                <span style={{ fontSize:11, color:T.textDim, fontFamily:FONT_MONO, flexShrink:0 }}>{filtered.length} reg.</span>
              </div>

              {/* Content */}
              {loading ? <Spinner/> : filtered.length === 0 ? (
                <div style={{ textAlign:"center", padding:"80px 20px", color:T.textDim }}>
                  <Icon name="package" size={48} color={T.border2}/>
                  <p style={{ marginTop:16, fontSize:14, color:T.textMid, fontFamily:FONT_DISPLAY }}>Nenhum ativo encontrado</p>
                  <p style={{ fontSize:12, marginTop:4 }}>Ajusta os filtros ou adiciona um novo ativo.</p>
                </div>
              ) : view === "cards" ? (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
                  {filtered.map((asset,i) => {
                    const utilizador = utilizadores.find(u=>u.id===asset.utilizador_id)||null;
                    return (
                      <div key={asset.id} onClick={()=>setDetailAsset(asset)}
                        style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, overflow:"hidden", cursor:"pointer", transition:"border-color 0.2s, transform 0.2s", animation:`fadeUp 0.3s ease ${i*0.04}s both` }}
                        onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.border2; e.currentTarget.style.transform="translateY(-2px)"; }}
                        onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform="translateY(0)"; }}>
                        {/* Image */}
                        <div style={{ height:110, background:T.surface2, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
                          {asset.photo_url
                            ? <img src={asset.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
                            : <Avatar name={asset.name} size={56}/>
                          }
                          {asset.family_id && (
                            <div style={{ position:"absolute", top:8, right:8 }}><Badge label={getFamilyName(asset.family_id)}/></div>
                          )}
                        </div>
                        {/* Info */}
                        <div style={{ padding:"12px 14px" }}>
                          <h3 style={{ fontSize:13, fontWeight:600, color:T.text, fontFamily:FONT_DISPLAY, marginBottom:4, letterSpacing:"-0.02em" }}>{asset.name}</h3>
                          {asset.modelo && <p style={{ fontSize:11, color:T.textMid, fontWeight:300, marginBottom:2 }}>{asset.modelo}</p>}
                          {asset.serial && <p style={{ fontSize:10, color:T.textDim, fontFamily:FONT_MONO }}>#{asset.serial}</p>}
                          {utilizador && (
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8, paddingTop:8, borderTop:`1px solid ${T.border}` }}>
                              <Avatar src={utilizador.photo_url} name={utilizador.nome} size={18} round/>
                              <span style={{ fontSize:10, color:T.textMid }}>{utilizador.nome}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List view */
                <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                        {["Nome","Família","Modelo","Nº Série","Localização","Atribuído a",""].map((h,i)=>(
                          <th key={i} style={{ padding:"11px 16px", textAlign:"left", fontSize:10, fontWeight:500, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:FONT_DISPLAY, background:T.surface2 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((asset,i) => {
                        const utilizador = utilizadores.find(u=>u.id===asset.utilizador_id)||null;
                        return (
                          <tr key={asset.id} style={{ borderBottom:`1px solid ${T.border}`, cursor:"pointer", transition:"background 0.1s" }}
                            onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                            onClick={()=>setDetailAsset(asset)}>
                            <td style={{ padding:"12px 16px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <Avatar src={asset.photo_url} name={asset.name} size={30}/>
                                <span style={{ fontSize:13, fontWeight:600, color:T.text, fontFamily:FONT_DISPLAY }}>{asset.name}</span>
                              </div>
                            </td>
                            <td style={{ padding:"12px 16px" }}>
                              {asset.family_id ? <Badge label={getFamilyName(asset.family_id)}/> : <span style={{ color:T.textDim, fontSize:11 }}>—</span>}
                            </td>
                            <td style={{ padding:"12px 16px", fontSize:12, color:T.textMid }}>{asset.modelo||"—"}</td>
                            <td style={{ padding:"12px 16px", fontSize:11, color:T.textDim, fontFamily:FONT_MONO }}>{asset.serial||"—"}</td>
                            <td style={{ padding:"12px 16px", fontSize:12, color:T.textMid }}>{asset.localizacao||"—"}</td>
                            <td style={{ padding:"12px 16px" }}>
                              {utilizador ? (
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <Avatar src={utilizador.photo_url} name={utilizador.nome} size={26} round/>
                                  <span style={{ fontSize:12, color:T.text }}>{utilizador.nome}</span>
                                </div>
                              ) : <span style={{ color:T.textDim, fontSize:11 }}>—</span>}
                            </td>
                            <td style={{ padding:"12px 16px" }} onClick={e=>e.stopPropagation()}>
                              <div style={{ display:"flex", gap:6 }}>
                                <button onClick={()=>{ setEditingAsset(asset); setModal("edit"); }}
                                  style={{ background:T.surface3, border:`1px solid ${T.border2}`, color:T.textMid, borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center" }}><Icon name="edit" size={13}/></button>
                                <button onClick={()=>{ setDeletingAsset(asset); setModal("confirm"); }}
                                  style={{ background:T.redDim, border:"none", color:T.red, borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center" }}><Icon name="trash" size={13}/></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Section modals (sidebar nav) */}
      {section !== "assets" && renderSectionContent()}

      {/* Asset detail panel */}
      {detailAsset && (
        <AssetDetail asset={detailAsset} families={families} utilizadores={utilizadores}
          onEdit={()=>{ setEditingAsset(detailAsset); setModal("edit"); setDetailAsset(null); }}
          onDelete={()=>{ setDeletingAsset(detailAsset); setModal("confirm"); setDetailAsset(null); }}
          onClose={()=>setDetailAsset(null)}/>
      )}

      {/* Modals */}
      {(modal==="add"||modal==="edit") && (
        <AssetModal asset={modal==="edit"?editingAsset:null} families={families} localizacoes={localizacoes} utilizadores={utilizadores}
          onSave={handleSaveAsset} onClose={()=>{ setModal(null); setEditingAsset(null); }} showToast={showToast}/>
      )}
      {modal==="confirm" && deletingAsset && (
        <ConfirmModal asset={deletingAsset} onConfirm={handleDelete} onClose={()=>{ setModal(null); setDeletingAsset(null); }}/>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}