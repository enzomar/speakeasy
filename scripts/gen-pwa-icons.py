"""Generate PWA icons for SpeakEasy."""
from PIL import Image
from pathlib import Path

root = Path(__file__).parent.parent
src = root / "public" / "se.png"
img = Image.open(src).convert("RGBA")

for size in [192, 512]:
    out = root / "public" / f"pwa-{size}.png"
    img.resize((size, size), Image.Resampling.LANCZOS).save(out)
    print(f"✓ {out.relative_to(root)}  ({size}×{size})")
