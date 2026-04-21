# Words as Vectors (3D Demo)

A lightweight web app that visualizes the idea of word embeddings in a 3D space.

## Run locally

From this folder, run:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

## Interactions

- Drag to orbit the embedding space.
- Scroll to zoom in and out.
- Click a word node to:
  - animate and pulse the selected point,
  - trigger a ripple burst,
  - highlight connected semantic directions,
  - smoothly move the camera toward the selected region,
  - update vector and relation details in the side panel.
