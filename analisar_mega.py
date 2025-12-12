import pandas as pd
import json

print("📊 Analisando mega.csv...")

df = pd.read_csv("mega.csv")

todas = (
    df[["bola1","bola2","bola3","bola4","bola5","bola6"]]
    .values
    .reshape(-1)
)

freq = pd.Series(todas).value_counts().sort_index()

stats = {
    "numeros": [
        {"numero": int(num), "frequencia": int(freq[num])}
        for num in freq.index
    ],
    "mais_frequentes": freq.sort_values(ascending=False).head(10).to_dict()
}

with open("stats.json", "w", encoding="utf-8") as f:
    json.dump(stats, f, indent=4, ensure_ascii=False)

print("✅ stats.json criado!")
