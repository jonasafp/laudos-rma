/**
 * ui.js
 * Tudo que mexe na tela: lista, formulário, modal de item e a lógica de
 * alternar entre "uma coluna" (celular) e "lista + formulário lado a
 * lado" (tablet/desktop, ver css/style.css para o breakpoint).
 */
window.LaudosUI = (function () {
  "use strict";

  var api = window.LaudosAPI;
  var DESKTOP_QUERY = "(min-width: 720px)";

  function isDesktop() {
    return window.matchMedia(DESKTOP_QUERY).matches;
  }

  var state = { suggestions: {}, editingItemId: null, currentLaudo: null };

  /* ---------------- Referências de elementos ---------------- */
  var el = {}; // populado em init()

  /* ---------------- Toast ---------------- */
  var toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove("show"); }, 2400);
  }

  /* ---------------- Sugestões / datalists ---------------- */
  function renderDatalists() {
    api.SUGG_FIELDS.forEach(function (field) {
      var dl = document.getElementById("dl_" + field);
      if (!dl) return;
      var vals = state.suggestions[field] || [];
      dl.innerHTML = vals.map(function (v) { return '<option value="' + api.escapeHtml(v) + '">'; }).join("");
    });
  }

  async function addSuggestions(map) {
    state.suggestions = await api.addSuggestions(state.suggestions, map);
    renderDatalists();
  }

  /* ---------------- Painel de lista ---------------- */
  async function refreshList() {
    el.pageSub.textContent = "carregando…";
    if (!api.isReady()) {
      el.sharedBanner.innerHTML = "Não consegui conectar ao banco de dados agora. Verifique sua conexão com a internet e recarregue a página.";
      el.listContainer.innerHTML = "";
      el.pageSub.textContent = "armazenamento indisponível";
      return;
    }
    var idx = await api.loadIndex();
    el.pageSub.textContent = idx.length + (idx.length === 1 ? " laudo salvo" : " laudos salvos");
    renderList(idx);
  }

  function renderList(idxEntries) {
    el.listContainer.innerHTML = "";
    if (idxEntries.length === 0) {
      el.listContainer.innerHTML =
        '<div class="empty-state">' +
        '<div class="tag-icon">L</div>' +
        '<p><strong>Nenhum laudo ainda.</strong></p>' +
        '<p>Toque em "+ Novo" para começar a preencher.</p>' +
        '</div>';
      return;
    }
    var sorted = idxEntries.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    sorted.forEach(function (entry) {
      var card = document.createElement("div");
      card.className = "laudo-card";
      if (state.currentLaudo && state.currentLaudo.id === entry.id) card.classList.add("active");
      card.innerHTML =
        '<div class="lc-main">' +
        '<p class="lc-cliente">' + api.escapeHtml(entry.cliente || "(sem cliente)") + '</p>' +
        '<div class="lc-meta">' +
        '<span>📅 ' + api.toBR(entry.data) + '</span>' +
        (entry.nfNumero ? '<span>NF ' + api.escapeHtml(entry.nfNumero) + '</span>' : '') +
        '</div>' +
        '</div>' +
        '<span class="lc-count">' + entry.itemCount + ' ' + (entry.itemCount === 1 ? 'item' : 'itens') + '</span>' +
        '<button class="lc-del" title="Excluir" aria-label="Excluir">✕</button>';
      card.querySelector(".lc-main").addEventListener("click", function () { openLaudo(entry.id); });
      card.querySelector(".lc-count").addEventListener("click", function () { openLaudo(entry.id); });
      card.querySelector(".lc-del").addEventListener("click", async function (ev) {
        ev.stopPropagation();
        if (confirm('Excluir o laudo de "' + (entry.cliente || 'sem nome') + '"? Essa ação não pode ser desfeita.')) {
          await api.deleteLaudo(entry.id);
          toast("Laudo excluído.");
          if (state.currentLaudo && state.currentLaudo.id === entry.id) showEmptyState();
          refreshList();
        }
      });
      el.listContainer.appendChild(card);
    });
  }

  /* ---------------- Alternância de painel (só importa no celular) ---------------- */
  function showListPaneMobile() {
    el.formPane.classList.add("hidden");
    el.listPane.classList.remove("hidden");
    el.btnBack.classList.add("hidden");
  }
  function showFormPaneMobile() {
    el.listPane.classList.add("hidden");
    el.formPane.classList.remove("hidden");
    el.btnBack.classList.remove("hidden");
  }

  function showEmptyState() {
    state.currentLaudo = null;
    el.viewForm.classList.add("hidden");
    el.formEmptyState.classList.remove("hidden");
    el.fabRow.classList.add("hidden");
    el.pageTitle.textContent = "Laudos RMA";
    if (!isDesktop()) showListPaneMobile();
  }

  function openInFormPane(laudo) {
    state.currentLaudo = laudo;
    el.formEmptyState.classList.add("hidden");
    el.viewForm.classList.remove("hidden");
    el.fabRow.classList.remove("hidden");
    el.pageTitle.textContent = laudo.cliente ? laudo.cliente : "Novo laudo";
    fillForm(laudo);
    if (!isDesktop()) showFormPaneMobile();
  }

  async function openLaudo(id) {
    var wasDesktop = isDesktop();
    if (!wasDesktop) { el.listContainer.innerHTML = '<div class="loading-row"><div class="spinner"></div> Abrindo laudo…</div>'; }
    var l = await api.loadLaudo(id);
    if (!l) {
      toast("Não foi possível abrir esse laudo.");
      if (!wasDesktop) refreshList();
      return;
    }
    openInFormPane(l);
    if (!wasDesktop) refreshList(); else renderActiveCard();
  }

  function renderActiveCard() {
    // realça o card selecionado na lista sem refazer a busca inteira
    var cards = el.listContainer.querySelectorAll(".laudo-card");
    cards.forEach(function (c) { c.classList.remove("active"); });
  }

  function newLaudo() {
    openInFormPane(api.blankLaudo());
  }

  el = {}; // será preenchido em bindElements()

  /* ---------------- Formulário ---------------- */
  var FIELD_IDS = ["cliente", "endereco", "bairro", "cidade", "uf", "telefone", "respEnvio", "respLaudo", "email", "whatsapp", "nf", "data"];
  var FIELD_MAP = { nf: "nfNumero" };

  function fillForm(l) {
    FIELD_IDS.forEach(function (key) {
      var prop = FIELD_MAP[key] || key;
      var input = document.getElementById("f_" + key);
      if (input) input.value = l[prop] || "";
    });
    renderItems(l);
  }

  function readFormInto(l) {
    FIELD_IDS.forEach(function (key) {
      var prop = FIELD_MAP[key] || key;
      var input = document.getElementById("f_" + key);
      if (input) l[prop] = input.value.trim();
    });
  }

  async function saveCurrentLaudo() {
    var l = state.currentLaudo;
    if (!l) return;
    readFormInto(l);
    if (!l.cliente) { toast("Informe o nome do cliente."); document.getElementById("f_cliente").focus(); return; }
    if (!l.telefone) { toast("Informe o telefone."); document.getElementById("f_telefone").focus(); return; }
    if (!l.respEnvio) { toast("Informe o responsável pelo envio."); document.getElementById("f_respEnvio").focus(); return; }
    if (!l.email) { toast("Informe o e-mail."); document.getElementById("f_email").focus(); return; }
    if (!l.nfNumero) { toast("Informe o número da NF."); document.getElementById("f_nf").focus(); return; }

    l.updatedAt = Date.now();
    el.btnSaveLaudo.setAttribute("disabled", "true");
    el.btnSaveLaudo.textContent = "Salvando…";
    var ok = await api.saveLaudo(l);
    el.btnSaveLaudo.removeAttribute("disabled");
    el.btnSaveLaudo.textContent = "Salvar laudo";

    if (ok) {
      el.pageTitle.textContent = l.cliente;
      toast("Laudo salvo — já disponível em qualquer aparelho.");
      addSuggestions({
        cliente: l.cliente, endereco: l.endereco, bairro: l.bairro, cidade: l.cidade, uf: l.uf,
        telefone: l.telefone, respEnvio: l.respEnvio, respLaudo: l.respLaudo, email: l.email, whatsapp: l.whatsapp
      });
      refreshList();
    } else {
      toast("Não foi possível salvar agora. Tente novamente.");
    }
  }

  async function deleteCurrentLaudo() {
    var l = state.currentLaudo;
    if (!l) return;
    if (confirm("Excluir este laudo permanentemente?")) {
      await api.deleteLaudo(l.id);
      toast("Laudo excluído.");
      showEmptyState();
      refreshList();
    }
  }

  /* ---------------- Itens ---------------- */
  function renderItems(l) {
    el.itemsContainer.innerHTML = "";
    el.itemCountLabel.textContent = l.itens.length ? (l.itens.length + (l.itens.length === 1 ? " item" : " itens")) : "";
    if (l.itens.length === 0) {
      el.itemsContainer.innerHTML = '<p class="no-items-note">Nenhum item adicionado ainda.</p>';
      return;
    }
    l.itens.forEach(function (it) {
      var row = document.createElement("div");
      row.className = "item-ticket";
      var fabTxt = it.fabricacao ? ("Fab. " + api.toBR(it.fabricacao)) : "";
      row.innerHTML =
        '<div class="it-num">' + api.escapeHtml(it.itemOS) + '</div>' +
        '<div class="it-body">' +
        '<p class="it-produto">' + api.escapeHtml(it.produto) + '</p>' +
        (fabTxt ? '<p class="it-fab">' + fabTxt + '</p>' : '') +
        '<p class="it-desc">' + api.escapeHtml(it.descricao) + '</p>' +
        '<div class="it-tags"><span class="pill ' + it.situacao + '">' + (it.situacao === "troca" ? "TROCA" : "CLIENTE") + '</span></div>' +
        '</div>' +
        '<div class="it-actions">' +
        '<button data-act="edit">Editar</button>' +
        '<button data-act="del">Remover</button>' +
        '</div>';
      row.querySelector('[data-act="edit"]').addEventListener("click", function () { openItemModal(it.id); });
      row.querySelector('[data-act="del"]').addEventListener("click", function () {
        if (confirm("Remover este item do laudo?")) {
          var laudo = state.currentLaudo;
          laudo.itens = laudo.itens.filter(function (x) { return x.id !== it.id; });
          renderItems(laudo);
          toast('Item removido — clique em "Salvar laudo" para confirmar.');
        }
      });
      el.itemsContainer.appendChild(row);
    });
  }

  function nextItemNumber(l) { return String(l.itens.length + 1).padStart(2, "0"); }

  function openItemModal(itemId) {
    var l = state.currentLaudo;
    state.editingItemId = itemId || null;
    if (itemId) {
      var it = l.itens.find(function (x) { return x.id === itemId; });
      el.itemModalTitle.textContent = "Editar item";
      el.m_itemOS.value = it.itemOS;
      el.m_produto.value = it.produto;
      el.m_fabricacao.value = it.fabricacao || "";
      el.m_descricao.value = it.descricao;
      document.querySelector('input[name="m_situacao"][value="' + it.situacao + '"]').checked = true;
    } else {
      el.itemModalTitle.textContent = "Novo item";
      el.m_itemOS.value = nextItemNumber(l);
      el.m_produto.value = "";
      el.m_fabricacao.value = "";
      el.m_descricao.value = "";
      document.querySelector('input[name="m_situacao"][value="troca"]').checked = true;
    }
    el.itemModal.classList.remove("hidden");
    setTimeout(function () { el.m_produto.focus(); }, 50);
  }

  function closeItemModal() {
    el.itemModal.classList.add("hidden");
    state.editingItemId = null;
  }

  function saveItemFromModal() {
    var l = state.currentLaudo;
    if (!el.m_itemOS.value.trim()) { toast("Informe o número do item/OS."); el.m_itemOS.focus(); return; }
    if (!el.m_produto.value.trim()) { toast("Informe o produto."); el.m_produto.focus(); return; }
    if (!el.m_descricao.value.trim()) { toast("Descreva o problema."); el.m_descricao.focus(); return; }
    var situacao = document.querySelector('input[name="m_situacao"]:checked').value;

    if (state.editingItemId) {
      var it = l.itens.find(function (x) { return x.id === state.editingItemId; });
      it.itemOS = el.m_itemOS.value.trim();
      it.produto = el.m_produto.value.trim();
      it.fabricacao = el.m_fabricacao.value;
      it.descricao = el.m_descricao.value.trim();
      it.situacao = situacao;
    } else {
      l.itens.push({
        id: api.uid(), itemOS: el.m_itemOS.value.trim(), produto: el.m_produto.value.trim(),
        fabricacao: el.m_fabricacao.value, descricao: el.m_descricao.value.trim(), situacao: situacao
      });
    }
    renderItems(l);
    el.itemCountLabel.textContent = l.itens.length + (l.itens.length === 1 ? " item" : " itens");
    addSuggestions({ produto: el.m_produto.value.trim() });
    closeItemModal();
    toast('Item salvo — clique em "Salvar laudo" para confirmar.');
  }

  /* ---------------- PDF ---------------- */
  function exportPdf() {
    var l = state.currentLaudo;
    if (!l) return;
    readFormInto(l);
    if (l.itens.length === 0) { toast("Adicione ao menos um item antes de exportar."); return; }
    window.LaudosPDF.print(l);
  }

  /* ---------------- Ligação dos elementos e eventos ---------------- */
  function bindElements() {
    el.toast = document.getElementById("toast");
    el.btnBack = document.getElementById("btnBack");
    el.btnRefresh = document.getElementById("btnRefresh");
    el.pageTitle = document.getElementById("pageTitle");
    el.pageSub = document.getElementById("pageSub");
    el.sharedBanner = document.getElementById("sharedBanner");
    el.listPane = document.getElementById("listPane");
    el.formPane = document.getElementById("formPane");
    el.listContainer = document.getElementById("listContainer");
    el.btnNewLaudo = document.getElementById("btnNewLaudo");
    el.formEmptyState = document.getElementById("formEmptyState");
    el.viewForm = document.getElementById("viewForm");
    el.fabRow = document.getElementById("fabRow");
    el.btnSaveLaudo = document.getElementById("btnSaveLaudo");
    el.btnDeleteLaudo = document.getElementById("btnDeleteLaudo");
    el.itemsContainer = document.getElementById("itemsContainer");
    el.itemCountLabel = document.getElementById("itemCountLabel");
    el.btnAddItem = document.getElementById("btnAddItem");
    el.btnExportPdf = document.getElementById("btnExportPdf");
    el.itemModal = document.getElementById("itemModal");
    el.itemModalTitle = document.getElementById("itemModalTitle");
    el.m_itemOS = document.getElementById("m_itemOS");
    el.m_produto = document.getElementById("m_produto");
    el.m_fabricacao = document.getElementById("m_fabricacao");
    el.m_descricao = document.getElementById("m_descricao");
    el.btnCancelItem = document.getElementById("btnCancelItem");
    el.btnSaveItem = document.getElementById("btnSaveItem");
  }

  function bindEvents() {
    el.btnBack.addEventListener("click", showEmptyState);
    el.btnRefresh.addEventListener("click", function () { refreshList(); toast("Lista atualizada."); });
    el.btnNewLaudo.addEventListener("click", newLaudo);
    el.btnSaveLaudo.addEventListener("click", saveCurrentLaudo);
    el.btnDeleteLaudo.addEventListener("click", deleteCurrentLaudo);
    el.btnAddItem.addEventListener("click", function () { openItemModal(null); });
    el.btnExportPdf.addEventListener("click", exportPdf);
    el.btnCancelItem.addEventListener("click", closeItemModal);
    el.btnSaveItem.addEventListener("click", saveItemFromModal);
    el.itemModal.addEventListener("click", function (e) { if (e.target === el.itemModal) closeItemModal(); });

    // ao redimensionar para desktop, garante que ambos os painéis fiquem
    // visíveis (a classe "hidden" é ignorada via CSS nesse breakpoint,
    // isto só evita qualquer estado visual estranho residual)
    window.matchMedia(DESKTOP_QUERY).addEventListener("change", function () {
      if (!state.currentLaudo) showEmptyState();
    });
  }

  async function init() {
    bindElements();
    bindEvents();
    showEmptyState();
    state.suggestions = await api.loadSuggestions();
    renderDatalists();
    await refreshList();
  }

  return { init: init };
})();