import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Dynamic library loader ──────────────────────────────────
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

// ── Date formatting (PT locale, no external lib needed) ──────
function fmtDate(str) {
  if (!str) return null;
  try {
    const d = new Date(str);
    return d.toLocaleDateString("pt-PT", { day:"2-digit", month:"2-digit", year:"numeric" });
  } catch { return str; }
}
function fmtRelDate(str) {
  if (!str) return null;
  try {
    const d = new Date(str); const now = new Date();
    const diff = Math.round((now - d) / 86400000);
    if (diff === 0) return "hoje";
    if (diff === 1) return "ontem";
    if (diff < 30) return `há ${diff} dias`;
    if (diff < 365) return `há ${Math.round(diff/30)} meses`;
    return `há ${Math.round(diff/365)} anos`;
  } catch { return str; }
}

const SUPABASE_URL = "https://esongdnufiypzcaodwxb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzb25nZG51Zml5cHpjYW9kd3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTk2NTUsImV4cCI6MjA4ODA5NTY1NX0.QSVC08TbciKgDSQPOj_YOvw6oxogY1L_nw6kpfkz3QE";

function getAuthToken() {
  try {
    const raw = sessionStorage.getItem("gi_session");
    const session = raw ? JSON.parse(raw) : null;
    return session?.access_token || SUPABASE_ANON_KEY;
  } catch { return SUPABASE_ANON_KEY; }
}

async function sbFetch(path, options = {}) {
  const token = getAuthToken();
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "",
      ...options.headers,
    },
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  getAssets:        () => sbFetch("/assets?select=*&order=created_at.desc"),
  getFamilies:      () => sbFetch("/families?select=*&order=name.asc"),
  getLocalizacoes:  () => sbFetch("/localizacoes?select=*&order=nome.asc"),
  addAsset:         (data) => sbFetch("/assets", { method:"POST", prefer:"return=representation", body:JSON.stringify(data) }),
  updateAsset:      (id, data) => sbFetch(`/assets?id=eq.${id}`, { method:"PATCH", prefer:"return=representation", body:JSON.stringify(data) }),
  deleteAsset:      (id) => sbFetch(`/assets?id=eq.${id}`, { method:"DELETE" }),
  addFamily:        (data) => sbFetch("/families", { method:"POST", prefer:"return=representation", body:JSON.stringify(data) }),
  updateFamily:     (id, data) => sbFetch(`/families?id=eq.${id}`, { method:"PATCH", prefer:"return=representation", body:JSON.stringify(data) }),
  deleteFamily:     (id) => sbFetch(`/families?id=eq.${id}`, { method:"DELETE" }),
  addLocalizacao:   (nome) => sbFetch("/localizacoes", { method:"POST", prefer:"return=representation", body:JSON.stringify({ nome }) }),
  deleteLocalizacao:(id) => sbFetch(`/localizacoes?id=eq.${id}`, { method:"DELETE" }),
  getUtilizadores:  () => sbFetch("/utilizadores?select=*&order=nome.asc"),
  addUtilizador:    (data) => sbFetch("/utilizadores", { method:"POST", prefer:"return=representation", body:JSON.stringify(data) }),
  updateUtilizador: (id, data) => sbFetch(`/utilizadores?id=eq.${id}`, { method:"PATCH", prefer:"return=representation", body:JSON.stringify(data) }),
  deleteUtilizador: (id) => sbFetch(`/utilizadores?id=eq.\${id}`, { method:"DELETE" }),
  getMarcas:        () => sbFetch("/marcas?select=*&order=nome.asc"),
  addMarca:         (nome) => sbFetch("/marcas", { method:"POST", prefer:"return=representation", body:JSON.stringify({ nome }) }),
  deleteMarca:      (id) => sbFetch(`/marcas?id=eq.\${id}`, { method:"DELETE" }),
  uploadPhoto: async (file) => {
    const token = getAuthToken();
    const ext = file.name.split(".").pop();
    const filename = `${Date.now()}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${filename}`, {
      method:"POST",
      headers:{ "apikey":SUPABASE_ANON_KEY, "Authorization":`Bearer ${token}`, "Content-Type":file.type },
      body: file,
    });
    if (!res.ok) throw new Error("Erro ao fazer upload da foto");
    return `${SUPABASE_URL}/storage/v1/object/public/photos/${filename}`;
  },
};

// ============================================================
// SUPABASE AUTH
// ============================================================
const auth = {
  signIn: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Erro de autenticação");
    return data; // { access_token, refresh_token, user, ... }
  },
  signOut: async (accessToken) => {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  },
  getSession: () => {
    try {
      const raw = sessionStorage.getItem("gi_session");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  saveSession: (session) => {
    sessionStorage.setItem("gi_session", JSON.stringify(session));
  },
  clearSession: () => {
    sessionStorage.removeItem("gi_session");
  },
};


const C = {
  dark:"#333F48", darkMid:"#4a5563",
  yellow:"#e0cb4b", yellowLight:"#f5f0c0", yellowMid:"#ede28a",
  gray:"#8d9190", grayLight:"#f0f0ef", grayMid:"#d4d5d4",
  white:"#FFFFFF", text:"#333F48", textLight:"#8d9190", textMid:"#5a6370",
  danger:"#c0392b", dangerLight:"#fdecea", border:"#dddedd",
};
const FONT = "'Inter','Helvetica Neue',Arial,sans-serif";
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; }
  body { margin:0; font-family:${FONT}; font-weight:300; }
  input,select,button,textarea { font-family:${FONT}; font-weight:300; }
  ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:#f0f0ef; } ::-webkit-scrollbar-thumb { background:#d4d5d4; border-radius:3px; }
  @media (max-width:768px) {
    .hide-mobile { display:none !important; }
    .header-title-full { display:none !important; }
    .header-title-short { display:inline !important; }
    .table-col-hide { display:none !important; }
    .table-actions-hide { display:none !important; }
    .toolbar-views { display:none !important; }
  }
  @media (min-width:769px) {
    .header-title-short { display:none !important; }
  }
`;

// Campos por secção
const SECTIONS = [
  {
    key: "computador", label: "Computador",
    fields: [
      { key:"modelo",  label:"Modelo",            type:"text",   placeholder:"Ex: Dell OptiPlex 7090" },
      { key:"serial",  label:"Número de Série",   type:"text",   placeholder:"Ex: SN-2024-00123" },
      { key:"cpu",     label:"CPU",               type:"text",   placeholder:"Ex: Intel Core i7-12700" },
      { key:"memoria", label:"Memória RAM",        type:"text",   placeholder:"Ex: 16GB DDR4" },
      { key:"hdd",     label:"HDD / SSD",         type:"text",   placeholder:"Ex: 512GB SSD NVMe" },
      { key:"gpu",     label:"GPU",               type:"text",   placeholder:"Ex: NVIDIA GTX 1650" },
      { key:"so",      label:"Sistema Operativo", type:"text",   placeholder:"Ex: Windows 11 Pro" },
    ]
  },
  {
    key: "software", label: "Software",
    fields: [
      { key:"ms365", label:"Microsoft 365", type:"boolean" },
    ]
  },
  {
    key: "geral", label: "Geral",
    fields: [
      { key:"localizacao", label:"Localização", type:"text", placeholder:"Ex: Escritório Lisboa — Sala 2" },
      { key:"foto",        label:"Fotografia",  type:"photo" },
    ]
  },
  {
    key: "monitor", label: "Monitor",
    fields: [
      { key:"monitor_marca",     label:"Marca",      type:"text",   placeholder:"Ex: LG" },
      { key:"monitor_modelo",    label:"Modelo",     type:"text",   placeholder:"Ex: 27UK850-W" },
      { key:"monitor_polegadas", label:"Polegadas",  type:"text",   placeholder:"Ex: 27\"" },
      { key:"monitor_quantidade",label:"Quantidade", type:"number", placeholder:"Ex: 2" },
    ]
  },
  {
    key: "rede", label: "Rede",
    fields: [
      { key:"dominio",         label:"Domínio",          type:"text", placeholder:"Ex: empresa.local" },
      { key:"grupo_trabalho",  label:"Grupo de Trabalho",type:"text", placeholder:"Ex: WORKGROUP" },
    ]
  },
  {
    key: "observacoes", label: "Observações",
    fields: [
      { key:"observacoes", label:"Observações", type:"textarea", placeholder:"Notas adicionais sobre este ativo..." },
    ]
  },
];

const EMPTY_FORM = {
  name:"", family_id:"", photo_url:"",
  cpu:"", hdd:"", memoria:"", modelo:"", gpu:"", serial:"", so:"",
  ms365: false,
  localizacao:"",
  monitor_marca:"", monitor_modelo:"", monitor_serial:"", monitor_polegadas:"", monitor_quantidade:"",
  dominio:"", grupo_trabalho:"", ip:"", dhcp:false,
  observacoes:"",
  utilizador_id:"",
  // Smartphone — Equipamento
  sm_marca_id:"", sm_modelo:"", sm_nr_telefone:"", sm_imei1:"", sm_imei2:"",
  sm_data_compra:"", sm_data_entrega:"", sm_obs:"",
  // Smartphone — Tarifário
  sm_tarifario:"", sm_nr_cartao:"", sm_pin:"", sm_puk:"",
  sm_plafond_dados:"", sm_ilimitado:false,
};

function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

const PhotoPlaceholder = ({ size=48, name }) => {
  const initials = name ? name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() : "?";
  return (
    <div style={{ width:size, height:size, borderRadius:size>60?10:6, background:C.yellowLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size/3.2, fontWeight:500, color:C.dark, flexShrink:0, border:`1px solid ${C.yellowMid}`, letterSpacing:"0.05em" }}>
      {initials}
    </div>
  );
};

const Badge = ({ label }) => (
  <span style={{ background:C.yellowLight, color:C.dark, borderRadius:4, padding:"2px 8px", fontSize:10, fontWeight:500, border:`1px solid ${C.yellowMid}`, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</span>
);

const Spinner = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
    <div style={{ width:36, height:36, border:`3px solid ${C.grayMid}`, borderTop:`3px solid ${C.yellow}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
    <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
  </div>
);

const Toast = ({ msg, type }) => (
  <div style={{ position:"fixed", bottom:24, right:24, zIndex:2000, background:type==="error"?C.danger:C.dark, color:C.white, padding:"12px 20px", borderRadius:6, fontWeight:400, fontSize:13, boxShadow:"0 4px 24px rgba(0,0,0,0.18)", letterSpacing:"0.01em" }}>
    {type==="error"?"✕":"✓"} {msg}
  </div>
);

const lbl = { fontSize:10, fontWeight:500, color:C.textLight, marginBottom:5, display:"block", textTransform:"uppercase", letterSpacing:"0.1em" };
const inp = (err) => ({ width:"100%", padding:"8px 11px", borderRadius:4, fontSize:13, fontWeight:300, border:`1px solid ${err?C.danger:C.grayMid}`, outline:"none", background:C.white, color:C.text, letterSpacing:"0.01em" });

function SectionHeader({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"20px 0 14px" }}>
      <div style={{ width:3, height:16, background:C.yellow, borderRadius:2, flexShrink:0 }}/>
      <span style={{ fontSize:10, fontWeight:600, color:C.dark, textTransform:"uppercase", letterSpacing:"0.12em" }}>{label}</span>
      <div style={{ flex:1, height:1, background:C.border }}/>
    </div>
  );
}

function AssetModal({ asset, families, localizacoes, utilizadores, marcas, onSave, onClose, showToast, onAddLocalizacao, onAddMarca }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, family_id: families[0]?.id||"", ...asset });
  const [photoPreview, setPhotoPreview] = useState(asset?.photo_url||null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [newLocInput, setNewLocInput] = useState("");
  const [addingLoc, setAddingLoc] = useState(false);
  const [savingLoc, setSavingLoc] = useState(false);
  const fileRef = useRef();

  // Derive which sections to show based on selected family
  const selectedFamily = families.find(f => f.id === form.family_id) || null;
  const familySections = selectedFamily?.secoes || null; // null = no family = show all
  const showSection = (key) => !familySections || familySections.includes(key);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    return e;
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploading(true);
    try { const url = await api.uploadPhoto(file); setForm(f=>({...f, photo_url:url})); }
    catch { showToast("Erro ao fazer upload da foto","error"); }
    finally { setUploading(false); }
  };

  const set = (key, val) => setForm(f=>({...f,[key]:val}));

  const handleQuickAddLoc = async () => {
    if (!newLocInput.trim()) return;
    setSavingLoc(true);
    try {
      const res = await api.addLocalizacao(newLocInput.trim());
      const newLoc = res[0];
      onAddLocalizacao(newLoc);
      set("localizacao", newLoc.nome);
      setAddingLoc(false);
      setNewLocInput("");
      showToast("Localização criada");
    } catch { showToast("Erro ao criar localização","error"); }
    finally { setSavingLoc(false); }
  };

  const [addingMarca, setAddingMarca] = useState(false);
  const [newMarcaInput, setNewMarcaInput] = useState("");
  const [savingMarca, setSavingMarca] = useState(false);

  const handleQuickAddMarca = async () => {
    if (!newMarcaInput.trim()) return;
    setSavingMarca(true);
    try {
      const res = await api.addMarca(newMarcaInput.trim());
      const newM = res[0];
      onAddMarca(newM);
      set("sm_marca_id", newM.id);
      setAddingMarca(false);
      setNewMarcaInput("");
      showToast("Marca criada");
    } catch { showToast("Erro ao criar marca","error"); }
    finally { setSavingMarca(false); }
  };

  const handleSubmit = async () => {
    const e = validate(); if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        family_id: form.family_id||null,
        photo_url: form.photo_url||null,
        cpu: form.cpu||null,
        hdd: form.hdd||null,
        memoria: form.memoria||null,
        modelo: form.modelo||null,
        gpu: form.gpu||null,
        serial: form.serial||null,
        so: form.so||null,
        ms365: form.ms365===true ? true : form.ms365===false ? false : null,
        localizacao: form.localizacao||null,
        monitor_marca: form.monitor_marca||null,
        monitor_modelo: form.monitor_modelo||null,
        monitor_serial: form.monitor_serial||null,
        monitor_polegadas: form.monitor_polegadas||null,
        monitor_quantidade: form.monitor_quantidade||null,
        dominio: form.dominio||null,
        grupo_trabalho: form.grupo_trabalho||null,
        ip: form.dhcp ? null : (form.ip||null),
        dhcp: form.dhcp===true ? true : false,
        observacoes: form.observacoes||null,
        utilizador_id: form.utilizador_id||null,
        sm_marca_id: form.sm_marca_id||null,
        sm_modelo: form.sm_modelo||null,
        sm_nr_telefone: form.sm_nr_telefone||null,
        sm_imei1: form.sm_imei1||null,
        sm_imei2: form.sm_imei2||null,
        sm_data_compra: form.sm_data_compra||null,
        sm_data_entrega: form.sm_data_entrega||null,
        sm_obs: form.sm_obs||null,
        sm_tarifario: form.sm_tarifario||null,
        sm_nr_cartao: form.sm_nr_cartao||null,
        sm_pin: form.sm_pin||null,
        sm_puk: form.sm_puk||null,
        sm_plafond_dados: form.sm_ilimitado ? "Ilimitado" : (form.sm_plafond_dados||null),
        sm_ilimitado: form.sm_ilimitado===true ? true : false,
      };
      const res = asset?.id ? await api.updateAsset(asset.id, payload) : await api.addAsset(payload);
      onSave(res[0]);
    } catch(err) {
      console.error("Erro ao guardar:", err);
      showToast("Erro: " + (err.message||"desconhecido"), "error");
    }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(51,63,72,0.45)", backdropFilter:"blur(3px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
      <div style={{ background:C.white, borderRadius:10, width:"100%", maxWidth:600, boxShadow:"0 24px 64px rgba(0,0,0,0.2)", overflow:"hidden", margin:"auto", maxHeight:"95vh", display:"flex", flexDirection:"column" }}>

        {/* Header modal */}
        <div style={{ background:C.dark, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h2 style={{ color:C.white, margin:0, fontSize:14, fontWeight:400, letterSpacing:"0.1em", textTransform:"uppercase" }}>{asset?.id ? "Editar Ativo" : "Novo Ativo"}</h2>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:C.white, borderRadius:4, width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ padding:"8px 16px 24px", flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>

          {/* Identificação com foto */}
          <SectionHeader label="Identificação"/>
          <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
            {/* Foto */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
              <div style={{ position:"relative", width:88, height:108, borderRadius:6, overflow:"hidden", border:`1px solid ${C.grayMid}`, background:C.grayLight, cursor:"pointer" }} onClick={()=>fileRef.current.click()}>
                {photoPreview
                  ? <img src={photoPreview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
                  : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><PhotoPlaceholder size={56} name={form.name}/></div>
                }
                <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.35)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0)"}>
                  <span style={{ color:"white", fontSize:10, fontWeight:500, opacity:0, transition:"opacity 0.2s" }}
                    onMouseEnter={e=>e.currentTarget.style.opacity=1}
                    onMouseLeave={e=>e.currentTarget.style.opacity=0}>Alterar</span>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }}/>
            </div>
            {/* Campos de identificação */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={lbl}>Nome / Designação *</label>
                <input style={inp(errors.name)} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Ex: PC Receção 01"/>
                {errors.name && <span style={{color:C.danger,fontSize:11,marginTop:3,display:"block"}}>{errors.name}</span>}
              </div>
              <div>
                <label style={lbl}>Família</label>
                <select value={form.family_id||""} onChange={e=>set("family_id",e.target.value)} style={{...inp(), cursor:"pointer"}}>
                  <option value="">— Sem família —</option>
                  {families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* COMPUTADOR */}
          {showSection("computador") && <SectionHeader label="Computador"/>}
          {showSection("computador") && <>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12 }}>
            {/* Modelo — largo */}
            <div>
              <label style={lbl}>Modelo</label>
              <input style={inp()} value={form.modelo||""} onChange={e=>{set("modelo",e.target.value);}} placeholder="Ex: Dell OptiPlex 7090"/>
            </div>
            {/* Nº Série — estreito */}
            <div>
              <label style={lbl}>Nº Série</label>
              <input style={inp()} value={form.serial||""} onChange={e=>{set("serial",e.target.value);}} placeholder="Ex: SN-00123"/>
            </div>
            {/* CPU */}
            <div>
              <label style={lbl}>CPU</label>
              <input style={inp()} value={form.cpu||""} onChange={e=>{set("cpu",e.target.value);}} placeholder="Ex: Intel Core i7-12700"/>
            </div>
            {/* Memória */}
            <div>
              <label style={lbl}>Memória RAM</label>
              <input style={inp()} value={form.memoria||""} onChange={e=>{set("memoria",e.target.value);}} placeholder="Ex: 16GB DDR4"/>
            </div>
            {/* HDD */}
            <div>
              <label style={lbl}>HDD / SSD</label>
              <input style={inp()} value={form.hdd||""} onChange={e=>{set("hdd",e.target.value);}} placeholder="Ex: 512GB SSD NVMe"/>
            </div>
            {/* GPU */}
            <div>
              <label style={lbl}>GPU</label>
              <input style={inp()} value={form.gpu||""} onChange={e=>{set("gpu",e.target.value);}} placeholder="Ex: NVIDIA GTX 1650"/>
            </div>
            {/* SO — span completo */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Sistema Operativo</label>
              <input style={inp()} value={form.so||""} onChange={e=>{set("so",e.target.value);}} placeholder="Ex: Windows 11 Pro"/>
            </div>
          </div>
          </>}

          {/* SOFTWARE */}
          {showSection("software") && <SectionHeader label="Software"/>}
          {showSection("software") && <>
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:C.grayLight, borderRadius:5, border:`1px solid ${C.border}` }}>
            <label style={{ ...lbl, margin:0, flex:1 }}>Microsoft 365</label>
            <div style={{ display:"flex", gap:0, border:`1px solid ${C.grayMid}`, borderRadius:4, overflow:"hidden" }}>
              {["Sim","Não"].map(opt=>(
                <button key={opt} onClick={()=>set("ms365", opt==="Sim")}
                  style={{ padding:"6px 20px", border:"none", cursor:"pointer", fontSize:12, fontWeight: (form.ms365===true&&opt==="Sim")||(form.ms365===false&&opt==="Não") ? 500 : 300,
                    background: (form.ms365===true&&opt==="Sim") ? C.dark : (form.ms365===false&&opt==="Não") ? C.danger : C.white,
                    color: (form.ms365===true&&opt==="Sim")||(form.ms365===false&&opt==="Não") ? C.white : C.textLight,
                    letterSpacing:"0.04em", transition:"all 0.15s" }}>{opt}</button>
              ))}
            </div>
          </div>
          </>}

          {/* GERAL */}
          {showSection("geral") && <SectionHeader label="Geral"/>}
          {showSection("geral") && <>
          <div>
            <label style={lbl}>Localização</label>
            {!addingLoc ? (
              <div style={{ display:"flex", gap:8 }}>
                <select value={form.localizacao||""} onChange={e=>set("localizacao",e.target.value)} style={{...inp(), cursor:"pointer", flex:1}}>
                  <option value="">— Selecionar localização —</option>
                  {localizacoes.map(l=><option key={l.id} value={l.nome}>{l.nome}</option>)}
                </select>
                <button onClick={()=>setAddingLoc(true)} title="Criar nova localização"
                  style={{ padding:"0 12px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:C.grayLight, color:C.dark, cursor:"pointer", fontSize:16, fontWeight:400, flexShrink:0, height:36 }}>+</button>
              </div>
            ) : (
              <div style={{ display:"flex", gap:8 }}>
                <input autoFocus value={newLocInput} onChange={e=>setNewLocInput(e.target.value)}
                  onKeyDown={async e=>{ if(e.key==="Enter") { await handleQuickAddLoc(); } if(e.key==="Escape") { setAddingLoc(false); setNewLocInput(""); } }}
                  placeholder="Nome da nova localização..." style={{...inp(), flex:1}}/>
                <button disabled={savingLoc} onClick={handleQuickAddLoc}
                  style={{ padding:"0 14px", borderRadius:4, border:"none", background:C.dark, color:C.white, cursor:"pointer", fontSize:12, fontWeight:500, flexShrink:0, height:36, letterSpacing:"0.04em" }}>
                  {savingLoc?"...":"Criar"}
                </button>
                <button onClick={()=>{ setAddingLoc(false); setNewLocInput(""); }}
                  style={{ padding:"0 10px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:C.white, color:C.textLight, cursor:"pointer", flexShrink:0, height:36, fontSize:13 }}>✕</button>
              </div>
            )}
          </div>
          </>}

          {/* MONITOR */}
          {showSection("monitor") && <SectionHeader label="Monitor"/>}
          {showSection("monitor") && <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={lbl}>Marca</label>
              <input style={inp()} value={form.monitor_marca||""} onChange={e=>set("monitor_marca",e.target.value)} placeholder="Ex: LG"/>
            </div>
            <div>
              <label style={lbl}>Modelo</label>
              <input style={inp()} value={form.monitor_modelo||""} onChange={e=>set("monitor_modelo",e.target.value)} placeholder="Ex: 27UK850-W"/>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Número de Série</label>
              <input style={inp()} value={form.monitor_serial||""} onChange={e=>set("monitor_serial",e.target.value)} placeholder="Ex: SN-MON-00456"/>
            </div>
            <div>
              <label style={lbl}>Polegadas</label>
              <input style={inp()} value={form.monitor_polegadas||""} onChange={e=>set("monitor_polegadas",e.target.value)} placeholder='Ex: 27"'/>
            </div>
            <div>
              <label style={lbl}>Quantidade</label>
              <input style={inp()} type="number" value={form.monitor_quantidade||""} onChange={e=>set("monitor_quantidade",e.target.value)} placeholder="Ex: 2"/>
            </div>
          </div>
          </>}

          {/* REDE */}
          {showSection("rede") && <SectionHeader label="Rede"/>}
          {showSection("rede") && <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={lbl}>Domínio</label>
              <input
                style={{ ...inp(), background:form.grupo_trabalho?C.grayLight:C.white, color:form.grupo_trabalho?C.textLight:C.text, cursor:form.grupo_trabalho?"not-allowed":"text" }}
                value={form.grupo_trabalho ? "" : (form.dominio||"")}
                onChange={e=>{ if(!form.grupo_trabalho) set("dominio",e.target.value); }}
                disabled={!!form.grupo_trabalho}
                placeholder={form.grupo_trabalho?"(inativo — Grupo de Trabalho selecionado)":"Ex: empresa.local"}
              />
            </div>
            <div>
              <label style={lbl}>Grupo de Trabalho</label>
              <input
                style={{ ...inp(), background:form.dominio?C.grayLight:C.white, color:form.dominio?C.textLight:C.text, cursor:form.dominio?"not-allowed":"text" }}
                value={form.dominio ? "" : (form.grupo_trabalho||"")}
                onChange={e=>{ if(!form.dominio) set("grupo_trabalho",e.target.value); }}
                disabled={!!form.dominio}
                placeholder={form.dominio?"(inativo — Domínio selecionado)":"Ex: WORKGROUP"}
              />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <label style={{ ...lbl, margin:0 }}>Endereço IP</label>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:10, color:form.dhcp?C.dark:C.textLight, fontWeight:form.dhcp?600:300, textTransform:"uppercase", letterSpacing:"0.08em", transition:"color 0.15s" }}>DHCP</span>
                  <div onClick={()=>set("dhcp",!form.dhcp)} style={{ width:36, height:20, borderRadius:10, background:form.dhcp?C.dark:C.grayMid, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                    <div style={{ position:"absolute", top:2, left:form.dhcp?18:2, width:16, height:16, borderRadius:"50%", background:form.dhcp?C.yellow:C.white, transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.25)" }}/>
                  </div>
                </div>
              </div>
              <input
                style={{ ...inp(), background:form.dhcp?C.grayLight:"white", color:form.dhcp?C.textLight:C.text, cursor:form.dhcp?"not-allowed":"text" }}
                value={form.dhcp?"(Automático — DHCP)":form.ip||""}
                onChange={e=>{ if(!form.dhcp) set("ip",e.target.value); }}
                disabled={form.dhcp}
                placeholder="Ex: 192.168.1.100"
              />
            </div>
          </div>
          </>}

          {/* SMARTPHONE — EQUIPAMENTO */}
          {showSection("sm_equipamento") && <SectionHeader label="Equipamento"/>}
          {showSection("sm_equipamento") && <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Marca</label>
              {!addingMarca ? (
                <div style={{ display:"flex", gap:8 }}>
                  <select value={form.sm_marca_id||""} onChange={e=>set("sm_marca_id",e.target.value)} style={{...inp(), cursor:"pointer", flex:1}}>
                    <option value="">— Selecionar marca —</option>
                    {marcas.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  <button onClick={()=>setAddingMarca(true)} title="Criar nova marca"
                    style={{ padding:"0 12px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:C.grayLight, color:C.dark, cursor:"pointer", fontSize:16, flexShrink:0, height:36 }}>+</button>
                </div>
              ) : (
                <div style={{ display:"flex", gap:8 }}>
                  <input autoFocus value={newMarcaInput} onChange={e=>setNewMarcaInput(e.target.value)}
                    onKeyDown={async e=>{ if(e.key==="Enter") await handleQuickAddMarca(); if(e.key==="Escape"){ setAddingMarca(false); setNewMarcaInput(""); }}}
                    placeholder="Nome da nova marca..." style={{...inp(), flex:1}}/>
                  <button disabled={savingMarca} onClick={handleQuickAddMarca}
                    style={{ padding:"0 14px", borderRadius:4, border:"none", background:C.dark, color:C.white, cursor:"pointer", fontSize:12, fontWeight:500, flexShrink:0, height:36 }}>
                    {savingMarca?"...":"Criar"}
                  </button>
                  <button onClick={()=>{ setAddingMarca(false); setNewMarcaInput(""); }}
                    style={{ padding:"0 10px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:C.white, color:C.textLight, cursor:"pointer", flexShrink:0, height:36, fontSize:13 }}>✕</button>
                </div>
              )}
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Modelo</label>
              <input style={inp()} value={form.sm_modelo||""} onChange={e=>set("sm_modelo",e.target.value)} placeholder="Ex: iPhone 15 Pro"/>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                <label style={{ ...lbl, margin:0 }}>Nº Telefone</label>
                {form.utilizador_id && utilizadores.find(u=>u.id===form.utilizador_id)?.telefone && (
                  <button type="button" onClick={()=>set("sm_nr_telefone", utilizadores.find(u=>u.id===form.utilizador_id).telefone)}
                    style={{ fontSize:9, fontWeight:500, color:C.dark, background:C.yellowLight, border:`1px solid ${C.yellowMid}`, borderRadius:3, padding:"2px 8px", cursor:"pointer", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                    ↙ Importar do utilizador
                  </button>
                )}
              </div>
              <input style={inp()} value={form.sm_nr_telefone||""} onChange={e=>set("sm_nr_telefone",e.target.value)} placeholder="Ex: +351 912 345 678"/>
            </div>
            <div>
              <label style={lbl}>IMEI 1</label>
              <input style={inp()} value={form.sm_imei1||""} onChange={e=>set("sm_imei1",e.target.value)} placeholder="Ex: 352099001761481"/>
            </div>
            <div>
              <label style={lbl}>IMEI 2</label>
              <input style={inp()} value={form.sm_imei2||""} onChange={e=>set("sm_imei2",e.target.value)} placeholder="Ex: 352099001761482"/>
            </div>
            <div>
              <label style={lbl}>Data de Compra</label>
              <input style={inp()} type="date" value={form.sm_data_compra||""} onChange={e=>set("sm_data_compra",e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Data de Entrega</label>
              <input style={inp()} type="date" value={form.sm_data_entrega||""} onChange={e=>set("sm_data_entrega",e.target.value)}/>
            </div>
          </div>
          </>}

          {/* SMARTPHONE — TARIFÁRIO */}
          {showSection("sm_tarifario") && <SectionHeader label="Tarifário"/>}
          {showSection("sm_tarifario") && <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Tarifário</label>
              <input style={inp()} value={form.sm_tarifario||""} onChange={e=>set("sm_tarifario",e.target.value)} placeholder="Ex: MEO Total 50GB"/>
            </div>
            <div>
              <label style={lbl}>Nº Cartão</label>
              <input style={inp()} value={form.sm_nr_cartao||""} onChange={e=>set("sm_nr_cartao",e.target.value)} placeholder="Ex: 351 912 345 678"/>
            </div>
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <label style={{ ...lbl, margin:0 }}>Plafond Dados</label>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:10, color:form.sm_ilimitado?C.dark:C.textLight, fontWeight:form.sm_ilimitado?600:300, textTransform:"uppercase", letterSpacing:"0.08em", transition:"color 0.15s" }}>Ilimitado</span>
                  <div onClick={()=>set("sm_ilimitado",!form.sm_ilimitado)} style={{ width:36, height:20, borderRadius:10, background:form.sm_ilimitado?C.dark:C.grayMid, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                    <div style={{ position:"absolute", top:2, left:form.sm_ilimitado?18:2, width:16, height:16, borderRadius:"50%", background:form.sm_ilimitado?C.yellow:C.white, transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.25)" }}/>
                  </div>
                </div>
              </div>
              <input
                style={{ ...inp(), background:form.sm_ilimitado?C.grayLight:C.white, color:form.sm_ilimitado?C.textLight:C.text, cursor:form.sm_ilimitado?"not-allowed":"text" }}
                value={form.sm_ilimitado?"(Ilimitado)":form.sm_plafond_dados||""}
                onChange={e=>{ if(!form.sm_ilimitado) set("sm_plafond_dados",e.target.value); }}
                disabled={form.sm_ilimitado}
                placeholder="Ex: 50 GB"
              />
            </div>
            <div>
              <label style={lbl}>PIN Original</label>
              <input style={inp()} value={form.sm_pin||""} onChange={e=>set("sm_pin",e.target.value)} placeholder="Ex: 1234"/>
            </div>
            <div>
              <label style={lbl}>PUK</label>
              <input style={inp()} value={form.sm_puk||""} onChange={e=>set("sm_puk",e.target.value)} placeholder="Ex: 12345678"/>
            </div>
          </div>
          </>}

          {/* ATRIBUIÇÃO */}
          {showSection("atribuicao") && <SectionHeader label="Atribuído a"/>}
          {showSection("atribuicao") && <>
          <div>
            <label style={lbl}>Utilizador</label>
            <select value={form.utilizador_id||""} onChange={e=>{
              const uid = e.target.value;
              set("utilizador_id", uid);
              if (uid) {
                const u = utilizadores.find(x=>x.id===uid);
                if (u?.telefone && !form.sm_nr_telefone) set("sm_nr_telefone", u.telefone);
              }
            }} style={{...inp(), cursor:"pointer"}}>
              <option value="">— Não atribuído —</option>
              {utilizadores.map(u=>(
                <option key={u.id} value={u.id}>{u.nome}{u.email ? ` — ${u.email}` : ""}</option>
              ))}
            </select>
          </div>
          </>}

          {/* OBSERVAÇÕES */}
          {showSection("observacoes") && <SectionHeader label="Observações"/>}
          {showSection("observacoes") && <>
          <div>
            <textarea
              value={form.observacoes||""}
              onChange={e=>set("observacoes",e.target.value)}
              placeholder="Notas adicionais sobre este ativo..."
              rows={4}
              style={{ width:"100%", padding:"9px 11px", borderRadius:4, fontSize:13, fontWeight:300, border:`1px solid ${C.grayMid}`, outline:"none", background:C.white, color:C.text, letterSpacing:"0.01em", resize:"vertical", lineHeight:1.6 }}
            />
          </div>
          </>}

        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10, background:C.grayLight }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:C.white, color:C.textLight, cursor:"pointer", fontWeight:400, fontSize:12, letterSpacing:"0.05em", textTransform:"uppercase" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving||uploading} style={{ flex:2, padding:"10px", borderRadius:4, border:"none", background:C.dark, color:C.white, cursor:"pointer", fontWeight:400, fontSize:12, letterSpacing:"0.08em", textTransform:"uppercase", opacity:saving?0.7:1 }}>
            {saving ? "A guardar..." : asset?.id ? "Guardar Alterações" : "Adicionar Ativo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UtilizadoresModal({ utilizadores, onUpdate, onClose, showToast }) {
  const [list, setList] = useState([...utilizadores]);
  const [modal, setModal] = useState(null); // null | "add" | "edit"
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome:"", email:"", telefone:"", photo_url:"" });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const openAdd = () => { setForm({ nome:"", email:"", telefone:"", photo_url:"" }); setPhotoPreview(null); setEditing(null); setModal("form"); };
  const openEdit = (u) => { setForm({ nome:u.nome||"", email:u.email||"", telefone:u.telefone||"", photo_url:u.photo_url||"" }); setPhotoPreview(u.photo_url||null); setEditing(u); setModal("form"); };

  const handlePhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploading(true);
    try { const url = await api.uploadPhoto(file); setForm(f=>({...f, photo_url:url})); }
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
      setModal(null);
    } catch(err) { showToast("Erro ao guardar: "+(err.message||""),"error"); }
    finally { setSaving(false); }
  };

  const remove = async (u) => {
    try { await api.deleteUtilizador(u.id); const updated=list.filter(x=>x.id!==u.id); setList(updated); onUpdate(updated); }
    catch { showToast("Erro ao remover","error"); }
  };

  const lbl2 = { fontSize:10, fontWeight:500, color:C.textLight, marginBottom:4, display:"block", textTransform:"uppercase", letterSpacing:"0.1em" };
  const inp2 = () => ({ width:"100%", padding:"8px 11px", borderRadius:4, fontSize:13, fontWeight:300, border:`1px solid ${C.grayMid}`, outline:"none", background:C.white, color:C.text });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(51,63,72,0.45)", backdropFilter:"blur(3px)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:10, width:"100%", maxWidth:520, boxShadow:"0 24px 64px rgba(0,0,0,0.2)", overflow:"hidden", maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
        <div style={{ background:C.dark, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ color:C.white, margin:0, fontSize:14, fontWeight:400, letterSpacing:"0.1em", textTransform:"uppercase" }}>Utilizadores</h2>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={openAdd} style={{ padding:"6px 14px", borderRadius:4, background:C.yellow, border:"none", color:C.dark, cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>+ Adicionar</button>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:C.white, borderRadius:4, width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>
        </div>

        {modal === "form" ? (
          <div style={{ padding:24, overflowY:"auto" }}>
            <h3 style={{ margin:"0 0 20px", fontSize:13, fontWeight:500, color:C.text, textTransform:"uppercase", letterSpacing:"0.08em" }}>{editing ? "Editar Utilizador" : "Novo Utilizador"}</h3>
            {/* Foto */}
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
              <div style={{ width:64, height:64, borderRadius:"50%", overflow:"hidden", border:`1px solid ${C.grayMid}`, background:C.grayLight, flexShrink:0, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>fileRef.current.click()}>
                {photoPreview ? <img src={photoPreview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:22, color:C.textLight }}>👤</span>}
              </div>
              <div>
                <label style={lbl2}>Fotografia</label>
                <button onClick={()=>fileRef.current.click()} disabled={uploading} style={{ padding:"6px 12px", borderRadius:4, background:C.grayLight, border:`1px solid ${C.grayMid}`, color:C.text, cursor:"pointer", fontSize:12, fontWeight:400 }}>
                  {uploading ? "A carregar..." : "Escolher imagem"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }}/>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={lbl2}>Nome *</label>
                <input style={inp2()} value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: João Silva"/>
              </div>
              <div>
                <label style={lbl2}>Email</label>
                <input style={inp2()} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Ex: joao.silva@empresa.pt"/>
              </div>
              <div>
                <label style={lbl2}>Telefone</label>
                <input style={inp2()} value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} placeholder="Ex: +351 912 345 678"/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={()=>setModal(null)} style={{ flex:1, padding:"9px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:C.white, color:C.textLight, cursor:"pointer", fontWeight:400, fontSize:12, textTransform:"uppercase", letterSpacing:"0.05em" }}>Voltar</button>
              <button onClick={save} disabled={saving||uploading} style={{ flex:2, padding:"9px", borderRadius:4, border:"none", background:C.dark, color:C.white, cursor:"pointer", fontWeight:400, fontSize:12, textTransform:"uppercase", letterSpacing:"0.06em", opacity:saving?0.7:1 }}>
                {saving ? "A guardar..." : editing ? "Guardar" : "Adicionar"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding:16, overflowY:"auto", flex:1 }}>
            {list.length===0 && <p style={{ textAlign:"center", color:C.textLight, fontSize:13, fontWeight:300, padding:"30px 0" }}>Nenhum utilizador adicionado.</p>}
            {list.map(u=>(
              <div key={u.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:C.grayLight, borderRadius:6, border:`1px solid ${C.border}`, marginBottom:8 }}>
                <div style={{ width:42, height:42, borderRadius:"50%", overflow:"hidden", background:C.grayMid, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {u.photo_url ? <img src={u.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:18 }}>👤</span>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:500, color:C.text, fontSize:13 }}>{u.nome}</div>
                  {u.email && <div style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>{u.email}</div>}
                  {u.telefone && <div style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>{u.telefone}</div>}
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={()=>openEdit(u)} style={{ padding:"4px 10px", borderRadius:3, background:C.white, border:`1px solid ${C.border}`, color:C.text, cursor:"pointer", fontSize:10, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.05em" }}>Editar</button>
                  <button onClick={()=>remove(u)} style={{ padding:"4px 10px", borderRadius:3, background:C.dangerLight, border:"none", color:C.danger, cursor:"pointer", fontSize:10, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.05em" }}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LocationModal({ localizacoes, onUpdate, onClose, showToast }) {
  const [list, setList] = useState([...localizacoes]);
  const [newLoc, setNewLoc] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const add = async () => {
    if (!newLoc.trim()) { setError("Nome obrigatório"); return; }
    if (list.find(l=>l.nome.toLowerCase()===newLoc.trim().toLowerCase())) { setError("Localização já existe"); return; }
    setLoading(true);
    try { const res = await api.addLocalizacao(newLoc.trim()); const updated=[...list,res[0]]; setList(updated); onUpdate(updated); setNewLoc(""); setError(""); }
    catch { showToast("Erro ao adicionar localização","error"); }
    finally { setLoading(false); }
  };

  const remove = async (loc) => {
    setLoading(true);
    try { await api.deleteLocalizacao(loc.id); const updated=list.filter(l=>l.id!==loc.id); setList(updated); onUpdate(updated); }
    catch { showToast("Erro ao remover localização","error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(51,63,72,0.45)", backdropFilter:"blur(3px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:10, width:"100%", maxWidth:420, boxShadow:"0 24px 64px rgba(0,0,0,0.18)", overflow:"hidden" }}>
        <div style={{ background:C.dark, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h2 style={{ color:C.white, margin:0, fontSize:14, fontWeight:400, letterSpacing:"0.1em", textTransform:"uppercase" }}>Gerir Localizações</h2>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:C.white, borderRadius:4, width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input value={newLoc} onChange={e=>{setNewLoc(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Ex: Escritório Lisboa — Sala 2" style={{ flex:1, padding:"8px 11px", borderRadius:4, border:`1px solid ${error?C.danger:C.grayMid}`, fontSize:13, fontWeight:300, outline:"none", color:C.text }}/>
            <button onClick={add} disabled={loading} style={{ padding:"8px 18px", borderRadius:4, background:C.dark, border:"none", color:C.white, cursor:"pointer", fontWeight:400, fontSize:14 }}>+</button>
          </div>
          {error && <p style={{color:C.danger,fontSize:11,margin:"0 0 12px"}}>{error}</p>}
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:300, overflowY:"auto" }}>
            {list.length===0 && <p style={{color:C.textLight,fontSize:12,fontWeight:300,textAlign:"center",padding:"20px 0"}}>Nenhuma localização adicionada.</p>}
            {list.map(loc=>(
              <div key={loc.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:C.grayLight, borderRadius:4, border:`1px solid ${C.border}` }}>
                <span style={{ fontWeight:400, color:C.text, fontSize:13 }}>📍 {loc.nome}</span>
                <button onClick={()=>remove(loc)} disabled={loading} style={{ background:C.dangerLight, border:"none", color:C.danger, borderRadius:3, padding:"4px 10px", cursor:"pointer", fontSize:11, fontWeight:400 }}>Remover</button>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{ width:"100%", marginTop:20, padding:"10px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:C.white, color:C.textLight, cursor:"pointer", fontWeight:400, fontSize:13 }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

const SECOES_DISPONIVEIS = [
  { key:"computador",    label:"Computador",    desc:"Modelo, CPU, RAM, HDD, GPU, SO, Nº Série" },
  { key:"software",      label:"Software",      desc:"Microsoft 365" },
  { key:"geral",         label:"Localização",   desc:"Localização do ativo" },
  { key:"monitor",       label:"Monitor",       desc:"Marca, Modelo, Série, Polegadas, Quantidade" },
  { key:"rede",          label:"Rede",          desc:"Domínio, Grupo de Trabalho, IP" },
  { key:"sm_equipamento",label:"Equipamento (Smartphone)", desc:"Marca, Modelo, IMEI 1/2, Datas, Observações" },
  { key:"sm_tarifario",  label:"Tarifário (Smartphone)",   desc:"Tarifário, Nº Cartão, PIN, PUK, Plafond" },
  { key:"atribuicao",    label:"Atribuído a",   desc:"Utilizador responsável pelo ativo" },
  { key:"observacoes",   label:"Observações",   desc:"Notas e informações adicionais" },
];

function FamilyModal({ families, onUpdate, onClose, showToast }) {
  const [list, setList] = useState([...families]);
  const [newFam, setNewFam] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // family being configured

  const add = async () => {
    if (!newFam.trim()) { setError("Nome obrigatório"); return; }
    if (list.find(f=>f.name.toLowerCase()===newFam.trim().toLowerCase())) { setError("Família já existe"); return; }
    setLoading(true);
    try {
      const res = await api.addFamily({ name: newFam.trim(), secoes: [] });
      const updated=[...list,res[0]]; setList(updated); onUpdate(updated); setNewFam(""); setError("");
    }
    catch { showToast("Erro ao adicionar família","error"); }
    finally { setLoading(false); }
  };

  const remove = async (fam) => {
    setLoading(true);
    try { await api.deleteFamily(fam.id); const updated=list.filter(f=>f.id!==fam.id); setList(updated); onUpdate(updated); }
    catch { showToast("Erro ao remover família","error"); }
    finally { setLoading(false); }
  };

  const toggleSecao = async (fam, secKey) => {
    const current = fam.secoes || [];
    const updated_secoes = current.includes(secKey)
      ? current.filter(s => s !== secKey)
      : [...current, secKey];
    try {
      const res = await api.updateFamily(fam.id, { secoes: updated_secoes });
      const updatedFam = { ...fam, secoes: updated_secoes };
      const updatedList = list.map(f => f.id === fam.id ? updatedFam : f);
      setList(updatedList);
      onUpdate(updatedList);
      if (editing?.id === fam.id) setEditing(updatedFam);
    } catch { showToast("Erro ao guardar","error"); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(51,63,72,0.45)", backdropFilter:"blur(3px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:10, width:"100%", maxWidth: editing ? 640 : 480, boxShadow:"0 24px 64px rgba(0,0,0,0.18)", overflow:"hidden", maxHeight:"88vh", display:"flex", flexDirection:"column" }}>
        <div style={{ background:C.dark, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ color:C.white, margin:0, fontSize:14, fontWeight:400, letterSpacing:"0.1em", textTransform:"uppercase" }}>
            {editing ? `Secções — ${editing.name}` : "Gerir Famílias"}
          </h2>
          <div style={{ display:"flex", gap:8 }}>
            {editing && <button onClick={()=>setEditing(null)} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:C.white, borderRadius:4, padding:"4px 12px", cursor:"pointer", fontSize:11, fontWeight:400, letterSpacing:"0.06em", textTransform:"uppercase" }}>← Voltar</button>}
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:C.white, borderRadius:4, width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>
        </div>

        {!editing ? (
          <div style={{ padding:24, overflowY:"auto" }}>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <input value={newFam} onChange={e=>{setNewFam(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Nome da nova família..." style={{ flex:1, padding:"8px 11px", borderRadius:4, border:`1px solid ${error?C.danger:C.grayMid}`, fontSize:13, fontWeight:300, outline:"none", color:C.text }}/>
              <button onClick={add} disabled={loading} style={{ padding:"8px 18px", borderRadius:4, background:C.dark, border:"none", color:C.white, cursor:"pointer", fontWeight:400, fontSize:14 }}>+</button>
            </div>
            {error && <p style={{color:C.danger,fontSize:11,margin:"0 0 12px"}}>{error}</p>}
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:360, overflowY:"auto" }}>
              {list.length===0 && <p style={{color:C.textLight,fontSize:12,fontWeight:300,textAlign:"center",padding:"20px 0"}}>Nenhuma família criada.</p>}
              {list.map(fam=>{
                const secoes = fam.secoes || [];
                return (
                  <div key={fam.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:C.grayLight, borderRadius:4, border:`1px solid ${C.border}` }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:400, color:C.text, fontSize:13 }}>{fam.name}</div>
                      <div style={{ fontSize:10, color:C.textLight, fontWeight:300, marginTop:2 }}>
                        {secoes.length === 0
                          ? "Todas as secções visíveis"
                          : secoes.map(s => SECOES_DISPONIVEIS.find(sd=>sd.key===s)?.label).filter(Boolean).join(", ")}
                      </div>
                    </div>
                    <button onClick={()=>setEditing(fam)} style={{ padding:"4px 12px", borderRadius:3, background:C.dark, border:"none", color:C.white, cursor:"pointer", fontSize:10, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.05em", flexShrink:0 }}>Configurar</button>
                    <button onClick={()=>remove(fam)} disabled={loading} style={{ background:C.dangerLight, border:"none", color:C.danger, borderRadius:3, padding:"4px 10px", cursor:"pointer", fontSize:10, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.03em", flexShrink:0 }}>Remover</button>
                  </div>
                );
              })}
            </div>
            <button onClick={onClose} style={{ width:"100%", marginTop:20, padding:"10px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:C.white, color:C.textLight, cursor:"pointer", fontWeight:400, fontSize:13 }}>Fechar</button>
          </div>
        ) : (
          <div style={{ padding:24, overflowY:"auto" }}>
            <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:300, color:C.textLight, lineHeight:1.6 }}>
              Seleciona as secções que devem aparecer no formulário para ativos desta família.<br/>
              <strong style={{fontWeight:500, color:C.text}}>Se nenhuma estiver selecionada, aparecem todas.</strong>
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:16 }}>
              {SECOES_DISPONIVEIS.map(sec => {
                const active = (editing.secoes||[]).includes(sec.key);
                return (
                  <div key={sec.key} onClick={()=>toggleSecao(editing, sec.key)}
                    style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:6, border:`2px solid ${active ? C.yellow : C.border}`, background: active ? C.yellowLight : C.white, cursor:"pointer", transition:"all 0.15s" }}>
                    <div style={{ width:20, height:20, borderRadius:4, border:`2px solid ${active?C.yellow:C.grayMid}`, background:active?C.yellow:C.white, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
                      {active && <span style={{ color:C.dark, fontSize:12, fontWeight:700, lineHeight:1 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight:500, fontSize:13, color:C.text }}>{sec.label}</div>
                      <div style={{ fontSize:10, color:C.textLight, fontWeight:300, marginTop:2 }}>{sec.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ margin:"16px 0 0", fontSize:11, color:C.textLight, fontWeight:300, fontStyle:"italic" }}>
              As alterações são guardadas automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({ asset, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(51,63,72,0.45)", backdropFilter:"blur(3px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:10, width:"100%", maxWidth:360, padding:32, boxShadow:"0 24px 64px rgba(0,0,0,0.18)", textAlign:"center" }}>
        <div style={{ width:44, height:44, borderRadius:"50%", background:C.dangerLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:18, color:C.danger }}>✕</div>
        <h3 style={{ color:C.text, margin:"0 0 8px", fontSize:15, fontWeight:500 }}>Remover Ativo</h3>
        <p style={{ color:C.textLight, fontSize:13, margin:"0 0 24px", fontWeight:300, lineHeight:1.7 }}>Tem a certeza que deseja remover<br/><strong style={{fontWeight:500, color:C.text}}>{asset.name}</strong>?<br/><span style={{fontSize:11}}>Esta ação não pode ser desfeita.</span></p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:C.white, color:C.textLight, cursor:"pointer", fontWeight:400, fontSize:12, letterSpacing:"0.04em", textTransform:"uppercase" }}>Cancelar</button>
          <button disabled={loading} onClick={async()=>{setLoading(true);await onConfirm();}} style={{ flex:1, padding:"10px", borderRadius:4, border:"none", background:C.danger, color:C.white, cursor:"pointer", fontWeight:400, fontSize:12, letterSpacing:"0.04em", textTransform:"uppercase", opacity:loading?0.7:1 }}>
            {loading?"A remover...":"Remover"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Detalhe de um ativo em painel lateral
function QRSection({ assetId, assetName }) {
  const canvasRef = useRef();
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const qrUrl = `${window.location.origin}${window.location.pathname}?asset=${assetId}`;

  useEffect(() => {
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js")
      .then(() => setReady(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || !expanded || !canvasRef.current) return;
    canvasRef.current.innerHTML = "";
    new window.QRCode(canvasRef.current, {
      text: qrUrl,
      width: 140, height: 140,
      colorDark: "#333F48", colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }, [ready, expanded, qrUrl]);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    const canvas = canvasRef.current?.querySelector("canvas");
    const img = canvas ? canvas.toDataURL() : "";
    win.document.write(`<html><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;gap:12px">
      <img src="${img}" style="width:180px;height:180px"/>
      <div style="font-size:13px;font-weight:500;color:#333">${assetName}</div>
      <div style="font-size:9px;color:#999;word-break:break-all;max-width:200px;text-align:center">${qrUrl}</div>
    </body></html>`);
    win.document.close(); win.focus(); win.print(); win.close();
  };

  return (
    <div>
      <button onClick={()=>setExpanded(e=>!e)}
        style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:0, color:C.textLight, fontSize:10, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/></svg>
        QR Code
        <span style={{ fontSize:8, opacity:0.5 }}>{expanded?"▲":"▼"}</span>
      </button>
      {expanded && (
        <div style={{ marginTop:10, display:"flex", alignItems:"flex-start", gap:16 }}>
          <div ref={canvasRef} style={{ borderRadius:6, overflow:"hidden", border:`1px solid ${C.border}`, flexShrink:0 }}/>
          <div style={{ display:"flex", flexDirection:"column", gap:8, paddingTop:4 }}>
            <div style={{ fontSize:10, color:C.textLight, wordBreak:"break-all", lineHeight:1.5, maxWidth:160 }}>{qrUrl}</div>
            <button onClick={handlePrint}
              style={{ padding:"6px 12px", borderRadius:4, background:C.dark, border:"none", color:C.white, cursor:"pointer", fontSize:10, fontWeight:500, letterSpacing:"0.05em", textTransform:"uppercase" }}>
              Imprimir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function AssetDetail({ asset, families, utilizadores, marcas, onEdit, onDelete, onClose, onDuplicate }) {
  const getFamilyName = (id) => families.find(f=>f.id===id)?.name||"—";
  const utilizador = utilizadores?.find(u=>u.id===asset.utilizador_id)||null;
  const isMob = useIsMobile();
  const selectedFamily = families.find(f=>f.id===asset.family_id)||null;
  const familySections = selectedFamily?.secoes||null; // null = no family = show all
  const showSec = (key) => !familySections || familySections.length===0 || familySections.includes(key);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(51,63,72,0.45)", backdropFilter:"blur(3px)", zIndex:900, display:"flex", justifyContent: isMob?"center":"flex-end", alignItems: isMob?"center":"stretch", padding: isMob?"16px":0 }} onClick={onClose}>
      <div style={{ width:"100%", maxWidth: isMob?540:400, maxHeight: isMob?"92vh":"100vh", background:C.white, boxShadow: isMob?"0 24px 64px rgba(0,0,0,0.2)":"-8px 0 40px rgba(0,0,0,0.15)", display:"flex", flexDirection:"column", borderRadius: isMob?10:0, overflow:"hidden" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:C.dark, padding:"18px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ color:C.white, margin:0, fontSize:14, fontWeight:400, letterSpacing:"0.08em", textTransform:"uppercase" }}>Detalhe</h2>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:C.white, borderRadius:4, width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ overflowY:"auto", flex:1, WebkitOverflowScrolling:"touch" }}>

          {/* Identificação — foto + nome + família */}
          <div style={{ display:"flex", gap:14, padding:"16px 20px", borderBottom:`1px solid ${C.border}`, alignItems:"center" }}>
            <div style={{ width:72, height:88, borderRadius:6, overflow:"hidden", background:C.grayLight, flexShrink:0, border:`1px solid ${C.border}` }}>
              {asset.photo_url
                ? <img src={asset.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
                : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><PhotoPlaceholder size={48} name={asset.name}/></div>
              }
            </div>
            <div>
              <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:500, color:C.text, lineHeight:1.3 }}>{asset.name}</h3>
              {asset.family_id && <Badge label={getFamilyName(asset.family_id)}/>}

            </div>
          </div>

          {/* Atribuído a — logo após identificação */}
          {showSec("atribuicao") && <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, background:C.grayLight }}>
            <div style={{ fontSize:9, fontWeight:600, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:8 }}>Atribuído a</div>
            {utilizador ? (
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", overflow:"hidden", background:C.grayMid, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", border:`2px solid ${C.yellowMid}` }}>
                  {utilizador.photo_url
                    ? <img src={utilizador.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    : <span style={{ fontSize:16 }}>👤</span>}
                </div>
                <div>
                  <div style={{ fontWeight:500, color:C.text, fontSize:13 }}>{utilizador.nome}</div>
                  {utilizador.email && <div style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>{utilizador.email}</div>}
                  {utilizador.telefone && <div style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>{utilizador.telefone}</div>}
                </div>
              </div>
            ) : (
              <span style={{ fontSize:12, color:C.textLight, fontWeight:300, fontStyle:"italic" }}>Não atribuído</span>
            )}
          </div>}

          {/* Secções de dados */}
          <div style={{ padding:"16px 20px" }}>
            {[
              { key:"geral", title:"Localização", rows:[["Localização", asset.localizacao]] },
              { key:"computador", title:"Computador", rows:[
                ["Modelo", asset.modelo], ["Nº Série", asset.serial], ["CPU", asset.cpu],
                ["Memória RAM", asset.memoria], ["HDD / SSD", asset.hdd], ["GPU", asset.gpu], ["Sistema Operativo", asset.so]
              ]},
              { key:"software", title:"Software", rows:[["Microsoft 365", asset.ms365===true?"Sim":asset.ms365===false?"Não":null]] },
              { key:"monitor", title:"Monitor", rows:[["Marca", asset.monitor_marca],["Modelo", asset.monitor_modelo],["Nº Série", asset.monitor_serial],["Polegadas", asset.monitor_polegadas],["Quantidade", asset.monitor_quantidade]] },
              { key:"rede", title:"Rede", rows:[["Domínio", asset.dominio],["Grupo de Trabalho", asset.grupo_trabalho],["Endereço IP", asset.dhcp ? "DHCP (Automático)" : asset.ip]] },
            ].map(sec => {
              if (!showSec(sec.key)) return null;
              const hasData = sec.rows.some(([,v])=>v!=null&&v!==false&&v!=="");
              if (!hasData) return null;
              return (
                <div key={sec.title} style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <div style={{ width:3, height:12, background:C.yellow, borderRadius:1 }}/>
                    <span style={{ fontSize:9, fontWeight:600, color:C.dark, textTransform:"uppercase", letterSpacing:"0.12em" }}>{sec.title}</span>
                  </div>
                  {sec.rows.map(([label,value])=> value!=null&&value!==""&&value!==false ? (
                    <div key={label} style={{ display:"flex", gap:8, padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:10, fontWeight:500, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.08em", minWidth:120, flexShrink:0, paddingTop:1 }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:300, color:C.text }}>{String(value)}</span>
                    </div>
                  ) : null)}
                </div>
              );
            })}

            {/* Smartphone sections in detail */}
            {showSec("sm_equipamento") && (asset.sm_marca_id || asset.sm_modelo || asset.sm_imei1) && (() => {
              const marca = (marcas||[]).find(m=>m.id===asset.sm_marca_id)?.nome || "";
              return (
                <div style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <div style={{ width:3, height:12, background:C.yellow, borderRadius:1 }}/>
                    <span style={{ fontSize:9, fontWeight:600, color:C.dark, textTransform:"uppercase", letterSpacing:"0.12em" }}>Equipamento</span>
                  </div>
                  {[["Marca", marca],["Modelo",asset.sm_modelo],["Nº Telefone",asset.sm_nr_telefone],["IMEI 1",asset.sm_imei1],["IMEI 2",asset.sm_imei2],["Data Compra", fmtDate(asset.sm_data_compra)],["Data Entrega", fmtDate(asset.sm_data_entrega)]].map(([l,v])=>v?(
                    <div key={l} style={{ display:"flex", gap:8, padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:10, fontWeight:500, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.08em", minWidth:120, flexShrink:0 }}>{l}</span>
                      <span style={{ fontSize:13, fontWeight:300, color:C.text }}>{v}</span>
                    </div>
                  ):null)}
                </div>
              );
            })()}
            {showSec("sm_tarifario") && (asset.sm_tarifario || asset.sm_nr_cartao) && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <div style={{ width:3, height:12, background:C.yellow, borderRadius:1 }}/>
                  <span style={{ fontSize:9, fontWeight:600, color:C.dark, textTransform:"uppercase", letterSpacing:"0.12em" }}>Tarifário</span>
                </div>
                {[["Tarifário",asset.sm_tarifario],["Nº Cartão",asset.sm_nr_cartao],["Plafond Dados",asset.sm_ilimitado?"Ilimitado":(asset.sm_plafond_dados?asset.sm_plafond_dados+" GB":null)],["PIN",asset.sm_pin],["PUK",asset.sm_puk]].map(([l,v])=>v?(
                  <div key={l} style={{ display:"flex", gap:8, padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:10, fontWeight:500, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.08em", minWidth:120, flexShrink:0 }}>{l}</span>
                    <span style={{ fontSize:13, fontWeight:300, color:C.text }}>{v}</span>
                  </div>
                ):null)}
              </div>
            )}

            {showSec("observacoes") && asset.observacoes && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <div style={{ width:3, height:12, background:C.yellow, borderRadius:1 }}/>
                  <span style={{ fontSize:9, fontWeight:600, color:C.dark, textTransform:"uppercase", letterSpacing:"0.12em" }}>Observações</span>
                </div>
                <p style={{ margin:0, fontSize:13, fontWeight:300, color:C.text, lineHeight:1.7, padding:"8px 12px", background:C.grayLight, borderRadius:4, border:`1px solid ${C.border}` }}>{asset.observacoes}</p>
              </div>
            )}
          </div>
        </div>

        {/* QR Code */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}` }}>
          <QRSection assetId={asset.id} assetName={asset.name}/>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8, flexShrink:0 }}>
          <button onClick={onEdit} style={{ flex:1, padding:"9px", borderRadius:4, background:C.grayLight, border:`1px solid ${C.border}`, color:C.text, cursor:"pointer", fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" }}>Editar</button>
          <button onClick={onDuplicate} title="Duplicar este ativo para um novo registo" style={{ flex:1, padding:"9px", borderRadius:4, background:"#e8f4fd", border:"1px solid #b3d9f5", color:"#1a6fa0", cursor:"pointer", fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" }}>Duplicar</button>
          <button onClick={onDelete} style={{ flex:1, padding:"9px", borderRadius:4, background:C.dangerLight, border:`1px solid #f5c6c2`, color:C.danger, cursor:"pointer", fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" }}>Remover</button>
        </div>
      </div>
    </div>
  );
}

function MarcasModal({ marcas, onUpdate, onClose, showToast }) {
  const [list, setList] = useState([...marcas]);
  const [newNome, setNewNome] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const add = async () => {
    if (!newNome.trim()) { setError("Nome obrigatório"); return; }
    if (list.find(m=>m.nome.toLowerCase()===newNome.trim().toLowerCase())) { setError("Marca já existe"); return; }
    setLoading(true);
    try {
      const res = await api.addMarca(newNome.trim());
      const updated = [...list, res[0]]; setList(updated); onUpdate(updated); setNewNome(""); setError("");
    } catch { showToast("Erro ao adicionar marca","error"); }
    finally { setLoading(false); }
  };

  const remove = async (m) => {
    setLoading(true);
    try { await api.deleteMarca(m.id); const updated=list.filter(x=>x.id!==m.id); setList(updated); onUpdate(updated); }
    catch { showToast("Erro ao remover marca","error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(51,63,72,0.45)", backdropFilter:"blur(3px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:10, width:"100%", maxWidth:420, boxShadow:"0 24px 64px rgba(0,0,0,0.18)", overflow:"hidden" }}>
        <div style={{ background:C.dark, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h2 style={{ color:C.white, margin:0, fontSize:14, fontWeight:400, letterSpacing:"0.1em", textTransform:"uppercase" }}>Marcas de Smartphone</h2>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:C.white, borderRadius:4, width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input value={newNome} onChange={e=>{setNewNome(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&add()}
              placeholder="Ex: Apple, Samsung, Xiaomi..." style={{ flex:1, padding:"8px 11px", borderRadius:4, border:`1px solid ${error?C.danger:C.grayMid}`, fontSize:13, fontWeight:300, outline:"none", color:C.text }}/>
            <button onClick={add} disabled={loading} style={{ padding:"8px 18px", borderRadius:4, background:C.dark, border:"none", color:C.white, cursor:"pointer", fontWeight:400, fontSize:14 }}>+</button>
          </div>
          {error && <p style={{color:C.danger,fontSize:11,margin:"0 0 12px"}}>{error}</p>}
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:300, overflowY:"auto" }}>
            {list.length===0 && <p style={{color:C.textLight,fontSize:12,fontWeight:300,textAlign:"center",padding:"20px 0"}}>Nenhuma marca adicionada.</p>}
            {list.map(m=>(
              <div key={m.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:C.grayLight, borderRadius:4, border:`1px solid ${C.border}` }}>
                <span style={{ fontWeight:400, color:C.text, fontSize:13 }}>📱 {m.nome}</span>
                <button onClick={()=>remove(m)} disabled={loading} style={{ background:C.dangerLight, border:"none", color:C.danger, borderRadius:3, padding:"4px 10px", cursor:"pointer", fontSize:11, fontWeight:400 }}>Remover</button>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{ width:"100%", marginTop:20, padding:"10px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:C.white, color:C.textLight, cursor:"pointer", fontWeight:400, fontSize:13 }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}


function UserAssetsModal({ utilizadores, assets, families, onClose, onOpenAsset }) {
  const [selected, setSelected] = useState(utilizadores[0]?.id||null);
  const user = utilizadores.find(u=>u.id===selected)||null;
  const userAssets = assets.filter(a=>a.utilizador_id===selected);
  const getFamilyName = (id) => families.find(f=>f.id===id)?.name||"—";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(51,63,72,0.45)", backdropFilter:"blur(3px)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:10, width:"100%", maxWidth:760, maxHeight:"88vh", boxShadow:"0 24px 64px rgba(0,0,0,0.2)", overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ background:C.dark, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ color:C.white, margin:0, fontSize:14, fontWeight:400, letterSpacing:"0.1em", textTransform:"uppercase" }}>Assets por Utilizador</h2>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:C.white, borderRadius:4, width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
          {/* Coluna esquerda — lista de utilizadores */}
          <div style={{ width:220, borderRight:`1px solid ${C.border}`, overflowY:"auto", flexShrink:0 }}>
            {utilizadores.length===0 && <p style={{ padding:20, fontSize:12, color:C.textLight, textAlign:"center" }}>Nenhum utilizador.</p>}
            {utilizadores.map(u=>{
              const count = assets.filter(a=>a.utilizador_id===u.id).length;
              const isSelected = selected===u.id;
              return (
                <div key={u.id} onClick={()=>setSelected(u.id)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", cursor:"pointer", borderBottom:`1px solid ${C.border}`,
                    background:isSelected?C.yellowLight:C.white, borderLeft:isSelected?`3px solid ${C.yellow}`:"3px solid transparent", transition:"background 0.12s" }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", overflow:"hidden", background:C.grayMid, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", border:`2px solid ${isSelected?C.yellow:C.grayMid}` }}>
                    {u.photo_url ? <img src={u.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:14 }}>👤</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:isSelected?500:400, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.nome}</div>
                    <div style={{ fontSize:10, color:count>0?C.danger:C.textLight, fontWeight:300 }}>{count} ativo{count!==1?"s":""}</div>
                  </div>
                </div>
              );
            })}
            {/* Sem atribuição */}
            {(() => {
              const count = assets.filter(a=>!a.utilizador_id).length;
              const isSelected = selected===null;
              return (
                <div onClick={()=>setSelected(null)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", cursor:"pointer", borderBottom:`1px solid ${C.border}`,
                    background:isSelected?C.yellowLight:C.grayLight, borderLeft:isSelected?`3px solid ${C.yellow}`:"3px solid transparent" }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", background:C.grayMid, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", border:`2px solid ${isSelected?C.yellow:C.grayMid}` }}>
                    <span style={{ fontSize:14 }}>—</span>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:isSelected?500:400, color:C.text }}>Não atribuídos</div>
                    <div style={{ fontSize:10, color:"#22c55e", fontWeight:300 }}>{count} ativo{count!==1?"s":""}</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Coluna direita — assets do utilizador selecionado */}
          <div style={{ flex:1, overflowY:"auto", padding:20 }}>
            {user && (
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, padding:"12px 16px", background:C.grayLight, borderRadius:6, border:`1px solid ${C.border}` }}>
                <div style={{ width:44, height:44, borderRadius:"50%", overflow:"hidden", background:C.grayMid, flexShrink:0, border:`2px solid ${C.yellowMid}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {user.photo_url ? <img src={user.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:20 }}>👤</span>}
                </div>
                <div>
                  <div style={{ fontWeight:500, fontSize:14, color:C.text }}>{user.nome}</div>
                  {user.email && <div style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>{user.email}</div>}
                  {user.telefone && <div style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>{user.telefone}</div>}
                </div>
                <div style={{ marginLeft:"auto", background:C.danger, color:C.white, borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:600 }}>
                  {userAssets.length} ativo{userAssets.length!==1?"s":""}
                </div>
              </div>
            )}
            {!user && (
              <div style={{ marginBottom:20, padding:"12px 16px", background:"#f0fdf4", borderRadius:6, border:"1px solid #86efac", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, fontWeight:400, color:"#166534" }}>Ativos sem utilizador atribuído</span>
                <div style={{ background:"#22c55e", color:C.white, borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:600 }}>
                  {userAssets.length} ativo{userAssets.length!==1?"s":""}
                </div>
              </div>
            )}
            {userAssets.length===0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.textLight }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📭</div>
                <div style={{ fontSize:13, fontWeight:300 }}>Nenhum ativo associado.</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {userAssets.map(a=>(
                  <div key={a.id} onClick={()=>{ onOpenAsset(a); onClose(); }}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:C.white, borderRadius:6, border:`1px solid ${C.border}`, cursor:"pointer", transition:"background 0.12s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.yellowLight}
                    onMouseLeave={e=>e.currentTarget.style.background=C.white}>
                    <div style={{ width:40, height:40, borderRadius:4, overflow:"hidden", background:C.grayLight, flexShrink:0, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {a.photo_url ? <img src={a.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/> : <PhotoPlaceholder size={28} name={a.name}/>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:500, fontSize:13, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.name}</div>
                      <div style={{ display:"flex", gap:8, marginTop:3, flexWrap:"wrap" }}>
                        {a.family_id && <Badge label={getFamilyName(a.family_id)}/>}
                        {a.modelo && <span style={{ fontSize:10, color:C.textLight, fontWeight:300 }}>🖥 {a.modelo}</span>}
                        {a.localizacao && <span style={{ fontSize:10, color:C.textLight, fontWeight:300 }}>📍 {a.localizacao}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize:10, color:C.textLight, fontWeight:300, whiteSpace:"nowrap" }}>Ver detalhe →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function LoginPage({ onLogin }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Preenche os dois campos."); return; }
    setLoading(true);
    try {
      const session = await auth.signIn(email.trim(), password);
      auth.saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(err.message || "Utilizador ou password incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.dark, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:FONT }}>
      <style>{globalStyles}</style>
      <div style={{ marginBottom:32, textAlign:"center" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:6 }}>
          <span style={{ color:C.yellow, fontWeight:700, fontSize:28, letterSpacing:"0.06em" }}>g!</span>
          <span style={{ color:C.white, fontWeight:200, fontSize:22, letterSpacing:"0.14em", textTransform:"uppercase" }}>ASSET MANAGER</span>
        </div>
        <div style={{ color:"rgba(255,255,255,0.35)", fontSize:11, fontWeight:300, letterSpacing:"0.14em", textTransform:"uppercase" }}>Gestão de Ativos de TI</div>
      </div>
      <div style={{ background:C.white, borderRadius:10, width:"100%", maxWidth:360, padding:36, boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}>
        <h2 style={{ margin:"0 0 24px", fontSize:13, fontWeight:500, color:C.text, textTransform:"uppercase", letterSpacing:"0.1em", textAlign:"center" }}>Acesso</h2>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, fontWeight:500, color:C.textLight, marginBottom:5, display:"block", textTransform:"uppercase", letterSpacing:"0.1em" }}>Email</label>
          <input autoFocus value={email} onChange={e=>{ setEmail(e.target.value); setError(""); }}
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            type="email"
            style={{ width:"100%", padding:"9px 12px", borderRadius:4, fontSize:13, fontWeight:300, border:`1px solid ${error?C.danger:C.grayMid}`, outline:"none", color:C.text, boxSizing:"border-box" }}
            placeholder=""/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:10, fontWeight:500, color:C.textLight, marginBottom:5, display:"block", textTransform:"uppercase", letterSpacing:"0.1em" }}>Password</label>
          <div style={{ position:"relative" }}>
            <input value={password} onChange={e=>{ setPassword(e.target.value); setError(""); }}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              type={showPw?"text":"password"}
              style={{ width:"100%", padding:"9px 36px 9px 12px", borderRadius:4, fontSize:13, fontWeight:300, border:`1px solid ${error?C.danger:C.grayMid}`, outline:"none", color:C.text, boxSizing:"border-box" }}
              placeholder="••••••••"/>
            <span onClick={()=>setShowPw(s=>!s)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", cursor:"pointer", fontSize:15, color:C.textLight, userSelect:"none" }}>{showPw?"🙈":"👁"}</span>
          </div>
        </div>
        {error && <div style={{ background:"#fdecea", border:"1px solid #f5c6c2", borderRadius:4, padding:"8px 12px", color:C.danger, fontSize:12, fontWeight:400, marginBottom:16, textAlign:"center" }}>{error}</div>}
        <button onClick={handleLogin} disabled={loading}
          style={{ width:"100%", padding:"11px", borderRadius:4, background:C.dark, border:"none", color:C.white, cursor:loading?"not-allowed":"pointer", fontSize:12, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", opacity:loading?0.7:1 }}>
          {loading ? "A verificar..." : "Entrar"}
        </button>
      </div>
      <div style={{ marginTop:24, color:"rgba(255,255,255,0.2)", fontSize:10, fontWeight:300, letterSpacing:"0.08em" }}>© Sérgio Henriques</div>
    </div>
  );
}

function ExportMenu({ filtered, families, utilizadores }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const ref = useRef();

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const getFamilyName = (id) => families.find(f=>f.id===id)?.name||"—";
  const getUtilizadorNome = (id) => utilizadores.find(u=>u.id===id)?.nome||"—";

  const rows = filtered.map(a => ({
    "Nome": a.name||"",
    "Família": a.family_id ? getFamilyName(a.family_id) : "—",
    "Localização": a.localizacao||"—",
    "Atribuído a": a.utilizador_id ? getUtilizadorNome(a.utilizador_id) : "Disponível",
    "Observações": a.observacoes||"",
  }));

  const exportExcel = async () => {
    setExporting("excel");
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Ativos");
      ws["!cols"] = [{ wch:30 },{ wch:16 },{ wch:22 },{ wch:24 },{ wch:40 }];
      window.XLSX.writeFile(wb, `ativos_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch(e) { alert("Erro ao exportar Excel: " + e.message); }
    finally { setExporting(null); setOpen(false); }
  };

  const exportPDF = async () => {
    setExporting("pdf");
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
      doc.setFontSize(14); doc.setFont(undefined,"bold");
      doc.text("g! Asset Manager — Listagem de Ativos", 14, 16);
      doc.setFontSize(8); doc.setFont(undefined,"normal");
      doc.setTextColor(150);
      doc.text(`Exportado em ${new Date().toLocaleDateString("pt-PT")} · ${filtered.length} ativos`, 14, 22);
      doc.setTextColor(0);
      doc.autoTable({
        startY: 28,
        head: [Object.keys(rows[0]||{})],
        body: rows.map(r=>Object.values(r)),
        styles: { fontSize:8, cellPadding:3 },
        headStyles: { fillColor:[51,63,72], textColor:255, fontStyle:"bold", fontSize:8 },
        alternateRowStyles: { fillColor:[248,248,247] },
        columnStyles: { 4: { cellWidth:60 } },
        margin: { left:14, right:14 },
      });
      doc.save(`ativos_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch(e) { alert("Erro ao exportar PDF: " + e.message); }
    finally { setExporting(null); setOpen(false); }
  };

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:4, border:`1px solid ${C.grayMid}`, background:open?C.dark:C.white, color:open?C.white:C.text, cursor:"pointer", fontSize:11, fontWeight:400, letterSpacing:"0.04em", textTransform:"uppercase", transition:"all 0.15s" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Exportar
        <span style={{ fontSize:8, opacity:0.6 }}>▼</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, background:C.white, borderRadius:6, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", minWidth:160, zIndex:1000, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div style={{ padding:"8px 14px 6px", fontSize:9, color:C.textLight, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.1em" }}>
            {filtered.length} ativos
          </div>
          {[
            { label:"Excel (.xlsx)", icon:"📊", action: exportExcel, key:"excel" },
            { label:"PDF",           icon:"📄", action: exportPDF,   key:"pdf"   },
          ].map(item=>(
            <button key={item.key} onClick={item.action} disabled={!!exporting}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", textAlign:"left", padding:"10px 16px", border:"none", borderTop:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", fontSize:12, fontWeight:300, color:C.text }}
              onMouseEnter={e=>e.currentTarget.style.background=C.yellowLight}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span>{item.icon}</span>
              {exporting===item.key ? "A exportar..." : item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


export default function App() {
  const [session, setSession] = React.useState(auth.getSession());
  const authed = !!session?.access_token;
  const [assets, setAssets] = useState([]);
  const [families, setFamilies] = useState([]);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [view, setView] = useState("list"); // "cards" | "list"
  const [search, setSearch] = useState("");
  const [filterFamily, setFilterFamily] = useState("");
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [modal, setModal] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [detailAsset, setDetailAsset] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [openMenu, setOpenMenu] = useState(null); // "tabelas" | "consultas" | null

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    Promise.all([api.getAssets(), api.getFamilies(), api.getLocalizacoes(), api.getUtilizadores(), api.getMarcas()])
      .then(([a, f, l, u, m]) => { setAssets(a||[]); setFamilies(f||[]); setLocalizacoes(l||[]); setUtilizadores(u||[]); setMarcas(m||[]); })
      .catch(() => showToast("Erro ao carregar dados","error"))
      .finally(() => setLoading(false));
  }, []);

  const getFamilyName = (id) => families.find(f=>f.id===id)?.name||"—";
  const getUtilizador = (id) => utilizadores.find(u=>u.id===id)||null;

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const getSortValue = (asset, col) => {
    if (col === "name")        return (asset.name||"").toLowerCase();
    if (col === "family")      return getFamilyName(asset.family_id).toLowerCase();
    if (col === "modelo")      return (asset.modelo||"").toLowerCase();
    if (col === "serial")      return (asset.serial||"").toLowerCase();
    if (col === "localizacao") return (asset.localizacao||"").toLowerCase();
    if (col === "utilizador")  return (getUtilizador(asset.utilizador_id)?.nome||"").toLowerCase();
    if (col === "status")      return asset.utilizador_id ? 1 : 0;
    return "";
  };

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || [a.name,a.serial,a.localizacao,a.modelo,a.cpu].some(v=>v&&v.toLowerCase().includes(q));
    const matchFamily = !filterFamily || a.family_id===filterFamily;
    return matchSearch && matchFamily;
  });

  const handleSave = (saved) => {
    setAssets(prev => {
      const exists = prev.find(a=>a.id===saved.id);
      return exists ? prev.map(a=>a.id===saved.id?saved:a) : [saved,...prev];
    });
    setModal(null);
    setEditingAsset(null);
    showToast(editingAsset?.id ? "Ativo atualizado" : "Ativo adicionado");
  };

  const handleDelete = async () => {
    try {
      await api.deleteAsset(confirmDelete.id);
      setAssets(prev=>prev.filter(a=>a.id!==confirmDelete.id));
      setConfirmDelete(null);
      setDetailAsset(null);
      showToast("Ativo removido");
    } catch { showToast("Erro ao remover","error"); }
  };

  const openEdit = (asset) => { setEditingAsset(asset); setDetailAsset(null); setModal("edit"); };

  const handleDuplicate = (asset) => {
    // Strip id and timestamps, prefix name with "Cópia de"
    const { id, created_at, updated_at, ...rest } = asset;
    const duplicate = { ...rest, name: `Cópia de ${asset.name}` };
    setEditingAsset(duplicate);
    setDetailAsset(null);
    setModal("add");
  };

  // SVG icons
  const IconGear = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );

  const IconSignOut = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );

  const IconReports = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
      <polyline points="13 15 16 12 19 15"/>
      <line x1="16" y1="12" x2="16" y2="18"/>
    </svg>
  );

  // Gear menu — Definições with nested Tabelas submenu
  const [tabelasOpen, setTabelasOpen] = useState(false);

  const GearMenu = () => {
    const isOpen = openMenu === "definicoes";
    return (
      <div style={{ position:"relative" }} onMouseLeave={()=>{ setOpenMenu(null); setTabelasOpen(false); }}>
        <button
          title="Definições"
          onClick={()=>setOpenMenu(isOpen?null:"definicoes")}
          style={{ width:34, height:34, borderRadius:4, background:"transparent", border:"none", color:isOpen?C.yellow:"rgba(255,255,255,0.5)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"color 0.15s" }}
          onMouseEnter={e=>e.currentTarget.style.color=C.yellow}
          onMouseLeave={e=>e.currentTarget.style.color=isOpen?C.yellow:"rgba(255,255,255,0.5)"}>
          <IconGear/>
        </button>
        {isOpen && (
          <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, background:C.white, borderRadius:6, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", minWidth:180, zIndex:1000, border:`1px solid ${C.border}`, overflow:"visible" }}>
            {/* Tabelas — expandable submenu */}
            <div style={{ position:"relative" }}
              onMouseEnter={()=>setTabelasOpen(true)}
              onMouseLeave={()=>setTabelasOpen(false)}>
              <button
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", textAlign:"left", padding:"10px 16px", border:"none", background:tabelasOpen?C.yellowLight:"transparent", cursor:"pointer", fontSize:12, fontWeight:400, color:C.text, letterSpacing:"0.03em", borderBottom:`1px solid ${C.border}` }}>
                <span>Tabelas</span>
                <span style={{ fontSize:9, color:C.textLight }}>▶</span>
              </button>
              {tabelasOpen && (
                <div style={{ position:"absolute", top:0, left:"100%", background:C.white, borderRadius:6, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", minWidth:160, zIndex:1001, border:`1px solid ${C.border}`, overflow:"hidden" }}>
                  {[
                    { label:"Localizações", action:()=>setModal("locations") },
                    { label:"Famílias",     action:()=>setModal("families") },
                    { label:"Utilizadores", action:()=>setModal("utilizadores") },
                    { label:"Marcas",       action:()=>setModal("marcas") },
                  ].map(item=>(
                    <button key={item.label} onClick={()=>{ item.action(); setOpenMenu(null); setTabelasOpen(false); }}
                      style={{ display:"block", width:"100%", textAlign:"left", padding:"10px 16px", border:"none", background:"transparent", cursor:"pointer", fontSize:12, fontWeight:300, color:C.text, letterSpacing:"0.03em", borderBottom:`1px solid ${C.border}` }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.yellowLight}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Reports icon — direct actions
  const ReportsMenu = () => {
    const isOpen = openMenu === "consultas";
    return (
      <div style={{ position:"relative" }} onMouseLeave={()=>setOpenMenu(null)}>
        <button
          title="Consultas"
          onClick={()=>setOpenMenu(isOpen?null:"consultas")}
          style={{ width:34, height:34, borderRadius:4, background:"transparent", border:"none", color:isOpen?C.yellow:"rgba(255,255,255,0.5)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"color 0.15s" }}
          onMouseEnter={e=>e.currentTarget.style.color=C.yellow}
          onMouseLeave={e=>e.currentTarget.style.color=isOpen?C.yellow:"rgba(255,255,255,0.5)"}>
          <IconReports/>
        </button>
        {isOpen && (
          <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, background:C.white, borderRadius:6, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", minWidth:180, overflow:"hidden", zIndex:1000, border:`1px solid ${C.border}` }}>
            {[
              { label:"Por Utilizador", action:()=>setModal("userAssets") },
            ].map(item=>(
              <button key={item.label} onClick={()=>{ item.action(); setOpenMenu(null); }}
                style={{ display:"block", width:"100%", textAlign:"left", padding:"10px 16px", border:"none", background:"transparent", cursor:"pointer", fontSize:12, fontWeight:300, color:C.text, letterSpacing:"0.03em", borderBottom:`1px solid ${C.border}` }}
                onMouseEnter={e=>e.currentTarget.style.background=C.yellowLight}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!authed) return <LoginPage onLogin={(s)=>setSession(s)}/>;

  return (
    <div style={{ minHeight:"100vh", background:C.grayLight, fontFamily:FONT }} onClick={()=>setOpenMenu(null)}>
      <style>{globalStyles}</style>

      {/* HEADER */}
      <div style={{ background:C.dark, padding:"0 16px", boxShadow:"0 2px 12px rgba(0,0,0,0.18)", position:"sticky", top:0, zIndex:800 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:52 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:C.yellow, fontWeight:600, fontSize:15, letterSpacing:"0.08em" }}>g!</span>
            <span className="header-title-full" style={{ color:C.white, fontWeight:300, fontSize:15, letterSpacing:"0.08em" }}>ASSET MANAGER</span>
            <span className="header-title-short" style={{ color:C.white, fontWeight:300, fontSize:13, letterSpacing:"0.08em" }}>ASSETS</span>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }} onClick={e=>e.stopPropagation()}>
            <ReportsMenu/>
            <GearMenu/>
            <div style={{ width:1, height:20, background:"rgba(255,255,255,0.15)", margin:"0 2px" }}/>
            <button onClick={()=>{ setEditingAsset(null); setModal("add"); }}
              style={{ padding:"7px 14px", borderRadius:4, background:C.yellow, border:"none", color:C.dark, cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>
              {isMobile ? "+" : "+ Novo Ativo"}
            </button>
            <button onClick={async()=>{ try { await auth.signOut(session?.access_token); } catch {} auth.clearSession(); setSession(null); }}
              style={{ width:34, height:34, borderRadius:4, background:"transparent", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"color 0.15s" }}
              title="Terminar sessão"
              onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.9)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.5)"}>
              <IconSignOut/>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding: isMobile ? "12px" : "24px 24px" }}>

        {/* STATS */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
          {[
            { label:"Total de Ativos", value:assets.length },
            { label:"Famílias", value:families.length },
            { label:"Localizações", value:localizacoes.length },
            { label:"Utilizadores", value:utilizadores.length },
          ].map(s=>(
            <div key={s.label} style={{ background:C.white, borderRadius:6, padding:"14px 16px", border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize:22, fontWeight:300, color:C.dark }}>{s.value}</div>
              <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.09em", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por nome, modelo, série..."
            style={{ flex:1, minWidth:200, padding:"8px 12px", borderRadius:4, border:`1px solid ${C.grayMid}`, fontSize:13, fontWeight:300, outline:"none", color:C.text, background:C.white }}/>
          <select value={filterFamily} onChange={e=>setFilterFamily(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:4, border:`1px solid ${C.grayMid}`, fontSize:13, fontWeight:300, color:C.text, background:C.white, cursor:"pointer", outline:"none", minWidth:160 }}>
            <option value="">Todas as famílias</option>
            {families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ExportMenu filtered={filtered} families={families} utilizadores={utilizadores}/>
          <div className="toolbar-views" style={{ display:"flex", border:`1px solid ${C.grayMid}`, borderRadius:4, overflow:"hidden" }}>
            {["cards","list"].map(v=>(
              <button key={v} onClick={()=>setView(v)}
                style={{ padding:"8px 14px", border:"none", cursor:"pointer", fontSize:11, fontWeight:view===v?600:300,
                  background:view===v?C.dark:C.white, color:view===v?C.white:C.textLight, letterSpacing:"0.05em", textTransform:"uppercase", transition:"all 0.15s" }}>
                {v==="cards"?"Cards":"Lista"}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        {loading ? <Spinner/> : filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:C.textLight }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📦</div>
            <div style={{ fontSize:14, fontWeight:300 }}>{search||filterFamily ? "Nenhum ativo encontrado." : "Ainda não existem ativos. Clica em \"+ Novo Ativo\" para começar."}</div>
          </div>
        ) : view==="cards" ? (
          /* CARDS */
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
            {filtered.map(asset=>{
              const utilizador = getUtilizador(asset.utilizador_id);
              const disponivel = !asset.utilizador_id;
              return (
                <div key={asset.id} onClick={()=>setDetailAsset(asset)}
                  style={{ background:C.white, borderRadius:8, border:`1px solid ${disponivel?"#86efac":"#fca5a5"}`, overflow:"hidden", cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", transition:"box-shadow 0.2s,transform 0.2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.11)";e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)";e.currentTarget.style.transform="translateY(0)";}}>
                  {/* Barra de disponibilidade no topo */}
                  <div style={{ height:4, background: disponivel ? "#22c55e" : "#ef4444" }}/>
                  <div style={{ height:110, background:C.grayLight, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", position:"relative" }}>
                    {asset.photo_url
                      ? <img src={asset.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
                      : <PhotoPlaceholder size={64} name={asset.name}/>}
                    {/* Badge disponibilidade */}
                    <div style={{ position:"absolute", top:8, right:8, background: disponivel?"#22c55e":"#ef4444", color:"white", borderRadius:20, padding:"2px 8px", fontSize:9, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", boxShadow:"0 1px 4px rgba(0,0,0,0.18)" }}>
                      {disponivel ? "Disponível" : "Em uso"}
                    </div>
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    <div style={{ fontWeight:500, color:C.text, fontSize:13, marginBottom:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{asset.name}</div>
                    {asset.family_id && <div style={{ marginBottom:6 }}><Badge label={getFamilyName(asset.family_id)}/></div>}
                    {asset.modelo && <div style={{ fontSize:11, color:C.textLight, fontWeight:300, marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>🖥 {asset.modelo}</div>}
                    {asset.localizacao && <div style={{ fontSize:11, color:C.textLight, fontWeight:300, marginBottom:3 }}>📍 {asset.localizacao}</div>}
                    {asset.ms365===true && <div style={{ fontSize:10, color:C.dark, background:C.yellowLight, border:`1px solid ${C.yellowMid}`, borderRadius:3, display:"inline-block", padding:"1px 7px", marginTop:4, fontWeight:500, letterSpacing:"0.04em" }}>M365</div>}
                    {utilizador && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
                        <div style={{ width:22, height:22, borderRadius:"50%", overflow:"hidden", background:C.grayMid, flexShrink:0, border:`1px solid ${C.yellowMid}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {utilizador.photo_url ? <img src={utilizador.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:11 }}>👤</span>}
                        </div>
                        <span style={{ fontSize:11, color:C.textMid, fontWeight:300, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{utilizador.nome}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST */
          <div style={{ background:C.white, borderRadius:8, border:`1px solid ${C.border}`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:C.dark }}>
                  <th style={{ padding:"11px 8px 11px 14px", width:10 }}></th>
                  {[
                    { label:"Nome",        col:"name" },
                    { label:"Família",     col:"family" },
                    { label:"Modelo",      col:"modelo",      cls:"table-col-hide" },
                    { label:"Nº Série",    col:"serial",      cls:"table-col-hide" },
                    { label:"Localização", col:"localizacao", cls:"table-col-hide" },
                    { label:"Atribuído a", col:"utilizador" },
                  ].map(({ label, col })=>{
                    const active = sortCol === col;
                    const arrow = active ? (sortDir==="asc" ? " ▲" : " ▼") : " ⇅";
                    return (
                      <th key={col} onClick={()=>handleSort(col)} className={col==="modelo"||col==="serial"||col==="localizacao"?"table-col-hide":""}
                        style={{ padding:"11px 14px", textAlign:"left", fontSize:9, fontWeight:600, color: active?"#e0cb4b":"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:"0.1em", whiteSpace:"nowrap", cursor:"pointer", userSelect:"none", transition:"color 0.15s" }}
                        onMouseEnter={e=>{ if(!active) e.currentTarget.style.color="rgba(255,255,255,0.95)"; }}
                        onMouseLeave={e=>{ if(!active) e.currentTarget.style.color="rgba(255,255,255,0.7)"; }}>
                        {label}<span style={{ fontSize:8, marginLeft:2, opacity: active?1:0.45 }}>{arrow}</span>
                      </th>
                    );
                  })}
                  <th className="table-actions-hide" style={{ padding:"11px 14px" }}></th>
                </tr>
              </thead>
              <tbody>
                {[...filtered].sort((a,b)=>{
                    const va = getSortValue(a, sortCol);
                    const vb = getSortValue(b, sortCol);
                    const cmp = typeof va==="number" ? va-vb : va.localeCompare(vb, "pt", {sensitivity:"base"});
                    return sortDir==="asc" ? cmp : -cmp;
                  }).map((asset,i)=>{
                  const utilizador = getUtilizador(asset.utilizador_id);
                  const disponivel = !asset.utilizador_id;
                  return (
                    <tr key={asset.id} onClick={()=>setDetailAsset(asset)}
                      style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:i%2===0?C.white:C.grayLight, transition:"background 0.12s" }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.yellowLight}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.white:C.grayLight}>
                      <td style={{ padding:"10px 8px 10px 14px", width:10 }}>
                        <div title={disponivel?"Disponível":"Em uso"} style={{ width:10, height:10, borderRadius:"50%", background: disponivel?"#22c55e":"#ef4444", boxShadow:`0 0 0 3px ${disponivel?"#bbf7d0":"#fecaca"}`, flexShrink:0 }}/>
                      </td>
                      <td style={{ padding:"10px 14px", fontSize:13, fontWeight:400, color:C.text, whiteSpace:"nowrap", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis" }}>{asset.name}</td>
                      <td style={{ padding:"10px 14px" }}>{asset.family_id?<Badge label={getFamilyName(asset.family_id)}/>:<span style={{color:C.textLight,fontSize:12}}>—</span>}</td>
                      <td className="table-col-hide" style={{ padding:"10px 14px", fontSize:12, fontWeight:300, color:C.textMid }}>{asset.modelo||"—"}</td>
                      <td className="table-col-hide" style={{ padding:"10px 14px", fontSize:12, fontWeight:300, color:C.textMid, fontFamily:"monospace" }}>{asset.serial||"—"}</td>
                      <td className="table-col-hide" style={{ padding:"10px 14px", fontSize:12, fontWeight:300, color:C.textMid }}>{asset.localizacao||"—"}</td>
                      <td style={{ padding:"10px 14px" }}>
                        {utilizador ? (
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <div style={{ width:26, height:26, borderRadius:"50%", overflow:"hidden", background:C.grayMid, flexShrink:0, border:`2px solid ${C.yellowMid}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                              {utilizador.photo_url ? <img src={utilizador.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:12 }}>👤</span>}
                            </div>
                            <span style={{ fontSize:12, fontWeight:300, color:C.text }}>{utilizador.nome}</span>
                          </div>
                        ) : <span style={{ color:"#22c55e", fontSize:11, fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" }}>Disponível</span>}
                      </td>
                      <td className="table-actions-hide" style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", gap:6 }} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>openEdit(asset)} style={{ padding:"4px 10px", borderRadius:3, background:C.grayLight, border:`1px solid ${C.border}`, color:C.text, cursor:"pointer", fontSize:10, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.04em" }}>Editar</button>
                          <button onClick={()=>setConfirmDelete(asset)} style={{ padding:"4px 10px", borderRadius:3, background:C.dangerLight, border:"none", color:C.danger, cursor:"pointer", fontSize:10, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.04em" }}>Remover</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {(modal==="add"||modal==="edit") && (
        <AssetModal
          asset={modal==="edit"?editingAsset:(editingAsset&&!editingAsset.id?editingAsset:null)}
          families={families}
          localizacoes={localizacoes}
          utilizadores={utilizadores}
          marcas={marcas}
          onSave={handleSave}
          onClose={()=>{ setModal(null); setEditingAsset(null); }}
          showToast={showToast}
          onAddLocalizacao={(loc)=>setLocalizacoes(prev=>[...prev,loc])}
          onAddMarca={(m)=>setMarcas(prev=>[...prev,m])}
        />
      )}
      {modal==="families" && <FamilyModal families={families} onUpdate={setFamilies} onClose={()=>setModal(null)} showToast={showToast}/>}
      {modal==="locations" && <LocationModal localizacoes={localizacoes} onUpdate={setLocalizacoes} onClose={()=>setModal(null)} showToast={showToast}/>}
      {modal==="utilizadores" && <UtilizadoresModal utilizadores={utilizadores} onUpdate={setUtilizadores} onClose={()=>setModal(null)} showToast={showToast}/>}
      {modal==="marcas" && <MarcasModal marcas={marcas} onUpdate={setMarcas} onClose={()=>setModal(null)} showToast={showToast}/>}
      {modal==="userAssets" && <UserAssetsModal utilizadores={utilizadores} assets={assets} families={families} onClose={()=>setModal(null)} onOpenAsset={(a)=>setDetailAsset(a)}/>}
      {detailAsset && (
        <AssetDetail
          asset={detailAsset}
          families={families}
          utilizadores={utilizadores}
          marcas={marcas}
          onEdit={()=>openEdit(detailAsset)}
          onDelete={()=>{ setConfirmDelete(detailAsset); setDetailAsset(null); }}
          onClose={()=>setDetailAsset(null)}
          onDuplicate={()=>handleDuplicate(detailAsset)}
        />
      )}
      {confirmDelete && <ConfirmModal asset={confirmDelete} onConfirm={handleDelete} onClose={()=>setConfirmDelete(null)}/>}
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}
