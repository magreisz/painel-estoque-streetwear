/*
 * Camada de dados do painel.
 * Hoje: lê js/data.js (dados locais) e guarda o estoque digitado no navegador.
 * Fase 2: troque MODO para "api" e o painel passa a consumir o backend
 * (server/), que conversa com a API da Nuvemshop. O resto do front não muda.
 */
(function () {
  const MODO = "planilha"; // "planilha" | "api"
  const CHAVE_ESTOQUE = "painel.estoque.v1";

  function lerEstoqueLocal() {
    try { return JSON.parse(localStorage.getItem(CHAVE_ESTOQUE)) || {}; } catch { return {}; }
  }
  function gravarEstoqueLocal(mapa) {
    try { localStorage.setItem(CHAVE_ESTOQUE, JSON.stringify(mapa)); } catch { /* modo privado */ }
  }

  const planilha = {
    nome: "Base local",
    async carregar() {
      const d = window.PAINEL_DATA;
      if (!d) throw new Error("js/data.js não encontrado. Rode scripts/gerar_demo.py");
      return {
        origem: `${d.fonte} · ${new Date(d.geradoEm).toLocaleString("pt-BR")}`,
        canalPedidos: d.canalPedidos,
        dre: d.dre,
        unitario: d.unitario,
        reposicao: d.reposicao,
        pedidos: d.pedidos,
        vendasPorMes: [
          { mes: "Agosto", dias: 31, linhas: d.vendas.agosto },
          { mes: "Setembro", dias: 30, linhas: d.vendas.setembro },
        ],
        estoqueManual: lerEstoqueLocal(),
      };
    },
    async salvarEstoque(chave, quantidade) {
      const mapa = lerEstoqueLocal();
      if (quantidade === null) delete mapa[chave]; else mapa[chave] = quantidade;
      gravarEstoqueLocal(mapa);
    },
    async limparEstoque() { gravarEstoqueLocal({}); },
  };

  // Contrato esperado do backend (ver server/README e server/nuvemshop.js).
  const api = {
    nome: "Nuvemshop API",
    async carregar() {
      const r = await fetch("/api/dashboard", { credentials: "include" });
      if (!r.ok) throw new Error("Falha ao carregar /api/dashboard");
      return r.json();
    },
    async salvarEstoque(chave, quantidade) {
      const r = await fetch("/api/estoque", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave, quantidade }),
      });
      if (!r.ok) throw new Error("Falha ao atualizar estoque");
    },
    async limparEstoque() { /* no modo API o estoque é o da loja */ },
  };

  window.PAINEL_Fonte = MODO === "api" ? api : planilha;
  window.PAINEL_Fonte.modo = MODO;
})();
