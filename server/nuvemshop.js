/*
 * Cliente mínimo da API Nuvemshop para a fase 2 (roda SÓ no servidor).
 * O access token nunca vai para o navegador: o front chama as rotas /api/* do backend,
 * e o backend chama a Nuvemshop com as variáveis de ambiente abaixo.
 *
 *   NUVEMSHOP_STORE_ID      id da loja (user_id devolvido no OAuth)
 *   NUVEMSHOP_ACCESS_TOKEN  token do app (não expira; revogar desinstalando o app)
 *   NUVEMSHOP_CLIENT_SECRET usado para validar a assinatura dos webhooks
 *   NUVEMSHOP_USER_AGENT    obrigatório pela API, ex.: "Painel Streetwear (contato@dominio.com)"
 *
 * Doc oficial: https://tiendanube.github.io/api-documentation/
 * Requer Node 18+ (fetch nativo). Sem dependências.
 */
const crypto = require("node:crypto");
const { classificar } = require("../js/classificador.js");

const BASE = "https://api.nuvemshop.com.br/v1";

function config() {
  const { NUVEMSHOP_STORE_ID, NUVEMSHOP_ACCESS_TOKEN, NUVEMSHOP_USER_AGENT } = process.env;
  if (!NUVEMSHOP_STORE_ID || !NUVEMSHOP_ACCESS_TOKEN || !NUVEMSHOP_USER_AGENT) {
    throw new Error("Variáveis NUVEMSHOP_* não configuradas");
  }
  return { loja: NUVEMSHOP_STORE_ID, token: NUVEMSHOP_ACCESS_TOKEN, ua: NUVEMSHOP_USER_AGENT };
}

async function chamar(metodo, caminho, corpo, tentativa = 0) {
  const { loja, token, ua } = config();
  const r = await fetch(`${BASE}/${loja}${caminho}`, {
    method: metodo,
    headers: {
      // A Nuvemshop usa "Authentication" (e não "Authorization").
      Authentication: `bearer ${token}`,
      "User-Agent": ua,
      "Content-Type": "application/json",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  // Limite da API: balde de 40 requisições que esvazia 2 por segundo.
  if (r.status === 429 && tentativa < 5) {
    const espera = Number(r.headers.get("x-rate-limit-reset")) || 1000 * 2 ** tentativa;
    await new Promise((ok) => setTimeout(ok, espera));
    return chamar(metodo, caminho, corpo, tentativa + 1);
  }
  if (r.status === 404 && metodo === "GET") return [];
  if (!r.ok) {
    // Detalhe fica no log do servidor, nunca na resposta ao usuário.
    console.error("[nuvemshop]", metodo, caminho, r.status, await r.text());
    throw new Error(`Nuvemshop respondeu ${r.status}`);
  }
  return r.status === 204 ? null : r.json();
}

async function paginar(caminho, params = {}) {
  const itens = [];
  for (let page = 1; ; page++) {
    const qs = new URLSearchParams({ ...params, per_page: "200", page: String(page) });
    const lote = await chamar("GET", `${caminho}?${qs}`);
    itens.push(...lote);
    if (lote.length < 200) return itens;
  }
}

/** GET /orders. Use updated_at_min para sincronizar só o que mudou. */
function listarPedidos({ desde, status = "any" } = {}) {
  const p = { status };
  if (desde) p.updated_at_min = new Date(desde).toISOString();
  return paginar("/orders", p);
}

/** GET /products (já vem com variants[], cada uma com values, sku e stock). */
function listarProdutos({ desde } = {}) {
  return paginar("/products", desde ? { updated_at_min: new Date(desde).toISOString() } : {});
}

/** PUT /products/{id}/variants/{id} com o novo estoque. */
function atualizarEstoque(produtoId, varianteId, quantidade) {
  if (!Number.isInteger(quantidade) || quantidade < 0) throw new Error("Quantidade inválida");
  return chamar("PUT", `/products/${produtoId}/variants/${varianteId}`, { stock: quantidade });
}

/** POST /webhooks. Eventos úteis: order/created, order/paid, order/cancelled, product/updated. */
function registrarWebhook(evento, url) {
  return chamar("POST", "/webhooks", { event: evento, url });
}

/** Confere o header x-linkedstore-hmac-sha256 (HMAC-SHA256 do corpo cru com o client secret). */
function webhookValido(corpoCru, assinatura) {
  const segredo = process.env.NUVEMSHOP_CLIENT_SECRET;
  if (!segredo || !assinatura) return false;
  const esperado = crypto.createHmac("sha256", segredo).update(corpoCru).digest("hex");
  const a = Buffer.from(esperado), b = Buffer.from(String(assinatura));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Converte produtos da Nuvemshop para o formato de variantes do painel, já classificadas. */
function variantesDoPainel(produtos) {
  return produtos.flatMap((p) => {
    const nome = p.name?.pt || Object.values(p.name || {})[0] || "";
    return (p.variants || []).map((v) => {
      const valores = (v.values || []).map((x) => x.pt || Object.values(x)[0]).join(" / ");
      return {
        produtoId: p.id,
        varianteId: v.id,
        sku: v.sku,
        produto: nome,
        variante: valores,
        estoque: v.stock, // null = estoque infinito na Nuvemshop
        preco: Number(v.price),
        ...classificar(valores, nome),
      };
    });
  });
}

module.exports = {
  listarPedidos, listarProdutos, atualizarEstoque, registrarWebhook, webhookValido, variantesDoPainel,
};
