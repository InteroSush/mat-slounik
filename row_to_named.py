
import os

for name in os.listdir("./2-row-text"):
    with open(f"./2-row-text/{name}", 'r') as file:
        lines = file.readlines()
    titles: list[str] = []
    words: list[str] = []
    for line in lines:
        if line.startswith("#"):
            titles.append(line)
        else:
            words.append(line)
    name = "undefined"
    for title in titles:
        clear = title.replace("#", "")
        clear = clear.strip()
        if clear.isdigit():
            name = clear
    with open(f"./3-named-text/{name}.txt", "w") as file:
        for line in words:
            file.write(line)