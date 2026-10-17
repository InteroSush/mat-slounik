import os
from pathlib import Path

# Шлях да тэчкі (зменіце на патрэбны)
folder = Path("./1-png_renders")

# Перабіраем усе файлы ў тэчцы
for file in folder.iterdir():
    if file.is_file():
        # Новы імя ў верхнім рэгістры (з захаваннем пашырэння)
        new_name = str(int(file.stem.removeprefix("str")) - 2).zfill(3) + file.suffix
        new_path = file.with_name(new_name)
        
        # Правяраем, каб не перазапісаць існуючы файл
        if new_path.exists() and new_path != file:
            print(f"Прапушчана: {file.name} → {new_name} (ужо існуе)")
            continue
        
        # Перайменаванне
        file.rename(new_path)
        print(f"{file.name} → {new_name}")

print("Гатова!")