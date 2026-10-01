import os

legal_chars = "абвгдеёжзійклмнопрстуўфхцчшыьэюя’" +\
"АБВГДЕЁЖЗІЙКЛМНОПРСТУЎФХЦЧШЫЬЭЮЯ" +\
"абвгдеёжзийклмнопрстуфхцчшщъыьэюя" +\
"АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ" +\
" -|,.\nN()«»" +\
"—?;"

exceptions = []

for file_name in os.listdir("./3-named-text"):
    with open("./3-named-text/" + file_name, "r") as file:
        for line in file.readlines():
            for symbol in line:
                if not symbol in legal_chars:
                    print(file_name, line, symbol)
                    if not symbol in exceptions:
                        exceptions.append(symbol)
print(exceptions)
        