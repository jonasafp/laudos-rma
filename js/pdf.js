/**
 * pdf.js
 * Monta o HTML impresso (layout "LAUDO RMA" da Rossi) a partir de um
 * laudo, e aciona a janela de impressão do navegador.
 */
window.LaudosPDF = (function () {
  "use strict";

  var api = window.LaudosAPI;

  function row(label, value) {
    return '<div class="pdf-client-row"><div class="lbl">' + label + '</div><div class="val">' +
      api.escapeHtml(value) + '</div></div>';
  }

  function buildHtml(l) {
    var itemsRows = l.itens.map(function (it) {
      var fabTxt = it.fabricacao ? ("<br>Fab. " + api.toBR(it.fabricacao)) : "";
      var trocaMark = it.situacao === "troca" ? "x" : " ";
      var clienteMark = it.situacao === "cliente" ? "x" : " ";
      return '<tr>' +
        '<td class="col-item2">' + api.escapeHtml(it.itemOS) + '</td>' +
        '<td class="col-produto2">' + api.escapeHtml(it.produto) + fabTxt + '</td>' +
        '<td class="col-desc2">' + api.escapeHtml(it.descricao).toUpperCase().replace(/\n/g, "<br>") + '</td>' +
        '<td class="col-situ2">' +
        '<div class="situ-line2">TROCA&nbsp; ( &nbsp;' + trocaMark + '&nbsp; )</div>' +
        '<div class="situ-line2">CLIENTE ( &nbsp;' + clienteMark + '&nbsp; )</div>' +
        '</td>' +
        '</tr>';
    }).join("");

    return '' +
      '<div class="pdf-page">' +
      '<div class="pdf-header2">' +
      '<div class="pdf-logo-word"><div class="oval">ROSSi</div><div class="tag">Produtos Inteligentes</div></div>' +
      '<div class="pdf-title-bar"><span>LAUDO RMA</span></div>' +
      '</div>' +

      '<div class="pdf-client-wrap">' +
      '<div class="pdf-client-table">' +
      row('Cliente: *', l.cliente) +
      row('Endereço:', l.endereco) +
      row('Bairro:', l.bairro) +
      row('Cidade:', l.cidade) +
      row('UF:', l.uf) +
      row('Telefone*:', l.telefone) +
      row('Responsável pelo envio *', l.respEnvio) +
      row('Responsável pelo laudo', l.respLaudo) +
      row('E-mail*', l.email) +
      row('Whatsapp', l.whatsapp) +
      '</div>' +
      '<div class="pdf-side">' +
      '<div class="pdf-date-box2"><div class="dl">DATA:</div><div class="dv">' + api.toBR(l.data) + '</div></div>' +
      '<div class="pdf-nf-box2"><div class="dl">Nº DA NF*</div><div class="dv">' + api.escapeHtml(l.nfNumero) + '</div></div>' +
      '</div>' +
      '</div>' +

      '<div class="pdf-req-line">(*) itens obrigatórios</div>' +
      '<div class="pdf-banner">Este relatório deve esta acompanhado da NF de Remessa de Conserto</div>' +

      '<div class="pdf-items-wrap">' +
      '<table class="pdf-table2">' +
      '<thead><tr><th class="c-item">Item / OS*</th><th>Produto*</th><th>Descrição do problema*</th><th>Situação*</th></tr></thead>' +
      '<tbody>' + itemsRows + '</tbody>' +
      '</table>' +
      '</div>' +

      '<div class="pdf-footer-wrap">' +
      '<div class="pdf-footer-title2">Informações para preenchimento dos campos acima</div>' +
      '<div class="pdf-footer-cols">' +
      '<div>Na coluna "Item/OS", o Nº inserido nesta coluna deve esta anexado no produto com uma etiqueta.</div>' +
      '<div><strong>Descrição do Problema</strong> - Informar o período de funcionamento, qual voltagem esta ligada, relato do cliente sobre o defeito, se o defeito é intermitente, Etc....</div>' +
      '<div>Informar se este produto foi trocado ou é de cliente.</div>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function print(l) {
    document.getElementById("printArea").innerHTML = buildHtml(l);
    setTimeout(function () { window.print(); }, 60);
  }

  return { buildHtml: buildHtml, print: print };
})();