"""Generate Pixel Linter extension icons at 16, 48, and 128px."""
from PIL import Image, ImageDraw, ImageFont
import os
import math

SIZES = [16, 48, 128]
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

# Colors
BG_COLOR = (37, 99, 235)       # #2563EB - blue
LENS_COLOR = (255, 255, 255)    # white
GRID_COLOR = (147, 197, 253)    # light blue grid
HANDLE_COLOR = (219, 234, 254)  # very light blue handle
ACCENT_COLOR = (234, 179, 8)    # #EAB308 - amber accent dot


def draw_icon(size: int) -> Image.Image:
    """Draw a magnifying glass over a pixel grid icon."""
    # Work at 4x then downscale for antialiasing
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rect background
    pad = int(s * 0.06)
    radius = int(s * 0.22)
    draw.rounded_rectangle([pad, pad, s - pad, s - pad], radius=radius, fill=BG_COLOR)

    # Draw pixel grid dots (4x4 grid)
    grid_margin = int(s * 0.18)
    grid_size = s - 2 * grid_margin
    dot_radius = max(int(s * 0.03), 2)

    for row in range(4):
        for col in range(4):
            x = grid_margin + int(col * grid_size / 3)
            y = grid_margin + int(row * grid_size / 3)
            draw.ellipse(
                [x - dot_radius, y - dot_radius, x + dot_radius, y + dot_radius],
                fill=GRID_COLOR
            )

    # Draw magnifying glass
    cx = int(s * 0.42)
    cy = int(s * 0.42)
    lens_r = int(s * 0.22)
    ring_w = max(int(s * 0.045), 2)

    # Lens circle (semi-transparent fill)
    draw.ellipse(
        [cx - lens_r, cy - lens_r, cx + lens_r, cy + lens_r],
        fill=(255, 255, 255, 40),
        outline=LENS_COLOR,
        width=ring_w,
    )

    # Handle
    handle_len = int(s * 0.22)
    handle_w = max(int(s * 0.06), 2)
    angle = math.radians(45)
    hx1 = cx + int(lens_r * math.cos(angle))
    hy1 = cy + int(lens_r * math.sin(angle))
    hx2 = hx1 + int(handle_len * math.cos(angle))
    hy2 = hy1 + int(handle_len * math.sin(angle))
    draw.line([(hx1, hy1), (hx2, hy2)], fill=HANDLE_COLOR, width=handle_w)

    # Round cap on handle end
    cap_r = handle_w // 2
    draw.ellipse(
        [hx2 - cap_r, hy2 - cap_r, hx2 + cap_r, hy2 + cap_r],
        fill=HANDLE_COLOR
    )

    # Amber accent dot (bottom-right, like a suggestion marker)
    accent_r = int(s * 0.09)
    ax = int(s * 0.75)
    ay = int(s * 0.75)
    draw.ellipse(
        [ax - accent_r, ay - accent_r, ax + accent_r, ay + accent_r],
        fill=ACCENT_COLOR,
    )

    # Lightbulb or dot in accent
    if size >= 48:
        inner_r = max(int(accent_r * 0.4), 1)
        draw.ellipse(
            [ax - inner_r, ay - inner_r, ax + inner_r, ay + inner_r],
            fill=(255, 255, 255),
        )

    # Downscale with antialiasing
    return img.resize((size, size), Image.LANCZOS)


for size in SIZES:
    icon = draw_icon(size)
    path = os.path.join(OUT_DIR, f"icon-{size}.png")
    icon.save(path, "PNG")
    print(f"Generated {path} ({size}x{size})")

# Also generate 440x280 Chrome Web Store small promo
promo = Image.new("RGBA", (440 * 4, 280 * 4), (0, 0, 0, 0))
promo_draw = ImageDraw.Draw(promo)
# Gradient-like background
promo_draw.rounded_rectangle(
    [0, 0, 440 * 4, 280 * 4], radius=0,
    fill=(15, 23, 42)  # dark slate
)
# Place large icon in center-left
large_icon = draw_icon(128).resize((400, 400), Image.LANCZOS)
promo.paste(large_icon, (200, 160), large_icon)

# Add text area
try:
    font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 140)
    font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 56)
except:
    font_large = ImageFont.load_default()
    font_small = ImageFont.load_default()

promo_draw.text((720, 320), "Pixel Linter", fill=(255, 255, 255), font=font_large)
promo_draw.text((720, 500), "Visual QA for websites", fill=(148, 163, 184), font=font_small)

promo_final = promo.resize((440, 280), Image.LANCZOS)
promo_path = os.path.join(OUT_DIR, "promo-small.png")
promo_final.save(promo_path, "PNG")
print(f"Generated {promo_path} (440x280 promo)")

print("\nAll icons generated!")
