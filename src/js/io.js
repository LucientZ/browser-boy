const IOValues = {
    LCDCycles: 0x00,
    videoBuffer: new Uint16Array(144 * 160),
}

/////////////////////// Screen Stuff ///////////////////////

/**
 * Helper function which writes a given color to the canvas.
 * This does not do anything related to tiles; it is simply an interface with the canvas.
 * This will be optimized in the future
 * @param {number} x 
 * @param {number} y 
 * @param {number} color Must be in the format 0x0000
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
    const colorCoefficient = 255 / 31;
    const red = Math.floor(((color >> 10) & 0x1f) * colorCoefficient);
    const green = Math.floor(((color >> 5) & 0x1f) * colorCoefficient);
    const blue = Math.floor((color & 0x1f) * colorCoefficient);

    ctx.fillStyle = `rgb(${red} ${green} ${blue})`;
    ctx.fillRect(x, y, 1, 1);
}


function writePixelToBuffer(x, y, color) {
    const index = x + y * 160;
    IOValues.videoBuffer[index] = color;
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
 * 
 * @param {number} line 
 */
function drawLCDLine(line) {

    // Draw BG & Window if enabled. Else, draw transparent
    // In CGB mode, the gameboy always draws backgrounds and bit 0 simply means it has priority.
    if (Globals.metadata.supportsColor || IORegisters.LCDC & 0x01) {
        const tileBaseAddress = (IORegisters.LCDC & 0x10) ? 0x8000 : 0x8800;




        // Draw Window if enabled
        if (IORegisters.LCDC & 0x01) {

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
function updateLCDFlags() {
    /**
     * Changes the LCD mode and raises interrupt if that mode is selected in STAT
     * @param {number} mode 
     */
    function changeLCDMode(mode) {
        let mask = 0x00;
        switch (mode) {
            case 0x00:
                mask = 0x08;
                IORegisters.LCDSTAT &= ~0x03;
                break;
            case 0x01:
                mask = 0x10;
                IORegisters.LCDSTAT = (IORegisters.LCDSTAT & 0xFC) | 0x01;
                break;
            case 0x02:
                mask = 0x20;
                IORegisters.LCDSTAT = (IORegisters.LCDSTAT & 0xFC) | 0x02;
                break;
            case 0x03:
                mask = 0x40;
                IORegisters.LCDSTAT |= 0x03;
                break;
        }

        if (IORegisters.LCDSTAT & mask) {
            IORegisters.interruptFlag |= 0x02;
        }
    }

    let cycleDelta = Globals.cycleNumber - IOValues.LCDCycles;
    if (Globals.doubleSpeed) {
        cycleDelta /= 2;
    }

    if (IORegisters.LCDC & 0x80) { // Bit 7 means the LCD is enabled
        switch (IORegisters.LCDSTAT & 0x03) { // https://gbdev.io/pandocs/Rendering.html#ppu-modes
            case 0x0: // HBLANK - Waiting until the end of a scanline
                if (cycleDelta >= 36) {
                    IOValues.LCDCycles += Globals.doubleSpeed ? 72 : 36;
                    IORegisters.LY++;

                    // Set flags
                    if (IORegisters.LY == 144) { // Reached the end of the screen
                        IORegisters.interruptFlag |= 0x01; // Raise VBLANK interrupt
                        changeLCDMode(1);
                    }
                    else {
                        changeLCDMode(2);
                    }

                    // Set LYC == LY Bit
                    if (IORegisters.LY == IORegisters.LYC) {
                        IORegisters.LCDSTAT |= 0x04;

                        // Enable LCD Interrupt if mode LYC interrupt is selected
                        if (IORegisters.LCDSTAT & 0x40) {
                            IORegisters.interruptFlag |= 0x02;
                        }
                    }
                    else {
                        IORegisters.LCDSTAT &= 0xFB;
                    }
                }
                break;
            case 0x1: // VBLANK - Waiting until the next frame
                if (cycleDelta >= 114) {
                    IOValues.LCDCycles += Globals.doubleSpeed ? 228 : 114;

                    IORegisters.LY++;
                    if (IORegisters.LY == 154) { // Reached the end of VBLANK
                        IORegisters.LY = 0;
                        changeLCDMode(2);
                    }

                    // Set LYC == LY Bit
                    if (IORegisters.LY == IORegisters.LYC) {
                        IORegisters.LCDSTAT |= 0x04;

                        // Enable LCD Interrupt if mode LYC interrupt is selected
                        if (IORegisters.LCDSTAT & 0x40) {
                            IORegisters.interruptFlag |= 0x02;
                        }
                    }
                    else {
                        IORegisters.LCDSTAT &= 0xFB;
                    }
                }
                break;
            case 0x2: // Search OAM and Draw a line
                if (cycleDelta >= 20) {
                    IOValues.LCDCycles += Globals.doubleSpeed ? 40 : 20;
                    IORegisters.LCDSTAT++; // Go to state 3
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

/**
 */
function doLCDDraw() {

}

/////////////////////// Timer Stuff ///////////////////////

function doTimerUpdate() {
    IORegisters.divider = Globals.cycleNumber & 0xFF;

}

/////////////////////// Interrupts ///////////////////////

function handleInterrupts() {
    const interruptsToHandle = Globals.IE & IORegisters.interruptFlag;
    if (Globals.IME && interruptsToHandle) {
        doPush(Registers.PC);

        if (Globals.halted) {
            Globals.halted = false;
        }

        // Moves program counter to various interrupt handlers
        if (interruptsToHandle & 0x01) { // VBLANK
            Registers.PC = 0x40;
            IORegisters.interruptFlag &= ~0x01;
        }
        else if (interruptsToHandle & 0x02) { // LCD STAT
            Registers.PC = 0x48;
            IORegisters.interruptFlag &= ~0x02;
        }
        else if (interruptsToHandle & 0x04) { // Timer
            Registers.PC = 0x50;
            IORegisters.interruptFlag &= ~0x04;
        }
        else if (interruptsToHandle & 0x08) { // Serial
            Registers.PC = 0x58;
            IORegisters.interruptFlag &= ~0x08;
        }
        else if (interruptsToHandle & 0x10) { // Joypad
            Registers.PC = 0x60;
            IORegisters.interruptFlag &= ~0x10;
        }
        Globals.IME = false;
        Globals.cycleNumber += 2;
    }
}