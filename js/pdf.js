/**
 * pdf.js
 *
 * Monta o HTML do Laudo RMA para impressão/PDF.
 *
 * A estrutura foi baseada no modelo visual do formulário Rossi:
 * - Logo Rossi
 * - Título LAUDO RMA
 * - Dados do cliente
 * - Data e NF
 * - Tabela de produtos
 * - Situação
 * - Informações para preenchimento
 *
 * A logo é carregada como arquivo estático do projeto e NÃO é
 * armazenada no banco de dados.
 */

window.LaudosPDF = (function () {
  "use strict";

  var api = window.LaudosAPI;

  /*
   * Caminho da logo utilizada exclusivamente no PDF.
   *
   * A imagem deve estar em:
   * /assets/rossi-logo-otimizada.webp
   */
  var LOGO_PATH = "assets/rossi-logo-otimizada.webp";


  /**
   * Cria uma linha da tabela de informações do cliente.
   */
  function row(label, value) {
    return (
      '<div class="pdf-client-row">' +
        '<div class="lbl">' +
          label +
        '</div>' +
        '<div class="val">' +
          api.escapeHtml(value || "") +
        '</div>' +
      '</div>'
    );
  }


  /**
   * Monta uma linha da tabela de produtos.
   */
  function buildItemRow(it) {

    var fabTxt = "";

    if (it.fabricacao) {
      fabTxt =
        '<br>' +
        '<span class="pdf-fab">Fab. ' +
        api.toBR(it.fabricacao) +
        '</span>';
    }


    /*
     * Marca da situação.
     */
    var trocaMark =
      it.situacao === "troca"
        ? "x"
        : "";

    var clienteMark =
      it.situacao === "cliente"
        ? "x"
        : "";


    /*
     * Produto.
     */
    var produto =
      api.escapeHtml(it.produto || "") +
      fabTxt;


    /*
     * Descrição.
     *
     * Mantemos as quebras de linha digitadas no formulário.
     */
    var descricao =
      api
        .escapeHtml(it.descricao || "")
        .toUpperCase()
        .replace(/\n/g, "<br>");


    return (
      '<tr>' +

        /*
         * Item / OS
         */
        '<td class="col-item2">' +
          api.escapeHtml(it.itemOS || "") +
        '</td>' +


        /*
         * Produto
         */
        '<td class="col-produto2">' +
          produto +
        '</td>' +


        /*
         * Descrição do problema
         */
        '<td class="col-desc2">' +
          descricao +
        '</td>' +


        /*
         * Situação
         */
        '<td class="col-situ2">' +

          '<div class="situ-line2">' +
            'TROCA&nbsp; ( &nbsp;' +
            trocaMark +
            '&nbsp; )' +
          '</div>' +

          '<div class="situ-line2">' +
            'CLIENTE ( &nbsp;' +
            clienteMark +
            '&nbsp; )' +
          '</div>' +

        '</td>' +

      '</tr>'
    );
  }


  /**
   * Monta o HTML completo do PDF.
   */
  function buildHtml(l) {

    /*
     * Gera todas as linhas dos produtos.
     */
    var itemsRows = (l.itens || [])
      .map(buildItemRow)
      .join("");


    /*
     * HTML completo do documento.
     */
    return (

      '<div class="pdf-page">' +


        /* =========================================================
           CABEÇALHO
           ========================================================= */

        '<div class="pdf-header2">' +

          /*
           * Logo Rossi real.
           *
           * A imagem fica fora do banco de dados e é carregada
           * somente quando o PDF é montado.
           */
          '<div class="pdf-logo-word">' +

            '<img ' +
              'src="' + LOGO_PATH + '" ' +
              'alt="Rossi - Produtos Inteligentes" ' +
              'class="pdf-logo-image"' +
            '>' +

          '</div>' +


          /*
           * Título.
           */
          '<div class="pdf-title-bar">' +
            '<span>LAUDO RMA</span>' +
          '</div>' +

        '</div>' +



        /* =========================================================
           DADOS DO CLIENTE
           ========================================================= */

        '<div class="pdf-client-wrap">' +


          /*
           * Tabela principal dos dados.
           */
          '<div class="pdf-client-table">' +

            row(
              'Cliente: *',
              l.cliente
            ) +

            row(
              'Endereço:',
              l.endereco
            ) +

            row(
              'Bairro:',
              l.bairro
            ) +

            row(
              'Cidade:',
              l.cidade
            ) +

            row(
              'UF:',
              l.uf
            ) +

            row(
              'Telefone*:',
              l.telefone
            ) +

            row(
              'Responsável pelo envio *',
              l.respEnvio
            ) +

            row(
              'Responsável pelo laudo',
              l.respLaudo
            ) +

            row(
              'E-mail*',
              l.email
            ) +

            row(
              'Whatsapp',
              l.whatsapp
            ) +

          '</div>' +



          /*
           * Coluna lateral:
           * DATA
           * NF
           */
          '<div class="pdf-side">' +


            /*
             * Data.
             */
            '<div class="pdf-date-box2">' +

              '<div class="dl">' +
                'DATA:' +
              '</div>' +

              '<div class="dv">' +
                api.toBR(l.data) +
              '</div>' +

            '</div>' +


            /*
             * Número da NF.
             */
            '<div class="pdf-nf-box2">' +

              '<div class="dl">' +
                'Nº DA NF*' +
              '</div>' +

              '<div class="dv">' +
                api.escapeHtml(l.nfNumero || "") +
              '</div>' +

            '</div>' +

          '</div>' +

        '</div>' +



        /* =========================================================
           OBSERVAÇÕES
           ========================================================= */

        '<div class="pdf-req-line">' +
          '(*) itens obrigatórios' +
        '</div>' +


        '<div class="pdf-banner">' +
          'Este relatório deve esta acompanhado da NF de Remessa de Conserto' +
        '</div>' +



        /* =========================================================
           TABELA DE PRODUTOS
           ========================================================= */

        '<div class="pdf-items-wrap">' +

          '<table class="pdf-table2">' +

            '<thead>' +

              '<tr>' +

                '<th class="c-item">' +
                  'Item / OS*' +
                '</th>' +

                '<th>' +
                  'Produto*' +
                '</th>' +

                '<th>' +
                  'Descrição do problema*' +
                '</th>' +

                '<th>' +
                  'Situação*' +
                '</th>' +

              '</tr>' +

            '</thead>' +


            '<tbody>' +
              itemsRows +
            '</tbody>' +

          '</table>' +

        '</div>' +



        /* =========================================================
           INFORMAÇÕES PARA PREENCHIMENTO
           ========================================================= */

        '<div class="pdf-footer-wrap">' +


          '<div class="pdf-footer-title2">' +
            'Informações para preenchimento dos campos acima' +
          '</div>' +


          '<div class="pdf-footer-cols">' +


            '<div>' +
              'Na coluna "Item/OS", o Nº inserido nesta coluna deve ' +
              'esta anexado no produto com uma etiqueta.' +
            '</div>' +


            '<div>' +

              '<strong>Descrição do Problema</strong>' +

              ' - Informar o período de funcionamento, qual voltagem ' +
              'esta ligada, relato do cliente sobre o defeito, se o ' +
              'defeito é intermitente, Etc....' +

            '</div>' +


            '<div>' +
              'Informar se este produto foi trocado ou é de cliente.' +
            '</div>' +


          '</div>' +

        '</div>' +


      '</div>'
    );
  }


  /**
   * Imprime o laudo.
   */
  function print(l) {

    var printArea = document.getElementById("printArea");

    /*
     * Segurança:
     * se o elemento de impressão não existir, interrompe.
     */
    if (!printArea) {
      console.error(
        "LaudosPDF: elemento #printArea não encontrado."
      );

      return;
    }


    /*
     * Monta o documento.
     */
    printArea.innerHTML = buildHtml(l);


    /*
     * Aguarda a imagem da logo ser carregada antes de
     * abrir a janela de impressão.
     *
     * Isso evita gerar um PDF onde a logo apareça
     * vazia ou não seja renderizada.
     */
    var logo = printArea.querySelector(".pdf-logo-image");


    if (logo && !logo.complete) {

      logo.onload = function () {

        setTimeout(function () {
          window.print();
        }, 60);

      };


      logo.onerror = function () {

        console.warn(
          "LaudosPDF: não foi possível carregar a logo Rossi."
        );

        setTimeout(function () {
          window.print();
        }, 60);

      };


    } else {

      /*
       * A logo já estava carregada.
       */
      setTimeout(function () {
        window.print();
      }, 60);

    }

  }


  /*
   * API pública.
   */
  return {
    buildHtml: buildHtml,
    print: print
  };

})();
