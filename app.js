/* app.js - original preservado + suporte mínimo a múltiplas loterias */

const CHART_ID = "grafico";
let chartInstance = null;

/* ===== NOVO: configuração de loteria ===== */
let LOTERIA_ATUAL = "mega";

const LOTERIAS = {
  mega: {
    arquivo: "stats.json",
    min: 1,
    max: 60,
    titulo: "Estatísticas • Números mais sorteados da Mega-Sena"
  },
  lotofacil: {
    arquivo: "lotofacil.json",
    min: 1,
    max: 25,
    titulo: "Estatísticas • Números mais sorteados da Lotofácil"
  }
};
/* ======================================= */

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

/* ===== NOVO: range dinâmico ===== */
function ensureRange(freqMap, min, max) {
  const labels = [];
  const freqs = [];
  for (let i = min; i <= max; i++) {
    labels.push(i);
    freqs.push(freqMap[i] ?? 0);
  }
  return { labels, freqs };
}
/* ================================= */

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

async function carregar() {
  try {
    const cfg = LOTERIAS[LOTERIA_ATUAL];

    const res = await fetch(cfg.arquivo + "?_=" + Date.now());
    const dados = await res.json();

    const freqMap = buildFreqMap(dados);
    const { labels, freqs } = ensureRange(freqMap, cfg.min, cfg.max);

    const sumFreqs = freqs.reduce((s, v) => s + v, 0);
    const totalSorteios = Math.round(sumFreqs / (LOTERIA_ATUAL === "mega" ? 6 : 15));
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

  } catch (e) {
    console.error("Erro:", e);
  }
}

/* ===== NOVO: troca de loteria ===== */
document.querySelectorAll(".lottery-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".lottery-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    LOTERIA_ATUAL = btn.dataset.loteria;
    carregar();
  };
});
/* ================================= */

carregar();
