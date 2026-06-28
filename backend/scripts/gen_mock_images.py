import os, struct, zlib

def make_png(r: int, g: int, b: int, w: int = 100, h: int = 100) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    raw = b''.join(b'\x00' + bytes([r, g, b] * w) for _ in range(h))
    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw))
        + chunk(b'IEND', b'')
    )

COLORS = [(100, 149, 237), (144, 238, 144), (255, 182, 193), (255, 218, 185)]

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "static", "mock-docs")
    os.makedirs(out, exist_ok=True)
    for i, (r, g, b) in enumerate(COLORS, 1):
        path = os.path.join(out, f"doc{i}.png")
        with open(path, "wb") as f:
            f.write(make_png(r, g, b))
        print(f"Created {path}")
