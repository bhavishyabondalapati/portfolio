# Images for "Enter the house" (branch `wow`)

Drop each generated image into `docs/wow-assets/drop/`, named exactly as below. Any of `.png`,
`.jpg`, `.jpeg` or `.webp` works, and the size doesn't need to be exact. Then run:

```bash
node scripts/wow-assets.mjs
```

The script:
- Resizes each image to cover its exact size, cropping from the centre.
- Converts it to WebP in `public/house/assets/`.
- For cutouts that come back without transparency, removes a plain, even background (it samples
  the border colour and clears everything connected to it).
- Checks the total against the budget in `manifest.json` (2.9 MB).

Any slot without a file keeps a placeholder (`node scripts/wow-assets.mjs --placeholders` makes
them).

It needs `sips` (built into macOS) and `cwebp`. If `cwebp` is missing, the script stops and
says so; install it with `brew install webp`.

| File name | Size (px) | Kind | Where it shows |
|---|---|---|---|
| `scene-longfellow` | 1600 × 1000 | scene | Hero preview card (16:10) |
| `scene-zakim` | 1536 × 1024 | scene | Projects card 1 (3:2) |
| `scene-beacon-hill` | 1024 × 1536 | scene | Projects card 2 (2:3, portrait) |
| `scene-charles-reflection` | 1536 × 1024 | scene | Projects card 3 (3:2) |
| `scene-dawn-rowing` | 1920 × 1080 | scene | Contact backdrop (16:9, optional) |
| `seawall` | 1536 × 884 | cutout | Granite seawall with railing |
| `elm` | 1024 × 1438 | cutout | Esplanade elm |
| `reeds` | 1717 × 916 | cutout | Riverbank reeds |
| `magnolia-branch` | 1536 × 1024 | cutout | Magnolia branch from the right |
| `autumn-leaves` | 1536 × 1024 | cutout | Drifting maple and oak leaves |
| `gas-lamp` | 1024 × 1499 | cutout | Beacon Hill gas lamp, full height |
| `iron-fence-hedge` | 1717 × 876 | cutout | Iron fence and hedge |
| `granite-riprap` | 1536 × 996 | cutout | Granite boulders |
| `esplanade-bank` | 1774 × 887 | cutout | Grassy embankment |
| `rowing-shell` | 1536 × 1001 | cutout | Rowing eight, side view |

The prompts for each image are in `docs/phase-7-boston-house-proposal.md`, section 5.

**Background removal** works when the background is one even colour (white, grey, green screen).
For a busy background, ask the image tool for a transparent PNG instead.
