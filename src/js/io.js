const IOValues = {
    LCDCycles: 0x00,
    videoBuffer: new Uint16Array(144 * 160),
    defaultColorPalette: [0xFFFF, 0x7bde, 0x39ce, 0x0000], // Default color palette of the gameboy (DMG)
    timerCycles: 0x00,
    nextPC: null, // NULL if there is no nextPC
}

/////////////////////// Screen Stuff ///////////////////////

/**
 * Helper function which writes a given color to the canvas.
 * This does not do anything related to tiles; it is simply an interface with the canvas.
 * This will be optimized in the future
 * @param {number} x 
 * @param {number} y 
 * @param {number} color Must be little-endian 5-bit encoded (0b0bbbbbgggggrrrrr) 
 */
function writePixelToScreen(x, y, color, ctx) {
    if (!ctx) {
        const canvas = document.getElementById("game-screen");
        if (!canvas) {
            return;
        }
        ctx = canvas.getContext("2d");
    }

    // Converts from 5-bit color to 8-bit color
    const colorCoefficient = 8; // 256 / 32
    const red = Math.floor((color & 0x1f) * colorCoefficient);
    const green = Math.floor(((color >> 5) & 0x1f) * colorCoefficient);
    const blue = Math.floor(((color >> 10) & 0x1f) * colorCoefficient);

    ctx.fillStyle = `rgb(${red} ${green} ${blue})`;
    ctx.fillRect(x, y, 1, 1);
}

/**
 * Writes a single pixel value to the screen buffer
 * @param {number} x x-position on the LCD screen
 * @param {number} y y-position on the LCD screen
 * @param {number} color Must be 5-bit encoded
 */
function writePixelToBuffer(x, y, color) {
    const index = x + y * 160;
    IOValues.videoBuffer[index] = color;
}


/**
 * Writes a single pixel value to the screen buffer
 * @param {number} x x-position on the LCD screen
 * @param {number} y y-position on the LCD screen
 * @param {number} color Must be in the set {00, 01, 10, 11} (Brightest to darkest)
 */
function renderPixel(x, y, value) {
    if (!Globals.metadata.supportsColor) {
        writePixelToBuffer(x, y, IOValues.defaultColorPalette[value]);
    }
    else {
        writePixelToBuffer(x, y, IOValues.defaultColorPalette[value]); // TODO Support Color Actually
    }
}

function flushVideoBuffer() {
    for (let i = 0; i < IOValues.videoBuffer.length; i++) {
        const color = IOValues.videoBuffer[i];
        const x = i % 160;
        const y = Math.floor(i / 160);
        writePixelToScreen(x, y, color);
    }
}

function clearVideoBuffer() {
    for (let i = 0; i < IOValues.videoBuffer.length; i++) {
        IOValues.videoBuffer[i] = 0x0000;
    }
}


/**
 * Returns pixel ids from 0-3 from two bytes
 * @description https://gbdev.io/pandocs/Tile_Data.html
 * @param {number} first Least significant byte. First byte read in memory 
 * @param {number} second Most significant byte. Second byte read in memory
 * @returns {list<number>} List of pixel ids
 */
function extractPixelsFromBytes(first, second) {
    const pixels = [];
    let mask = 0x80;

    for (let i = 0; i < 7; i++) {
        pixels.push(((first & mask) >> (7 - i)) | ((second & mask) >> 6 - i));
        mask >>= 1;
    }
    // Last bits requires a left bitshift for the most significant byte
    pixels.push(((first & 0x01)) | ((second & 0x01) << 1));

    return pixels;
}
let testTile = 32;
/**
 * Draws a single line in the frame buffer
 * https://www.youtube.com/watch?v=_h5TXh20_fQ Great high level overview of how tiles work
 * @param {number} line Line on screen to be drawn
 */
function drawLCDLine(line) {

    // Draw BG & Window if enabled. Else, draw transparent
    // In CGB mode, the gameboy always draws backgrounds and bit 0 simply means it has priority.
    if (Globals.metadata.supportsColor || IORegisters.LCDC & 0x01) {
        // Used for addressing
        const tileBankBaseAddress0 = (IORegisters.LCDC & 0x10) ? 0x8000 : 0x9000;
        const tileBankBaseAddress1 = 0x8800;
        const tileMapSelected = (IORegisters.LCDC & 0x08) >> 3;
        // Draw background
        {
            // Used for tile data calcs
            const left = IORegisters.SCX;
            const right = (IORegisters.SCX + 159) % 256;
            const tileY = (Math.floor((IORegisters.SCY + line) / 8)) % 32;
            let tileX;

            // Draw 21 tiles since 160/8 = 20 and there is one overflow tile
            let column = 0;
            for (let i = 0; i < 21; i++) {
                tileX = ((Math.floor(IORegisters.SCX / 8)) + i) % 32;
                const tileMapAddress = 0x9800 | (tileMapSelected << 10) | ((tileY & 0x1F) << 5) | (tileX & 0x1F);
                const tileNumber = generalRead(tileMapAddress);
                const tileRow = (IORegisters.SCY + line) % 8;
                const tileBlockAddress = (
                    tileNumber < 128 ?
                        tileBankBaseAddress0 + tileNumber * 0x10 :
                        tileBankBaseAddress1 + (tileNumber - 128) * 0x10
                );
                const tileDataAddress = tileBlockAddress + tileRow * 2;
                const tileData = extractPixelsFromBytes(generalRead(tileDataAddress), generalRead(tileDataAddress + 1));
                const startTileColumn = (i === 0) ? (left % 8) : 0;
                const endTileColumn = (i === 21) ? (right % 8) : 7;
                for (let j = startTileColumn; j <= endTileColumn; j++) {
                    const pixel = tileData[j];
                    renderPixel(column++, line, pixel);
                }
            }
        }


        // Draw Window if enabled
        if ((IORegisters.LCDC & 0x20) && IORegisters.WY >= IORegisters.LY) {

        }

    }
    else {
        // Draw "clear" pixels (white) when background is off
        for (let i = 0; i < 160; i++) {
            writePixelToScreen(i, IORegisters.LY, 0xFFFF);
        }
    }

    // Draw sprites if enabled
    if (IORegisters.LCDC & 0x02) {

    }


}

/**
 * Updates the LCD state and any interrupt flags depending on different circumstances.
 * Timings for each mode is simply the average amount of dots a mode takes divided by 4 (This is because I'm lazy).
 */
function doLCDUpdate() {
    /**
     * Changes the LCD mode and raises interrupt if that mode is selected in STAT
     * @param {number} mode 
     */
    function changeLCDMode(mode) {
        let mask = 0x00;
        switch (mode) {
            case 0x00:
                mask = 0x08;
                IORegisters.STAT = IORegisters.STAT & 0xFC;
                break;
            case 0x01:
                mask = 0x10;
                IORegisters.STAT = (IORegisters.STAT & 0xFC) | 0x01;
                break;
            case 0x02:
                mask = 0x20;
                IORegisters.STAT = (IORegisters.STAT & 0xFC) | 0x02;
                break;
            case 0x03:
                mask = 0x40;
                IORegisters.STAT |= 0x03;
                break;
        }

        if (IORegisters.STAT & mask) {
            IORegisters.IF |= 0x02;
        }
    }

    let cycleDelta = Globals.cycleNumber - IOValues.LCDCycles;
    if (Globals.doubleSpeed) {
        cycleDelta /= 2;
    }

    if (IORegisters.LCDC & 0x80) { // Bit 7 means the LCD is enabled
        switch (IORegisters.STAT & 0x03) { // https://gbdev.io/pandocs/Rendering.html#ppu-modes
            case 0x0: // HBLANK - Waiting until the end of a scanline
                if (cycleDelta >= 36) {
                    IOValues.LCDCycles += Globals.doubleSpeed ? 72 : 36;
                    IORegisters.LY = (IORegisters.LY + 1) & 0xFF;

                    // Set flags
                    if (IORegisters.LY == 144) { // Reached the end of the screen
                        IORegisters.IF |= 0x01; // Raise VBLANK interrupt
                        changeLCDMode(1);
                    }
                    else {
                        changeLCDMode(2);
                    }

                    // Set LYC == LY Bit
                    if (IORegisters.LY == IORegisters.LYC) {
                        IORegisters.STAT |= 0x04;

                        // Enable LCD Interrupt if mode LYC interrupt is selected
                        if (IORegisters.STAT & 0x40) {
                            IORegisters.IF |= 0x02;
                        }
                    }
                    else {
                        IORegisters.STAT &= 0xFB;
                    }
                }
                break;
            case 0x1: // VBLANK - Waiting until the next frame
                if (cycleDelta >= 114) {
                    IOValues.LCDCycles += Globals.doubleSpeed ? 228 : 114;

                    IORegisters.LY = (IORegisters.LY + 1) & 0xFF;
                    if (IORegisters.LY == 154) { // Reached the end of VBLANK
                        IORegisters.LY = 0;
                        changeLCDMode(2);
                    }

                    // Set LYC == LY Bit
                    if (IORegisters.LY == IORegisters.LYC) {
                        IORegisters.STAT |= 0x04;

                        // Enable LCD Interrupt if mode LYC interrupt is selected
                        if (IORegisters.STAT & 0x40) {
                            IORegisters.IF |= 0x02;
                        }
                    }
                    else {
                        IORegisters.STAT &= 0xFB;
                    }
                }
                break;
            case 0x2: // Search OAM and Draw a line
                if (cycleDelta >= 20) {
                    IOValues.LCDCycles += Globals.doubleSpeed ? 40 : 20;
                    IORegisters.STAT++; // Go to state 3
                }
                break;
            case 0x3: // Send pixels to LCD (Flush Line)
                if (cycleDelta >= 57) {
                    IOValues.LCDCycles += Globals.doubleSpeed ? 114 : 57;

                    if (IORegisters.LY < 144) {
                        drawLCDLine(IORegisters.LY);
                    }
                    changeLCDMode(0);

                    if (Globals.metadata.supportsColor) {
                        // TODO Implement GBC stuff
                    }
                }
                break;
        }
    }
}

function updateVRAMInspector() {
    const colors = ["rgb(255, 255, 255)", "rgb(192, 192, 192)", "rgb(64, 64, 64)", "rgb(0, 0, 0)"]
    const canvas0 = document.getElementById("vram-tileblock-0");
    const canvas1 = document.getElementById("vram-tileblock-1");
    if (!canvas0 || !canvas1) {
        return;
    }
    const ctx0 = canvas0.getContext("2d");
    const ctx1 = canvas1.getContext("2d");

    for (let tileNumber = 0; tileNumber < 384; tileNumber++) {
        const baseTileAddress = tileNumber * 0x10;
        for (let dataIndex = 0; dataIndex < 0xF; dataIndex += 2) {
            const dataAddress = baseTileAddress + dataIndex;
            const pixels0 = extractPixelsFromBytes(Globals.VRAM0[dataAddress], Globals.VRAM0[dataAddress + 1]);
            const pixels1 = extractPixelsFromBytes(Globals.VRAM1[dataAddress], Globals.VRAM1[dataAddress + 1]);
            for (let i = 0; i < 8; i++) {
                const pixel0 = pixels0[i];
                const pixel1 = pixels1[i];
                ctx0.fillStyle = colors[pixel0];
                ctx1.fillStyle = colors[pixel1];

                const x = (tileNumber % 16) * 8 + i;
                const y = Math.floor(tileNumber / 16) * 8 + Math.floor(dataIndex / 2);
                ctx0.fillRect(x, y, 1, 1);
                ctx1.fillRect(x, y, 1, 1);
            }
        }
    }
}

/////////////////////// Timer Stuff ///////////////////////

function doTimerUpdate() {
    const cycleDelta = Globals.cycleNumber - IOValues.timerCycles;
    IORegisters.divider = Globals.cycleNumber & 0xFF;

    // Return if timer isn't enabled
    if (!(IORegisters.timerControl & 0x04)) {
        return;
    }

    let timerIncrementPeriod; // In m-cycles
    switch (IORegisters.timerControl & 0x03) {
        case 0:
            timerIncrementPeriod = 256;
            break;
        case 1:
            timerIncrementPeriod = 4;
            break;
        case 2:
            timerIncrementPeriod = 16;
            break;
        case 3:
            timerIncrementPeriod = 64;
            break;
    }

    if (cycleDelta > timerIncrementPeriod) {
        IORegisters.timerCounter += Math.floor(cycleDelta / timerIncrementPeriod);
        IOValues.timerCycles = Globals.cycleNumber;
        if (IORegisters.timerCounter > 0xFF) {
            IORegisters.timerCounter = IORegisters.timerModulo + (IORegisters >> 8);
            IORegisters.IF |= 0x4;
        }
    }
}