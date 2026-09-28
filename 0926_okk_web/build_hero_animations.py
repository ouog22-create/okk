"""Rebuild the full-resolution, lossless looping hero animations.

Run from the project folder: python3 build_hero_animations.py
"""

from pathlib import Path
import os
from unicodedata import normalize

from PIL import Image


FRAME_DURATION_MS = 50  # 프레임당 밀리초, 두 캐릭터에 동일하게 적용

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "public" / "assets"
CHARACTERS = {
    "okk": "오키키_멀티패스 합",
    "okkimong": "오키몽_멀티패스 합",
}


def named_child(parent: Path, name: str) -> Path:
    return next(path for path in parent.iterdir() if normalize("NFC", path.name) == normalize("NFC", name))


def build(character: str, folder: str) -> None:
    source = named_child(named_child(named_child(ROOT, "자료"), "대표캐릭터"), folder)
    frames = []
    for number in range(1, 32):
        with Image.open(source / f"{number}.png") as image:
            frames.append(image.convert("RGBA"))

    target = OUTPUT / f"{character}-loop.webp"
    temporary = OUTPUT / f".{character}-loop.webp.tmp"
    frames[0].save(
        temporary,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        lossless=True,
        method=3,
        exact=True,
    )
    os.replace(temporary, target)
    print(f"{target.name}: {31 * FRAME_DURATION_MS / 1000:.2f}초/반복")


if __name__ == "__main__":
    if FRAME_DURATION_MS < 10:
        raise ValueError("FRAME_DURATION_MS는 10 이상으로 설정해주세요.")
    for character, folder in CHARACTERS.items():
        build(character, folder)
