## **Features So Far :**

**Multi-layer canvas:** Grid, candles, and interaction handled separately.

**Draw & Edit:** Click-drag to draw candles. Resize or move parts like open, close, high, and low.

**Snap-to-grid:** Keeps drawing and dragging aligned cleanly.

**Undo support:** Deletes last selected candle (not just hovered).

**Toolbar toggles:** Grid visibility and time/price labels.

**Live coordinate feedback:** Shows price and time on click.

## **Highlights :**

requestAnimationFrame based rendering

Modular canvas layers (gridCanvas, candleCanvas, interactionCanvas)

Clean state handling: isDrawing, dragging, hoveredCandleIndex, selectedCandleIndex