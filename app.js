/* app.js - versão corrigida com suporte total a modo claro/escuro */

const CHART_ID = "grafico";
let chartInstance = null;
const STATS_PATH = "stats.json";


function buildFreqMap(dados) {
  const map = {};
  if (!dados) return map;

  if (Array.isArray(dados.numeros)) {
    dados.numeros.forEach(it => {
      const n = Number(it.numero);
      const f = Number(it.frequencia ?? it.freq ?? 0);
      if (!Number.isNaN(n)) map[n] = (map[n] ?? 0) + (Number.isFinite(f) ? f : 0);
    });
    return map;
  }

  if (dados.numeros && typeof dados.numeros === "object") {
    Object.keys(dados.numeros).forEach(k => {
      const n = Number(k);
      const f = Number(dados.numeros[k] ?? 0);
      if (!Number.isNaN(n)) map[n] = (map[n] ?? 0) + (Number.isFinite(f) ? f : 0);
    });
    return map;
  }

  Object.keys(dados).forEach(k => {
    const n = Number(k);
    if (!Number.isNaN(n)) {
      const f = Number(dados[k] ?? 0);
      map[n] = (map[n] ?? 0) + (Number.isFinite(f) ? f : 0);
    }
  });

  return map;
}


function ensure1a60(freqMap) {
  const labels = [];
  const freqs = [];
  for (let i = 1; i <= 60; i++) {
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
    bg: isLight
      ? "rgba(0,0,0,0.18)"
      : "rgba(255,255,255,0.06)",

    bgWeak: isLight
      ? "rgba(0,0,0,0.12)"
      : "rgba(255,255,255,0.04)",

    border: isLight
      ? "rgba(0,0,0,0.28)"
      : "rgba(255,255,255,0.08)",

    highlight: isLight
      ? "rgba(0,150,255,0.95)"
      : "rgba(0,230,184,0.95)",
  };
}


async function carregar() {
  try {
    const res = await fetch(STATS_PATH + "?_=" + Date.now());
    const dados = await res.json();

    const freqMap = buildFreqMap(dados);
    const { labels, freqs } = ensure1a60(freqMap);

    const sumFreqs = freqs.reduce((s, v) => s + v, 0);
    const inferredTotal = Math.round(sumFreqs / 6);
    const totalSorteios = Number(dados.totalSorteios ?? inferredTotal);

    const pcts = freqs.map(f => (f / totalSorteios) * 100);

    document.getElementById("totalInfo").textContent =
      `Aparições totais: ${sumFreqs} • Est. sorteios: ${totalSorteios}`;

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
                const v = ctx.raw;
                const pct = pcts[ctx.dataIndex];
                return ` ${v} vezes • ${fmtPct(pct)}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: getComputedStyle(document.body).color
            }
          }
        }
      }
    });

    // Top 10
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
          </li>
        `;
      });

    const input = document.getElementById("search");
    input.oninput = () => {
      const v = Number(input.value);

      if (!v) {
        chartInstance.data.datasets[0].backgroundColor = labels.map(() => C.bg);
        chartInstance.update();
        return;
      }

      chartInstance.data.datasets[0].backgroundColor = labels.map(n =>
        n === v ? C.highlight : C.bgWeak
      );
      chartInstance.update();
    };

    document.getElementById("themeToggle").onclick = () => {
      document.body.classList.toggle("light");

      destroyChart();
      carregar();
    };

  } catch (e) {
    console.error("Erro:", e);
  }
}

carregar();
