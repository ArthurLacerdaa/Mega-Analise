/* app.js - original preservado + gerador de jogos */

const CHART_ID = "grafico";
let chartInstance = null;

/* ===== configuração de loteria ===== */
const LOTERIAS = {
  mega: {
    arquivo: "stats.json",
    min: 1,
    max: 60,
    titulo: "Estatísticas • Números mais sorteados da Mega-Sena",
    tamanhoJogo: 6
  },
  lotofacil: {
    arquivo: "lotofacil.json",
    min: 1,
    max: 25,
    titulo: "Estatísticas • Números mais sorteados da Lotofácil",
    tamanhoJogo: 15
  }
};

/* ===== estado inicial sincronizado com o HTML ===== */
const btnAtivoInicial = document.querySelector(".lottery-btn.active");
let LOTERIA_ATUAL = btnAtivoInicial?.dataset.loteria || "mega";

/* ================================================ */

let FREQ_MAP_ATUAL = {}; // cache das frequências

/* ===== utilitários ===== */
function buildFreqMap(dados) {
  const map = {};
  if (!dados) return map;

  if (Array.isArray(dados.numeros)) {
    dados.numeros.forEach(it => {
      const n = Number(it.numero);
      const f = Number(it.frequencia ?? 0);
      if (!Number.isNaN(n)) map[n] = f;
    });
  }
  return map;
}

function ensureRange(freqMap, min, max) {
  const labels = [];
  const freqs = [];
  for (let i = min; i <= max; i++) {
    labels.push(i);
    freqs.push(freqMap[i] ?? 0);
  }
  return { labels, freqs };
}

function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

function fmtPct(v) {
  return Number.isFinite(v) ? v.toFixed(2) + "%" : "0.00%";
}

function chartColors() {
  const isLight = document.body.classList.contains("light");
  return {
    bg: isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.06)",
    bgWeak: isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.04)",
    border: isLight ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.08)",
    highlight: isLight ? "rgba(0,150,255,0.95)" : "rgba(0,230,184,0.95)"
  };
}

/* ================== CARREGAMENTO PRINCIPAL ================== */
async function carregar() {
  try {
    const cfg = LOTERIAS[LOTERIA_ATUAL];

    const res = await fetch(cfg.arquivo + "?_=" + Date.now());
    const dados = await res.json();

    const freqMap = buildFreqMap(dados);
    FREQ_MAP_ATUAL = freqMap;

    const { labels, freqs } = ensureRange(freqMap, cfg.min, cfg.max);

    const sumFreqs = freqs.reduce((s, v) => s + v, 0);
    const totalSorteios = Math.round(sumFreqs / cfg.tamanhoJogo);
    const pcts = freqs.map(f => (f / totalSorteios) * 100);

    document.querySelector(".tagline").textContent = cfg.titulo;
    document.getElementById("totalInfo").textContent =
      `Aparições totais: ${sumFreqs} • Est. sorteios: ${totalSorteios}`;

    const input = document.getElementById("search");
    input.min = cfg.min;
    input.max = cfg.max;
    input.placeholder = `Buscar número (${cfg.min} a ${cfg.max})…`;

    const ctx = document.getElementById(CHART_ID).getContext("2d");
    destroyChart();

    const C = chartColors();

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: freqs,
          backgroundColor: labels.map(() => C.bg),
          borderColor: labels.map(() => C.border),
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const freq = ctx.raw;
                const pct = pcts[ctx.dataIndex] ?? 0;
                return [
                  `Frequência: ${freq}`,
                  `Porcentagem: ${pct.toFixed(2)}%`
                ];
              }
            }
          }
        }
      }
    });

    const ul = document.getElementById("top10");
    ul.innerHTML = "";
    labels
      .map((n, i) => ({ n, f: freqs[i], p: pcts[i] }))
      .sort((a, b) => b.f - a.f)
      .slice(0, 10)
      .forEach((t, i) => {
        ul.innerHTML += `
          <li>
            <div class="rank">${i + 1}</div>
            <div class="num">Número ${t.n}</div>
            <div class="meta">${t.f} vezes • ${fmtPct(t.p)}</div>
          </li>`;
      });

    input.oninput = () => {
      const v = Number(input.value);
      chartInstance.data.datasets[0].backgroundColor =
        labels.map(n => n === v ? C.highlight : C.bgWeak);
      chartInstance.update();
    };

    document.getElementById("themeToggle").onclick = () => {
      document.body.classList.toggle("light");
      carregar();
    };

    document.getElementById("refresh").onclick = carregar;

    atualizarVisibilidadeGerador();

  } catch (e) {
    console.error("Erro:", e);
  }
}

/* ========== TROCA DE LOTERIA ========== */
document.querySelectorAll(".lottery-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".lottery-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    LOTERIA_ATUAL = btn.dataset.loteria;
    carregar();
  };
});

/* ================= GERADOR DE JOGOS ================= */

function sorteioPonderado(numeros) {
  const total = numeros.reduce((s, n) => s + n.freq, 0);
  let r = Math.random() * total;

  for (const n of numeros) {
    r -= n.freq;
    if (r <= 0) return n.num;
  }
}

function gerarJogoPorLoteria(tipo) {
  if (LOTERIA_ATUAL !== tipo) return;

  const cfg = LOTERIAS[tipo];

  const lista = [];
  for (let i = cfg.min; i <= cfg.max; i++) {
    lista.push({
      num: i,
      freq: FREQ_MAP_ATUAL[i] ?? 1
    });
  }

  const jogo = new Set();
  while (jogo.size < cfg.tamanhoJogo) {
    jogo.add(sorteioPonderado(lista));
  }

  const resultado = [...jogo].sort((a, b) => a - b).join(" - ");

  const el =
    tipo === "mega"
      ? document.getElementById("resultado-mega")
      : document.getElementById("resultado-lotofacil");

  el.textContent = resultado;
}

document.getElementById("gerarMega")?.addEventListener("click", () => gerarJogoPorLoteria("mega"));
document.getElementById("gerarLotofacil")?.addEventListener("click", () => gerarJogoPorLoteria("lotofacil"));

function atualizarVisibilidadeGerador() {
  document.querySelectorAll(".generator-card").forEach(card => {
    card.style.display =
      card.dataset.loteria === LOTERIA_ATUAL ? "block" : "none";
  });
}

/* ======================================================= */

carregar();
atualizarVisibilidadeGerador();
