// Rodar com: node tests/classificador.test.js
const assert = require("node:assert");
const { classificar } = require("../js/classificador.js");

const casos = [
  // [variante, produto, tamanho, grade, cor, modelo]
  ["P / Preto", "", "P", "Normal", "Preto", "Tradicional"],
  ["G1 / Preto", "", "G1", "Plus size", "Preto", "Tradicional"],
  ["Preto / G2", "", "G2", "Plus size", "Preto", "Tradicional"],
  ["G3", "", "G3", "Plus size", "Não informada", "Tradicional"],
  ["Off-white / GG", "", "GG", "Normal", "Off-white", "Tradicional"],
  ["Preto,Oversized M", "", "M", "Normal", "Preto", "Oversized"],
  ["Preto,Oversized GG", "", "GG", "Normal", "Preto", "Oversized"],
  ["GG -Modelo Basico,Preto", "", "GG", "Normal", "Preto", "Básica"],
  ["Todas GG", "Kit 3 Camisetas Streetwear Premium", "GG", "Normal", "Não informada", "Kit"],
  ["M / Branco", "", "M", "Normal", "Branco", "Tradicional"],
  ["Tamanho: G 2 - Preto", "", "G2", "Plus size", "Preto", "Tradicional"],
  ["XL", "", "GG", "Normal", "Não informada", "Tradicional"],
  ["EGG / Preta", "", "G2", "Plus size", "Preto", "Tradicional"],
  ["", "Camiseta Retro Arcade G1", "G1", "Plus size", "Não informada", "Tradicional"],
  ["Preto", "Camiseta Streetwear - Neon Drive", null, "Indefinida", "Preto", "Tradicional"],
];

let ok = 0;
for (const [variante, produto, tam, grade, cor, modelo] of casos) {
  const r = classificar(variante, produto);
  assert.deepStrictEqual(
    { tam: r.tamanho, grade: r.grade, cor: r.cor, modelo: r.modelo },
    { tam, grade, cor, modelo },
    `falhou em "${variante}" / "${produto}"`
  );
  ok++;
}

assert.strictEqual(classificar("G", "Camiseta Streetwear - Garage Noise - Rock").colecao, "Bandas / Rock");
assert.strictEqual(classificar("G", "Camiseta Streetwear - Midnight Slasher").colecao, "Terror");
assert.strictEqual(classificar("G", "Camiseta Streetwear - Retro Arcade").colecao, "Nostalgia / Cultura Pop");
assert.strictEqual(classificar("G", "Camiseta Streetwear - Zombie Drive-In").colecao, "Terror");
assert.strictEqual(classificar("G", "Camiseta Streetwear - Garage Noise - Rock").estampa, "Garage Noise - Rock");

assert.strictEqual(classificar("M", "Camiseta Streetwear - Neon Drive").tipo, "Camiseta");
assert.strictEqual(classificar("P / Preto", "Blusa Moletom Horror").tipo, "Moletom");
assert.strictEqual(classificar("M", "Blusa Feminina Nostalgia").tipo, "Blusa");
assert.strictEqual(classificar("Todas GG", "Kit 3 Camisetas Streetwear").tipo, "Kit");

console.log(`OK: ${ok + 9} testes passaram`);
