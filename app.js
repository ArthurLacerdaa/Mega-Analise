let chartInstance = null;

function buildFreqMap(dados) {
    const map = {};
    if (!dados || !dados.numeros) return map;

    if (Array.isArray(dados.numeros)) {
        dados.numeros.forEach(item => {
            const num = Number(item.numero);
            const f = Number(item.frequencia || 0);
            if (!Number.isNaN(num)) map[num] = f;
        });
    } else {
        Object.keys(dados.numeros).forEach(k => {
            const num = Number(k);
            const f = Number(dados.numeros[k] || 0);
            if (!Number.isNaN(num)) map[num] = f;
        });
    }
    return map;
}

function ensure1a60(freqMap) {
    const labels = [];
    const freqs = [];
    for (let n = 1; n <= 60; n++) {
        labels.push(n);
        freqs.push(freqMap[n] || 0);
    }
    return { labels, freqs };
}

function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

async function carregar() {
    const r = await fetch("stats.json?cache=" + Date.now());
    const dados = await r.json();

    const freqMap = buildFreqMap(dados);
    const { labels, freqs } = ensure1a60(freqMap);

    destroyChart();
    const ctx = document.getElementById("grafico");

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Frequência",
                data: freqs,
                backgroundColor: "rgba(0,230,184,0.55)",
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
    ticks: {
        color: "#ccc",
        autoSkip: window.innerWidth < 500, 
        maxTicksLimit: 15,                
        maxRotation: window.innerWidth < 500 ? 70 : 90,
        minRotation: window.innerWidth < 500 ? 70 : 90,
        font: { size: window.innerWidth < 500 ? 9 : 10 }
    }
}

            }
        }
    });


    const top = labels.map((n,i)=>({numero:n, freq:freqs[i]}))
                      .sort((a,b)=>b.freq - a.freq)
                      .slice(0,10);

    const ul = document.getElementById("top10");
    ul.innerHTML = "";
    top.forEach(t => {
        const li = document.createElement("li");
        li.textContent = `Número ${t.numero}: ${t.freq} vezes`;
        ul.appendChild(li);
    });


    const input = document.getElementById("search");
    input.addEventListener("input", () => {
        const v = Number(input.value);

        [...ul.children].forEach(li => {
            li.style.display =
                li.textContent.startsWith(`Número ${v}:`) ? "list-item" : "none";
            if (!v) li.style.display = "list-item";
        });

        if (!v || isNaN(v) || v < 1 || v > 60) {
            chartInstance.data.datasets[0].backgroundColor =
                freqs.map(()=> "rgba(0,230,184,0.55)");
        } else {
            chartInstance.data.datasets[0].backgroundColor = labels.map(n =>
                n === v ? "rgba(255,80,80,0.95)" : "rgba(0,230,184,0.25)"
            );
        }
        chartInstance.update();
    });


    document.getElementById("themeToggle").onclick = () =>
        document.body.classList.toggle("light");
}

carregar();
