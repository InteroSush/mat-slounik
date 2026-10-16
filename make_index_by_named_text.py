import os
import json

index_ru = {}
index_bel = {}

for name in os.listdir("./3-named-text"):
    with open(f"./3-named-text/{name}", "r") as file:
        lines = file.readlines()
        is_ru_added = False
        for line in lines:
            if line.startswith("N"):
                tmp = line.removeprefix("N ").replace("«", "").replace("»", "").split("|")
                if not is_ru_added:
                    index_ru[tmp[0].split(",")[0].strip().lower()] = name.removesuffix(".txt")
                is_ru_added = True
                if tmp[1].split(",")[0].strip().lower() in index_bel:
                    index_bel[tmp[1].split(",")[0].strip().lower()].append(name.removesuffix(".txt"))
                else:
                    index_bel[tmp[1].split(",")[0].strip().lower()] = [name.removesuffix(".txt")]


sorted_index = {w: index_ru[w] for w in sorted(index_ru.keys())}

with open("index_ru.json", "w", encoding="utf-8") as f:
    json.dump(sorted_index, f, ensure_ascii=False, separators=(",", ":"))


sorted_index = {w: sorted(set(index_bel[w])) for w in sorted(index_bel.keys())}

with open("index_bel.json", "w", encoding="utf-8") as f:
    json.dump(sorted_index, f, ensure_ascii=False, separators=(",", ":"))