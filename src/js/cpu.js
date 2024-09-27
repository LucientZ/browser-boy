/**
 * Registers in the CPU.
 * 
 * Note that in actual hardware, registers are 16-bit but split into "two" registers.
 * Normally, it would be:
 * - AF (Double)
 * - BC (Double)
 * - DE (Double)
 * - HL (Double)
 * - SP (Single)
 * - PC (Single)
 * 
 * https://gbdev.io/pandocs/Power_Up_Sequence.html#cpu-registers
 */
const Registers = {
    A: 0x11,
    Fz: 0x0, // Zero flag 
    Fn: 0x0, // Subtraction flag 
    Fh: 0x0, // Half Carry flag 
    Fc: 0x0, // Carry flag 
    B: 0x00,
    C: 0x00,
    D: 0x00,
    E: 0x08,
    H: 0x00,
    L: 0x00,
    SP: 0xFFFE, // Stack Pointer
    PC: 0x0100, // Program counter
}

/**
 * https://gbdev.io/pandocs/Memory_Map.html
 * @param {number} addr 
 */
function readIO(addr) {

    let val = 0;

    addr &= 0xFF;

    if (addr === 0x00) { // Joypad

    }
    else if (addr == 0x01 || addr == 0x02) { // Serial transfer

    }
    else if (addr >= 0x04 && addr <= 0x07) { // Timer and divider

    }
    else if (addr == 0x0F) { // Interrupts

    }
    else if (addr >= 0x10 && addr <= 0x26) { // Audio

    }
    else if (addr >= 0x30 && addr <= 0x3F) { // Wave pattern

    }
    else if (addr >= 0x40 && addr <= 0x4B) { // LCD, Status, Position, Scrolling, Pallettes

    }
    else if (addr == 0x4F) { // VRAM Bank Select

    }
    else if (addr == 0x50) { // Set to non-zero to disable boot ROM

    }
    else if (addr >= 0x51 & addr <= 0x55) { // VRAM DMA

    }
    else if (addr >= 0x68 && addr <= 0x6B) { // BG / OBJ Palettes 

    }
    else if (addr == 0xFF70) {

    }
    else {
        return Globals.RAM[addr];
    }
}

/**
 * 
 * @param {number} addr 
 * @param {number} val 
 */
function writeIO(addr, val) {

    addr &= 0xFF;

    if (addr === 0x00) { // Joypad

    }
    else if (addr == 0x01 || addr == 0x02) { // Serial transfer

    }
    else if (addr >= 0x04 && addr <= 0x07) { // Timer and divider

    }
    else if (addr == 0x0F) { // Interrupts

    }
    else if (addr >= 0x10 && addr <= 0x26) { // Audio

    }
    else if (addr >= 0x30 && addr <= 0x3F) { // Wave pattern

    }
    else if (addr >= 0x40 && addr <= 0x4B) { // LCD, Status, Position, Scrolling, Pallettes

    }
    else if (addr == 0x4F) { // VRAM Bank Select

    }
    else if (addr == 0x50) { // Set to non-zero to disable boot ROM

    }
    else if (addr >= 0x51 & addr <= 0x55) { // VRAM DMA

    }
    else if (addr >= 0x68 && addr <= 0x6B) { // BG / OBJ Palettes 

    }
    else if (addr == 0xFF70) {

    }
    else {

    }
}

/**
 * 
 * @param {number} addr 
 */
function gameboyRead(addr) {
    val = addr >= 0xFF00 ? readIO(addr) : readMem(addr);
    return val;
}

/**
 * 
 * @param {number} addr 
 * @param {number} val 
 */
function gameboyWrite(addr, val) {
    if (addr >= 0xFF00) {
        writeIO(addr, val);
    }
    else {
        writeMem(addr, val);
    }
}

/**
 * Converts two 8-bit registers to one 16 bit register
 * @param {number} high The higher bits  
 * @param {number} low  The lower bits
 */
function combineRegisters(high, low) {
    return ((high << 8) | low) & 0xFFFF;
}

/**
 * Converts one 16 bit registers to two 8-bit registers
 * @param {number} combined 
 */
function splitRegisters(combined) {
    high = (combined >> 8) & 0xFF;
    low = combined & 0xFF;

    return [high, low];
}

/**
 * Increments 8 bit value and sets appropriate flags.
 * @param {number} a 
 * @returns a + 1 mod 2^8
 */
function increment8Bit(a) {
    a = mod(a + 1, BYTE_VALUES.UINT_8_MAX + 1);
    Registers.Fz = !a;
    Registers.Fn = 0;
    Registers.Fh = !(a & 0x0F);
    return a;
}

/**
 * Increments 16 bit value and sets appropriate flags.
 * @param {number} a 
 * @returns a + 1 mod 2^16
 */
function increment16Bit(a) {
    a = mod(a + 1, BYTE_VALUES.UINT_16_MAX + 1);
    Registers.Fz = !a;
    Registers.Fn = 0;
    return a;
}

/**
 * Decrements 8 bit value and sets appropriate flags.
 * @param {number} a 
 * @returns a - 1 mod 2^16
 */
function decrement8Bit(a) {
    Registers.Fh = !(a & 0x0F);
    a = mod(a - 1, BYTE_VALUES.UINT_8_MAX + 1);
    Registers.Fn = 1;
    Registers.Fz = !a;
    return a;
}

/**
 * Decrements 16 bit value and sets appropriate flags.
 * @param {number} a 
 * @returns a - 1 mod 2^16
 */
function decrement16Bit(a) {
    a = mod(a - 1, BYTE_VALUES.UINT_16_MAX + 1);
    return a;
}

function add8Bit(a, b) {
    const result = mod(a + b, BYTE_VALUES.UINT_8_MAX + 1);
    return result;
}

function add16Bit(a, b) {
    const result = mod(a + b, BYTE_VALUES.UINT_16_MAX + 1);
    return result;
}

function subtract8Bit(a, b) {
    const result = mod(a + b, BYTE_VALUES.UINT_8_MAX + 1);
    return result;
}

function subtract16Bit(a, b) {
    const result = mod(a + b, BYTE_VALUES.UINT_16_MAX + 1);
    return result;
}

function signedRelativeJump() {
    const jumpValue = gameboyRead(Registers.PC++);
    if (jumpValue & 0x80) {
        jumpValue = mod(-jumpValue, Math.pow(2, 8));
        Registers.PC -= jumpValue;
    }
    else {
        Registers.PC += jumpValue;
    }
    Globals.cycleNumber += 3;
}

/**
 * https://meganesu.github.io/generate-gb-opcodes/
 * https://gbdev.io/gb-opcodes/optables/
 */
const opcodeTable8Bit = {
    0x00: () => { Globals.cycleNumber++; },
    0x01: () => {
        // BC = (PC)
        Registers.C = gameboyRead(Registers.PC++);
        Registers.B = gameboyRead(Registers.PC++);
        Globals.cycleNumber += 3;
    },
    0x02: () => {
        // (BC) <- A
        gameboyWrite(combineRegisters(Registers.B, Registers.C), Registers.A);
        Globals.cycleNumber += 2;
    },
    0x03: () => {
        // BC++
        value = increment16Bit(combineRegisters(Registers.B, Registers.C));
        [Registers.B, Registers.C] = splitRegisters(value);
        Globals.cycleNumber += 2;
    },
    0x04: () => {
        // B++
        Registers.B = increment8Bit(Registers.B);
        Globals.cycleNumber += 1;
    },
    0x05: () => {
        // B--
        Registers.B = decrement8Bit(Registers.B);
        Globals.cycleNumber += 1;
    },
    0x06: () => {
        // B <- d8 
        Registers.B = gameboyRead(Registers.PC++);
        Globals.cycleNumber += 2;
    },
    0x07: () => {
        // RLCA
        Registers.Fc = A >> 0x7;
        Registers.A = (A << 1) + Registers.Fc;
        Registers.Fz = 0;
        Registers.Fn = 0;
        Registers.Fh = 0;
        Globals.cycleNumber += 1;
    },
    0x08: () => {
        // (a16) <- SP
        address = gameboyRead(Registers.PC++) | (gameboyRead(Registers.PC++) << 8);
        gameboyWrite(address, Registers.SP & 0xFF);
        gameboyWrite(address + 1, Registers.SP >> 8);
        Globals.cycleNumber += 5;
    },
    0x09: () => {
        // HL += BC
        const HL = combineRegisters(Registers.H, Registers.L);
        const BC = combineRegisters(Registers.B, Registers.C);
        const result = add16Bit(HL, BC);
        [Registers.H, Registers.L] = splitRegisters(result);
        Globals.cycleNumber += 2;
    },
    0x0A: () => {
        // A <- (BC)
        Registers.A = gameboyRead(combineRegisters(Registers.B, Registers.C));
        Globals.cycleNumber += 1;
    },
    0x0B: () => {
        // BC--
        const BC = combineRegisters(Registers.B, Registers.C);
        [Registers.B, Registers.C] = splitRegisters(increment16Bit(BC));
        Globals.cycleNumber += 2;
    },
    0x0C: () => {
        // C++
        Registers.C = increment8Bit(Registers.C);
        Globals.cycleNumber += 1;
    },
    0x0D: () => {
        // C--
        Registers.C = decrement8Bit(Registers.C);
        Globals.cycleNumber += 1;
    },
    0x0E: () => {
        // C <- (PC)
        Registers.C = gameboyRead(Registers.PC++);
        Globals.cycleNumber += 2;
    },
    0x0F: () => {
        // RRCA
        Registers.Fc = Registers.A & 0x1;
        Registers.A = Registers.A >> 1;
        Registers.A += (Registers.Fc << 7);
        Registers.Fz = 0;
        Registers.Fn = 0;
        Registers.Fh = 0;
        Globals.cycleNumber += 1;
    },
    0x10: () => {
        // STOP
        if (gameboyRead(Globals.PC) !== undefined) {
            Globals.standby = true;
        }
        Globals.cycleNumber += 1;
    },
    0x11: () => {
        // DE = (PC)
        Registers.E = gameboyRead(Registers.PC++);
        Registers.D = gameboyRead(Registers.PC++);
        Globals.cycleNumber += 3;
    },
    0x12: () => {
        // (DE) <- A
        gameboyWrite(combineRegisters(Registers.D, Registers.E), Registers.A);
        Globals.cycleNumber += 2;
    },
    0x13: () => {
        // DE++
        value = increment16Bit(combineRegisters(Registers.D, Registers.E));
        [Registers.D, Registers.E] = splitRegisters(value);
        Globals.cycleNumber += 2;
    },
    0x14: () => {
        // D++
        Registers.D = increment8Bit(Registers.D);
        Globals.cycleNumber += 1;
    },
    0x15: () => {
        // D--
        Registers.D = decrement8Bit(Registers.D);
        Globals.cycleNumber += 1;
    },
    0x16: () => {
        // D <- d8 
        Registers.D = gameboyRead(Registers.PC++);
        Globals.cycleNumber += 2;
    },
    0x17: () => {
        // RLA
        const value = 2 * Registers.A + Registers.Fc;
        Registers.Fc = value >> 8;
        Registers.A = value;
        Registers.Fz = 0;
        Registers.Fn = 0;
        Registers.Fh = 0;
        Globals.cycleNumber += 1;
    },
    0x18: () => {
        // PC += (signed) (PC++)
        signedRelativeJump();
    },
    0x19: () => {
        // HL += DE
        const HL = combineRegisters(Registers.H, Registers.L);
        const DE = combineRegisters(Registers.D, Registers.E);
        const result = add16Bit(HL, DE);
        [Registers.H, Registers.L] = splitRegisters(result);
        Globals.cycleNumber += 2;
    },
    0x1A: () => {
        // A <- (DE)
        Registers.A = gameboyRead(combineRegisters(Registers.D, Registers.E));
        Globals.cycleNumber += 1;
    },
    0x1B: () => {
        // DE--
        const DE = combineRegisters(Registers.D, Registers.E);
        [Registers.D, Registers.E] = splitRegisters(increment16Bit(DE));
        Globals.cycleNumber += 2;
    },
    0x1C: () => {
        // E++
        Registers.E = increment8Bit(Registers.E);
        Globals.cycleNumber += 1;
    },
    0x1D: () => {
        // E--
        Registers.E = decrement8Bit(Registers.E);
        Globals.cycleNumber += 1;
    },
    0x1E: () => {
        // E <- (PC)
        Registers.E = gameboyRead(Registers.PC++);
        Globals.cycleNumber += 2;
    },
    0x1F: () => {
        // RRA
        const value = Registers.Fc;
        Registers.Fc = Registers.A & 0x1;
        Registers.A = Registers.A >> 1;
        Registers.A += value << 7;
        Registers.Fz = 0;
        Registers.Fn = 0;
        Registers.Fh = 0;
        Globals.cycleNumber += 1;
    },
    0x20: () => {
        // If last operation was zero
        // PC += (signed) (PC++)
        if (!Registers.Fz) {
            signedRelativeJump();
        }
        else {
            Registers.PC++;
            Globals.cycleNumber += 2;
        }
    },
    0x21: () => {
        // HL = (PC)
        Registers.L = gameboyRead(Registers.PC++);
        Registers.H = gameboyRead(Registers.PC++);
        Globals.cycleNumber += 3;
    },
    0x22: () => {
        // (HL) <- A
        gameboyWrite(combineRegisters(Registers.H, Registers.L), Registers.A);
        Globals.cycleNumber += 2;
    },
    0x23: () => {
        // HL++
        value = increment16Bit(combineRegisters(Registers.H, Registers.L));
        [Registers.H, Registers.L] = splitRegisters(value);
        Globals.cycleNumber += 2;
    },
    0x24: () => {
        // H++
        Registers.H = increment8Bit(Registers.H);
        Globals.cycleNumber += 1;
    },
    0x25: () => {
        // H--
        Registers.H = decrement8Bit(Registers.H);
        Globals.cycleNumber += 1;
    },
    0x26: () => {
        // H <- d8 
        Registers.H = gameboyRead(Registers.PC++);
        Globals.cycleNumber += 2;
    },
    0x27: () => {
        // DAA
        // https://blog.ollien.com/posts/gb-daa/

        let offset = 0;
        let A = Registers.A;

        if ((!Registers.Fn && A & 0xF > 0x09) || Registers.Fh) {
            offset |= 0x06;
        }

        if ((!Registers.Fn && A > 0x09) || Registers.Fc) {
            offset |= 0x06;
        }

        if (!Registers.Fn) {
            Registers.A = add8Bit(A, offset);
        }
        else {
            Registers.A = subtract8Bit(A, offset);
        }

        Registers.Fz = !Registers.A;
        Registers.Fh = Registers.A > 0x99;
        Registers.Fc = 0;
        Globals.cycleNumber += 1;
    },
    0x28: () => {
        // If last operation was not zero
        // PC += (signed) (PC++)
        if (Registers.Fz) {
            signedRelativeJump();
        }
        else {
            Registers.PC++;
            Globals.cycleNumber += 2;
        }
    },
    0x29: () => {
        // HL += HL
        const HL = combineRegisters(Registers.H, Registers.L);
        const result = add16Bit(HL, HL);
        [Registers.H, Registers.L] = splitRegisters(result);
        Globals.cycleNumber += 2;
    },
    0x2A: () => {
        // A <- (HL)
        Registers.A = gameboyRead(combineRegisters(Registers.H, Registers.L));
        Globals.cycleNumber += 1;
    },
    0x2B: () => {
        // HL--
        const HL = combineRegisters(Registers.H, Registers.L);
        [Registers.H, Registers.L] = splitRegisters(increment16Bit(HL));
        Globals.cycleNumber += 2;
    },
    0x2C: () => {
        // L++
        Registers.L = increment8Bit(Registers.L);
        Globals.cycleNumber += 1;
    },
    0x2D: () => {
        // L--
        Registers.L = decrement8Bit(Registers.L);
        Globals.cycleNumber += 1;
    },
    0x2E: () => {
        // L <- (PC)
        Registers.L = gameboyRead(Registers.PC++);
        Globals.cycleNumber += 2;
    },
    0x2F: () => {
        // A = ~A
        Registers.A ^= 0xFF;
        Registers.Fn = 1;
        Registers.Fh = 1;
        Globals.cycleNumber += 1;
    },
    0x30: () => {
        
    },
    0x31: () => {

    },
    0x32: () => {

    },
    0x33: () => {

    },
    0x34: () => {

    },
    0x35: () => {

    },
    0x36: () => {

    },
    0x37: () => {

    },
    0x38: () => {

    },
    0x39: () => {

    },
    0x3A: () => {

    },
    0x3B: () => {

    },
    0x3C: () => {

    },
    0x3D: () => {

    },
    0x3E: () => {

    },
    0x3F: () => {

    },
    0x40: () => {

    },
    0x41: () => {

    },
    0x42: () => {

    },
    0x43: () => {

    },
    0x44: () => {

    },
    0x45: () => {

    },
    0x46: () => {

    },
    0x47: () => {

    },
    0x48: () => {

    },
    0x49: () => {

    },
    0x4A: () => {

    },
    0x4B: () => {

    },
    0x4C: () => {

    },
    0x4D: () => {

    },
    0x4E: () => {

    },
    0x4F: () => {

    },
    0x50: () => {

    },
    0x51: () => {

    },
    0x52: () => {

    },
    0x53: () => {

    },
    0x54: () => {

    },
    0x55: () => {

    },
    0x56: () => {

    },
    0x57: () => {

    },
    0x58: () => {

    },
    0x59: () => {

    },
    0x5A: () => {

    },
    0x5B: () => {

    },
    0x5C: () => {

    },
    0x5D: () => {

    },
    0x5E: () => {

    },
    0x5F: () => {

    },
    0x60: () => {

    },
    0x61: () => {

    },
    0x62: () => {

    },
    0x63: () => {

    },
    0x64: () => {

    },
    0x65: () => {

    },
    0x66: () => {

    },
    0x67: () => {

    },
    0x68: () => {

    },
    0x69: () => {

    },
    0x6A: () => {

    },
    0x6B: () => {

    },
    0x6C: () => {

    },
    0x6D: () => {

    },
    0x6E: () => {

    },
    0x6F: () => {

    },
    0x70: () => {

    },
    0x71: () => {

    },
    0x72: () => {

    },
    0x73: () => {

    },
    0x74: () => {

    },
    0x75: () => {

    },
    0x76: () => {

    },
    0x77: () => {

    },
    0x78: () => {

    },
    0x79: () => {

    },
    0x7A: () => {

    },
    0x7B: () => {

    },
    0x7C: () => {

    },
    0x7D: () => {

    },
    0x7E: () => {

    },
    0x7F: () => {

    },
    0x80: () => {

    },
    0x81: () => {

    },
    0x82: () => {

    },
    0x83: () => {

    },
    0x84: () => {

    },
    0x85: () => {

    },
    0x86: () => {

    },
    0x87: () => {

    },
    0x88: () => {

    },
    0x89: () => {

    },
    0x8A: () => {

    },
    0x8B: () => {

    },
    0x8C: () => {

    },
    0x8D: () => {

    },
    0x8E: () => {

    },
    0x8F: () => {

    },
    0x90: () => {

    },
    0x91: () => {

    },
    0x92: () => {

    },
    0x93: () => {

    },
    0x94: () => {

    },
    0x95: () => {

    },
    0x96: () => {

    },
    0x97: () => {

    },
    0x98: () => {

    },
    0x99: () => {

    },
    0x9A: () => {

    },
    0x9B: () => {

    },
    0x9C: () => {

    },
    0x9D: () => {

    },
    0x9E: () => {

    },
    0x9F: () => {

    },
    0xA0: () => {

    },
    0xA1: () => {

    },
    0xA2: () => {

    },
    0xA3: () => {

    },
    0xA4: () => {

    },
    0xA5: () => {

    },
    0xA6: () => {

    },
    0xA7: () => {

    },
    0xA8: () => {

    },
    0xA9: () => {

    },
    0xAA: () => {

    },
    0xAB: () => {

    },
    0xAC: () => {

    },
    0xAD: () => {

    },
    0xAE: () => {

    },
    0xAF: () => {

    },
    0xB0: () => {

    },
    0xB1: () => {

    },
    0xB2: () => {

    },
    0xB3: () => {

    },
    0xB4: () => {

    },
    0xB5: () => {

    },
    0xB6: () => {

    },
    0xB7: () => {

    },
    0xB8: () => {

    },
    0xB9: () => {

    },
    0xBA: () => {

    },
    0xBB: () => {

    },
    0xBC: () => {

    },
    0xBD: () => {

    },
    0xBE: () => {

    },
    0xBF: () => {

    },
    0xC0: () => {

    },
    0xC1: () => {

    },
    0xC2: () => {

    },
    0xC3: () => {

    },
    0xC4: () => {

    },
    0xC5: () => {

    },
    0xC6: () => {

    },
    0xC7: () => {

    },
    0xC8: () => {

    },
    0xC9: () => {

    },
    0xCA: () => {

    },
    0xCB: () => {

    },
    0xCC: () => {

    },
    0xCD: () => {

    },
    0xCE: () => {

    },
    0xCF: () => {

    },
    0xD0: () => {

    },
    0xD1: () => {

    },
    0xD2: () => {

    },
    0xD3: () => {

    },
    0xD4: () => {

    },
    0xD5: () => {

    },
    0xD6: () => {

    },
    0xD7: () => {

    },
    0xD8: () => {

    },
    0xD9: () => {

    },
    0xDA: () => {

    },
    0xDB: () => {

    },
    0xDC: () => {

    },
    0xDD: () => {

    },
    0xDE: () => {

    },
    0xDF: () => {

    },
    0xE0: () => {

    },
    0xE1: () => {

    },
    0xE2: () => {

    },
    0xE3: () => {

    },
    0xE4: () => {

    },
    0xE5: () => {

    },
    0xE6: () => {

    },
    0xE7: () => {

    },
    0xE8: () => {

    },
    0xE9: () => {

    },
    0xEA: () => {

    },
    0xEB: () => {

    },
    0xEC: () => {

    },
    0xED: () => {

    },
    0xEE: () => {

    },
    0xEF: () => {

    },
    0xF0: () => {

    },
    0xF1: () => {

    },
    0xF2: () => {

    },
    0xF3: () => {

    },
    0xF4: () => {

    },
    0xF5: () => {

    },
    0xF6: () => {

    },
    0xF7: () => {

    },
    0xF8: () => {

    },
    0xF9: () => {

    },
    0xFA: () => {

    },
    0xFB: () => {

    },
    0xFC: () => {

    },
    0xFD: () => {

    },
    0xFE: () => {

    },
    0xFF: () => {

    },
}

const opcodeTable16Bit = {
    0x00: () => {

    },
    0x01: () => {
    },
    0x02: () => {
    },
    0x03: () => {

    },
    0x04: () => {

    },
    0x05: () => {

    },
    0x06: () => {

    },
    0x07: () => {

    },
    0x08: () => {

    },
    0x09: () => {

    },
    0x0A: () => {

    },
    0x0B: () => {

    },
    0x0C: () => {

    },
    0x0D: () => {

    },
    0x0E: () => {

    },
    0x0F: () => {

    },
    0x10: () => {

    },
    0x11: () => {

    },
    0x12: () => {

    },
    0x13: () => {

    },
    0x14: () => {

    },
    0x15: () => {

    },
    0x16: () => {

    },
    0x17: () => {

    },
    0x18: () => {

    },
    0x19: () => {

    },
    0x1A: () => {

    },
    0x1B: () => {

    },
    0x1C: () => {

    },
    0x1D: () => {

    },
    0x1E: () => {

    },
    0x1F: () => {

    },
    0x20: () => {

    },
    0x21: () => {

    },
    0x22: () => {

    },
    0x23: () => {

    },
    0x24: () => {

    },
    0x25: () => {

    },
    0x26: () => {

    },
    0x27: () => {

    },
    0x28: () => {

    },
    0x29: () => {

    },
    0x2A: () => {

    },
    0x2B: () => {

    },
    0x2C: () => {

    },
    0x2D: () => {

    },
    0x2E: () => {

    },
    0x2F: () => {

    },
    0x30: () => {

    },
    0x31: () => {

    },
    0x32: () => {

    },
    0x33: () => {

    },
    0x34: () => {

    },
    0x35: () => {

    },
    0x36: () => {

    },
    0x37: () => {

    },
    0x38: () => {

    },
    0x39: () => {

    },
    0x3A: () => {

    },
    0x3B: () => {

    },
    0x3C: () => {

    },
    0x3D: () => {

    },
    0x3E: () => {

    },
    0x3F: () => {

    },
    0x40: () => {

    },
    0x41: () => {

    },
    0x42: () => {

    },
    0x43: () => {

    },
    0x44: () => {

    },
    0x45: () => {

    },
    0x46: () => {

    },
    0x47: () => {

    },
    0x48: () => {

    },
    0x49: () => {

    },
    0x4A: () => {

    },
    0x4B: () => {

    },
    0x4C: () => {

    },
    0x4D: () => {

    },
    0x4E: () => {

    },
    0x4F: () => {

    },
    0x50: () => {

    },
    0x51: () => {

    },
    0x52: () => {

    },
    0x53: () => {

    },
    0x54: () => {

    },
    0x55: () => {

    },
    0x56: () => {

    },
    0x57: () => {

    },
    0x58: () => {

    },
    0x59: () => {

    },
    0x5A: () => {

    },
    0x5B: () => {

    },
    0x5C: () => {

    },
    0x5D: () => {

    },
    0x5E: () => {

    },
    0x5F: () => {

    },
    0x60: () => {

    },
    0x61: () => {

    },
    0x62: () => {

    },
    0x63: () => {

    },
    0x64: () => {

    },
    0x65: () => {

    },
    0x66: () => {

    },
    0x67: () => {

    },
    0x68: () => {

    },
    0x69: () => {

    },
    0x6A: () => {

    },
    0x6B: () => {

    },
    0x6C: () => {

    },
    0x6D: () => {

    },
    0x6E: () => {

    },
    0x6F: () => {

    },
    0x70: () => {

    },
    0x71: () => {

    },
    0x72: () => {

    },
    0x73: () => {

    },
    0x74: () => {

    },
    0x75: () => {

    },
    0x76: () => {

    },
    0x77: () => {

    },
    0x78: () => {

    },
    0x79: () => {

    },
    0x7A: () => {

    },
    0x7B: () => {

    },
    0x7C: () => {

    },
    0x7D: () => {

    },
    0x7E: () => {

    },
    0x7F: () => {

    },
    0x80: () => {

    },
    0x81: () => {

    },
    0x82: () => {

    },
    0x83: () => {

    },
    0x84: () => {

    },
    0x85: () => {

    },
    0x86: () => {

    },
    0x87: () => {

    },
    0x88: () => {

    },
    0x89: () => {

    },
    0x8A: () => {

    },
    0x8B: () => {

    },
    0x8C: () => {

    },
    0x8D: () => {

    },
    0x8E: () => {

    },
    0x8F: () => {

    },
    0x90: () => {

    },
    0x91: () => {

    },
    0x92: () => {

    },
    0x93: () => {

    },
    0x94: () => {

    },
    0x95: () => {

    },
    0x96: () => {

    },
    0x97: () => {

    },
    0x98: () => {

    },
    0x99: () => {

    },
    0x9A: () => {

    },
    0x9B: () => {

    },
    0x9C: () => {

    },
    0x9D: () => {

    },
    0x9E: () => {

    },
    0x9F: () => {

    },
    0xA0: () => {

    },
    0xA1: () => {

    },
    0xA2: () => {

    },
    0xA3: () => {

    },
    0xA4: () => {

    },
    0xA5: () => {

    },
    0xA6: () => {

    },
    0xA7: () => {

    },
    0xA8: () => {

    },
    0xA9: () => {

    },
    0xAA: () => {

    },
    0xAB: () => {

    },
    0xAC: () => {

    },
    0xAD: () => {

    },
    0xAE: () => {

    },
    0xAF: () => {

    },
    0xB0: () => {

    },
    0xB1: () => {

    },
    0xB2: () => {

    },
    0xB3: () => {

    },
    0xB4: () => {

    },
    0xB5: () => {

    },
    0xB6: () => {

    },
    0xB7: () => {

    },
    0xB8: () => {

    },
    0xB9: () => {

    },
    0xBA: () => {

    },
    0xBB: () => {

    },
    0xBC: () => {

    },
    0xBD: () => {

    },
    0xBE: () => {

    },
    0xBF: () => {

    },
    0xC0: () => {

    },
    0xC1: () => {

    },
    0xC2: () => {

    },
    0xC3: () => {

    },
    0xC4: () => {

    },
    0xC5: () => {

    },
    0xC6: () => {

    },
    0xC7: () => {

    },
    0xC8: () => {

    },
    0xC9: () => {

    },
    0xCA: () => {

    },
    0xCB: () => {

    },
    0xCC: () => {

    },
    0xCD: () => {

    },
    0xCE: () => {

    },
    0xCF: () => {

    },
    0xD0: () => {

    },
    0xD1: () => {

    },
    0xD2: () => {

    },
    0xD3: () => {

    },
    0xD4: () => {

    },
    0xD5: () => {

    },
    0xD6: () => {

    },
    0xD7: () => {

    },
    0xD8: () => {

    },
    0xD9: () => {

    },
    0xDA: () => {

    },
    0xDB: () => {

    },
    0xDC: () => {

    },
    0xDD: () => {

    },
    0xDE: () => {

    },
    0xDF: () => {

    },
    0xE0: () => {

    },
    0xE1: () => {

    },
    0xE2: () => {

    },
    0xE3: () => {

    },
    0xE4: () => {

    },
    0xE5: () => {

    },
    0xE6: () => {

    },
    0xE7: () => {

    },
    0xE8: () => {

    },
    0xE9: () => {

    },
    0xEA: () => {

    },
    0xEB: () => {

    },
    0xEC: () => {

    },
    0xED: () => {

    },
    0xEE: () => {

    },
    0xEF: () => {

    },
    0xF0: () => {

    },
    0xF1: () => {

    },
    0xF2: () => {

    },
    0xF3: () => {

    },
    0xF4: () => {

    },
    0xF5: () => {

    },
    0xF6: () => {

    },
    0xF7: () => {

    },
    0xF8: () => {

    },
    0xF9: () => {

    },
    0xFA: () => {

    },
    0xFB: () => {

    },
    0xFC: () => {

    },
    0xFD: () => {

    },
    0xFE: () => {

    },
    0xFF: () => {

    },
}

function doNextInstruction() {
    instruction = gameboyRead(Registers.PC++);
    if (instruction === 0xCB) {
        opcodeTable16Bit[gameboyRead(Registers.PC++)]();
    }
    else {
        opcodeTable8Bit[instruction]();
    }
}