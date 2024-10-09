/**
 * Registers in the MBC chip
 */
const MBCRegisters = {
    RAMEnable: 0x00,
    ROMBankNumber: 0x01,
    RAMBankNumber: 0x00,
    WRAMBankNumber: 0x01,
    bankingModeSelect: 0x00,
    RTC: 0x00,
    builtInRAM: null, // Initializes on start if this is an MBC2 cartridge
    latchClockData: 0x00,
}

/**
 * Registers for a real time clock if it exists
 */
const RTCRegisters = {
    seconds: 0x00,
    minutes: 0x00,
    hours: 0x00,
    DL: 0x00, // Lower 8 bits of day counter
    DH: 0x00, // Upper 1 bit of day counter
}

/**
 * Registers in HRAM (Named to make things easier)
 */
const IORegisters = {
    joypad: 0x00,
    serialData: 0x00,
    serialControl: 0x00,
    divider: 0x00,
    timerCounter: 0x00,
    timerModulo: 0x00,
    timerControl: 0x00,
    IF: 0xE0, // Interrupt flag
    LCDC: 0x80, // LCD Control
    LY: 0x00, // LCD Y-coordinate
    LYC: 0x00, // LY Compare
    STAT: 0x00, // LCD status
    SCY: 0x00, // Background viewport Y
    SCX: 0x00, // Background viewport X
    WY: 0x00, // Window Y position
    WX: 0x00, // Window X position
    backgroundPalette: 0x00,
    OBP0: 0x00, // OBJ palette 0
    OBP1: 0x00, // OBJ palette 0
    VRAMBankNumber: 0x00,
    bootROMDisabled: 0x00,
}

/**
 * Values that are useful to track, but aren't actual registers
 */
const IOValues = {
    LCDCycles: 0x00,
    videoBuffer: new Uint16Array(144 * 160),
    defaultColorPalette: [0x7fff, 0x5ad6, 0x39ce, 0x0000], // Default color palette of the gameboy (DMG)
    timerCycles: 0x00,
    transferCycles: 0x00,
    HDMATransferRequested: false,
    upPressed: false,
    downPressed: false,
    leftPressed: false,
    rightPressed: false,
    aButtonPressed: false,
    bButtonPressed: false,
    startPressed: false,
    selectPressed: false,
}

//// IO read/write ops ////

/**
 * https://gbdev.io/pandocs/Memory_Map.html
 * @param {number} addr 
 */
function readIO(addr) {
    addr &= 0xFF;

    let temp = 0x0F;

    switch (addr) {
        case 0x00: // Joypad
            if ((!(IORegisters.joypad & 0x20) && IOValues.aButtonPressed) || (!(IORegisters.joypad & 0x10) && IOValues.rightPressed)) {
                temp &= ~0x01;
            }
            if ((!(IORegisters.joypad & 0x20) && IOValues.bButtonPressed) || (!(IORegisters.joypad & 0x10) && IOValues.leftPressed)) {
                temp &= ~0x02;
            }
            if ((!(IORegisters.joypad & 0x20) && IOValues.selectPressed) || (!(IORegisters.joypad & 0x10) && IOValues.upPressed)) {
                temp &= ~0x04;
            }
            if ((!(IORegisters.joypad & 0x20) && IOValues.startPressed) || (!(IORegisters.joypad & 0x10) && IOValues.downPressed)) {
                temp &= ~0x08;
            }
            return IORegisters.joypad | temp;
        case 0x01:
            return IORegisters.serialData;
        case 0x02:
            return IORegisters.serialControl;
        case 0x04:
            return IORegisters.divider;
        case 0x05:
            return IORegisters.timerCounter;
        case 0x06:
            return IORegisters.timerModulo;
        case 0x07:
            return IORegisters.timerControl;
        case 0x0F:
            return IORegisters.IF;
        case 0x40:
            return IORegisters.LCDC;
        case 0x41:
            return IORegisters.STAT;
        case 0x42:
            return IORegisters.SCY;
        case 0x43:
            return IORegisters.SCX;
        case 0x44:
            return IORegisters.LY;
        case 0x45:
            return IORegisters.LYC;
        case 0x46:
            IOValues.transferCycles = Globals.cycleNumber;
            break;
        case 0x47:
            return IORegisters.backgroundPalette;
        case 0x48:
            return IORegisters.OBP0;
        case 0x49:
            return IORegisters.OBP1;
        case 0x4A:
            return IORegisters.WY;
        case 0x4B:
            return IORegisters.WX;
        case 0x4F:
            return IORegisters.VRAMBankNumber;
        case 0x50:
            return IORegisters.bootROMDisabled;
        case 0x70:
            return MBCRegisters.WRAMBankNumber;
        case 0xFF:
            return Globals.IE;
    }

    // 0x10-0x26: Audio
    // 0x30-0x3F: Wave pattern
    // 0x51-0x55: VRAM DMA
    // 0x68-0x6B: BG/OBJ Palettes
    return Globals.HRAM[addr];
}

/**
 * 
 * @param {number} addr 
 * @param {number} val 
 */
function writeIO(addr, val) {
    addr &= 0xFF;

    switch (addr) {
        case 0x00: // Joypad
            IORegisters.joypad = val & 0xF0;
            return;
        case 0x01:
            IORegisters.serialData = val;
            Globals.serialOutput += String.fromCharCode(val);
            document.getElementById("serial-output").innerText = Globals.serialOutput;
            return;
        case 0x02:
            IORegisters.serialControl = val;
            return;
        case 0x04:
            IORegisters.divider = 0x00;
            return;
        case 0x05:
            IORegisters.timerCounter = val;
            return;
        case 0x06:
            IORegisters.timerModulo = val;
            return;
        case 0x07:
            IORegisters.timerControl = val;
            return;
        case 0x0F:
            IORegisters.IF = val;
            return;
        case 0x40:
            // Reset LY to 0 when lcd is turned off
            if (IORegisters.LCDC & 0x80 && !(val & 0x80)) {
                IORegisters.LY = 0;
            }
            IORegisters.LCDC = val;
            return;
        case 0x41:
            IORegisters.STAT = val;
            return;
        case 0x42:
            IORegisters.SCY = val;
            return;
        case 0x43:
            IORegisters.SCX = val;
            return;
        case 0x44:
            IORegisters.LY = val;
            return;
        case 0x45:
            IORegisters.LYC = val;
            return;
        case 0x47:
            IORegisters.backgroundPalette = val;
            return;
        case 0x48:
            IORegisters.OBP0 = val;
            return;
        case 0x49:
            IORegisters.OBP1 = val;
            return;
        case 0x4A:
            IORegisters.WY = val;
            return;
        case 0x4B:
            IORegisters.WX = val;
            return;
        case 0x4F:
            IORegisters.VRAMBankNumber = val;
            return;
        case 0x50:
            IORegisters.bootROMDisabled = val;
            return;
        case 0x55:
            IOValues.HDMATransferRequested = true;
            break;
        case 0x70:
            MBCRegisters.WRAMBankNumber = val;
            return;
        case 0xFF:
            Globals.IE = val;
            return;
    }

    // 0x10-0x26: Audio
    // 0x30-0x3F: Wave pattern
    // 0x51-0x55: VRAM DMA
    // 0x68-0x6B: BG/OBJ Palettes
    Globals.HRAM[addr] = val;
}

//// Generic read/write ops ////

/**
 * 
 * @param {number} addr 
 */
function generalRead(addr) {
    if (addr >= 0x8000 && addr <= 0x9FFF) {
        if (IORegisters.VRAMBankNumber === 0 || !Globals.metadata.supportsColor) {
            return Globals.VRAM0[addr - 0x8000];
        }
        else {
            return Globals.VRAM1[addr - 0x8000];
        }
    }
    else if (addr >= 0xC000 && addr <= 0xCFFF) {
        return Globals.RAM[addr - 0xC000];
    }
    else if (addr >= 0xD000 && addr <= 0xDFFF) {
        return Globals.RAM[(addr - 0xD000) + MBCRegisters.WRAMBankNumber * 4 * BYTE_VALUES.KiB];
    }
    else if (addr >= 0xE000 && addr <= 0xEFFF) {
        // Echo RAM
        return Globals.RAM[addr - 0xE000];
    }
    else if (addr >= 0xF000 && addr <= 0xFDFF) {
        // Echo RAM
        return Globals.RAM[(addr - 0xF000) + MBCRegisters.WRAMBankNumber * 4 * BYTE_VALUES.KiB];
    }
    else if (addr >= 0xFE00 && addr <= 0xFE9F) {
        return Globals.OAM[addr - 0xFE00];
    }
    else if (addr >= 0xFEA0 && addr <= 0xFEFF) {
        return 0xFF;
    }

    throw new Error(`Invalid read at 0x${addr.toString(16)}`);
}

/**
 * 
 * @param {number} addr 
 * @param {number} val
 * @returns {number} 
 */
function generalWrite(addr, val) {
    if (addr >= 0x8000 && addr <= 0x9FFF) {
        if (IORegisters.VRAMBankNumber === 0 || !Globals.metadata.supportsColor) {
            Globals.VRAM0[addr - 0x8000] = val;
            return;
        }
        else {
            Globals.VRAM1[addr - 0x8000] = val;
            return;
        }
    }
    else if (addr >= 0xC000 && addr <= 0xCFFF) {
        Globals.RAM[addr - 0xC000] = val;
        return;
    }
    else if (addr >= 0xD000 && addr <= 0xDFFF) {
        Globals.RAM[(addr - 0xD000) + MBCRegisters.WRAMBankNumber * 4 * BYTE_VALUES.KiB] = val;
        return;
    }
    else if (addr >= 0xE000 && addr <= 0xEFFF) {
        // Echo RAM
        Globals.RAM[addr - 0xE000] = val;
        return;
    }
    else if (addr >= 0xF000 && addr <= 0xFDFF) {
        // Echo RAM
        Globals.RAM[(addr - 0xF000) + MBCRegisters.WRAMBankNumber * 4 * BYTE_VALUES.KiB] = val;
        return;
    }
    else if (addr >= 0xFE00 && addr <= 0xFE9F) {
        Globals.OAM[addr - 0xFE00] = val;
        return;
    }
    else if (addr >= 0xFEA0 && addr <= 0xFEFF) {
        return;
    }

    throw new Error(`Invalid write at 0x${addr.toString(16)}`);
}

//// No MBC ////

/**
 * 
 * @param {number} addr 
 * @returns {number} value at address
*/
function readMBCNone(addr) {
    if (addr <= 0x7FFF) {
        return Globals.ROM[addr];
    }
    else if (addr <= 0xBFFF) {
        if (!Globals.cartridgeRAM) {
            return 0xFF;
        }
        return Globals.cartridgeRAM[addr];
    }

    return generalRead(addr);
}

/**
 * 
 * @param {number} addr 
 * @param {number} val 
 */
function writeMBCNone(addr, val) {
    if (addr <= 0x7FFF) {
        Globals.ROM[addr] = val;
    }
    else if (addr >= 0xA000 && addr <= 0xBFFF) {
        if (Globals.cartridgeRAM) {
            Globals.cartridgeRAM[addr] = val;
        }
    }
    else {
        generalWrite(addr, val);
    }
}

//// MBC1 ////

/**
 * If the banking mode is 1, translate the address
 * https://gbdev.io/pandocs/MBC1.html#addressing-diagrams
 * @param {number} addr 
 * @returns Banking mode address
 */
function getMBC1BankingModeAddress(addr) {
    if (MBCRegisters.bankingModeSelect === 0x01) {
        if (addr <= 0x3FFF) {
            addr = addr | (MBCRegisters.RAMBankNumber << 19);
        }
        else if (addr <= 0x7FFF) {
            addr = addr | (MBCRegisters.RAMBankNumber << 19) | (MBCRegisters.ROMBankNumber << 14);
        }
        else if (addr >= 0xA000 && addr <= 0xBFFF) {
            addr = (addr & 0x1fff) | (MBCRegisters.RAMBankNumber << 13);
        }
    }
    return addr;
}

/**
 * 
 * @param {number} addr 
 * @returns {number}
 */
function readMBC1(addr) {
    addr = getMBC1BankingModeAddress(addr);

    if (addr <= 0x3FFF) {
        return Globals.ROM[addr];
    }
    else if (addr <= 0x7FFF) {
        // Treats bank 0 as bank 1
        if (MBCRegisters.ROMBankNumber === 0) {
            return Globals.ROM[(addr - 0x4000) + 16 * BYTE_VALUES.KiB];
        }
        else {
            return Globals.ROM[(addr - 0x4000) + (MBCRegisters.ROMBankNumber & 0x1F) * 16 * BYTE_VALUES.KiB];
        }
    }
    else if (addr >= 0xA000 && addr <= 0xBFFF) {
        if (!Globals.cartridgeRAM) {
            return 0xFF;
        }
        return Globals.cartridgeRAM[(addr - 0xA000) + MBCRegisters.RAMBankNumber * 8 * BYTE_VALUES.KiB];
    }

    return generalRead(addr);
}

/**
 * 
 * @param {number} addr 
 * @param {number} val 
 */
function writeMBC1(addr, val) {
    addr = getMBC1BankingModeAddress(addr);

    if (addr <= 0x1FFF) {
        MBCRegisters.RAMEnable = val;
    }
    else if (addr <= 0x3FFF) {
        MBCRegisters.ROMBankNumber = val & 0x1F;
    }
    else if (addr <= 0x5FFF) {
        MBCRegisters.RAMBankNumber = val & 0x03;
    }
    else if (addr <= 0x7FFF) {
        MBCRegisters.bankingModeSelect = val & 0x1;
    }
    else if (addr >= 0xA000 && addr <= 0xBFFF) {
        if (Globals.cartridgeRAM) {
            Globals.cartridgeRAM[(addr - 0xA000) + MBCRegisters.RAMBankNumber * 8 * BYTE_VALUES.KiB] = val;
        }
    }
    else {
        generalWrite(addr, val);
    }
}
//// MBC 2 ////

/**
 * 
 * @param {number} addr 
 * @returns {number} value at address
 */
function readMBC2(addr) {
    if (addr <= 0x3FFF) {
        return Globals.ROM[addr];
    }
    else if (addr <= 0x7FFF) {
        return Globals.ROM[(addr - 0x4000) + MBCRegisters.ROMBankNumber * 16 * BYTE_VALUES.KiB];
    }
    else if (addr >= 0xA000 && addr <= 0xA1FF) {
        // Built-in RAM
        // Only uses the lower 4 bits
        return MBCRegisters.builtInRAM[addr - 0xA000] & 0x0F;
    }
    else if (addr >= 0xA200 && addr <= 0xBFFF) {
        // Echo of previous block
        return MBCRegisters.builtInRAM[(addr - 0xA200) & 0x1FF] & 0x0F;
    }

    return generalRead(addr);
}

function writeMBC2(addr, val) {
    if (addr <= 0x3FFF) {
        if (addr & 0x80) {
            MBCRegisters.ROMBankNumber = val;
            return;
        }
        else {
            MBCRegisters.RAMEnable = val;
            return;
        }
    }
    else if (addr >= 0xA000 && addr <= 0xA1FF) {
        // Built-in RAM
        // Only uses the lower 4 bits
        return MBCRegisters.builtInRAM[addr - 0xA000] = val & 0x0F;
    }
    else if (addr >= 0xA200 && addr <= 0xBFFF) {
        // Echo of previous block
        return MBCRegisters.builtInRAM[(addr - 0xA200) & 0x1FF] = val & 0x0F;
    }
    generalWrite(addr, val);
}

//// MBC 3 ////

function readMBC3(addr) {
    if (addr <= 0x3FFF) {
        return Globals.ROM[addr];
    }
    else if (addr <= 0x7FFF) {
        return Globals.ROM[(addr - 0x4000) + MBCRegisters.ROMBankNumber * 16 * BYTE_VALUES.KiB];
    }
    else if (addr >= 0xA000 && addr <= 0xBFFF) {
        // MBC 3 will read/write to the real time clock if selecting a ram bank higher than 7
        if (MBCRegisters.RAMBankNumber <= 0x07) {
            // Treats bank 0 as bank 1
            if (MBCRegisters.RAMBankNumber == 0) {
                return Globals.cartridgeRAM[(addr - 0xA000) + 8 * BYTE_VALUES.KiB];
            }
            else {
                return Globals.cartridgeRAM[(addr - 0xA000) + MBCRegisters.ROMBankNumber * 8 * BYTE_VALUES.KiB];
            }
        }
        else {
            switch (MBCRegisters.RAMBankNumber) {
                case 0x08: return RTCRegisters.seconds;
                case 0x09: return RTCRegisters.minutes;
                case 0x0A: return RTCRegisters.hours;
                case 0x0B: return RTCRegisters.DL;
                case 0x0C: return RTCRegisters.DH;
            }
        }
    }

    return generalRead(addr);
}

function writeMBC3(addr, val) {
    if (addr <= 0x1FFF) {
        MBCRegisters.RAMEnable = val;
        return;
    }
    else if (addr <= 0x3FFF) {
        MBCRegisters.ROMBankNumber = val;
        return;
    }
    else if (addr <= 0x5FFF) {
        MBCRegisters.RAMBankNumber = val;
        return;
    }
    else if (addr <= 0x7FFF) {
        // Latch Clock Data
        const currentTime = Date.now();
        if (MBCRegisters.latchClockData === 0x00 && val === 0x01) {
            RTCRegisters.seconds = Math.floor(currentTime / 1000) % 60;
            RTCRegisters.minutes = Math.floor(currentTime / 60_000) % 60;
            RTCRegisters.hours = Math.floor(currentTime / 3_600_000) % 60;
            const totalDays = Math.floor(currentTime / 86_400_000);
            RTCRegisters.DL = totalDays & 0xFF;
            RTCRegisters.DH = ((totalDays & 0x100) >> 8) | ((totalDays > 0x1FF) << 7) | (RTCRegisters.DH & 0x80);
        }
        MBCRegisters.latchClockData = val;
        return;
    }
    else if (addr <= 0x9FFF) {
        generalWrite(addr, val);
        return;
    }
    else if (addr <= 0xBFFF) {
        // MBC 3 will read/write to the real time clock if selecting a ram bank higher than 7
        if (MBCRegisters.RAMBankNumber <= 0x07) {
            // Treats bank 0 as bank 1
            if (MBCRegisters.RAMBankNumber == 0) {
                Globals.cartridgeRAM[(addr - 0xA000) + 8 * BYTE_VALUES.KiB] = val;
                return;
            }
            else {
                Globals.cartridgeRAM[(addr - 0xA000) + MBCRegisters.ROMBankNumber * 8 * BYTE_VALUES.KiB] = val;
                return;
            }
        }
        else {
            switch (MBCRegisters.RAMBankNumber) {
                case 0x08: RTCRegisters.seconds = val; break;
                case 0x09: RTCRegisters.minutes = val; break;
                case 0x0A: RTCRegisters.hours = val; break;
                case 0x0B: RTCRegisters.DL = val; break;
                case 0x0C: RTCRegisters.DH = val; break;
            }
            return;
        }
    }
    generalWrite(addr, val);
}

/**
 * https://gbdev.io/pandocs/Memory_Map.html#memory-map
 * @param {number} addr 
 */
function readMem(addr) {
    switch (Globals.MBC) {
        case null:
            return readMBCNone(addr);
        case "MBC1":
            return readMBC1(addr);
        case "MBC2":
            return readMBC2(addr);
        case "MBC3":
            return readMBC3(addr);
        default:
            throw new Error(`${Globals.MBC} not supported`);
    }
}

/**
 * 
 * @param {number} addr 
 * @param {number} val 
*/
function writeMem(addr, val) {
    switch (Globals.MBC) {
        case null:
            writeMBCNone(addr, val);
            break;
        case "MBC1":
            writeMBC1(addr, val);
            break;
        case "MBC2":
            writeMBC2(addr, val);
            break;
        case "MBC3":
            writeMBC3(addr, val);
            break;
        default:
            throw new Error(`${Globals.MBC} not supported`);
    }
}