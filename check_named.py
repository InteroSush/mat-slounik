import os

files = os.listdir("./3-named-text")
for i in range(9, 229):
    if not f"{i}.txt" in files:
        print(i, end=", ")