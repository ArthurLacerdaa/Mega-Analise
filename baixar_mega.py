import requests
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed

URL = "https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/{}"

def baixar_concurso(n):
    try:
        r = requests.get(URL.format(n), timeout=5)
        if r.status_code != 200:
            return None

        j = r.json()
        dezenas = j["listaDezenas"]
        data = j["dataApuracao"]

        return {
            "concurso": n,
            "data": data,
            "bola1": dezenas[0],
            "bola2": dezenas[1],
            "bola3": dezenas[2],
            "bola4": dezenas[3],
            "bola5": dezenas[4],
            "bola6": dezenas[5],
        }
    except:
        return None


print("⚡ Baixando rapidamente TODOS os concursos da Mega-Sena...")


TOTAL = 2700

resultados = []
with ThreadPoolExecutor(max_workers=50) as executor:
    futures = [executor.submit(baixar_concurso, i) for i in range(1, TOTAL)]
    for f in as_completed(futures):
        r = f.result()
        if r:
            resultados.append(r)


resultados = sorted(resultados, key=lambda x: x["concurso"])

df = pd.DataFrame(resultados)
df.to_csv("mega.csv", index=False)

print("✅ mega.csv gerado com sucesso (versão rápida)!")
print(f"📊 Concursos baixados: {len(df)}")
