# VYOMABOARD — UNIFIED ANNOTATION & LAYERING SYSTEM SPECIFICATION

## 1. Root Cause of Legacy Annotation Failures
1. **Screen Coordinates Instead of Document Coordinates**:
   * Pen strokes were recorded using viewport pixels relative to `viewer-content-container`.
   * When a student zoomed in on a PDF or scrolled through a presentation, annotations stayed glued to the modal window, floating over completely wrong lines of text.
2. **Stacking Context & Pointer Event Trapping**:
   * The annotation SVG was placed inside the same container as IFRAMEs (Office Online PPT) and virtual grids.
   * `pointerEvents: 'none'` on the SVG prevented text selection and annotation editing.
   * Conversely, when set to `'auto'`, the SVG swallowed all scroll wheels and touch drags, preventing users from scrolling through their documents.

---

## 2. Rebuilt Document-Relative Coordinate Space
All annotations are recorded in **Document-Normalized Space**:
$$X_{\text{doc}} = \frac{X_{\text{event}} - B_{\text{left}} + S_{\text{left}}}{Z_{\text{doc}}}$$
$$Y_{\text{doc}} = \frac{Y_{\text{event}} - B_{\text{top}} + S_{\text{top}}}{Z_{\text{doc}}}$$
where:
* $(B_{\text{left}}, B_{\text{top}})$ is the document bounding box.
* $(S_{\text{left}}, S_{\text{top}})$ is the document's internal scroll offset.
* $Z_{\text{doc}}$ is the current document zoom level.

When the document is resized, viewed on a mobile device, zoomed to 200%, or scrolled, annotations scale and translate synchronously with the document canvas.

---

## 3. Explicit Stacking Context & Layer Hierarchy

```
+-------------------------------------------------------+
| Level 7: Modal Controls & Close Buttons (z: 100)      |
+-------------------------------------------------------+
| Level 6: Viewer Navigation & Page Scrubber (z: 50)    |
+-------------------------------------------------------+
| Level 5: Floating Annotation Toolbar (z: 40)          |
+-------------------------------------------------------+
| Level 4: Annotation Selection Handles (z: 30)         |
+-------------------------------------------------------+
| Level 3: Annotation SVG Drawing Layer (z: 20)          |
|          (pointer-events: auto ONLY when tool != select)
+-------------------------------------------------------+
| Level 2: Document Interaction Layer (Text Select) (z: 10)
+-------------------------------------------------------+
| Level 1: Underlying Document Surface (PDF/Grid) (z: 1)|
+-------------------------------------------------------+
```

### Pointer Events Management:
* When `activeTool === 'select'`: Annotation layer has `pointer-events: none`, allowing standard document interaction, text selection, and mouse wheel scrolling.
* When `activeTool in ['pen', 'highlighter', 'eraser', 'text']`: Annotation layer has `pointer-events: auto`, capturing drawing gestures cleanly without triggering accidental document text selection or hyperlink clicks.
