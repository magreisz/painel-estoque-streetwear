/*
 * Classificador automático de variantes de roupas.
 * Lê strings livres como "P / Preto", "Preto,Oversized GG", "GG -Modelo Basico,Preto",
 * "Todas GG" ou "Off-white / G1" e devolve tamanho, grade, cor e modelo.
 * Funciona no navegador (window.PAINEL_Classificador) e no Node (module.exports).
 */
(function (raiz) {
  const ORDEM_TAMANHOS = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4"];

  // Sinônimos vistos em marketplaces e fornecedores, convertidos para a grade da loja.
  const SINONIMOS = {
    PP: "PP", XP: "PP", XS: "PP",
    P: "P", S: "P",
    M: "M",
    G: "G", L: "G",
    GG: "GG", XL: "GG",
    G1: "G1", XG: "G1", EG: "G1", XXL: "G1", "2XL": "G1",
    G2: "G2", XGG: "G2", EGG: "G2", XXXL: "G2", "3XL": "G2",
    G3: "G3", EXG: "G3", EXGG: "G3", XXXXL: "G3", "4XL": "G3",
    G4: "G4", "5XL": "G4",
  };

  const CORES = [
    ["Off-white", /\bOFF\s*-?\s*WHITE\b/],
    ["Preto", /\bPRET[OA]\b|\bBLACK\b/],
    ["Branco", /\bBRANC[OA]\b|\bWHITE\b/],
    ["Cinza", /\bCINZA\b|\bMESCLA\b/],
    ["Azul", /\bAZUL\b|\bNAVY\b/],
    ["Vermelho", /\bVERMELH[OA]\b/],
    ["Verde", /\bVERDE\b/],
  ];

  const TIPOS = [
    ["Kit", /\bKIT\b/],
    ["Moletom", /\bMOLETOM\b|\bHOODIE\b|\bCANGURU\b/],
    ["Regata", /\bREGATA\b/],
    ["Cropped", /\bCROPPED\b/],
    ["Blusa", /\bBLUSA\b/],
    ["Camiseta", /\bCAMISETA\b|\bCAMISA\b|\bT-?SHIRT\b/],
    ["Boné", /\bBONE\b/],
    ["Calça", /\bCALCA\b|\bJOGGER\b/],
    ["Bermuda", /\bBERMUDA\b|\bSHORTS?\b/],
  ];

  const MODELOS = [
    ["Oversized", /\bOVERSIZED?\b/],
    ["Básica", /\bBASIC[OA]\b|\bTRADICIONAL\b/],
    ["Regata", /\bREGATA\b/],
    ["Moletom", /\bMOLETOM\b|\bHOODIE\b/],
    ["Kit", /\bKIT\b/],
  ];

  // Coleções por palavra-chave no nome do produto. Ajuste a lista ao catálogo da loja.
  const COLECOES = [
    ["Bandas / Rock", ["ROCK", "PUNK", "METAL", "GRUNGE", "HIP HOP", "RAP", "RIFF", "DISTORTION",
      "AMPS", "BAND", "TOUR"]],
    ["Terror", ["HORROR", "TERROR", "SLASHER", "HAUNTED", "GRAVEYARD", "ZOMBIE", "CURSED", "VAMPIRE",
      "WITCH", "SKULL", "GHOST", "CAVEIRA"]],
    ["Nostalgia / Cultura Pop", ["RETRO", "VHS", "ARCADE", "8 BIT", "CASSETTE", "CARTOONS", "ANOS 90",
      "GAME", "PIXEL", "NOSTALGIA"]],
  ];

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[´`']/g, " ")
      .replace(/\bG\s+([1-4])\b/g, "G$1")          // "G 1" -> "G1"
      .replace(/\b([2-5])\s*X\s*L\b/g, "$1XL")      // "2 XL" -> "2XL"
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(texto) {
    return normalizar(texto).split(/[\s,/\\|;:()\[\]+\-_.]+/).filter(Boolean);
  }

  function extrairTamanho(texto) {
    const achados = [];
    for (const t of tokens(texto)) {
      const tam = SINONIMOS[t];
      if (tam && !achados.includes(tam)) achados.push(tam);
    }
    return achados;
  }

  function primeiro(lista, alvo) {
    const hit = lista.find(([, re]) => re.test(alvo));
    return hit ? hit[0] : null;
  }

  function classificarColecao(produto) {
    const alvo = " " + normalizar(produto).replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ") + " ";
    for (const [nome, chaves] of COLECOES) {
      if (chaves.some((k) => alvo.includes(" " + k + " "))) return nome;
    }
    return "Outros";
  }

  function nomeEstampa(produto) {
    const partes = String(produto || "").split(" - ").map((s) => s.trim()).filter(Boolean);
    if (partes.length <= 1) return String(produto || "").trim();
    return partes.slice(1).join(" - ");
  }

  /**
   * Classifica uma variante. O tamanho vem primeiro da variante; se ela não tiver,
   * cai para o nome do produto (ex.: "Kit 3 Camisetas ... GG").
   */
  function classificar(variante, produto) {
    let tamanhos = extrairTamanho(variante);
    let origem = "variante";
    if (!tamanhos.length && produto) {
      tamanhos = extrairTamanho(produto);
      origem = tamanhos.length ? "produto" : "nenhuma";
    }
    const tamanho = tamanhos[0] || null;
    const alvo = normalizar(`${variante || ""} ${produto || ""}`);
    return {
      tamanho,
      tamanhosEncontrados: tamanhos,
      ambiguo: tamanhos.length > 1,
      origem,
      grade: tamanho ? (/^G[1-4]$/.test(tamanho) ? "Plus size" : "Normal") : "Indefinida",
      tipo: primeiro(TIPOS, normalizar(produto || variante)) || "Outro",
      cor: primeiro(CORES, alvo) || "Não informada",
      modelo: primeiro(MODELOS, alvo) || "Tradicional",
      colecao: classificarColecao(produto),
      estampa: nomeEstampa(produto),
    };
  }

  function ordemTamanho(t) {
    const i = ORDEM_TAMANHOS.indexOf(t);
    return i === -1 ? 99 : i;
  }

  const api = { classificar, extrairTamanho, normalizar, ordemTamanho, ORDEM_TAMANHOS, SINONIMOS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.PAINEL_Classificador = api;
})(typeof window !== "undefined" ? window : globalThis);
