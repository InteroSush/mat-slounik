import os

replacements = {
    "'": "’",
    'a': '?',
    'ó': '?',
    'i': '?',
    'á': '?',
    'é': '?',
    'x': '?',
    'p': '?',
    'є': '?',
    'ỳ': '?',
    'ý': '?',
    'ө': '?',
    '́': ""
}

for file_name in os.listdir("./3-named-text"):
    with open("./3-named-text/" + file_name, "r") as file:
        lines = file.readlines()
    for i in range(len(lines)):
        for symbol in lines[i]:
            if symbol in replacements:
                lines[i] = lines[i].replace(symbol, replacements[symbol])
    with open("./3-named-text/" + file_name, "w") as file:
        file.writelines(lines)
