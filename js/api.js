/**
 * api.js
 * Toda a comunicação com o Supabase (laudos e sugestões de preenchimento)
 * e pequenos utilitários compartilhados pelo resto do app.
 * Não mexe no DOM — só busca/salva dados e devolve valores.
 */
window.LaudosAPI = (function () {
  "use strict";

  var cfg = window.LAUDOS_CONFIG;
  var sb = null;
  var ready = false;

  try {
    if (window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      ready = true;
    }
  } catch (e) {
    ready = false;
  }

  var SUGG_FIELDS = ["cliente", "endereco", "bairro", "cidade", "uf", "telefone",
    "respEnvio", "respLaudo", "email", "whatsapp", "produto"];

  /* ---------------- Utilitários ---------------- */

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    // fallback gerador de UUID v4 para navegadores muito antigos
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function toBR(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return p.length === 3 ? (p[2] + "/" + p[1] + "/" + p[0]) : iso;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function blankLaudo() {
    return {
      id: uuid(),
      cliente: "", endereco: "", bairro: "", cidade: "", uf: "",
      telefone: "", respEnvio: "", respLaudo: "", email: "", whatsapp: "",
      nfNumero: "", data: todayISO(),
      itens: [],
      createdAt: Date.now(), updatedAt: Date.now()
    };
  }

  /* ---------------- Conversão de formato (app <-> banco) ---------------- */

  function laudoToRow(l) {
    return {
      id: l.id, cliente: l.cliente, endereco: l.endereco, bairro: l.bairro, cidade: l.cidade, uf: l.uf,
      telefone: l.telefone, resp_envio: l.respEnvio, resp_laudo: l.respLaudo, email: l.email,
      whatsapp: l.whatsapp, nf_numero: l.nfNumero, data: l.data || null, itens: l.itens,
      updated_at: new Date(l.updatedAt || Date.now()).toISOString()
    };
  }

  function rowToLaudo(r) {
    return {
      id: r.id, cliente: r.cliente || "", endereco: r.endereco || "", bairro: r.bairro || "", cidade: r.cidade || "",
      uf: r.uf || "", telefone: r.telefone || "", respEnvio: r.resp_envio || "", respLaudo: r.resp_laudo || "",
      email: r.email || "", whatsapp: r.whatsapp || "", nfNumero: r.nf_numero || "", data: r.data || "",
      itens: r.itens || [],
      createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
      updatedAt: r.updated_at ? Date.parse(r.updated_at) : Date.now()
    };
  }

  /* ---------------- Laudos ---------------- */

  async function loadIndex() {
    if (!ready) return [];
    try {
      var res = await sb.from("laudos")
        .select("id,cliente,data,nf_numero,itens,updated_at")
        .order("updated_at", { ascending: false });
      if (res.error) throw res.error;
      return (res.data || []).map(function (r) {
        return {
          id: r.id, cliente: r.cliente || "", data: r.data || "", nfNumero: r.nf_numero || "",
          itemCount: (r.itens || []).length, updatedAt: r.updated_at ? Date.parse(r.updated_at) : 0
        };
      });
    } catch (e) { return []; }
  }

  async function loadLaudo(id) {
    if (!ready) return null;
    try {
      var res = await sb.from("laudos").select("*").eq("id", id).single();
      if (res.error) throw res.error;
      return rowToLaudo(res.data);
    } catch (e) { return null; }
  }

  async function saveLaudo(l) {
    if (!ready) return false;
    try {
      var res = await sb.from("laudos").upsert(laudoToRow(l), { onConflict: "id" });
      if (res.error) throw res.error;
      return true;
    } catch (e) { return false; }
  }

  async function deleteLaudo(id) {
    if (!ready) return false;
    try {
      var res = await sb.from("laudos").delete().eq("id", id);
      if (res.error) throw res.error;
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- Sugestões (dropdowns de preenchimento rápido) ---------------- */

  async function loadSuggestions() {
    if (!ready) return {};
    try {
      var res = await sb.from("field_suggestions").select("field,values");
      if (res.error) throw res.error;
      var obj = {};
      (res.data || []).forEach(function (row) { obj[row.field] = row.values || []; });
      return obj;
    } catch (e) { return {}; }
  }

  async function addSuggestions(currentSuggestions, map) {
    if (!ready) return currentSuggestions;
    try {
      var updates = [];
      Object.keys(map).forEach(function (field) {
        var val = (map[field] || "").trim();
        if (!val) return;
        var list = (currentSuggestions[field] || []).slice();
        var i = list.findIndex(function (v) { return v.toLowerCase() === val.toLowerCase(); });
        if (i >= 0) list.splice(i, 1);
        list.unshift(val);
        if (list.length > 50) list = list.slice(0, 50);
        currentSuggestions[field] = list;
        updates.push({ field: field, values: list, updated_at: new Date().toISOString() });
      });
      if (updates.length === 0) return currentSuggestions;
      var res = await sb.from("field_suggestions").upsert(updates, { onConflict: "field" });
      if (res.error) throw res.error;
      return currentSuggestions;
    } catch (e) { return currentSuggestions; }
  }

  return {
    isReady: function () { return ready; },
    SUGG_FIELDS: SUGG_FIELDS,
    uid: uid, uuid: uuid, todayISO: todayISO, toBR: toBR, escapeHtml: escapeHtml,
    blankLaudo: blankLaudo,
    loadIndex: loadIndex, loadLaudo: loadLaudo, saveLaudo: saveLaudo, deleteLaudo: deleteLaudo,
    loadSuggestions: loadSuggestions, addSuggestions: addSuggestions
  };
})();