---
status: accepted
---

# Separate the thinking graph from the renderer

The product's source of truth is a renderer-independent typed thinking graph, not React Flow or Excalidraw scene JSON. React Flow is the MVP renderer because structured nodes and typed edges match the domain, while Excalidraw remains an adapter candidate for freeform drawing; this prevents the Spatial Thinking method from becoming locked to a canvas library.
