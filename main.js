// const canvas = document.getElementById("chartCanvas");
// const ctx = canvas.getContext("2d");

const gridBtn = document.getElementById("gridBtn");
const coordToggleBtn = document.getElementById("coordToggleBtn");
const undoBtn = document.getElementById("undoBtn");
const candles = [];

const gridCanvas = document.getElementById("gridCanvas");
const candleCanvas = document.getElementById("candleCanvas");
const interactionCanvas = document.getElementById("interactionCanvas");

// Multi layers
const gridCtx = gridCanvas.getContext("2d");
const candleCtx = candleCanvas.getContext("2d");
const interactionCtx = interactionCanvas.getContext("2d");

const gridSize = 10;
let showGrid = false;
let currentTool = "candle";

let isDrawing = false;
let startX = null;
let startY = null;
let previewCandle = null;
let dragging = false;
let draggedCandleIndex = null;
let dragStart = null;
let needsRedraw = false;
let showLogicalCoords = false;
let hoveredCandleIndex = null;
let resizeMode = null;
let selectedCandleIndex = null;


function snapToGrid(x, size) {
  return Math.round(x / size) * size;
}

// ---- TOOLBAR TOGGLE ----
document.querySelectorAll(".tool-btn[data-tool]").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        currentTool = button.dataset.tool;
    });
});

gridBtn.addEventListener("click", () => {
    showGrid = !showGrid;
    gridBtn.classList.toggle("active", showGrid);
    scheduleRedraw();
});

coordToggleBtn.addEventListener("click", () => {
    showLogicalCoords = !showLogicalCoords;
    coordToggleBtn.classList.toggle("active", showLogicalCoords);
    scheduleRedraw();
});

// interactionCanvas.addEventListener("mouseleave", () => {
//     hoveredCandleIndex = null;
//     interactionCanvas.style.cursor = "default";
//     scheduleRedraw();
// });

undoBtn.addEventListener("click", () => {
    if (selectedCandleIndex !== null) {
        candles.splice(selectedCandleIndex, 1);
        selectedCandleIndex = null;
        hoveredCandleIndex = null;
        scheduleRedraw();
    }
});

function redrawGrid() {
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    if (showGrid) drawGrid(gridCtx);
}

function redrawCandles() {
    candleCtx.clearRect(0, 0, candleCanvas.width, candleCanvas.height);
    candles.forEach(c => {
        drawCandle(candleCtx, c.x, c.open, c.close, c.high, c.low);
    });
    if (previewCandle) {
        drawCandle(candleCtx, previewCandle.x, previewCandle.open, previewCandle.close, previewCandle.high, previewCandle.low);
    }
}

function redrawInteraction() {
    interactionCtx.clearRect(0, 0, interactionCanvas.width, interactionCanvas.height);
    if (hoveredCandleIndex !== null) {
        highlightCandle(interactionCtx, candles[hoveredCandleIndex]);
    }
}


function pixelToTime(x) {
    const intervalWidth = interactionCanvas.width / 48;
    const index = Math.round(x / intervalWidth);
    const hours = Math.floor(index / 2);
    const minutes = index % 2 === 0 ? '00' : '30';
    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function pixelToPrice(y) {
    const price = 500 - Math.round((y / interactionCanvas.height) * 500);
    return `$${price}`;
}

function drawLogicalAxisLabels(ctx) {
    ctx.fillStyle = "#333";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // --- Time Labels 1 hr for now---
    const minutesPerDiv = 60;
    const totalDivs = 24 * 60 / minutesPerDiv;
    const xInterval = interactionCanvas.width / totalDivs;

    for (let i = 0; i <= totalDivs; i++) {
        const x = i * xInterval;
        const totalMinutes = i * minutesPerDiv;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const label = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        ctx.fillText(label, x, interactionCanvas.height - 18);
    }

    // Price labels 100 for now may change later
    const priceStep = 100;
    const maxPrice = 1000;
    const totalSteps = maxPrice / priceStep;

    for (let i = 0; i <= totalSteps; i++) {
        const price = i * priceStep;
        const y = interactionCanvas.height - (price / maxPrice) * gridCanvas.height;
        ctx.textAlign = "left";
        ctx.fillText(`$${price}`, 4, y + 3);
    }
}


// ---- DRAW GRID ----
function drawGrid(ctx) {
    if (!showGrid) return;

    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 0.5;

    // Vertical lines (Time)
    for (let x = 0; x < gridCanvas.width; x += gridCanvas.width / 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, gridCanvas.height);
        ctx.stroke();
    }

    // Horizontal lines (Price)
    for (let y = 0; y < gridCanvas.height; y += gridCanvas.height / 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(gridCanvas.width, y);
        ctx.stroke();
    }

    if (showLogicalCoords) {
        drawLogicalAxisLabels(gridCtx);
    }
}

function drawCandle(ctx, x, open, close, high, low) {
    const width = 10;
    const bodyTop = Math.min(open, close);
    const bodyHeight = Math.abs(open - close);

    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(x, low);
    ctx.lineTo(x, high);
    ctx.stroke();

    ctx.fillStyle = open > close ? "green" : "red";
    ctx.fillRect(x - width / 2, bodyTop, width, bodyHeight);
}

function scheduleRedraw() {
    if (!needsRedraw) {
        needsRedraw = true;
        requestAnimationFrame(() => {
            redrawGrid();
            redrawCandles();
            redrawInteraction();
            needsRedraw = false;
        });
    }
}

function clearCandles() {
    candles.length = 0;
    scheduleRedraw();
    }

function easeSnap(current, target, ease = 0.5) {
    return current + (target - current) * ease;
}

function highlightCandle(ctx, candle) {
    const width = 12;
    const bodyTop = Math.min(candle.open, candle.close);
    const bodyHeight = Math.abs(candle.open - candle.close);

    ctx.strokeStyle = "rgba(8, 8, 3, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(candle.x - width / 2, bodyTop - 2, width, bodyHeight + 4);
}


function getCandleAt(x, y) {
    const tolerance = 5;
    const width = 10;

    for (let i = candles.length - 1; i >= 0; i--) {
        const c = candles[i];
        const top = Math.min(c.open, c.close);
        const bottom = Math.max(c.open, c.close);
        const left = c.x - width / 2;
        const right = c.x + width / 2;

        if (x >= left - tolerance && x <= right + tolerance && y >= top - tolerance && y <= bottom + tolerance) {
        return { index: i, candle: c };
        }
    }

    return null;
}

function getCandlePartAt(x, y) {
    const tolerance = 5;
    const width = 10;

    for (let i = candles.length - 1; i >= 0; i--) {
        const c = candles[i];
        const top = Math.min(c.open, c.close);
        const bottom = Math.max(c.open, c.close);
        const left = c.x - width / 2;
        const right = c.x + width / 2;

        if (x >= left - tolerance && x <= right + tolerance) {
            if (Math.abs(y - c.high) <= tolerance) return { index: i, part: "high" };
            if (Math.abs(y - c.low) <= tolerance) return { index: i, part: "low" };
            if (Math.abs(y - c.open) <= tolerance) return { index: i, part: "open" };
            if (Math.abs(y - c.close) <= tolerance) return { index: i, part: "close" };
            if (y >= top - tolerance && y <= bottom + tolerance) return { index: i, part: "body" };  // <- Add this
        }
    }

    return null;
}


// ---- MOUSE EVENTS - Up, Down, Move, Leave ----
interactionCanvas.addEventListener("mousedown", (e) => {
    const rect = interactionCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const generalHit = getCandleAt(x, y);
    const partHit = getCandlePartAt(x, y);

    if (currentTool !== "candle") return;

    if (partHit) {
        dragging = true;
        draggedCandleIndex = partHit.index;
        resizeMode = partHit.part;
        dragStart = { x, y };
        hoveredCandleIndex = partHit.index;

        selectedCandleIndex = partHit.index;
    } else if (generalHit) {
        dragging = true;
        draggedCandleIndex = generalHit.index;
        resizeMode = "body";
        dragStart = { x, y };
        hoveredCandleIndex = generalHit.index;

        selectedCandleIndex = generalHit.index;
    } else {
        startX = snapToGrid(x, gridSize);
        startY = y;
        isDrawing = true;
    }
    if (showLogicalCoords) {
        const time = pixelToTime(x);
        const price = pixelToPrice(y);
        console.log(`Clicked at Time: ${time}, Price: ${price}`);
}
});

interactionCanvas.addEventListener("mousemove", (e) => {
    const rect = interactionCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hitHover = getCandlePartAt(x, y);

    if (currentTool !== "candle") return;

    if (dragging && draggedCandleIndex !== null && resizeMode) {
    const candle = candles[draggedCandleIndex];
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    switch (resizeMode) {
        case "high": candle.high += dy; break;
        case "low": candle.low += dy; break;
        case "open": candle.open += dy; break;
        case "close": candle.close += dy; break;
        case "body":
            candle.x += dx;
            candle.open += dy;
            candle.close += dy;
            candle.high += dy;
            candle.low += dy;
            break;
    }

    dragStart = { x, y };
    scheduleRedraw();
}

    if (isDrawing) {
        const currentY = snapToGrid(y, gridSize);
        const open = snapToGrid(startY, gridSize);
        const close = currentY;
        const high = Math.min(open, close) - gridSize;
        const low = Math.max(open, close) + gridSize;

        previewCandle = { x: startX, open, close, high, low };
        scheduleRedraw();
    }

    if (hitHover) {
        hoveredCandleIndex = hitHover.index;
        interactionCanvas.style.cursor = "move";
    } else {
        hoveredCandleIndex = null;
        interactionCanvas.style.cursor = "default";
}
});

interactionCanvas.addEventListener("mouseleave", () => {
    hoveredCandleIndex = null;
    interactionCanvas.style.cursor = "default";
    scheduleRedraw();
});

interactionCanvas.addEventListener("mouseup", () => {
    if (currentTool !== "candle") return;

    if (isDrawing && previewCandle) {
        candles.push(previewCandle);
        previewCandle = null;
    }

    isDrawing = false;
    dragging = false;
    draggedCandleIndex = null;
    dragStart = null;
    resizeMode = null;

    scheduleRedraw();
});

window.onload = scheduleRedraw;
