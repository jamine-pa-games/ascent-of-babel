from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
files = sorted(root.glob('skill-flow-frame-*.jpg'))
if len(files) < 12:
    raise RuntimeError('Missing captured pipeline frames')
frames = [Image.open(p).convert('RGB') for p in files]
if len({f.size for f in frames}) != 1:
    raise RuntimeError('Inconsistent screenshot dimensions')
palette = frames[-1].quantize(colors=256, method=Image.Quantize.MEDIANCUT)
indexed = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
durations = [175] * len(indexed)
durations[0] = 500
durations[-1] = 850
output = root / 'skill-mercury-pipe-flow-demo-20261006.gif'
indexed[0].save(output, save_all=True, append_images=indexed[1:], duration=durations,
                loop=0, optimize=False, disposal=2)
print({'file': str(output), 'frames': len(indexed), 'size': frames[0].size,
       'bytes': output.stat().st_size, 'scope': 'captured pipe-travel segment, not pocket-fill segment'})
