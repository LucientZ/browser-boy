/**
 * Registers in the MBC chip
 * @typedef MBCRegisters
 * @prop {number}            RAMEnable         If truthy, the *cartridge* ram is enabled. Else, it is disabled (Should return 0xFF and ignore writes)
 * @prop {number}            ROMBankNumber     Says which ROM bank is selected that the program can access
 * @prop {number}            RAMBankNumber     Says which *cartridge* RAM bank is selected that the program can access
 * @prop {number}            WRAMBankNumber    Says which *device* RAM bank is selected that the program can access
 * @prop {number}            bankingModeSelect Says what banking mode is selected for MBC1 (See MBC1 specs for details)
 * @prop {Uint8Array | null} builtInRAM        Array used for MBC2 built in RAM
 * @prop {Uint8Array}        latchClockData    RTC hardware latch
 */
/** @type {MBCRegisters} */
const MBCRegisters = {
    RAMEnable: 0x00,
    ROMBankNumber: 0x01,
    RAMBankNumber: 0x00,
    WRAMBankNumber: 0x01,
    bankingModeSelect: 0x00,
    builtInRAM: null, // Initializes on start if this is an MBC2 cartridge
    latchClockData: 0x00,
}

/**
 * Registers for a real time clock if it exists
 * @typedef RTCRegisters
 * @prop {number} seconds Seconds since "RTC epoch"
 * @prop {number} minutes Minutes since "RTC epoch"
 * @prop {number} hours   Hours since "RTC epoch"
 * @prop {number} DL      Day Low: Lower 8 bits of day counter
 * @prop {number} DH      Day High: Upper 1 bit of day counter
 */
/** @type {RTCRegisters} */
const RTCRegisters = {
    seconds: 0x00,
    minutes: 0x00,
    hours: 0x00,
    DL: 0x00,
    DH: 0x00,
}

/**
 * Registers in HRAM (Named to make things easier)
 * @typedef IORegisters
 * @prop {number} joypad                 Joypad input
 * @prop {number} serialData             Most recent byte in/out of the serial bus
 * @prop {number} serialControl          Serial bus control
 * @prop {number} divider                Increases every clock cycle
 * @prop {number} timerCounter           Timer value
 * @prop {number} timerModulo            Value counter overflows to
 * @prop {number} timerControl           Controls whether the timer is enabled and how it works
 * @prop {number} IF                     Interrupt flags. Used to state which interrupts are being requested
 * @prop {number} LCDC                   Flags for the LCD display 
 * @prop {number} LY                     Current line the gameboy is drawing
 * @prop {number} LYC                    LY compare register. Used for special interrupts
 * @prop {number} STAT                   State of the LCD display
 * @prop {number} SCY                    Screen y-coordinate (used for background)
 * @prop {number} SCX                    Screen x-coordinate (used for background)
 * @prop {number} WY                     Window y-coordinate
 * @prop {number} WX                     Window x-coordinate
 * @prop {number} backgroundPalette      (DMG only) States the palette for the Gameboy
 * @prop {number} OBP0                   (DMG only) Object palette 0 
 * @prop {number} OBP1                   (DMG only) Object palette 1
 * @prop {number} backgroundPaletteIndex (GBC only) States which background palette is selected for the background on the Gameboy Color
 * @prop {number} spritePaletteIndex     (GBC only) States the currently selected sprite palette
 * @prop {number} VRAMBankNumber         (GBC only) Selected VRAM bank
 * @prop {number} bootROMDisabled        States whether the boot ROM is disabled
 */
/** @type {IORegisters} */
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
    backgroundPalette: 0x00, // Used for DMG
    OBP0: 0x00, // OBJ palette 0
    OBP1: 0x00, // OBJ palette 0
    backgroundPaletteIndex: 0x00, // Used for GBC
    spritePaletteIndex: 0x00, // Used for GBC
    VRAMBankNumber: 0x00,
    bootROMDisabled: 0x01,
}

/**
 * Values that are useful to track, but aren't actual registers
 * @typedef IOValues
 * @prop {Uint16Array}         videoBuffer         Array used to store colors to be flushed to the screen
 * @prop {number}              defaultColorPalette The default color palette for a gameboy
 * @prop {number}              LCDCycles           How many cycles the LCD display has gone through
 * @prop {number}              timerCycles         How many cycles the timer has gone through
 * @prop {number}              DMATransferCycles   How many cycles the DMA transfer has gone through
 * @prop {number}              HDMATransferCycles  How many cycles the HDMA transfer has gone through
 * @prop {number}              HDMASource          Address for where the HDMA transfer is copying data *from*
 * @prop {number}              HDMADestination     Address for where the HDMA transfer is copying data *to*
 * @prop {boolean}             HDMAInProgress      States whether or not an HDMA transfer is currently in progress
 * @prop {boolean}             upPressed           Up button is currently pressed
 * @prop {boolean}             downPressed         Down button is currently pressed
 * @prop {boolean}             leftPressed         Left button is currently pressed
 * @prop {boolean}             rightPressed        Right button is currently pressed
 * @prop {boolean}             aButtonPressed      A button is currently pressed
 * @prop {boolean}             bButtonPressed      B button is currently pressed
 * @prop {boolean}             startPressed        Start button is currently pressed
 * @prop {boolean}             selectPressed       Select button is currently pressed
 * @prop {AudioContext | null} audioCtx            Used for audio playback. Must be created via user input because of security reasons :P
 */
/** @type {IOValues} */
const IOValues = {
    videoBuffer: new Uint16Array(144 * 160),
    defaultColorPalette: [0x7fff, 0x5ad6, 0x39ce, 0x0000], // Default color palette of the gameboy (DMG)
    LCDCycles: 0x00,
    timerCycles: 0x00,
    DMATransferCycles: 0x00,
    HDMATransferCycles: 0x00,
    HDMASource: 0x00,
    HDMADestination: 0x00,
    HDMAInProgress: false,
    upPressed: false,
    downPressed: false,
    leftPressed: false,
    rightPressed: false,
    aButtonPressed: false,
    bButtonPressed: false,
    startPressed: false,
    selectPressed: false,
    audioCtx: null, // Must be enabled by user
}

Object.preventExtensions(MBCRegisters);
Object.preventExtensions(RTCRegisters);
Object.preventExtensions(IORegisters);
Object.preventExtensions(IOValues);

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
            IOValues.DMATransferCycles = Globals.cycleNumber;
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
            return IORegisters.VRAMBankNumber & 0x01;
        case 0x50:
            return IORegisters.bootROMDisabled;
        case 0x55:
            return ((!IOValues.HDMAInProgress) << 7) | (Globals.HRAM[0x55] & 0x7F);
        case 0x68:
            return IORegisters.backgroundPaletteIndex;
        case 0x69:
            return Globals.BGCRAM[IORegisters.backgroundPaletteIndex & 0x3f];
        case 0x6A:
            return IORegisters.spritePaletteIndex;
        case 0x6B:
            return Globals.OBJCRAM[IORegisters.spritePaletteIndex & 0x3f];
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
 * https://gbdev.io/pandocs/Memory_Map.html#io-ranges
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
        case 0x14:
            if (audioChannels[0].currentWave && (val & 0x80)) {
                audioChannels[0].currentWave.stop();
                audioChannels[0].enabled = false;
            }
            break;
        case 0x19:
            if (audioChannels[1].currentWave && (val & 0x80)) {
                audioChannels[1].currentWave.stop();
                audioChannels[1].enabled = false;
            }
            break;
        case 0x0F:
            IORegisters.IF = val;
            return;
        case 0x14:
            if (audioChannels[0].currentWave && (val & 0x80)) {
                audioChannels[0].currentWave.stop();
                audioChannels[0].enabled = false;
            }
            break;
        case 0x19:
            if (audioChannels[1].currentWave && (val & 0x80)) {
                audioChannels[1].currentWave.stop();
                audioChannels[1].enabled = false;
            }
            break;
        case 0x1A:
            if (audioChannels[2].currentWave && !(val & 0x80)) {
                audioChannels[2].currentWave.stop();
                audioChannels[2].enabled = false;
            }
            break;
        case 0x1E:
            if (audioChannels[2].currentWave && (val & 0x80)) {
                audioChannels[2].currentWave.stop();
                audioChannels[2].enabled = false;
            }
            break;
        case 0x23:
            if (audioChannels[3].currentWave && (val & 0x80)) {
                audioChannels[3].currentWave.stop();
                audioChannels[3].enabled = false;
            }
            break;
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
            if (Globals.metadata.supportsColor) {
                if (!(val & 0x80) && IOValues.HDMAInProgress) { // Cancel HBLANK transfer
                    IOValues.HDMAInProgress = false;
                    Globals.HRAM[0x55] = 0x80 | (Globals.HRAM[0x55] & 0x7F);
                    return;
                }
                else {
                    IOValues.HDMAInProgress = true;
                    IOValues.HDMASource = ((Globals.HRAM[0x51] << 8) | (Globals.HRAM[0x52] & 0xF0));
                    IOValues.HDMADestination = ((((Globals.HRAM[0x53] & 0x1F) << 8) | (Globals.HRAM[0x54] & 0xF0))) | 0x8000;
                    Globals.HRAM[0x55] = val;
                }
            }
            return;
        case 0x68:
            IORegisters.backgroundPaletteIndex = val;
            return;
        case 0x69:
            Globals.BGCRAM[IORegisters.backgroundPaletteIndex & 0x3f] = val;
            if (IORegisters.backgroundPaletteIndex & 0x80) {
                IORegisters.backgroundPaletteIndex = 0x80 | ((IORegisters.backgroundPaletteIndex + 1) & 0x3f);
            }
            return;
        case 0x6A:
            IORegisters.spritePaletteIndex = val;
            return;
        case 0x6B:
            Globals.OBJCRAM[IORegisters.spritePaletteIndex & 0x3f] = val;
            if (IORegisters.spritePaletteIndex & 0x80) {
                IORegisters.spritePaletteIndex = 0x80 | ((IORegisters.spritePaletteIndex + 1) & 0x3f);
            }
            return;
        case 0x70:
            MBCRegisters.WRAMBankNumber = val & 0x07;
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
 * https://gbdev.io/pandocs/Memory_Map.html
 * @param {number} addr 
 * @returns {number} Value at given address
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
    else if (addr >= 0xC000 && addr <= 0xCFFF || addr >= 0xE000 && addr <= 0xEFFF) {
        return Globals.RAM[addr - 0xC000];
    }
    else if (addr >= 0xD000 && addr <= 0xDFFF || addr >= 0xF000 && addr <= 0xFDFF) {
        if (MBCRegisters === 0) {
            return Globals.RAM[(addr - 0xD000) + 4 * BYTE_VALUES.KiB];
        }
        return Globals.RAM[(addr - 0xD000) + MBCRegisters.WRAMBankNumber * 4 * BYTE_VALUES.KiB];
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
 * https://gbdev.io/pandocs/Memory_Map.html
 * @param {number} addr 
 * @param {number} val
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
    else if (addr >= 0xC000 && addr <= 0xCFFF || addr >= 0xE000 && addr <= 0xEFFF) {
        Globals.RAM[addr - 0xC000] = val;
        return;
    }
    else if (addr >= 0xD000 && addr <= 0xDFFF || addr >= 0xF000 && addr <= 0xFDFF) {
        if (MBCRegisters === 0) {
            Globals.RAM[(addr - 0xD000) + 4 * BYTE_VALUES.KiB] = val;
            return;
        }
        Globals.RAM[(addr - 0xD000) + MBCRegisters.WRAMBankNumber * 4 * BYTE_VALUES.KiB] = val;
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
 * https://gbdev.io/pandocs/nombc.html
 * @param {number} addr 
 * @returns {number} Value at given address
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
 * https://gbdev.io/pandocs/nombc.html
 * @param {number} addr 
 * @param {number} val 
 */
function writeMBCNone(addr, val) {
    if (addr >= 0xA000 && addr <= 0xBFFF) {
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
 * @returns {number} Banking mode address
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
 * https://gbdev.io/pandocs/MBC1.html
 * @param {number} addr 
 * @returns {number} Value at given address
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
 * https://gbdev.io/pandocs/MBC1.html
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
 * https://gbdev.io/pandocs/MBC2.html
 * @param {number} addr 
 * @returns {number} Value at given address
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

/**
 * https://gbdev.io/pandocs/MBC2.html
 * @param {number} addr 
 * @param {number} val 
 */
function writeMBC2(addr, val) {
    if (addr <= 0x3FFF) {
        if (addr & 0x100) {
            MBCRegisters.ROMBankNumber = (val & 0x0F) || 1;
            return;
        }
        else {
            if (val === 0x0A) {
                MBCRegisters.RAMEnable = 1;
            }
            else {
                MBCRegisters.RAMEnable = 0;
            }
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

/**
 * https://gbdev.io/pandocs/MBC3.html
 * @param {number} addr 
 * @returns {number} Value at given address
 */
function readMBC3(addr) {
    if (addr <= 0x3FFF) {
        return Globals.ROM[addr];
    }
    else if (addr <= 0x7FFF) {
        return Globals.ROM[(addr - 0x4000) + MBCRegisters.ROMBankNumber * 16 * BYTE_VALUES.KiB];
    }
    else if (addr >= 0xA000 && addr <= 0xBFFF) {
        // MBC 3 will read/write to the real time clock if selecting a ram bank higher than 7
        if (!MBCRegisters.RAMEnable) {
            return 0xFF;
        }
        if (MBCRegisters.RAMBankNumber <= 0x07) {
            return Globals.cartridgeRAM[(addr - 0xA000) + MBCRegisters.RAMBankNumber * 8 * BYTE_VALUES.KiB];
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

/**
 * https://gbdev.io/pandocs/MBC3.html
 * @param {number} addr 
 * @param {number} val 
 */
function writeMBC3(addr, val) {
    if (addr <= 0x1FFF) {
        if (val === 0x00) {
            MBCRegisters.RAMEnable = 0;
        }
        else if (val === 0x0A) {
            MBCRegisters.RAMEnable = 1;
        }
    }
    else if (addr <= 0x3FFF) {
        MBCRegisters.ROMBankNumber = val & 0x7F;
    }
    else if (addr <= 0x5FFF) {
        MBCRegisters.RAMBankNumber = val;
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
    }
    else if (addr <= 0x9FFF) {
        generalWrite(addr, val);
    }
    else if (addr <= 0xBFFF) {
        if (!MBCRegisters.RAMEnable) {
            return;
        }

        // MBC 3 will read/write to the real time clock if selecting a ram bank higher than 7
        if (MBCRegisters.RAMBankNumber <= 0x07) {
            Globals.cartridgeRAM[(addr - 0xA000) + MBCRegisters.RAMBankNumber * 8 * BYTE_VALUES.KiB] = val;
        }
        else {
            switch (MBCRegisters.RAMBankNumber) {
                case 0x08: RTCRegisters.seconds = val; break;
                case 0x09: RTCRegisters.minutes = val; break;
                case 0x0A: RTCRegisters.hours = val; break;
                case 0x0B: RTCRegisters.DL = val; break;
                case 0x0C: RTCRegisters.DH = val; break;
            }
        }
    }
    else {
        generalWrite(addr, val);
    }
}

//// MBC 5 ////

/**
 * https://gbdev.io/pandocs/MBC5.html
 * @param {number} addr 
 * @returns {number}
 */
function readMBC5(addr) {
    if (addr <= 0x3FFF) {
        return Globals.ROM[addr];
    }
    else if (addr <= 0x7FFF) {
        // ROM bank 0 is actually 0 now
        return Globals.ROM[(addr - 0x4000) + MBCRegisters.ROMBankNumber * 16 * BYTE_VALUES.KiB];
    }
    else if (addr >= 0xA000 && addr <= 0xBFFF) {
        if (!MBCRegisters.RAMEnable) {
            return 0xFF;
        }

        // Bit 3 is hooked up to the rumble motor if the cartridge uses rumble
        let bankSelected = Globals.metadata.supportsRumble ? MBCRegisters.RAMBankNumber & 0xF7 : MBCRegisters.RAMBankNumber;
        return Globals.cartridgeRAM[(addr - 0xA000) + bankSelected * 8 * BYTE_VALUES.KiB];
    }

    return generalRead(addr);
}

/**
 * https://gbdev.io/pandocs/MBC5.html
 * @param {number} addr 
 * @param {number} val 
 */
function writeMBC5(addr, val) {
    if (addr <= 0x1FFF) {
        if (val & 0x0A) {
            MBCRegisters.RAMEnable = 1;
        }
        else if (val === 0) {
            MBCRegisters.RAMEnable = 0;
        }
    }
    else if (addr <= 0x2FFF) {
        MBCRegisters.ROMBankNumber = (MBCRegisters.ROMBankNumber & 0x100) | val;
    }
    else if (addr <= 0x3FFF) {
        MBCRegisters.ROMBankNumber = (MBCRegisters.ROMBankNumber & 0x0FF) | ((val & 0x01) << 8);
    }
    else if (addr <= 0x5FFF) {
        MBCRegisters.RAMBankNumber = val;
    }
    else if (addr >= 0xA000 && addr <= 0xBFFF) {
        if (!MBCRegisters.RAMEnable) {
            return 0xFF;
        }

        let bankSelected = Globals.metadata.supportsRumble ? MBCRegisters.RAMBankNumber & 0xF7 : MBCRegisters.RAMBankNumber;
        Globals.cartridgeRAM[(addr - 0xA000) + bankSelected * 8 * BYTE_VALUES.KiB] = val;
    }
    else {
        generalWrite(addr, val);
    }


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
        case "MBC5":
            return readMBC5(addr);
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
        case "MBC5":
            writeMBC5(addr, val);
            break;
        default:
            throw new Error(`${Globals.MBC} not supported`);
    }
}