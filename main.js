const canvas = document.getElementById("chartCanvas");
const ctx = canvas.getContext("2d");

const gridBtn = document.getElementById("gridBtn");
const coordToggleBtn = document.getElementById("coordToggleBtn");
const undoBtn = document.getElementById("undoBtn");
const candles = [];

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
let lastHoveredIndex = null;

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

canvas.addEventListener("mouseleave", () => {
    hoveredCandleIndex = null;
    canvas.style.cursor = "default";
    scheduleRedraw();
});

undoBtn.addEventListener("click", () => {
    if (lastHoveredIndex !== null) {
        candles.splice(lastHoveredIndex, 1);
        lastHoveredIndex = null;
        hoveredCandleIndex = null;
        scheduleRedraw();
    }
});

function pixelToTime(x) {
    const intervalWidth = canvas.width / 48;
    const index = Math.round(x / intervalWidth);
    const hours = Math.floor(index / 2);
    const minutes = index % 2 === 0 ? '00' : '30';
    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function pixelToPrice(y) {
    const price = 500 - Math.round((y / canvas.height) * 500);
    return `$${price}`;
}

function drawLogicalAxisLabels() {
    ctx.fillStyle = "#333";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // --- Time Labels 1 hr for now---
    const minutesPerDiv = 60;
    const totalDivs = 24 * 60 / minutesPerDiv;
    const xInterval = canvas.width / totalDivs;

    for (let i = 0; i <= totalDivs; i++) {
        const x = i * xInterval;
        const totalMinutes = i * minutesPerDiv;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const label = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        ctx.fillText(label, x, canvas.height - 18);
    }

    // Price labels 100 for now may change later
    const priceStep = 100;
    const maxPrice = 1000;
    const totalSteps = maxPrice / priceStep;

    for (let i = 0; i <= totalSteps; i++) {
        const price = i * priceStep;
        const y = canvas.height - (price / maxPrice) * canvas.height;
        ctx.textAlign = "left";
        ctx.fillText(`$${price}`, 4, y + 3);
    }
}


// ---- DRAW GRID ----
function drawGrid() {
    if (!showGrid) return;

    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 0.5;

    // Vertical lines (Time)
    for (let x = 0; x < canvas.width; x += canvas.width / 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Horizontal lines (Price)
    for (let y = 0; y < canvas.height; y += canvas.height / 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    if (showLogicalCoords) {
        drawLogicalAxisLabels();
    }
}


function drawCandle(x, open, close, high, low) {
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

function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showGrid) drawGrid();

    for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        if (candle.x < 0 || candle.x > canvas.width) continue;
        drawCandle(candle.x, candle.open, candle.close, candle.high, candle.low);

        if (i === hoveredCandleIndex) {
            highlightCandle(candle);
        }
    }


    if (previewCandle && previewCandle.x >= 0 && previewCandle.x <= canvas.width) {
        drawCandle(
        previewCandle.x,
        previewCandle.open,
        previewCandle.close,
        previewCandle.high,
        previewCandle.low
        );
    }

    if (showLogicalCoords) {
        drawLogicalAxisLabels();
    }
}

function scheduleRedraw() {
    if (!needsRedraw) {
        needsRedraw = true;
        requestAnimationFrame(() => {
        redrawAll();
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

function highlightCandle(candle) {
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

// ---- MOUSE EVENTS - Up, Down, Move, Leave ----
canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = getCandleAt(x, y);

    if (currentTool !== "candle") return;

    if (hit) {
        dragging = true;
        draggedCandleIndex = hit.index;
        dragStart = { x, y };
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

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hitHover = getCandleAt(x, y);

    if (hitHover) {
        hoveredCandleIndex = hitHover.index;
        canvas.style.cursor = "move";
    } else {
        hoveredCandleIndex = null;
        canvas.style.cursor = "default";
    }

    if (currentTool !== "candle") return;

    if (dragging && draggedCandleIndex !== null) {
        const candle = candles[draggedCandleIndex];
        const dy = y - dragStart.y;

        dragStart = { x, y };

        // Target snapped positions
        const targetX = snapToGrid(x, gridSize);
        const targetOpen = snapToGrid(candle.open + dy, gridSize);
        const targetClose = snapToGrid(candle.close + dy, gridSize);

        // Smooth easing
        candle.x = easeSnap(candle.x, targetX);
        candle.open = easeSnap(candle.open, snapToGrid(candle.open + dy, gridSize));
        candle.close = easeSnap(candle.close, snapToGrid(candle.close + dy, gridSize));


        // Update high/low after easing
        candle.high = Math.min(candle.open, candle.close) - 10;
        candle.low = Math.max(candle.open, candle.close) + 10;

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
        lastHoveredIndex = hitHover.index;
        canvas.style.cursor = "move";
    } else {
        hoveredCandleIndex = null;
        canvas.style.cursor = "default";
}
});

canvas.addEventListener("mouseleave", () => {
    hoveredCandleIndex = null;
    canvas.style.cursor = "default";
    scheduleRedraw();
});

canvas.addEventListener("mouseup", () => {
    if (currentTool !== "candle") return;

    if (isDrawing && previewCandle) {
        candles.push(previewCandle);
        previewCandle = null;
    }

    isDrawing = false;
    dragging = false;
    draggedCandleIndex = null;
    dragStart = null;

    scheduleRedraw();
});

window.onload = scheduleRedraw;
