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

/**
 * Reads the next value in the ROM and jumps PC relatively via the read signed 8-bit integer
 */
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
 * Used for instructions 0x40-0x75 and 0x77-0x7F
 * These instructions simply load values from registers or memory
 * @param {number} instruction 
 */
function doLoadInstruction(instruction) {
    let value;

    switch (instruction & 0x07) {
        case 0x0: value = Registers.B; break;
        case 0x1: value = Registers.C; break;
        case 0x2: value = Registers.D; break;
        case 0x3: value = Registers.E; break;
        case 0x4: value = Registers.H; break;
        case 0x5: value = Registers.L; break;
        case 0x6: value = gameboyRead(combineRegisters(Registers.H, Registers.L)); Globals.cycleNumber++; break;
        case 0x7: value = Registers.A; break;
    }

    switch ((instruction >> 3) & 7) {
        case 0x0: Registers.B == value; break;
        case 0x1: Registers.C == value; break;
        case 0x2: Registers.D == value; break;
        case 0x3: Registers.E == value; break;
        case 0x4: Registers.H == value; break;
        case 0x5: Registers.L == value; break;
        case 0x6: gameboyWrite(combineRegisters(Registers.H, Registers.L), value); Globals.cycleNumber++; break;
        case 0x7: Registers.A == value; break;
    }
    Globals.cycleNumber++;
}

/**
 * This handles instructions 0x80-0xBF
 * @param {number} instruction 
 */
function doArithmeticInstruction(instruction) {
    let value;

    switch (instruction & 0x07) {
        case 0x0: value = Registers.B; break;
        case 0x1: value = Registers.C; break;
        case 0x2: value = Registers.D; break;
        case 0x3: value = Registers.E; break;
        case 0x4: value = Registers.H; break;
        case 0x5: value = Registers.L; break;
        case 0x6: value = gameboyRead(combineRegisters(Registers.H, Registers.L)); Globals.cycleNumber++; break;
        case 0x7: value = Registers.A; break;
    }

    switch ((instruction >> 3) & 0x7) {
        case 0: // ADD
        case 1: // ADC
        case 2: // SUB
        case 3: // SBC
        case 4: // AND
        case 5: // XOR
        case 6: // OR
        case 7: // COMPARE
    }
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
        [Registers.B, Registers.C] = splitRegisters(decrement16Bit(BC));
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
        [Registers.D, Registers.E] = splitRegisters(decrement16Bit(DE));
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
        // (HL+) <- A
        // Write, then increment HL
        gameboyWrite(combineRegisters(Registers.H, Registers.L), Registers.A);
        Registers.L = mod(Registers.L + 1, BYTE_VALUES.UINT_8_MAX + 1);
        if (!(Registers.L)) {
            Registers.H = mod(Registers.H + 1, BYTE_VALUES.UINT_8_MAX + 1);
        }
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
        // A <- (HL+)
        Registers.A = gameboyRead(combineRegisters(Registers.H, Registers.L));
        Registers.L = mod(Registers.L + 1, BYTE_VALUES.UINT_8_MAX + 1);
        if (!(Registers.L)) {
            Registers.H = mod(Registers.H + 1, BYTE_VALUES.UINT_8_MAX + 1);
        }
        Globals.cycleNumber += 2;
    },
    0x2B: () => {
        // HL--
        const HL = combineRegisters(Registers.H, Registers.L);
        [Registers.H, Registers.L] = splitRegisters(decrement16Bit(HL));
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
        // If carry bit is zero
        // PC += (signed) (PC++)
        if (!Registers.Fc) {
            signedRelativeJump();
        }
        else {
            Registers.PC++;
            Globals.cycleNumber += 2;
        }
    },
    0x31: () => {

    },
    0x32: () => {
        // (HL-) <- A
        // Write, then decrement HL
        gameboyWrite(combineRegisters(Registers.H, Registers.L), Registers.A);
        Registers.L = mod(Registers.L - 1, BYTE_VALUES.UINT_8_MAX + 1);
        if (!(Registers.L)) {
            Registers.H = mod(Registers.H - 1, BYTE_VALUES.UINT_8_MAX + 1);
        }
        Globals.cycleNumber += 2;
    },
    0x33: () => {
        // SP++
        Registers.SP++;
        Globals.cycleNumber += 2;
    },
    0x34: () => {
        // (HL)++
        let value = gameboyRead(combineRegisters(Registers.H, Registers.L));
        value = increment16Bit(value);
        gameboyWrite(value, combineRegisters(Registers.H, Registers.L));
        Globals.cycleNumber += 2;
    },
    0x35: () => {
        // (HL)--
        let value = gameboyRead(combineRegisters(Registers.H, Registers.L));
        value = decrement16Bit(value);
        gameboyWrite(value, combineRegisters(Registers.H, Registers.L));
        Globals.cycleNumber += 2;
    },
    0x36: () => {
        // (HL) <- d8
        gameboyWrite(combineRegisters(Registers.H, Registers.L), gameboyRead(Registers.PC++));
        Globals.cycleNumber += 3;
    },
    0x37: () => {
        // Fc = 1
        Registers.Fc = 1;
        Globals.cycleNumber += 1;
    },
    0x38: () => {
        // If CY flag aka Fc is set
        // PC += (signed) (PC++)
        if (Registers.Fz) {
            signedRelativeJump();
        }
        else {
            Registers.PC++;
            Globals.cycleNumber += 2;
        }
    },
    0x39: () => {
        // HL += SP
        const HL = combineRegisters(Registers.H, Registers.L);
        const SP = Registers.SP;
        const result = add16Bit(HL, SP);
        [Registers.H, Registers.L] = splitRegisters(result);
        Globals.cycleNumber += 2;
    },
    0x3A: () => {
        // A <- (HL-)
        Registers.A = gameboyRead(combineRegisters(Registers.H, Registers.L));
        Registers.L = mod(Registers.L - 1, BYTE_VALUES.UINT_8_MAX + 1);
        if (!(Registers.L)) {
            Registers.H = mod(Registers.H - 1, BYTE_VALUES.UINT_8_MAX + 1);
        }
        Globals.cycleNumber += 2;
    },
    0x3B: () => {
        // SP--
        const SP = Registers.SP;
        Registers.SP = decrement16Bit(SP);
        Globals.cycleNumber += 2;
    },
    0x3C: () => {
        // A++
        Registers.A = increment8Bit(Registers.A);
        Globals.cycleNumber += 1;
    },
    0x3D: () => {
        // A--
        Registers.A = decrement8Bit(Registers.A);
        Globals.cycleNumber += 1;
    },
    0x3E: () => {
        // A <- (PC)
        Registers.A = gameboyRead(Registers.PC++);
        Globals.cycleNumber += 2;
    },
    0x3F: () => {
        // Flip carry flag
        Registers.Fz = !Registers.Fz;
        Registers.Fn = 0;
        Registers.Fh = 0;
        Globals.cycleNumber++;
    },
    // GAP of Load Instructions 0x40-0x75
    0x76: () => {
        // TODO
        // HALT
        Globals.halted = true;
        Globals.cycleNumber++;
    },
    // GAP of Load Instructions 0x77-0x7F
    // GAP of Arithmetic instructions 0x80-0xBF
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

function doNext16BitInstruction() {
    const instruction = gameboyRead(Registers.PC++);
    opcodeTable16Bit[instruction]();

    // Get value
    let value;
    switch (instruction & 0x07) {
        case 0x0: value = Registers.B; break;
        case 0x1: value = Registers.C; break;
        case 0x2: value = Registers.D; break;
        case 0x3: value = Registers.E; break;
        case 0x4: value = Registers.H; break;
        case 0x5: value = Registers.L; break;
        case 0x6: value = gameboyRead(combineRegisters(Registers.H, Registers.L)); Globals.cycleNumber++; break;
        case 0x7: value = Registers.A; break;
    }

    // Perform operation on value
    switch (instruction >> 3) {
        case 0x00: // RLC
            break;
        case 0x01: // RRC
            break;
        case 0x02: // RL
            break;
        case 0x03: // RR
            break;
        case 0x04: // SLA
            break;
        case 0x05: // SRA
            break;
        case 0x06: // SWAP
            break;
        case 0x07: // SRL
            break;
        case 0x08: // BIT 0
            Registers.Fz = !(value & 0x01);
            Registers.Fn = 0;
            Registers.Fh = 1;
            break;
        case 0x09: // BIT 1
            Registers.Fz = !(value & 0x02);
            Registers.Fn = 0;
            Registers.Fh = 1;
            break;
        case 0x0A: // BIT 2
            Registers.Fz = !(value & 0x04);
            Registers.Fn = 0;
            Registers.Fh = 1;
            break;
        case 0x0B: // BIT 3
            Registers.Fz = !(value & 0x08);
            Registers.Fn = 0;
            Registers.Fh = 1;
            break;
        case 0x0C: // BIT 4
            Registers.Fz = !(value & 0x10);
            Registers.Fn = 0;
            Registers.Fh = 1;
            break;
        case 0x0D: // BIT 5
            Registers.Fz = !(value & 0x20);
            Registers.Fn = 0;
            Registers.Fh = 1;
            break;
        case 0x0E: // BIT 6
            Registers.Fz = !(value & 0x40);
            Registers.Fn = 0;
            Registers.Fh = 1;
            break;
        case 0x0F: // BIT 7
            Registers.Fz = !(value & 0x80);
            Registers.Fn = 0;
            Registers.Fh = 1;
            break;
        case 0x10: // RES 0
            value &= 0xFE;
            break;
        case 0x11: // RES 1
            value &= 0xFD;
            break;
        case 0x12: // RES 2
            value &= 0xFB;
            break;
        case 0x13: // RES 3
            value &= 0xF7;
            break;
        case 0x14: // RES 4
            value &= 0xEF;
            break;
        case 0x15: // RES 5
            value &= 0xDF;
            break;
        case 0x16: // RES 6
            value &= 0xBF;
            break;
        case 0x17: // RES 7
            value &= 0x7F;
            break;
        case 0x18: // SET 0
            value |= 0x01;
            break;
        case 0x19: // SET 1
            value |= 0x02;
            break;
        case 0x1A: // SET 2
            value |= 0x04;
            break;
        case 0x1B: // SET 3
            value |= 0x08;
            break;
        case 0x1C: // SET 4
            value |= 0x10;
            break;
        case 0x1D: // SET 5
            value |= 0x20;
            break;
        case 0x1E: // SET 6
            value |= 0x40;
            break;
        case 0x1F: // SET 7
            value |= 0x80;
            break;
    }

    // Store value
    switch ((instruction) & 7) {
        case 0x0: Registers.B == value; break;
        case 0x1: Registers.C == value; break;
        case 0x2: Registers.D == value; break;
        case 0x3: Registers.E == value; break;
        case 0x4: Registers.H == value; break;
        case 0x5: Registers.L == value; break;
        case 0x6: gameboyWrite(combineRegisters(Registers.H, Registers.L), value); Globals.cycleNumber++; break;
        case 0x7: Registers.A == value; break;
    }
}

function doNext8BitInstruction() {
    const instruction = gameboyRead(Registers.PC++);
    if (instruction === 0xCB) {
        doNext16BitInstruction();
    }
    else if (instruction >= 0x40 && instruction <= 0x75 || instruction >= 0x77 && instruction <= 0x7F) {
        doLoadInstruction(instruction);
    }
    else if (instruction >= 0x80 && instruction <= 0xBF) {
        doArithmeticInstruction(instruction);
    }
    else {
        opcodeTable8Bit[instruction]();
    }
}