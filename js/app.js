(async function () {
  const C = window.PAINEL_Classificador;
  const fonte = window.PAINEL_Fonte;
  const $ = (s, r = document) => r.querySelector(s);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const brl = (v) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const brl0 = (v) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const pct = (v, d = 1) => ((v ?? 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d }) + "%";
  const int = (v) => Math.round(v ?? 0).toLocaleString("pt-BR");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const COR = {
    normal: css("--s-normal"), plus: css("--s-plus"), ads: css("--s-ads"), frete: css("--s-frete"),
    prev: css("--s-prev"), accent: css("--accent"), surface: css("--surface"),
    ink2: css("--ink-2"), ink3: css("--ink-3"), line: css("--line-soft"),
    critico: css("--st-critico"), atencao: css("--st-atencao"), ok: css("--st-ok"), excesso: css("--st-excesso"),
  };

  Chart.defaults.color = COR.ink3;
  Chart.defaults.font.family = "Lato, system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.borderColor = COR.line;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
  Chart.defaults.plugins.legend.labels.color = COR.ink2;
  Chart.defaults.plugins.tooltip.backgroundColor = "#000";
  Chart.defaults.plugins.tooltip.borderColor = "#2a2a2a";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.maintainAspectRatio = false;

  const barra = { borderRadius: 4, borderSkipped: "start", borderWidth: 0, maxBarThickness: 36 };
  const graficos = {};
  function grafico(id, cfg) {
    graficos[id]?.destroy();
    graficos[id] = new Chart(document.getElementById(id), cfg);
  }

  let D;
  try {
    D = await fonte.carregar();
  } catch (e) {
    document.querySelector(".content").innerHTML = `<div class="alert"><strong>Erro ao carregar dados.</strong> ${esc(e.message)}</div>`;
    return;
  }
  $("#fonte-info").textContent = `Fonte: ${fonte.nome}`;
  $("#side-data").textContent = D.origem;

  /* =============================== NAVEGAÇÃO =============================== */
  const renderizado = {};
  const views = { dre: renderDRE, pedidos: renderPedidos, estoque: renderEstoque };
  function abrir(view) {
    if (!views[view]) view = "dre";
    document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("active", a.dataset.view === view));
    document.querySelectorAll(".view").forEach((s) => s.classList.toggle("active", s.id === "view-" + view));
    if (!renderizado[view]) { views[view](); renderizado[view] = true; }
  }
  window.addEventListener("hashchange", () => abrir(location.hash.slice(1)));

  /* =============================== DRE =============================== */
  function renderDRE() {
    const d = D.dre;
    let mes = d.meses.length - 1;

    const seg = $("#dre-mes");
    seg.innerHTML = d.meses.map((m, i) => `<button data-i="${i}" class="${i === mes ? "on" : ""}">${esc(m)}</button>`).join("");
    seg.onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      mes = +b.dataset.i;
      seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      kpis();
    };

    function delta(serie, inverso = false, formato = "pct") {
      if (mes === 0) return `<span class="muted">primeiro mês da base</span>`;
      const a = serie[mes - 1], b = serie[mes];
      if (!a) return "";
      const bom = inverso ? b <= a : b >= a;
      const txt = formato === "pp" ? `${b >= a ? "+" : ""}${((b - a) * 100).toFixed(1).replace(".", ",")} p.p.`
        : `${b >= a ? "▲" : "▼"} ${pct(Math.abs(b / a - 1), 0)}`;
      return `<span class="delta ${bom ? "up" : "down"}">${txt}</span> vs ${esc(d.meses[mes - 1])}`;
    }

    function kpis() {
      const i = mes;
      const pecas = d.pecasNormais[i] + d.pecasPlus[i];
      const ticket = d.vendas.map((v, k) => v / d.pedidos[k]);
      const cards = [
        ["Faturamento", brl0(d.vendas[i]), delta(d.vendas), true],
        ["Lucro líquido", brl0(d.lucroLiquido[i]), delta(d.lucroLiquido)],
        ["Margem líquida", pct(d.lucroPct[i]), delta(d.lucroPct, false, "pp")],
        ["Custo total", brl0(d.custoTotal[i]), delta(d.custoTotal, true)],
        ["Gasto com ads", brl0(d.gastoAds[i]), `${pct(d.pctAds[i])} do faturamento`],
        ["Pedidos", int(d.pedidos[i]), delta(d.pedidos)],
        ["Ticket médio", brl(ticket[i]), `por pedido · ${int(pecas)} peças`],
        ["Receita por peça", brl(d.receitaPorPeca[i]), "faturamento ÷ peças"],
      ];
      $("#dre-kpis").innerHTML = cards.map(([l, v, s, hero]) => `
        <div class="kpi ${hero ? "hero" : ""}">
          <div class="kpi-label">${l}</div><div class="kpi-value">${v}</div><div class="kpi-sub">${s}</div>
        </div>`).join("");
    }
    kpis();

    const series = [
      ["Peças normais", d.custoNormal, COR.normal],
      ["Peças plus size", d.custoPlus, COR.plus],
      ["Ads", d.gastoAds, COR.ads],
      ["Frete grátis", d.freteGratis, COR.frete],
      ["Lucro líquido", d.lucroLiquido, COR.accent],
    ];
    grafico("ch-composicao", {
      type: "bar",
      data: {
        labels: d.meses,
        datasets: series.map(([label, data, cor]) => ({
          label, data, backgroundColor: cor, borderColor: COR.surface, borderWidth: 2, borderRadius: 3, maxBarThickness: 70,
        })),
      },
      options: {
        indexAxis: "y",
        scales: {
          x: { stacked: true, grid: { color: COR.line }, ticks: { callback: (v) => "R$ " + (v / 1000) + "k" } },
          y: { stacked: true, grid: { display: false }, ticks: { color: COR.ink2, font: { weight: 700 } } },
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.dataset.label}: ${brl0(c.raw)} (${pct(c.raw / d.vendas[c.dataIndex], 0)} da venda)`,
              footer: (items) => `Faturamento: ${brl0(d.vendas[items[0].dataIndex])}`,
            },
          },
        },
      },
    });

    grafico("ch-grade", {
      type: "bar",
      data: {
        labels: d.meses,
        datasets: [
          { label: "Normal (P ao GG)", data: d.pecasNormais, backgroundColor: COR.normal, ...barra },
          { label: "Plus size (G1 ao G3)", data: d.pecasPlus, backgroundColor: COR.plus, ...barra },
        ],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        scales: { x: { grid: { display: false }, ticks: { color: COR.ink2, font: { weight: 700 } } }, y: { grid: { color: COR.line }, beginAtZero: true } },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (c) => {
                const tot = d.pecasNormais[c.dataIndex] + d.pecasPlus[c.dataIndex];
                return ` ${c.dataset.label}: ${int(c.raw)} peças (${pct(c.raw / tot, 0)})`;
              },
            },
          },
        },
      },
    });

    const maxMargem = Math.max(...D.unitario.map((u) => u.margem));
    $("#tbl-unitario").innerHTML = `
      <thead><tr><th>Venda</th><th class="num">Preço</th><th class="num">Peças</th><th class="num">Custo peças</th>
      <th class="num">Ads</th><th class="num">Frete</th><th class="num">Gateway</th><th class="num">Lucro</th><th>Margem</th></tr></thead>
      <tbody>${D.unitario.map((u) => `
        <tr>
          <td class="strong">${esc(u.nome)}</td>
          <td class="num">${brl(u.preco)}</td><td class="num">${int(u.pecas)}</td>
          <td class="num muted">${brl(u.custoPecas)}</td><td class="num muted">${brl(u.ads)}</td>
          <td class="num muted">${brl(u.frete)}</td><td class="num muted">${brl(u.gateway)}</td>
          <td class="num accent">${brl(u.lucro)}</td>
          <td><div class="days"><div class="days-bar"><i style="width:${(u.margem / maxMargem) * 100}%;background:${COR.accent}"></i></div><b>${pct(u.margem, 0)}</b></div></td>
        </tr>`).join("")}</tbody>`;

    renderSimulador();
  }

  function renderSimulador() {
    const el = $("#simulador");
    el.innerHTML = `
      <label class="full">Cenário base
        <select id="sim-cen">${D.unitario.map((u, i) => `<option value="${i}">${esc(u.nome)}</option>`).join("")}</select>
      </label>
      <label>Preço de venda (R$)<input type="number" step="0.01" min="0" id="sim-preco"></label>
      <label>Custo das peças (R$)<input type="number" step="0.01" min="0" id="sim-custo"></label>
      <label>Ads por venda (R$)<input type="number" step="0.01" min="0" id="sim-ads"></label>
      <label>Frete grátis (R$)<input type="number" step="0.01" min="0" id="sim-frete"></label>
      <label class="full">Taxa de gateway (% do preço)<input type="number" step="0.01" min="0" max="100" id="sim-gw"></label>
      <div class="sim-out">
        <div class="hl"><span>Lucro por venda</span><b id="sim-lucro"></b></div>
        <div><span>Margem</span><b id="sim-margem"></b></div>
        <div><span>Ads máximo p/ empatar</span><b id="sim-teto"></b></div>
      </div>`;
    const campos = ["preco", "custo", "ads", "frete", "gw"].map((k) => $("#sim-" + k));
    function carregar(i) {
      const u = D.unitario[i];
      const vals = [u.preco, u.custoPecas, u.ads, u.frete, +((u.gateway / u.preco) * 100).toFixed(2)];
      campos.forEach((c, k) => (c.value = vals[k]));
      calcular();
    }
    function calcular() {
      const [preco, custo, ads, frete, gw] = campos.map((c) => parseFloat(c.value) || 0);
      const taxa = preco * (gw / 100);
      const lucro = preco - custo - ads - frete - taxa;
      $("#sim-lucro").textContent = brl(lucro);
      $("#sim-lucro").style.color = lucro < 0 ? COR.critico : "";
      $("#sim-margem").textContent = preco ? pct(lucro / preco) : "–";
      $("#sim-teto").textContent = brl(Math.max(0, preco - custo - frete - taxa));
    }
    $("#sim-cen").onchange = (e) => carregar(+e.target.value);
    campos.forEach((c) => (c.oninput = calcular));
    carregar(0);
  }


  /* =============================== PEDIDOS =============================== */
  function statusPedido(p) {
    const s = p.status.toLowerCase();
    if (s.includes("cancel")) return { nome: "Cancelado", cls: "critico" };
    if (p.devolucao && /andamento|aprovada/i.test(p.devolucao)) return { nome: "Devolução", cls: "atencao" };
    if (s.includes("devolução até")) return { nome: "Entregue", cls: "ok" };
    if (s.includes("conclu")) return { nome: "Concluído", cls: "ok" };
    if (s.includes("entregue")) return { nome: "Entregue", cls: "ok" };
    if (s.includes("enviado")) return { nome: "Enviado", cls: "neutro" };
    if (s.includes("enviar")) return { nome: "A enviar", cls: "atencao" };
    return { nome: p.status || "Outro", cls: "neutro" };
  }

  function renderPedidos() {
    const linhas = D.pedidos.map((p) => ({ ...p, st: statusPedido(p), cls: C.classificar(p.variacao, p.produto) }));
    const porId = new Map();
    linhas.forEach((l) => { if (!porId.has(l.id)) porId.set(l.id, l); });
    const pedidos = [...porId.values()];
    const validos = pedidos.filter((p) => p.st.nome !== "Cancelado");
    const linhasValidas = linhas.filter((l) => l.st.nome !== "Cancelado");
    const faturamento = linhasValidas.reduce((s, l) => s + l.subtotal, 0);
    const taxas = validos.reduce((s, p) => s + p.taxaComissao + p.taxaServico + p.taxaTransacao, 0);
    const cancelados = pedidos.filter((p) => p.st.nome === "Cancelado");
    const semEstoque = linhas.filter((l) => /fora de estoque/i.test(l.motivoCancelamento));
    const devolucoes = pedidos.filter((p) => p.st.nome === "Devolução");
    const datas = linhas.map((l) => l.data).filter(Boolean).sort();
    const periodo = datas.length ? `${new Date(datas[0]).toLocaleDateString("pt-BR")} a ${new Date(datas.at(-1)).toLocaleDateString("pt-BR")}` : "";

    $("#canal-tag").textContent = `Canal: ${D.canalPedidos} · ${periodo}`;

    const cards = [
      ["Pedidos", int(pedidos.length), `${int(linhas.length)} itens`, true],
      ["Faturamento", brl(faturamento), "produtos, sem cancelados"],
      [`Taxas ${D.canalPedidos}`, brl(taxas), `${pct(taxas / faturamento)} do faturamento`],
      ["Líquido após taxas", brl(faturamento - taxas), "antes de custo e ads"],
      ["Cancelados", int(cancelados.length), `${pct(cancelados.length / pedidos.length, 0)} dos pedidos`],
      ["Devoluções", int(devolucoes.length), "em andamento ou aprovadas"],
    ];
    $("#ped-kpis").innerHTML = cards.map(([l, v, s, hero]) => `
      <div class="kpi ${hero ? "hero" : ""}"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div><div class="kpi-sub">${s}</div></div>`).join("");

    if (semEstoque.length) {
      const perdido = semEstoque.reduce((s, l) => s + l.subtotal, 0);
      $("#ped-alerta").innerHTML = `⚠ <strong>${semEstoque.length} pedidos cancelados por falta de estoque</strong> (${brl(perdido)} em vendas perdidas): ` +
        semEstoque.map((l) => `${esc(l.cls.estampa)} tam. <strong>${l.cls.tamanho}</strong>`).join(", ") +
        `. O módulo Estoque Inteligente existe para isso não acontecer.`;
    }

    const contar = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m; }, {});
    const barrasH = (id, obj, cor, ordem) => {
      const entradas = ordem ? ordem.filter((k) => obj[k]).map((k) => [k, obj[k]]) : Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 8);
      grafico(id, {
        type: "bar",
        data: { labels: entradas.map((e) => e[0]), datasets: [{ label: "Pedidos", data: entradas.map((e) => e[1]), backgroundColor: cor, ...barra }] },
        options: {
          indexAxis: ordem ? "x" : "y",
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: !!!ordem, color: COR.line }, ticks: { precision: 0, color: ordem ? COR.ink2 : COR.ink3 }, beginAtZero: true },
            y: { grid: { display: !!ordem, color: COR.line }, ticks: { precision: 0, color: ordem ? COR.ink3 : COR.ink2 }, beginAtZero: true },
          },
        },
      });
    };
    barrasH("ch-status", contar(pedidos, (p) => p.st.nome), COR.accent);
    barrasH("ch-uf", contar(pedidos, (p) => p.uf || "N/I"), COR.accent);
    const porTam = linhasValidas.reduce((m, l) => { m[l.cls.tamanho || "?"] = (m[l.cls.tamanho || "?"] || 0) + l.quantidade; return m; }, {});
    barrasH("ch-ped-tam", porTam, COR.accent, C.ORDEM_TAMANHOS);

    const selStatus = $("#ped-status");
    const nomes = [...new Set(linhas.map((l) => l.st.nome))];
    selStatus.innerHTML = `<option value="">Todos os status</option>` + nomes.map((n) => `<option>${esc(n)}</option>`).join("");

    function tabela() {
      const q = $("#ped-busca").value.trim().toLowerCase();
      const st = selStatus.value;
      const lista = linhas
        .filter((l) => !st || l.st.nome === st)
        .filter((l) => !q || `${l.id} ${l.produto} ${l.variacao} ${l.rastreio}`.toLowerCase().includes(q))
        .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
      $("#tbl-pedidos").innerHTML = `
        <thead><tr><th>Data</th><th>Pedido</th><th>Estampa</th><th>Variação original</th><th>Tam.</th><th>Status</th><th class="num">Qtd</th><th class="num">Valor</th><th>Rastreio</th></tr></thead>
        <tbody>${lista.map((l) => `
          <tr>
            <td class="muted">${l.data ? new Date(l.data).toLocaleDateString("pt-BR") : ""}</td>
            <td class="strong">${esc(l.id)}</td>
            <td>${esc(l.cls.estampa)}</td>
            <td class="muted">${esc(l.variacao)}</td>
            <td>${tamBadge(l.cls)}</td>
            <td><span class="pill ${l.st.cls}">${esc(l.st.nome)}</span></td>
            <td class="num">${int(l.quantidade)}</td>
            <td class="num">${brl(l.subtotal)}</td>
            <td class="muted">${esc(l.rastreio || "–")}</td>
          </tr>`).join("") || `<tr><td colspan="9" class="muted">Nenhum pedido encontrado.</td></tr>`}</tbody>`;
    }
    $("#ped-busca").oninput = tabela;
    selStatus.onchange = tabela;
    tabela();
  }

  function tamBadge(cls) {
    if (!cls.tamanho) return `<span class="size" title="Tamanho não identificado">?</span>`;
    return `<span class="size ${cls.grade === "Plus size" ? "plus" : ""}" title="${esc(cls.grade)}">${cls.tamanho}</span>`;
  }

  /* =============================== ESTOQUE =============================== */
  const STATUS = {
    critico: { nome: "Crítico", ico: "●", ordem: 0 },
    atencao: { nome: "Atenção", ico: "▲", ordem: 1 },
    ok: { nome: "OK", ico: "✓", ordem: 2 },
    excesso: { nome: "Excesso", ico: "■", ordem: 3 },
    semVenda: { nome: "Sem dado", ico: "–", ordem: 4 },
  };
  const COBERTURA_ALVO = 30; // dias de estoque desejados após repor
  const CUSTO_PECA = { Normal: D.dre.custoPeca.basica.futuro, "Plus size": D.dre.custoPeca.plus.futuro };

  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

  function montarVariantes() {
    const mapa = new Map();
    const ultimo = D.vendasPorMes.length - 1;
    D.vendasPorMes.forEach((m, iMes) => {
      for (const l of m.linhas) {
        const cls = C.classificar(l.variante, l.produto);
        const chave = `${cls.estampa}|${cls.tamanho}|${cls.cor}`.toUpperCase();
        if (!mapa.has(chave)) mapa.set(chave, { chave, cls, produto: l.produto, variantes: new Set(), vendas: D.vendasPorMes.map(() => 0), receita: 0, estoquePlanilha: null });
        const v = mapa.get(chave);
        v.variantes.add(l.variante);
        v.vendas[iMes] += l.unidades;
        v.receita += l.receita;
        if (iMes === ultimo && l.estoque != null) v.estoquePlanilha = l.estoque;
      }
    });
    return [...mapa.values()].map((v) => {
      const iRef = v.vendas[ultimo] > 0 ? ultimo : v.vendas.findLastIndex((x) => x > 0);
      v.velocidade = iRef >= 0 ? v.vendas[iRef] / D.vendasPorMes[iRef].dias : 0;
      return v;
    });
  }

  function renderEstoque() {
    const variantes = montarVariantes();
    let simular = true;
    const filtroTam = new Set();

    function estoqueDe(v) {
      if (D.estoqueManual[v.chave] != null) return { qtd: D.estoqueManual[v.chave], origem: "manual" };
      if (v.estoquePlanilha != null) return { qtd: v.estoquePlanilha, origem: "planilha" };
      if (!simular) return { qtd: null, origem: "vazio" };
      const r = hash(v.chave);
      const mensal = v.velocidade * 30;
      const qtd = r < 0.07 ? 0 : Math.max(1, Math.round(mensal * (0.2 + r * 2.2)) + Math.floor(r * 5));
      return { qtd, origem: "simulado" };
    }

    function calcular(v) {
      const e = estoqueDe(v);
      v.estoque = e.qtd; v.origem = e.origem;
      if (v.estoque == null) { v.dias = null; v.status = "semVenda"; v.repor = 0; return v; }
      v.dias = v.velocidade > 0 ? v.estoque / v.velocidade : Infinity;
      v.status = v.estoque <= 0 || v.dias < 7 ? "critico" : v.dias < 15 ? "atencao" : v.dias <= 60 ? "ok" : "excesso";
      v.repor = Math.max(0, Math.ceil(v.velocidade * COBERTURA_ALVO - v.estoque));
      return v;
    }

    function banner() {
      const temManual = Object.keys(D.estoqueManual).length;
      const semPlanilha = variantes.every((v) => v.estoquePlanilha == null);
      $("#est-banner").innerHTML = `
        <div>${semPlanilha ? "<strong>A base não trouxe estoque atual.</strong> " : ""}
        ${simular ? "Linhas com borda tracejada usam <strong>estoque SIMULADO</strong> só para demonstrar os alertas." : "Simulação desligada."}
        Digite o estoque real na tabela (${temManual} variante(s) com valor manual). Na fase 2 esse número vem direto da API da Nuvemshop.</div>
        <div class="filters">
          <button id="btn-sim">${simular ? "Desligar simulação" : "Ligar simulação"}</button>
          <button id="btn-limpar">Limpar valores digitados</button>
          <button id="btn-csv">Baixar lista de reposição (CSV)</button>
        </div>`;
      $("#btn-sim").onclick = () => { simular = !simular; atualizar(); };
      $("#btn-limpar").onclick = async () => {
        if (!confirm("Apagar todos os estoques digitados neste navegador?")) return;
        await fonte.limparEstoque(); D.estoqueManual = {}; atualizar();
      };
      $("#btn-csv").onclick = exportarCSV;
    }

    function kpis() {
      const conta = (s) => variantes.filter((v) => v.status === s).length;
      const esgotadas = variantes.filter((v) => v.estoque === 0).length;
      const repor = variantes.reduce((s, v) => s + v.repor, 0);
      const custo = variantes.reduce((s, v) => s + v.repor * (CUSTO_PECA[v.cls.grade] || CUSTO_PECA.Normal), 0);
      const cards = [
        ["Variantes monitoradas", int(variantes.length), `${new Set(variantes.map((v) => v.cls.estampa)).size} estampas`, false],
        ["Crítico", int(conta("critico")), `${int(esgotadas)} esgotadas · menos de 7 dias`, false, "critico"],
        ["Atenção", int(conta("atencao")), "entre 7 e 15 dias", false, "atencao"],
        ["Peças a repor", int(repor), `para ${COBERTURA_ALVO} dias de cobertura`, true],
        ["Custo da reposição", brl0(custo), `normal ${brl(CUSTO_PECA.Normal)} · plus ${brl(CUSTO_PECA["Plus size"])}`],
      ];
      $("#est-kpis").innerHTML = cards.map(([l, v, s, hero, st]) => `
        <div class="kpi ${hero ? "hero" : ""}"><div class="kpi-label">${st ? `<span style="color:${COR[st]}">${STATUS[st].ico}</span> ` : ""}${l}</div>
        <div class="kpi-value">${v}</div><div class="kpi-sub">${s}</div></div>`).join("");
    }

    function graficoTamanhos() {
      const tams = C.ORDEM_TAMANHOS.filter((t) => variantes.some((v) => v.cls.tamanho === t));
      const cores = [COR.prev, COR.accent];
      grafico("ch-tamanhos", {
        type: "bar",
        data: {
          labels: tams,
          datasets: D.vendasPorMes.map((m, i) => ({
            label: m.mes,
            data: tams.map((t) => variantes.filter((v) => v.cls.tamanho === t).reduce((s, v) => s + v.vendas[i], 0)),
            backgroundColor: cores[i % 2], ...barra,
          })),
        },
        options: {
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${int(c.raw)} un.` } } },
          scales: { x: { grid: { display: false }, ticks: { color: COR.ink2, font: { weight: 900 } } }, y: { grid: { color: COR.line }, beginAtZero: true } },
        },
      });
    }

    function heatmap() {
      const iMes = D.vendasPorMes.length - 1;
      const tams = C.ORDEM_TAMANHOS.filter((t) => variantes.some((v) => v.cls.tamanho === t));
      const porEstampa = new Map();
      for (const v of variantes) {
        const e = porEstampa.get(v.cls.estampa) || { total: 0, t: {} };
        e.total += v.vendas[iMes];
        e.t[v.cls.tamanho] = (e.t[v.cls.tamanho] || 0) + v.vendas[iMes];
        porEstampa.set(v.cls.estampa, e);
      }
      const top = [...porEstampa.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 15);
      const max = Math.max(...top.flatMap(([, e]) => Object.values(e.t)));
      $("#heatmap").innerHTML = `<thead><tr><th></th>${tams.map((t) => `<th>${t}</th>`).join("")}<th>Total</th></tr></thead><tbody>` +
        top.map(([nome, e]) => `<tr><th class="row" title="${esc(nome)}">${esc(nome)}</th>${tams.map((t) => {
          const n = e.t[t] || 0;
          if (!n) return `<td class="zero" data-tip="${esc(nome)} · ${t}: sem vendas">·</td>`;
          const a = 0.18 + 0.82 * (n / max);
          return `<td style="background:rgba(241,196,15,${a.toFixed(2)});color:${a > 0.55 ? "#0a0a0a" : "#f5f5f5"}" data-tip="${esc(nome)} · ${t}: ${n} un.">${n}</td>`;
        }).join("")}<td class="zero" style="color:var(--ink);font-weight:900">${e.total}</td></tr>`).join("") + "</tbody>";
    }

    const colecoes = [...new Set(variantes.map((v) => v.cls.colecao))].sort();
    $("#est-colecao").innerHTML = `<option value="">Todas as coleções</option>` + colecoes.map((c) => `<option>${esc(c)}</option>`).join("");
    const tamsPresentes = C.ORDEM_TAMANHOS.filter((t) => variantes.some((v) => v.cls.tamanho === t));
    $("#est-tamanhos").innerHTML = `<button data-t="" class="on">Todos</button>` + tamsPresentes.map((t) => `<button data-t="${t}">${t}</button>`).join("");
    $("#est-tamanhos").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const t = b.dataset.t;
      if (!t) filtroTam.clear(); else filtroTam.has(t) ? filtroTam.delete(t) : filtroTam.add(t);
      $("#est-tamanhos").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.t ? filtroTam.has(x.dataset.t) : filtroTam.size === 0));
      tabela();
    };
    $("#est-busca").oninput = tabela;
    $("#est-colecao").onchange = tabela;
    $("#est-status").onchange = tabela;

    function corDias(v) {
      return COR[v.status] || COR.ink3;
    }

    function tabela() {
      const q = $("#est-busca").value.trim().toLowerCase();
      const col = $("#est-colecao").value;
      const st = $("#est-status").value;
      const lista = variantes
        .filter((v) => !filtroTam.size || filtroTam.has(v.cls.tamanho))
        .filter((v) => !col || v.cls.colecao === col)
        .filter((v) => !st || v.status === st)
        .filter((v) => !q || v.cls.estampa.toLowerCase().includes(q))
        .sort((a, b) => STATUS[a.status].ordem - STATUS[b.status].ordem || (a.dias ?? 1e9) - (b.dias ?? 1e9) || b.velocidade - a.velocidade);
      const meses = D.vendasPorMes.map((m) => m.mes.slice(0, 3));
      $("#tbl-estoque").innerHTML = `
        <thead><tr><th>Estampa</th><th>Coleção</th><th>Tipo</th><th>Cor</th><th>Tam.</th>${meses.map((m) => `<th class="num">Vend. ${m}</th>`).join("")}
        <th class="num">Vel./dia</th><th class="num">Estoque</th><th>Dias restantes</th><th>Status</th><th class="num">Repor</th></tr></thead>
        <tbody>${lista.map((v) => {
          const s = STATUS[v.status];
          const dias = v.dias == null ? "–" : v.dias === Infinity ? "∞" : Math.floor(v.dias) + "d";
          const w = v.dias == null ? 0 : Math.min(100, (Math.min(v.dias, 60) / 60) * 100);
          return `<tr>
            <td class="strong" title="${esc([...v.variantes].join(" | "))}">${esc(v.cls.estampa)}</td>
            <td class="muted">${esc(v.cls.colecao)}</td>
            <td class="muted">${esc(v.cls.tipo)}</td>
            <td class="muted">${v.cls.cor === "Não informada" ? "–" : esc(v.cls.cor)}</td>
            <td>${tamBadge(v.cls)}</td>
            ${v.vendas.map((n) => `<td class="num">${int(n)}</td>`).join("")}
            <td class="num muted">${v.velocidade.toFixed(2).replace(".", ",")}</td>
            <td class="num"><input class="stock-input ${v.origem === "simulado" ? "sim" : ""}" type="number" min="0" step="1"
                 data-k="${esc(v.chave)}" value="${v.estoque ?? ""}" placeholder="–" aria-label="Estoque ${esc(v.cls.estampa)} ${v.cls.tamanho}"></td>
            <td><div class="days"><div class="days-bar"><i style="width:${w}%;background:${corDias(v)}"></i></div><b>${dias}</b></div></td>
            <td><span class="pill ${v.status === "semVenda" ? "neutro" : v.status}">${s.ico} ${s.nome}</span></td>
            <td class="num ${v.repor ? "accent" : "muted"}">${v.repor ? int(v.repor) : "–"}</td>
          </tr>`;
        }).join("") || `<tr><td colspan="14" class="muted">Nenhuma variante com esses filtros.</td></tr>`}</tbody>`;
    }

    $("#tbl-estoque").addEventListener("change", async (e) => {
      const inp = e.target.closest(".stock-input"); if (!inp) return;
      const valor = inp.value === "" ? null : Math.max(0, parseInt(inp.value, 10));
      if (valor === null) delete D.estoqueManual[inp.dataset.k]; else D.estoqueManual[inp.dataset.k] = valor;
      try { await fonte.salvarEstoque(inp.dataset.k, valor); } catch (err) { alert(err.message); }
      atualizar();
    });

    function exportarCSV() {
      const linhas = variantes.filter((v) => v.repor > 0).sort((a, b) => STATUS[a.status].ordem - STATUS[b.status].ordem);
      const cab = ["Estampa", "Tamanho", "Cor", "Grade", "Estoque", "Vendas/dia", "Dias restantes", "Status", "Repor", "Origem do estoque"];
      const csv = [cab, ...linhas.map((v) => [v.cls.estampa, v.cls.tamanho, v.cls.cor, v.cls.grade, v.estoque, v.velocidade.toFixed(2).replace(".", ","),
        v.dias === Infinity ? "" : Math.floor(v.dias), STATUS[v.status].nome, v.repor, v.origem])]
        .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["" + csv], { type: "text/csv;charset=utf-8" }));
      a.download = `reposicao-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function atualizar() {
      variantes.forEach(calcular);
      banner(); kpis(); tabela();
    }

    atualizar();
    graficoTamanhos();
    heatmap();
    testador();
  }

  function testador() {
    const inp = $("#cls-input");
    function mostrar() {
      const r = C.classificar(inp.value, inp.value);
      const campo = (l, v) => `<div><span>${l}</span><b>${esc(v)}</b></div>`;
      $("#cls-out").innerHTML =
        `<div class="big"><span>Tamanho</span><b>${r.tamanho || "?"}</b></div>` +
        campo("Grade", r.grade) + campo("Cor", r.cor) + campo("Modelo", r.modelo) + campo("Tipo", r.tipo) +
        (r.ambiguo ? campo("Atenção", "mais de um tamanho: " + r.tamanhosEncontrados.join(", ")) : "");
    }
    inp.oninput = mostrar;
    document.querySelector(".tester-ex").onclick = (e) => {
      const b = e.target.closest("button[data-ex]"); if (!b) return;
      inp.value = b.dataset.ex; mostrar();
    };
    mostrar();
  }

  /* tooltip do mapa de calor */
  const tip = $("#tooltip");
  document.addEventListener("mousemove", (e) => {
    const alvo = e.target.closest("[data-tip]");
    if (!alvo) { tip.hidden = true; return; }
    tip.textContent = alvo.dataset.tip;
    tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + "px";
    tip.style.top = e.clientY + 14 + "px";
  });

  document.querySelectorAll(".menu a").forEach((a) => a.addEventListener("click", () => {}));
  abrir(location.hash.slice(1) || "dre");
})();
