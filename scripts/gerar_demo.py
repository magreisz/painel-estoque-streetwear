"""
Gera js/data.js com dados FICTÍCIOS para demonstrar o painel.

Uso:
    python scripts/gerar_demo.py

Para usar dados reais, gere um js/data.js no mesmo formato (ver README).
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)
SAIDA = Path(__file__).resolve().parent.parent / "js" / "data.js"

ESTAMPAS = [
    "Midnight Slasher", "Haunted Motel", "Graveyard Shift", "Zombie Drive-In", "Cursed Tape",
    "Vampire Club", "Witch Hour", "Skull Garden", "Ghost Signal", "Horror Night",
    "Distortion Club - Rock", "Garage Noise - Rock", "Riff Machine - Metal", "Punk Alley - Punk",
    "Grunge Days - Rock", "Street Cypher - Hip Hop", "Loud Amps - Rock",
    "Retro Arcade", "VHS Kid", "Saturday Cartoons", "8 Bit Hero", "Cassette Love",
    "Anos 90 Crew", "Game Over", "Pixel Racer", "Neon Drive", "Concrete Jungle", "Rooftop",
]
FORMATOS = [
    "{t} / Preto", "{t}", "Preto / {t}", "{t} / Branco", "Off-white / {t}", "{t} / Preto",
]
TAMANHOS = ["P", "M", "G", "GG", "G1", "G2", "G3"]
PESO_TAM = [0.8, 1.4, 2.2, 2.0, 1.0, 0.6, 0.5]
UFS = ["São Paulo"] * 8 + ["Rio de Janeiro"] * 3 + ["Minas Gerais"] * 3 + ["Paraná"] * 2 + \
      ["Santa Catarina", "Rio Grande do Sul", "Bahia", "Goiás", "Pernambuco", "Espírito Santo"]


def produto(nome):
    return f"Camiseta Streetwear - {nome}"


def vendas_mes(fator):
    linhas = []
    for nome in ESTAMPAS:
        pop = random.uniform(0.2, 1.6)
        fmt = random.choice(FORMATOS)
        for tam, peso in zip(TAMANHOS, PESO_TAM):
            un = int(random.gauss(pop * peso * fator, 1.2))
            if un <= 0:
                continue
            preco = 99.9 if tam.startswith("G") and tam != "G" and tam != "GG" else 79.9
            linhas.append({
                "produto": produto(nome),
                "variante": fmt.format(t=tam),
                "unidades": float(un),
                "estoque": None,
                "diasRestantes": None,
                "receita": round(un * preco * random.uniform(0.78, 0.9), 2),
            })
    return linhas


def pedidos():
    status = (["Concluído"] * 14 + ["Entregue"] * 5 + ["Enviado"] * 6 + ["A Enviar"] * 2 +
              ["Cancelado"] * 5)
    motivos = ["Cancelado pelo comprador. Motivo: Outros",
               "Cancelado automaticamente. Motivo: Pedido não pago",
               "Cancelado pelo vendedor. Motivo: Fora de estoque"]
    inicio = datetime(2025, 9, 1, 10, 0)
    out = []
    for i, st in enumerate(status):
        nome = random.choice(ESTAMPAS)
        tam = random.choices(TAMANHOS, PESO_TAM)[0]
        cor = random.choice(["Preto", "Off-white"])
        var = random.choice([f"{cor},{tam}", f"{cor},Oversized {tam}"])
        oversized = "Oversized" in var
        preco = 64.95 if oversized else 49.95
        qtd = 2.0 if random.random() < 0.08 else 1.0
        sub = round(preco * qtd, 2)
        cancelado = st == "Cancelado"
        out.append({
            "canal": "Marketplace",
            "id": f"DEMO{10230 + i}",
            "status": st,
            "motivoCancelamento": (motivos[2] if i % 3 == 0 else random.choice(motivos[:2])) if cancelado else "",
            "devolucao": "Devolução em Andamento" if i in (7, 19) else "",
            "rastreio": "" if cancelado else f"DM{random.randint(100000000, 999999999)}BR",
            "transportadora": "Correios",
            "data": (inicio + timedelta(days=i * 2, hours=random.randint(0, 12))).isoformat(timespec="minutes"),
            "produto": produto(nome),
            "sku": f"SKU-{i:04d}",
            "variacao": var,
            "precoOriginal": preco * 2,
            "precoAcordado": preco,
            "quantidade": qtd,
            "subtotal": sub,
            "valorTotal": 0 if cancelado else round(sub + random.choice([0, 7.15, 19.72]), 2),
            "taxaTransacao": 0,
            "taxaComissao": 0 if cancelado else round(sub * 0.18, 2),
            "taxaServico": 0 if cancelado else 5.0,
            "totalGlobal": 0 if cancelado else round(sub * 0.82 - 5, 2),
            "uf": random.choice(UFS),
        })
    return out


def dre():
    vendas = [8420.0, 12960.0]
    ads = [1890.0, 3110.0]
    ped = [58.0, 86.0]
    pn, pp = [82.0, 160.0], [38.0, 34.0]
    custo_n, custo_p = 18.0, 28.0
    cn = [x * custo_n for x in pn]
    cp = [x * custo_p for x in pp]
    frete = [x * 10 for x in ped]
    total = [cn[i] + cp[i] + ads[i] + frete[i] for i in range(2)]
    lucro = [vendas[i] - total[i] for i in range(2)]
    return {
        "meses": ["Agosto", "Setembro"],
        "vendas": vendas, "gastoAds": ads, "pedidos": ped,
        "pecasNormais": pn, "pecasPlus": pp,
        "custoNormal": cn, "custoPlus": cp, "freteGratis": frete,
        "custoTotal": total, "lucroLiquido": lucro,
        "lucroPct": [lucro[i] / vendas[i] for i in range(2)],
        "pctAds": [ads[i] / vendas[i] for i in range(2)],
        "receitaPorPeca": [vendas[i] / (pn[i] + pp[i]) for i in range(2)],
        "custoPeca": {"plus": {"futuro": custo_p, "atual": custo_p},
                      "basica": {"futuro": custo_n, "atual": custo_n}},
    }


def unitario():
    cenarios = [
        ("Camiseta avulsa (P ao GG)", 89.9, 1, 18.0, 22.0, 0.0, 0.03),
        ("Camiseta avulsa plus (G1 ao G3)", 109.9, 1, 28.0, 22.0, 0.0, 0.03),
        ("Promo Leve 4 Pague 3 (P ao GG)", 269.7, 4, 72.0, 38.0, 15.0, 0.10),
        ("Promo Leve 4 Pague 3 plus", 329.7, 4, 112.0, 38.0, 15.0, 0.10),
    ]
    out = []
    for nome, preco, pecas, custo, ads, frete, gw in cenarios:
        taxa = round(preco * gw, 3)
        lucro = preco - custo - ads - frete - taxa
        out.append({"nome": nome, "preco": preco, "pecas": pecas, "custoPecas": custo, "ads": ads,
                    "frete": frete, "gateway": taxa, "lucro": round(lucro, 3), "margem": lucro / preco})
    return out


def main():
    dados = {
        "geradoEm": datetime.now().isoformat(timespec="minutes"),
        "fonte": "Dados fictícios de demonstração",
        "canalPedidos": "Marketplace",
        "dre": dre(),
        "unitario": unitario(),
        "pedidos": pedidos(),
        "vendas": {"agosto": vendas_mes(1.0), "setembro": vendas_mes(1.6)},
    }
    SAIDA.write_text(
        "// Dados FICTÍCIOS gerados por scripts/gerar_demo.py\n"
        "window.PAINEL_DATA = " + json.dumps(dados, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    print(f"OK: {SAIDA}")


if __name__ == "__main__":
    main()
