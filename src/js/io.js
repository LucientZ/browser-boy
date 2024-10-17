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
 * @param {number} color Must be 5-bit encoded. Use unused bit 15 for priority
 * @param {boolean} priority Says whether a pixel will be drawn over other pixels
 * @param {boolean} bypassPriority Says whether a pixel will replace the previous pixel no matter the priority
 */
function writePixelToBuffer(x, y, color, priority = true, bypassPriority = false) {
    const index = x + y * 160;
    if (!priority && !bypassPriority && (IOValues.videoBuffer[index] & 0x8000)) {
        return;
    }
    IOValues.videoBuffer[index] = ((!!priority) << 15) | color;
}


/**
 * Writes a single pixel value to the screen buffer
 * @param {number} x x-position on the LCD screen
 * @param {number} y y-position on the LCD screen
 * @param {number} color Must be in the set {00, 01, 10, 11}
 * @param {boolean} priority Says whether a pixel will be drawn over the background
 * @param {boolean} bypassPriority Says whether a pixel will replace the previous pixel no matter the priority
 * @param {Array<number>} palette Color palette this pixel will pull from. Must be at least of length 4. 
 */
function renderPixel(x, y, value, priority = true, bypassPriority = false, palette = IOValues.defaultColorPalette) {
    if (!Globals.metadata.supportsColor) {
        writePixelToBuffer(x, y, IOValues.defaultColorPalette[value], priority, bypassPriority);
    }
    else {
        writePixelToBuffer(x, y, palette[value], priority, bypassPriority);
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
 * @returns {Array<number>} List of pixel ids
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
        const backgroundTileMapSelected = (IORegisters.LCDC & 0x08) >> 3;
        // Draw background
        {
            // Used for tile data calcs
            const left = IORegisters.SCX;
            const right = (IORegisters.SCX + 159) % 256;
            const tileRow = (IORegisters.SCY + line) % 8;
            const tileY = (Math.floor((IORegisters.SCY + line) / 8)) % 32;
            let tileX;

            // Draw 21 tiles since 160/8 = 20 and there is one overflow tile
            let column = 0;
            for (let i = 0; i < 21; i++) {
                tileX = ((Math.floor(IORegisters.SCX / 8)) + i) % 32;
                const tileMapAddress = 0x9800 | (backgroundTileMapSelected << 10) | ((tileY & 0x1F) << 5) | (tileX & 0x1F);
                const tileNumber = generalRead(tileMapAddress);
                const tileBlockAddress = (
                    tileNumber < 128 ?
                        tileBankBaseAddress0 + tileNumber * 0x10 :
                        tileBankBaseAddress1 + (tileNumber - 128) * 0x10
                );

                const tileAttributes = Globals.metadata.supportsColor ? Globals.VRAM1[tileMapAddress - 0x8000] : 0;
                const actualRow = (((tileAttributes & 0x40) ? 7 - tileRow : tileRow)); // y-flip
                const tileDataAddress = tileBlockAddress + actualRow * 2;

                let tileData;
                if (tileAttributes & 0x08) { // Is it in bank 1?
                    tileData = extractPixelsFromBytes(Globals.VRAM1[tileDataAddress - 0x8000], Globals.VRAM1[(tileDataAddress + 1) - 0x8000]);
                }
                else {
                    tileData = extractPixelsFromBytes(generalRead(tileDataAddress), generalRead(tileDataAddress + 1));
                }

                if (tileAttributes & 0x20) { // x-flip
                    tileData.reverse();
                }

                let palette = IOValues.defaultColorPalette;
                if (Globals.metadata.supportsColor) {
                    palette = [];
                    const paletteIndex = (tileAttributes & 0x07) * 8;
                    for (let j = 0; j < 4; j++) {
                        palette.push(Globals.BGCRAM[paletteIndex + 2 * j] | (Globals.BGCRAM[paletteIndex + 2 * j + 1] << 8));
                    }
                }

                const startTileColumn = (i === 0) ? (left % 8) : 0;
                const endTileColumn = (i === 21) ? (right % 8) : 7;
                for (let j = startTileColumn; j <= endTileColumn; j++) {
                    const pixel = tileData[j];

                    // DMG takes from a register for the palette.  
                    let color;
                    if (!Globals.metadata.supportsColor) {
                        switch (pixel) {
                            case 0x0:
                                color = (IORegisters.backgroundPalette & 0x03);
                                break;
                            case 0x1:
                                color = (IORegisters.backgroundPalette & 0x0C) >> 2;
                                break;
                            case 0x2:
                                color = (IORegisters.backgroundPalette & 0x30) >> 4;
                                break;
                            case 0x3:
                                color = (IORegisters.backgroundPalette & 0xC0) >> 6;
                                break;
                        }
                    }
                    else {
                        color = pixel;
                    }

                    const priority = Globals.metadata.supportsColor ? ((tileAttributes & 0x80) !== 0 || (IORegisters.LCDC & 0x01)) && pixel !== 0 : pixel !== 0;

                    renderPixel(column++, line, color, priority, true, palette);
                }
            }
        }


        // Draw Window if enabled and we're in the window drawing area
        if ((IORegisters.LCDC & 0x20) && IORegisters.WY <= line && IORegisters.WX <= 166 && IORegisters.WY <= 144) {
            const windowTileMapSelected = (IORegisters.LCDC & 0x40 >> 6);
            const tileY = (Math.floor((line - IORegisters.WY) / 8)) % 32;
            let tileX;

            const tileRow = (IORegisters.WY + line) % 8;
            const tileCount = Math.floor((174 - IORegisters.WX) / 8); // 22 tiles max

            for (let i = 0; i < tileCount; i++) {
                tileX = i;
                const tileMapAddress = 0x9800 | (windowTileMapSelected << 10) | ((tileY & 0x1F) << 5) | (tileX & 0x1F);
                const tileNumber = generalRead(tileMapAddress);
                const tileBlockAddress = (
                    tileNumber < 128 ?
                        tileBankBaseAddress0 + tileNumber * 0x10 :
                        tileBankBaseAddress1 + (tileNumber - 128) * 0x10
                );
                const tileAttributes = Globals.metadata.supportsColor ? Globals.VRAM1[tileMapAddress - 0x8000] : 0;
                const actualRow = (((tileAttributes & 0x40) ? 7 - tileRow : tileRow)); // y-flip
                const tileDataAddress = tileBlockAddress + actualRow * 2;

                let tileData;
                if (tileAttributes & 0x08) { // Is it in bank 1?
                    tileData = extractPixelsFromBytes(Globals.VRAM1[tileDataAddress - 0x8000], Globals.VRAM1[(tileDataAddress + 1) - 0x8000]);
                }
                else {
                    tileData = extractPixelsFromBytes(generalRead(tileDataAddress), generalRead(tileDataAddress + 1));
                }

                if (tileAttributes & 0x20) { // x-flip
                    tileData.reverse();
                }

                let palette = IOValues.defaultColorPalette;
                if (Globals.metadata.supportsColor) {
                    palette = [];
                    const paletteIndex = (tileAttributes & 0x07) * 8;
                    for (let j = 0; j < 4; j++) {
                        palette.push(Globals.BGCRAM[paletteIndex + 2 * j] | (Globals.BGCRAM[paletteIndex + 2 * j + 1] << 8));
                    }
                }

                for (let j = 0; j < tileData.length; j++) {
                    const pixel = tileData[j];

                    // DMG takes from a register for the palette.  
                    let color;
                    if (!Globals.metadata.supportsColor) {
                        switch (pixel) {
                            case 0x0:
                                color = (IORegisters.backgroundPalette & 0x03);
                                break;
                            case 0x1:
                                color = (IORegisters.backgroundPalette & 0x0C) >> 2;
                                break;
                            case 0x2:
                                color = (IORegisters.backgroundPalette & 0x30) >> 4;
                                break;
                            case 0x3:
                                color = (IORegisters.backgroundPalette & 0xC0) >> 6;
                                break;
                        }
                    }
                    else {
                        color = pixel;
                    }

                    const priority = Globals.metadata.supportsColor ? ((tileAttributes & 0x80) !== 0 || (IORegisters.LCDC & 0x01)) : true;
                    renderPixel((IORegisters.WX - 7) + i * 8 + j, line, color, priority, false, palette);
                }

            }
        }
    }
    else {
        // Draw "clear" pixels (white) when background is off
        for (let i = 0; i < 160; i++) {
            writePixelToScreen(i, IORegisters.LY, 0x7FFF);
        }
    }

    // Draw sprites if enabled
    // https://gbdev.io/pandocs/OAM.html
    // https://gbdev.io/pandocs/OAM.html#object-priority-and-conflicts
    if (IORegisters.LCDC & 0x02) {
        const spritesToDraw = [];
        const spriteHeight = (IORegisters.LCDC & 0x04) ? 16 : 8;
        for (let i = 0; i < 40; i++) { // There are up to 40 sprites in the OAM
            const spriteY = Globals.OAM[i * 4];
            const spriteX = Globals.OAM[i * 4 + 1];

            // Hide Sprite conditions
            if (spriteY === 0 ||
                spriteY === 160 ||
                spriteY > (line + 16) ||
                spriteY + spriteHeight <= line + 16 ||
                spriteX === 0 ||
                spriteX >= 168
            ) {
                continue;
            }

            spritesToDraw.push(i);
            if (spritesToDraw.length > 10) {
                break;
            }
        }

        // DMG sorts sprites by x position
        if (!Globals.metadata.supportsColor) {
            spritesToDraw.sort((a, b) => {
                const aX = Globals.OAM[a * 4 + 1];
                const bX = Globals.OAM[b * 4 + 1];
                if (aX < bX) {
                    return 1;
                }
                else if (aX > bX) {
                    return -1;
                }
                return 0;
            });
        }

        for (const spriteNum of spritesToDraw) {
            const spriteY = Globals.OAM[spriteNum * 4];
            const spriteX = Globals.OAM[spriteNum * 4 + 1];
            let spriteIndex = Globals.OAM[spriteNum * 4 + 2];
            const flags = Globals.OAM[spriteNum * 4 + 3];

            let VRAM = Globals.VRAM0;
            if (Globals.metadata.supportsColor && (flags & 0x08)) {
                VRAM = Globals.VRAM1;
            }

            // https://gbdev.io/pandocs/OAM.html#byte-2--tile-index
            if (IORegisters.LCDC & 0x04) { // 8x16 mode
                spriteIndex &= 0xFE;
            }

            // Get row to draw and flip y if necessary
            let spriteRow = line + 16 - spriteY;
            if ((flags & 0x40)) {
                spriteRow = spriteHeight - spriteRow - 1;
            }


            const spriteBlockAddress = spriteIndex * 0x10;
            const spriteDataAddress = spriteBlockAddress + spriteRow * 2;
            const spriteData = extractPixelsFromBytes(VRAM[spriteDataAddress], VRAM[spriteDataAddress + 1]);

            if (flags & 0x20) { // flip x if necessary
                spriteData.reverse();
            }

            let palette = IOValues.defaultColorPalette;
            if (Globals.metadata.supportsColor) {
                palette = [];
                const paletteIndex = (flags & 0x07) * 8;
                for (let j = 0; j < 4; j++) {
                    palette.push(Globals.OBJCRAM[paletteIndex + 2 * j] | (Globals.OBJCRAM[paletteIndex + 2 * j + 1] << 8));
                }
            }

            for (let i = 0; i < spriteData.length; i++) {
                const pixel = spriteData[i];
                if (pixel === 0) { // transparent 
                    continue;
                }
                let color;
                if (!Globals.metadata.supportsColor) {
                    const palette = (flags & 0x10) ? IORegisters.OBP1 : IORegisters.OBP0;
                    switch (pixel) {
                        case 0x0:
                            color = (palette & 0x03);
                            break;
                        case 0x1:
                            color = (palette & 0x0C) >> 2;
                            break;
                        case 0x2:
                            color = (palette & 0x30) >> 4;
                            break;
                        case 0x3:
                            color = (palette & 0xC0) >> 6;
                            break;
                    }
                }
                else {
                    color = pixel;
                }
                const priority = !(flags & 0x80);
                renderPixel((spriteX - 8) + i, line, color, priority, false, palette);
            }
        }
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

/**
 * Transfers a selected address space to the Object Attribute Memory
 */
function doDMATransfer() {
    const cycleDelta = Globals.cycleNumber - IOValues.DMATransferCycles;

    if (cycleDelta >= 160 && Globals.HRAM[0x46] !== 0) { // Do DMA transfer
        let source = (Globals.HRAM[0x46] << 8);

        for (let destination = 0xFE00; destination <= 0xFE9F; destination++, source++) {
            gameboyWrite(destination, gameboyRead(source));
        }
        Globals.HRAM[0x46] = 0x00;
    }
}

/**
 * Only works on gameboy color.
 * Transfers a selected address space to VRAM.
 * https://gbdev.io/pandocs/CGB_Registers.html#ff51ff52--hdma1-hdma2-cgb-mode-only-vram-dma-source-high-low-write-only
 * Technically, this shouldn't be instant, but I made it this way because I am lazy.
*/
function doHDMATransfer() {
    const blocksLeft = (Globals.HRAM[0x55] & 0x7F) + 1;
    let blocksTransferred = 0;

    if (!(Globals.HRAM[0x55] & 0x80)) { // Transfer all data at once
        for (let i = 0; i < (blocksLeft * 0x10); i++) {
            gameboyWrite(IOValues.HDMADestination++, gameboyRead(IOValues.HDMASource++));
        }
        Globals.HRAM[0x55] = 0xFF;
        blocksTransferred = blocksLeft;
    }
    else if ((IORegisters.LY <= 143 && (IORegisters.STAT & 0x03) === 0x00)) { // Transfer 0x10 (16) bytes during each HBlank
        for (let i = 0; i < 0x10; i++) {
            gameboyWrite(IOValues.HDMADestination++, gameboyRead(IOValues.HDMASource++));
        }
        Globals.HRAM[0x55] = 0x80 | (((Globals.HRAM[0x55] & 0x7F) - 1) & 0x7F);
        blocksTransferred = 1;
    }

    if (Globals.HRAM[0x55] === 0xFF) {
        IOValues.HDMAInProgress = false;
    }

    Globals.halted = false;
    Globals.cycleNumber += (blocksTransferred) * (Globals.doubleSpeed ? 16 : 8);
}

/////////////////////// Timer Stuff ///////////////////////

function doTimerUpdate() {
    IORegisters.divider = Globals.cycleNumber & 0xFF;

    // Return if timer isn't enabled
    if (!(IORegisters.timerControl & 0x04)) {
        return;
    }
    let cycleDelta = Globals.cycleNumber - IOValues.timerCycles;
    if (Globals.doubleSpeed) {
        cycleDelta /= 2;
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
            IORegisters.timerCounter = IORegisters.timerModulo + (IORegisters.timerCounter >> 8);
            IORegisters.IF |= 0x4;
        }
    }
}

/////////////////////// Joypad Stuff ///////////////////////

const upKeys = ["ArrowUp", "w", "W"];
const downKeys = ["ArrowDown", "s", "S"];
const leftKeys = ["ArrowLeft", "a", "A"];
const rightKeys = ["ArrowRight", "d", "D"];
const aButtonKeys = ["z", "Z", "n", "N"];
const bButtonKeys = ["x", "X", "m", "M"];
const startKeys = ["1"];
const selectKeys = ["2"];

// https://gbdev.io/pandocs/Joypad_Input.html
// For whatever reason, the gameboy has a button being pressed as 0 and released as 1
document.addEventListener("keydown", (event) => {
    if (upKeys.includes(event.key)) {
        IOValues.upPressed = true;
    }
    else if (downKeys.includes(event.key)) {
        IOValues.downPressed = true;
    }
    else if (leftKeys.includes(event.key)) {
        IOValues.leftPressed = true;
    }
    else if (rightKeys.includes(event.key)) {
        IOValues.rightPressed = true;
    }
    else if (aButtonKeys.includes(event.key)) {
        IOValues.aButtonPressed = true;
    }
    else if (bButtonKeys.includes(event.key)) {
        IOValues.bButtonPressed = true;
    }
    else if (startKeys.includes(event.key)) {
        IOValues.startPressed = true;
    }
    else if (selectKeys.includes(event.key)) {
        IOValues.selectPressed = true;
    }

    if ((IORegisters.joypad & 0x10) && (upKeys.includes(event.key) || downKeys.includes(event.key) || leftKeys.includes(event.key) || rightKeys.includes(event.key)) ||
        (IORegisters.joypad & 0x20) && (aButtonKeys.includes(event.key) || bButtonKeys.includes(event.key) || startKeys.includes(event.key) || selectKeys.includes(event.key))) {
        IORegisters.IF |= 0x10;
    }
});

// https://gbdev.io/pandocs/Joypad_Input.html
document.addEventListener("keyup", (event) => {
    if (upKeys.includes(event.key)) {
        IOValues.upPressed = false;
    }
    else if (downKeys.includes(event.key)) {
        IOValues.downPressed = false;
    }
    else if (leftKeys.includes(event.key)) {
        IOValues.leftPressed = false;
    }
    else if (rightKeys.includes(event.key)) {
        IOValues.rightPressed = false;
    }
    else if (aButtonKeys.includes(event.key)) {
        IOValues.aButtonPressed = false;
    }
    else if (bButtonKeys.includes(event.key)) {
        IOValues.bButtonPressed = false;
    }
    else if (startKeys.includes(event.key)) {
        IOValues.startPressed = false;
    }
    else if (selectKeys.includes(event.key)) {
        IOValues.selectPressed = false;
    }
});

/////////////////////// Audio Stuff ///////////////////////

/**
 * @typedef Wave
 * @prop {Function}         play               Plays the current wave with given parameters (depends on the channel)
 * @prop {Function}         stop               Stops the current wave from playing
 * @prop {Function}         panWave            Pans the wave to the left, right, both, or neither
 * @prop {GainNode}         _masterGain        Used to control whether or not the node is muted
 * @prop {GainNode}         _gainNode          Controls the relative sound
 * @prop {StereoPannerNode} _panNode           Controls how far left or right the sound is panned
 */

/**
 * Base class for all wave interfaces
 * @type {Wave}
 */
class Wave {
    constructor() {
        if (!IOValues.audioCtx) {
            throw new Error("Audio context not initialized");
        }

        // Controls whether or not the node is muted due to panning
        this._masterGain = IOValues.audioCtx.createGain();
        this._masterGain.gain.value = 1;
        this._masterGain.connect(IOValues.audioCtx.destination);

        this._panNode = IOValues.audioCtx.createStereoPanner();
        this._panNode.connect(this._masterGain);

        this._gainNode = IOValues.audioCtx.createGain();
        this._gainNode.gain.value = 0;
        this._gainNode.connect(this._panNode);
    }

    /**
     * Stops the wave from playing earlier than specified
     * @returns {Wave} This object
    */
    stop() {
        this._gainNode.gain.cancelScheduledValues(IOValues.audioCtx.currentTime);
        this._gainNode.gain.setTargetAtTime(0, IOValues.audioCtx.currentTime, 0);
        return this;
    }

    /**
    * Pans the channel to the left, right, or both channels
    * @param {boolean}      hardLeft 
    * @param {boolean}      hardRight
    * @returns {Wave} This object
    */
    panWave(hardLeft, hardRight) {
        if (!(hardLeft || hardRight)) {
            this._masterGain.gain.value = 0;
        }
        else {
            this._masterGain.gain.value = 1;
            if (hardLeft && !hardRight) {
                this._panNode.pan.value = -1;
            }
            else if (!hardLeft && hardRight) {
                this._panNode.pan.value = 1;
            }
            else {
                this._panNode.pan.value = 0;
            }
        }
        return this;
    }
}

/**
 * Interface for interacting with a pulse wave
 * 
 * Node hierarchy
 * - oscillator -> gainNode -> panNode -> masterGain -> audioCtx
 * 
 * @type {Wave}
 */
class PulseWave extends Wave {
    /**
     * Create a Pulse Wave object
     * @param {OscillatorNode} oscillator Oscillator for periodic pulse wave
     * @param {GainNode}       gainNode   Used to control volume
     */
    constructor(oscillator) {
        super();

        if (!oscillator || typeof oscillator !== "object") {
            throw new TypeError(`oscillator must be of type OscillatorNode instead got ${oscillator ? typeof oscillator : oscillator}`);
        }

        this._oscillator = oscillator;
        this._oscillator.connect(this._gainNode);
        this._oscillator.start();
    }

    /**
     * Plays the wave with given properties and stops the previous oscillation
     * @param {Object}             properties                      Properties that should be taken into account when playing the tone
     * @param {number | undefined} properties.frequency            Frequency the oscillator should play in Hz
     * @param {number | undefined} properties.length               Duration in seconds. If set to 0, play forever
     * @param {number | undefined} properties.envelopeLength       Duration in seconds of how long the envelope will last. If set to 0, disable envelope 
     * @param {number | undefined} properties.initialVolume        Volume the envelope starts at
     * @param {number | undefined} properties.finalVolume          Volume the envelope will approach
     * @param {number | undefined} properties.periodValue          Initial period value for the wave
     * @param {number | undefined} properties.sweepDirection       If true, will decrease the period. Else, increases the period
     * @param {number | undefined} properties.sweepPace            How many sweep iterations happen per 7.8 ms (128 Hz)
     * @param {number | undefined} properties.sweepStepSize        How large the sweep will change the period Where L_{t+1} = L_t +/- L_t/2^step
     * @returns {PulseWave}        This object
    */
    play({ frequency = 440, length = 0, envelopeLength = 0, initialVolume = Globals.masterVolume / 2, finalVolume = 0, periodValue = 0, sweepDirection = 0, sweepPace = 0, sweepStepSize = 0 }) {
        this.stop();
        this._oscillator.frequency.setTargetAtTime(frequency, IOValues.audioCtx.currentTime, 0);
        this._gainNode.gain.setTargetAtTime(initialVolume, IOValues.audioCtx.currentTime, 0);
        this._gainNode.connect(IOValues.audioCtx.destination);

        if (envelopeLength !== 0) {
            this._gainNode.gain.linearRampToValueAtTime(initialVolume, IOValues.audioCtx.currentTime);
            this._gainNode.gain.linearRampToValueAtTime(finalVolume, IOValues.audioCtx.currentTime + envelopeLength);
        }

        if (sweepPace !== 0) {
            let timeDifference = 0;
            const currentTime = IOValues.audioCtx.currentTime;
            if (sweepDirection) {
                for (let i = periodValue; i > 1 && (i >> sweepStepSize) != 0; i -= (i >> sweepStepSize)) {
                    timeDifference += sweepPace / 128;
                    this._oscillator.frequency.setTargetAtTime(132072 / (2048 - i), currentTime + timeDifference, 0);
                }
            }
            else {
                for (let i = periodValue; i < 0x7FF; i += (i >> sweepStepSize)) {
                    timeDifference += sweepPace / 128;
                    this._oscillator.frequency.setTargetAtTime(132072 / (2048 - i), currentTime + timeDifference, 0);
                }
            }
            this._gainNode.gain.setTargetAtTime(0, IOValues.audioCtx.currentTime + timeDifference, 0);
            console.log(currentTime + timeDifference);
        }

        if (length !== 0) {
            this._gainNode.gain.setTargetAtTime(0, IOValues.audioCtx.currentTime + length, 0);
        }
        return this;
    }

    /**
     * Stops the wave from playing earlier than specified
     * @returns {PulseWave} This object
    */
    stop() {
        this._oscillator.frequency.cancelScheduledValues(IOValues.audioCtx.currentTime);
        this._gainNode.gain.cancelScheduledValues(IOValues.audioCtx.currentTime);
        this._gainNode.gain.setTargetAtTime(0, IOValues.audioCtx.currentTime, 0);
        return this;
    }
}

/**
 * Interface for interacting with a custom wave
 * 
 * Node hierarchy
 * - bufferSource -> gainNode -> panNode -> masterGain -> audioCtx
 * 
 * @type {Wave}
 */
class CustomWave extends Wave {
    /**
     * Creates a Custom Wave object
     * @param {AudioBufferSourceNode} bufferSource Where the audio buffer is stored
     */
    constructor(bufferSource) {
        super();

        if (!bufferSource || typeof bufferSource !== "object") {
            throw new TypeError(`buffer must be of type AudioBuffer instead got ${bufferSource ? typeof bufferSource : bufferSource}`);
        }

        this._audioBuffer = new Float32Array(32); // Where 32 samples are loaded

        this._bufferSource = bufferSource;
        this._bufferSource.connect(this._gainNode);
        this._bufferSource.start();
    }

    /**
     * Plays the wave with given properties and stops the previous oscillation
     * @param   {Object}            properties            Properties that should be taken into account when playing the tone
     * @param   {number}            properties.frequency  Frequency the oscillator should play in Hz
     * @param   {number}            properties.length     Duration in seconds. If set to 0, play forever
     * @param   {number}            properties.volume     Volume of the wave. There is only one volume control since custom waves only have a set volume. 
     * @returns {CustomWave}        This object
     */
    play({ frequency = 440, length = 1, volume = Globals.masterVolume / 2 }) {
        this.stop();
        this._gainNode.gain.setTargetAtTime(volume, IOValues.audioCtx.currentTime, 0);
        this._bufferSource.playbackRate.value = frequency * this._bufferSource.buffer.length / this._bufferSource.buffer.sampleRate; // Since we have 32 samples, we playback at this rate: frequency * 32 / 65536

        if (length !== 0) {
            this._gainNode.gain.setTargetAtTime(0, IOValues.audioCtx.currentTime + length, 0);
        }
        return this;
    }

    /**
     * Loads a maximum of 32 samples into the audio buffer. Can be done while the wave is playing.
     * @param {Array<number>} samples List of 32 4-bit samples
     * @returns {CustomWave} This object
     */
    loadSamples(samples) {
        if (samples.length > 32) {
            console.warn("More than 32 samples provided to Custom Wave. Dropping some samples");
        }
        for (let i = 0; i < Math.min(32, samples.length); i++) {
            this._audioBuffer[i] = samples[i] / 0xF;
        }
        this._bufferSource.buffer.copyToChannel(this._audioBuffer, 0, 0);

        // Must replace the audio source to comply with Firefox's implementation of AudioBufferSourceNode
        const replacementSource = IOValues.audioCtx.createBufferSource();
        replacementSource.buffer = this._bufferSource.buffer;
        replacementSource.loop = true;
        replacementSource.connect(this._gainNode);

        this._bufferSource.stop();
        this._bufferSource.disconnect();

        this._bufferSource = replacementSource;
        this._bufferSource.start();
        return this;
    }
}

/**
 * Interface for interacting with a noise wave
 * 
 * Node hierarchy
 * - bufferSource -> gainNode -> panNode -> masterGain -> audioCtx
 * 
 * @type {Wave}
 */
class NoiseWave extends Wave {
    /**
     * Creates a Noise Wave object
     * @param {AudioBufferSourceNode} bufferSource Where the audio buffer is stored
     * @param {GainNode}              gainNode     Used to control volume
     */
    constructor(bufferSource) {
        super();
        if (!bufferSource || typeof bufferSource !== "object") {
            throw new TypeError(`buffer must be of type AudioBuffer instead got ${bufferSource ? typeof bufferSource : bufferSource}`);
        }

        this._audioBuffer = new Float32Array(IOValues.audioCtx.sampleRate);
        this._bufferSource = bufferSource;
        this._bufferSource.connect(this._gainNode);
        this._bufferSource.start();
    }

    /**
     * Plays the noise wave with given properties and stops the previous oscillation
     * @param {Object}             properties                   Properties that should be taken into account when playing the tone
     * @param {number | undefined} properties.length            Duration in seconds. If set to 0, play forever 
     * @param {number | undefined} properties.envelopeLength    Duration in seconds of how long the envelope will last. If set to 0, disable envelope 
     * @param {number | undefined} properties.initialVolume     Volume the envelope starts at
     * @param {number | undefined} properties.finalVolume       Volume the envelope will approach
     * @returns {PulseWave}        This object
    */
    play({ length = 1, envelopeLength = 0, initialVolume = Globals.masterVolume / 2, finalVolume = 0 }) {
        this.stop();
        this._gainNode.gain.setTargetAtTime(initialVolume, IOValues.audioCtx.currentTime, 0);

        if (envelopeLength !== 0) {
            this._gainNode.gain.linearRampToValueAtTime(initialVolume, IOValues.audioCtx.currentTime);
            this._gainNode.gain.linearRampToValueAtTime(finalVolume, IOValues.audioCtx.currentTime + envelopeLength);
        }

        if (length !== 0) {
            this._gainNode.gain.setTargetAtTime(0, IOValues.audioCtx.currentTime + length, 0);
        }
        return this;
    }

    /**
     * 
     * @param {number} lfsrWidth 
     * @param {number} lfsrFrequency 
     * @returns {CustomWave} This object
     */
    loadNewWave(lfsrWidth, lfsrFrequency) {
        const sampleNum = lfsrFrequency;
        const sampleWidth = Math.floor(this._audioBuffer.length / sampleNum) || 1;
        const noiseChannel = audioChannels[3];
        for (let i = 0; i < sampleNum && (i * sampleWidth + sampleWidth) < this._audioBuffer.length; i++) {
            for (let j = 0; j < sampleWidth; j++) {
                this._audioBuffer[i * sampleWidth + j] = (noiseChannel.lfsr & 0x01);
            }
            const xorBit = (noiseChannel.lfsr & 0x01) ^ ((noiseChannel.lfsr >> 1) & 0x01);
            noiseChannel.lfsr = lfsrWidth ? (noiseChannel.lfsr & 0x7f7f) | (xorBit << 15) | (xorBit << 7) : (noiseChannel.lfsr & 0x7FFF) | (xorBit << 15);
            noiseChannel.lfsr >>= 1;
        }
        this._bufferSource.buffer.copyToChannel(this._audioBuffer, 0, 0);

        // Must replace the audio source to comply with Firefox's implementation of AudioBufferSourceNode
        const replacementSource = IOValues.audioCtx.createBufferSource();
        replacementSource.buffer = this._bufferSource.buffer;
        replacementSource.loop = true;
        replacementSource.connect(this._gainNode);

        this._bufferSource.stop();
        this._bufferSource.disconnect(this._gainNode);

        this._bufferSource = replacementSource;
        this._bufferSource.start();

        return this;
    }
}

/**
 * Creates an oscillator object for a pulse wave with given specifications
 * https://youtu.be/pz7klCW3dYQ?si=JhUL-LCBKb3oYzG9&t=1888
 * 
 * @param {number}             dutyCycleSelect 2 bits indicating the specific duty cyle (See table below)
 * @returns {PulseWave | null} PulseWave object if the audio context has been created. Null if it hasn't
 * 
 * |Value|Duty Cycle|
 * |:----|:---------|
 * |00   |12.5%     |
 * |01   |25%       |
 * |10   |50%       |
 * |11   |75%       |
 */
function createGameboyPulseWave(dutyCycleSelect) {
    if (!IOValues.audioCtx) {
        return null;
    }

    let dutyCycle = 0.5;
    switch (dutyCycleSelect) {
        case 0b00:
            dutyCycle = 0.125;
            break;
        case 0b01:
            dutyCycle = 0.25;
            break;
        case 0b10:
            dutyCycle = 0.50;
            break;
        case 0b11:
            dutyCycle = 0.75;
            break;
    }

    // Create waveform with a fourier transform
    const oscillator = IOValues.audioCtx.createOscillator();

    const maxFrequency = 1000; // Highest *reasonable* frequency in Hz
    const maxCoefficient = IOValues.audioCtx.sampleRate / (2 * maxFrequency); // Highest *reasonable* value that a coefficient can have before fourier series breaks down
    const real = new Float32Array(IOValues.audioCtx.sampleRate / 2);
    const imaginary = new Float32Array(IOValues.audioCtx.sampleRate / 2);

    real[0] = 0; imaginary[0] = 0;
    for (let i = 1; i < maxCoefficient; i++) {
        real[i] = 2 * Math.sin(i * Math.PI * dutyCycle) / (i * Math.PI);
    }

    oscillator.setPeriodicWave(IOValues.audioCtx.createPeriodicWave(real, imaginary));

    return new PulseWave(oscillator);
}

/**
 * Creates a custom waveform object
 * @returns {CustomWave | null} null if audio context does not exist
 */
function createGameboyCustomWave() {
    if (!IOValues.audioCtx) {
        return null;
    }

    const bufferSource = IOValues.audioCtx.createBufferSource();
    bufferSource.buffer = IOValues.audioCtx.createBuffer(1, 32, 65536);
    bufferSource.loop = true;

    return new CustomWave(bufferSource);
}

/**
 * 
 * @param {number} lfsrWidth     Falsy if 15-bit. Truthy if 7-bit
 * @param {number} lfsrFrequency Sample rate of the linear feedback shift register
 * @param {number} sampleNum     How many random bits to sample 
 */
function createGameboyNoiseWave(lfsrWidth, lfsrFrequency) {
    const sampleNum = lfsrFrequency;
    const audioBuffer = new Float32Array(IOValues.audioCtx.sampleRate);
    const sampleWidth = Math.floor(audioBuffer.length / sampleNum) || 1;
    const noiseChannel = audioChannels[3];
    for (let i = 0; i < sampleNum && (i * sampleWidth + sampleWidth) < audioBuffer.length; i++) {
        for (let j = 0; j < sampleWidth; j++) {
            audioBuffer[i * sampleWidth + j] = (noiseChannel.lfsr & 0x01);
        }
        const xorBit = (noiseChannel.lfsr & 0x01) ^ ((noiseChannel.lfsr >> 1) & 0x01);
        noiseChannel.lfsr = lfsrWidth ? (noiseChannel.lfsr & 0x7f7f) | (xorBit << 15) | (xorBit << 7) : (noiseChannel.lfsr & 0x7FFF) | (xorBit << 15);
        noiseChannel.lfsr >>= 1;
    }

    const bufferSource = IOValues.audioCtx.createBufferSource();
    bufferSource.buffer = IOValues.audioCtx.createBuffer(1, audioBuffer.length, IOValues.audioCtx.sampleRate);
    bufferSource.loop = true;
    bufferSource.buffer.copyToChannel(audioBuffer, 0, 0);

    return new NoiseWave(bufferSource);
}

/**
 * Initializes audio channels and creates an audio context object
 */
function initializeAudio() {
    if (!(window.AudioContext || window.webkitAudioContext)) {
        alert("Your browser does not support the audio webkit API");
        return;
    }
    const audioToggle = document.getElementById("audio-toggle");
    IOValues.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioToggle.innerText = "Mute Audio";

    audioChannels[0].waveforms = [];
    audioChannels[1].waveforms = [];

    for (let i = 0; i < 4; i++) {
        audioChannels[0].waveforms.push(createGameboyPulseWave(i));
        audioChannels[1].waveforms.push(createGameboyPulseWave(i));
    }
    audioChannels[2].currentWave = createGameboyCustomWave();
    Globals.HRAM[0x26] |= 0x80; // Audio on/off bit
}

/**
 * Toggles whether or not the audio is playing
 */
function toggleAudio() {
    if (IOValues.audioCtx) {
        const audioToggle = document.getElementById("audio-toggle");
        if (IOValues.audioCtx.state === "running") {
            IOValues.audioCtx.suspend();
            audioToggle.innerText = "Unmute Audio";
            Globals.HRAM[0x26] &= 0x7F; // Audio on/off bit
        }
        else if (IOValues.audioCtx.state === "suspended") {
            IOValues.audioCtx.resume();
            audioToggle.innerText = "Mute Audio";
            Globals.HRAM[0x26] |= 0x80;
        }
        else {
            initializeAudio();
        }
    }
    else {
        initializeAudio();
    }
}

/**
 * All the business logic needed to control and activate each audio channel.
 */
function doAudioUpdate() {
    const audioMasterControl = Globals.HRAM[0x26];
    if (audioMasterControl & 0x80 && IOValues.audioCtx) {
        // Audio Channel 1 (Pulse)
        {
            const channel = audioChannels[0];
            if (!channel.enabled && (Globals.HRAM[0x14] & 0x80)) {
                const sweepPace = (Globals.HRAM[0x10] & 0x70) >> 4;
                const sweepDirection = (Globals.HRAM[0x10] & 0x08) >> 3;
                const sweepStepSize = (Globals.HRAM[0x10] & 0x07);

                const duty = (Globals.HRAM[0x11] & 0xC0) >> 6;
                const lengthTimer = Globals.HRAM[0x11] & 0x3f;
                const lengthEnable = (Globals.HRAM[0x14] & 0x40);
                const periodValue = Globals.HRAM[0x13] | ((Globals.HRAM[0x14] & 0x07) << 8);

                const envelopeDirection = (Globals.HRAM[0x12] & 0x08) >> 3;
                const envelopePace = Globals.HRAM[0x12] & 0x07;
                const initialVolume = (Globals.HRAM[0x12] & 0xF0) >> 4;

                const envelopeLength = envelopePace ? Math.abs(envelopeDirection ? 0xF : 0x0 - initialVolume) * envelopePace / 64 : 0;
                const audioFrequency = 131072 / (2048 - periodValue); // https://gbdev.io/pandocs/Audio_Registers.html#ff13--nr13-channel-1-period-low-write-only
                const audioLength = lengthEnable ? (64 - lengthTimer) / 256 : 0; // https://gbdev.io/pandocs/Audio.html#length-timer 

                if (channel.currentWave) {
                    channel.currentWave.stop();
                }
                channel.currentWave = channel.waveforms[duty];
                channel.currentWave.stop().panWave(Globals.HRAM[0x25] & 0x10, Globals.HRAM[0x25] & 0x01).play({
                    length: audioLength,
                    frequency: audioFrequency,
                    initialVolume: initialVolume * Globals.masterVolume / 0xF, // Converts binary volume into real gain
                    finalVolume: envelopeDirection ? Globals.masterVolume : 0,
                    envelopeLength: envelopeLength,
                    periodValue: periodValue,
                    sweepDirection: sweepDirection,
                    sweepPace: sweepPace,
                    sweepStepSize: sweepStepSize,
                });
                channel.enabled = true;
                if (audioLength !== 0) {
                    setTimeout(() => {
                        channel.enabled = false;
                    }, audioLength * 1000);
                }
            }
        }

        // Audio Channel 2 (Pulse)
        {
            const channel = audioChannels[1];
            if (!channel.enabled && (Globals.HRAM[0x19] & 0x80)) {
                const duty = (Globals.HRAM[0x16] & 0xC0) >> 6;
                const lengthTimer = Globals.HRAM[0x16] & 0x3F;
                const lengthEnable = (Globals.HRAM[0x19] & 0x40);
                const periodValue = Globals.HRAM[0x18] | ((Globals.HRAM[0x19] & 0x07) << 8);

                const envelopeDirection = (Globals.HRAM[0x17] & 0x08) >> 3;
                const envelopePace = Globals.HRAM[0x17] & 0x07;
                const initialVolume = (Globals.HRAM[0x17] & 0xF0) >> 4;

                const envelopeLength = envelopePace ? Math.abs(envelopeDirection ? 0xF : 0x0 - initialVolume) * envelopePace / 64 : 0;
                const audioFrequency = 131072 / (2048 - periodValue); // https://gbdev.io/pandocs/Audio_Registers.html#ff13--nr13-channel-1-period-low-write-only
                const audioLength = lengthEnable ? (64 - lengthTimer) / 256 : 0;

                if (channel.currentWave) {
                    channel.currentWave.stop();
                }
                channel.currentWave = channel.waveforms[duty];
                channel.currentWave.panWave(Globals.HRAM[0x25] & 0x20, Globals.HRAM[0x25] & 0x02).play({
                    length: audioLength,
                    frequency: audioFrequency,
                    initialVolume: initialVolume * Globals.masterVolume / 0xF, // Converts binary volume into real gain
                    finalVolume: envelopeDirection ? Globals.masterVolume : 0,
                    envelopeLength: envelopeLength,
                });
                channel.enabled = true;
                if (audioLength !== 0) {
                    setTimeout(() => {
                        channel.enabled = false;
                    }, audioLength * 1000);
                }
            }
        }

        // Audio Channel 3 (Custom)
        {
            const channel = audioChannels[2];
            if (!channel.enabled && (Globals.HRAM[0x1E] & 0x80) && (Globals.HRAM[0x1A] & 0x80)) {
                const lengthTimer = Globals.HRAM[0x1B] & 0x3F;
                const lengthEnable = (Globals.HRAM[0x1E] & 0x40);
                const periodValue = Globals.HRAM[0x1D] | ((Globals.HRAM[0x1E] & 0x07) << 8);
                const outputLevel = (Globals.HRAM[0x1C] & 0x60) >> 5;

                const audioFrequency = 65536 / (2048 - periodValue);
                const audioLength = lengthEnable ? (64 - lengthTimer) / 256 : 0;

                const samples = [];
                for (let i = 0x30; i <= 0x3F; i++) {
                    samples.push((Globals.HRAM[i] & 0xF0) >> 4);
                    samples.push(Globals.HRAM[i] & 0x0F);
                }

                let audioVolume = 1;
                switch (outputLevel) {
                    case 0:
                        audioVolume = 0;
                        break;
                    case 2:
                        samples.pop();
                        samples.unshift(0);
                        break;
                    case 3:
                        samples.pop();
                        samples.pop();
                        samples.unshift(0);
                        samples.unshift(0);
                        break;
                }

                if (!channel.currentWave) {
                    channel.currentWave = createGameboyCustomWave();
                }
                channel.currentWave.stop().panWave(Globals.HRAM[0x25] & 0x40, Globals.HRAM[0x25] & 0x04).loadSamples(samples).play({
                    length: audioLength,
                    frequency: audioFrequency,
                    volume: audioVolume * Globals.masterVolume,
                });
                channel.enabled = true;
                if (audioLength !== 0) {
                    setTimeout(() => {
                        channel.enabled = false;
                    }, audioLength * 1000);
                }
            }
        }

        // Audio Channel 4 (Noise)
        {
            const channel = audioChannels[3];
            if (!channel.enabled && (Globals.HRAM[0x23] & 0x80)) {
                const lengthTimer = Globals.HRAM[0x20] & 0x3F;
                const lengthEnable = (Globals.HRAM[0x23] & 0x40);
                const clockShift = (Globals.HRAM[0x22] & 0xF0) >> 4;
                const clockDivider = Globals.HRAM[0x22] & 0x07;
                const lfsrWidth = (Globals.HRAM[0x22] & 0x08);

                const envelopeDirection = (Globals.HRAM[0x21] & 0x08) >> 3;
                const envelopePace = Globals.HRAM[0x21] & 0x07;
                const initialVolume = Globals.HRAM[0x21] >> 4;

                const envelopeLength = envelopePace ? Math.abs(envelopeDirection ? 0xF : 0x0 - initialVolume) * envelopePace / 64 : 0;
                const audioLength = lengthEnable ? (64 - lengthTimer) / 256 : 0;

                // Technically, this is not *exactly* how the gameboy made white noise, but it's close enough
                // What *should* happen is the oscillator should be either 1 or 0 constantly, but we can't do that so we just sample a large amount
                const lfsrFrequency = 262144 / ((clockDivider || 0.5) * (2 << clockShift)); // https://gbdev.io/pandocs/Audio_Registers.html#ff22--nr43-channel-4-frequency--randomness

                if (!channel.currentWave) {
                    channel.currentWave = createGameboyNoiseWave(lfsrWidth, lfsrFrequency);
                }

                channel.currentWave.stop().loadNewWave(lfsrWidth, lfsrFrequency).panWave(Globals.HRAM[0x25] & 0x80, Globals.HRAM[0x25] & 0x08).play({
                    length: audioLength,
                    initialVolume: initialVolume * Globals.masterVolume / 0xF, // Converts binary volume into real gain
                    finalVolume: envelopeDirection ? Globals.masterVolume : 0,
                    envelopeLength: envelopeLength,
                });
                channel.enabled = true;
                if (audioLength !== 0) {
                    setTimeout(() => {
                        channel.enabled = false;
                    }, audioLength * 1000);
                }
            }
        }
    }
}
