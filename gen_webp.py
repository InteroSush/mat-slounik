from pathlib import Path
from PIL import Image

SRC = Path("1-png_renders")          # адкуль браць PNG
DST = Path("pages")     # куды класці WebP
MAX_WIDTH = 1500             # максімальная шырыня ў пікселях
QUALITY = 80                 # 75-85: баланс якасці і памеру

DST.mkdir(exist_ok=True)

for png in sorted(SRC.glob("*.png")):
    img = Image.open(png).convert("RGB")
    if img.width > MAX_WIDTH:
        height = round(img.height * MAX_WIDTH / img.width)
        img = img.resize((MAX_WIDTH, height), Image.LANCZOS)
    out = DST / (png.stem + ".webp")          # 010.png → 010.webp
    img.save(out, "WEBP", quality=QUALITY, method=6)
    print(png.name, "→", out.name, out.stat().st_size // 1024, "КБ")