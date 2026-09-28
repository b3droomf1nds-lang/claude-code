# Product 3D models

One folder per product. Each has:

- `<product>.blend`: open in Blender 5.0 or newer (free, blender.org). Textures are packed inside, and the studio lights and camera are included, so pressing F12 renders it.
- `<product>.glb`: the same model at real-world size (metres), for Shopify product media (3D viewer and AR "view in your space").
- `renders/`: finished PNGs on an off-white background.
- `source/`: the scripts that build the model, so it can be regenerated or tweaked.
  `python tex.py` makes the decal textures, and `python corepro.py <hero|front|back|flat|side|export> <out> [samples] [res]` builds and renders or exports (needs `pip install bpy`, Python 3.11). `side` is a straight-on view of the long edge for checking the layer proportions against the listing's side drawing.

| Product | Size | Status |
|---|---|---|
| Core Pro (F20) | 104 × 66 × 7.8 mm | Modelled from listing photos. Edge is three layers measured off the listing's side drawing: 2.70 mm rounded aluminium front plate, 3.45 mm satin frame, 1.65 mm glass back plate, with both plates inset 0.55 mm from the frame. Display dots measured off the listing's display close-up. Port and button positions and the back print are estimates |
| Core | | Needs reference photos and dimensions |
| Puck | | Needs reference photos and dimensions |
