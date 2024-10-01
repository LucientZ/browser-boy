const IOValues = {
    LCDCycles: 0x00,
}

/**
 * Helper function which writes a given color to the canvas.
 * This does not do anything related to tiles; it is simply an interface with the canvas.
 * This will be optimized in the future
 * @param {number} x 
 * @param {number} y 
 * @param {number} color Must be in the format 0x000000
 */
function writePixelToScreen(x, y, color) {
    const canvas = document.getElementById("game-screen");
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = `rgb(${color >> 16} ${(color >> 8) & 0xFF} ${color & 0xFF})`;
    ctx.fillRect(x, y, 1, 1);
}