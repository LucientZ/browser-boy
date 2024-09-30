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
 * 
 * @param {number} addr 
 * @returns {number}
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
 * @returns a - 1 mod 2^8
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

/**
 * 
 * @param {number} a 
 * @param {number} b 
 * @returns 
 */
function add8Bit(a, b) {
    Registers.Fh = ((a * 0x0F) + (b & 0x0F)) >> 4;
    const result = mod(a + b, BYTE_VALUES.UINT_8_MAX + 1);
    Registers.Fz = !result;
    Registers.Fn = 0;
    return result;
}

/**
 * 
 * @param {number} a 
 * @param {number} b 
 * @returns 
 */
function add16Bit(a, b) {
    Registers.Fh = ((a & 0x0FFFF) + (b & 0x0FFFF)) >> 12;
    const result = mod(a + b, BYTE_VALUES.UINT_16_MAX + 1);
    Registers.Fz = !result;
    Registers.Fn = 0;
    Registers.Fc = (a + b) >> 16;
    return result;
}

/**
 * 
 * @param {number} a 
 * @param {number} b 
 * @returns 
 */
function subtract8Bit(a, b) {
    Registers.Fh = (a & 0x0F) < (b & 0x0F);
    const result = mod(a - b, BYTE_VALUES.UINT_8_MAX + 1);
    Registers.Fc = (result >> 8) & 1
    Registers.Fz = !result;
    Registers.Fn = 1;
    return result;
}

function subtract16Bit(a, b) {
    const result = mod(a + b, BYTE_VALUES.UINT_16_MAX + 1);
    Registers.Fz = !result;
    Registers.Fn = 1;
    return result;
}

/**
 * Reads the next value in the ROM and jumps PC relatively via the read signed 8-bit integer
 */
function doSignedRelativeJump() {
    let jumpValue = gameboyRead(Registers.PC++);
    if (jumpValue & 0x80) {
        jumpValue = mod(-jumpValue, Math.pow(2, 8));
        Registers.PC -= jumpValue;
    }
    else {
        Registers.PC += jumpValue;
    }
    Globals.cycleNumber += 3;
}

function doJump() {

}

/**
 * Pop value at SP and return next two 8-bit values.
 * The first value is the least significant byte. The second value is the most significant byte.
 * @returns {[number, number]} [firstByteRead, secondByteRead]
 */
function doPop() {
    const firstByteRead = gameboyRead(Registers.SP++);
    const secondByteRead = gameboyRead(Registers.SP++);
    Globals.cycleNumber += 3;
    return [firstByteRead, secondByteRead];
}

/**
 * Pushes value to memory pointed by SP.
 * Memory will be written in little endian order
*/
function doPush(value) {
    const leastSignificantByte = value && 0xFF;
    const mostSignificantByte = (value >> 8);
    gameboyWrite(--Registers.SP, mostSignificantByte);
    gameboyWrite(--Registers.SP, leastSignificantByte);
    Globals.cycleNumber += 4;
}

/**
 * Pushes current PC onto stack and calls specified address
 * If the address is not passed, read address from ROM
 * @param {number | undefined} address 
 */
function doCall(address = undefined) {
    if (address === undefined) {
        address = gameboyRead(Registers.PC++) | (gameboyRead(Registers.PC++) << 8);
        Globals.cycleNumber += 2;
    }

    gameboyWrite(Registers.SP--, Registers.PC >> 8);
    gameboyWrite(Registers.SP--, Registers.PC & 0xFF);
    Registers.PC = address;
    Globals.cycleNumber += 3;
}

function doReturn() {

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
 * 0xC6, 0xCE, 0xD6, 0xDE, 0xE6, 0xEE, 0xF6, 0xFE 
 * @param {number} instruction 
 */
function doArithmeticInstruction(instruction) {
    let value;

    if (instruction in [0xC6, 0xCE, 0xD6, 0xDE, 0xE6, 0xEE, 0xF6, 0xFE]) {
        value = gameboyRead(Registers.PC++);
        Globals.cycleNumber++;
    }
    else {
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
    }

    const oldFc = Registers.Fc;
    switch ((instruction >> 3) & 0x7) {
        case 0: // ADD
            Registers.A = add8Bit(value, Registers.A);
            break;
        case 1: // ADC
            Registers.Fh = ((Registers.A & 0x0F) + (value & 0x0F) + oldFc) >> 4;
            Registers.Fc = (Registers.A + value + oldFc) >> 8
            Registers.A = mod(Registers.A + Registers.Fc + value, BYTE_VALUES.UINT_8_MAX + 1);
            Registers.Fz = !Registers.A;
            Registers.Fn = 0;
            break;
        case 2: // SUB
            Registers.A = subtract8Bit(Registers.A, value);
            break;
        case 3: // SBC
            Registers.Fh = (Registers.A & 0x0F) < ((value & 0x0F) + oldFc);
            const result = Registers.A - Registers.Fc - value;
            Registers.A = mod(result, BYTE_VALUES.UINT_8_MAX + 1);
            Registers.Fc = (result >> 8) & 0x01;
            Registers.Fz = !Registers.A;
            Registers.Fn = 1;
            break;
        case 4: // AND
            Registers.A &= value;
            Registers.Fz = !Registers.A;
            Registers.Fn = 0;
            Registers.Fh = 1;
            Registers.Fc = 0;
            break;
        case 5: // XOR
            Registers.A ^= value;
            Registers.Fz = !Registers.A;
            Registers.Fn = 0;
            Registers.Fh = 0;
            Registers.Fc = 0;
            Registers.Fz = !value;
            break;
        case 6: // OR
            Registers.A |= value;
            Registers.Fz = !Registers.A;
            Registers.Fn = 0;
            Registers.Fh = 0;
            Registers.Fc = 0;
            break;
        case 7: // COMPARE
            subtract8Bit(Registers.A - value);
            break;
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
        Registers.Fc = A >> 7;
        Registers.A = ((A << 1) + Registers.Fc) & 0xFF;
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
        Registers.A |= (Registers.Fc << 7);
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
        Registers.Fc = Registers.A & 0x80;
        Registers.A = value & 0xFF;
        Registers.Fz = 0;
        Registers.Fn = 0;
        Registers.Fh = 0;
        Globals.cycleNumber += 1;
    },
    0x18: () => {
        // PC += (signed) (PC++)
        doSignedRelativeJump();
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
        const oldFc = Registers.Fc;
        Registers.Fc = Registers.A & 0x1;
        Registers.A = Registers.A >> 1;
        Registers.A |= oldFc << 7;
        Registers.Fz = 0;
        Registers.Fn = 0;
        Registers.Fh = 0;
        Globals.cycleNumber += 1;
    },
    0x20: () => {
        // If last operation was zero
        // PC += (signed) (PC++)
        if (!Registers.Fz) {
            doSignedRelativeJump();
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
            doSignedRelativeJump();
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
            doSignedRelativeJump();
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
            doSignedRelativeJump();
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
        // RET NZ
        if (!(Registers.Fz)) {
            doReturn();
        }
        else {
            Globals.cycleNumber += 2;
        }
    },
    0xC1: () => {
        // POP BC
        [Registers.C, Registers.B] = doPop();
        Globals.cycleNumber += 3;
    },
    0xC2: () => {
        // JP NZ, a16
        if (!(Registers.Fz)) {
            doJump();
        }
        else {
            Registers.PC += 2;
            Globals.cycleNumber += 2;
        }
    },
    0xC3: () => {
        doJump();
    },
    0xC4: () => {
        // Call NZ, a16
        if (!(Registers.Fz)) {
            doCall();
        }
        else {
            Registers.PC += 2;
            Globals.cycleNumber += 2;
        }
    },
    0xC5: () => {
        // PUSH BC
        doPush(combineRegisters(Registers.B, Registers.C));
    },
    0xC6: () => {
        doArithmeticInstruction(0xC6);
    },
    0xC7: () => {
        // RST 0x00
        doCall(0x00);
    },
    0xC8: () => {
        // RET Z
        Registers.cycleNumber++;
        if (Registers.Fz) {
            doReturn();
        }
    },
    0xC9: () => {
        // RET
        doReturn();
    },
    0xCA: () => {
        // JP Z, a16
        if (Registers.Fz) {
            doJump();
        }
        else {
            Registers.PC += 2;
            Registers.cycleNumber += 2;
        }
    },
    0xCC: () => {
        // CALL Z, a16
        if (Registers.Fz) {
            doCall();
        }
        else {
            Registers.PC += 2;
            Globals.cycleNumber += 3;
        }
    },
    0xCD: () => {
        // CALL a16
        doCall();
    },
    0xCE: () => {
        doArithmeticInstruction(0xCE);
    },
    0xCF: () => {
        // RST 0x08
        doCall(0x08);
    },
    0xD0: () => {
        // RET NC
        if (!Registers.Fc) {
            doReturn();
        }
        else {
            Globals.cycleNumber += 2;
        }
    },
    0xD1: () => {
        // POP DE
        [Registers.E, Registers.D] = doPop();
        Globals.cycleNumber += 3;
    },
    0xD2: () => {
        // JP NC, a16
        if (!Registers.Fc) {
            doJump();
        }
        else {
            Registers.PC += 2;
            Globals.cycleNumber += 3;
        }
    },
    0xD4: () => {
        // Call NZ, a16
        if (!(Registers.Fc)) {
            doCall();
        }
        else {
            Registers.PC += 2;
            Globals.cycleNumber += 2;
        }
    },
    0xD5: () => {
        doPush(combineRegisters(Registers.D, Registers.E));
    },
    0xD6: () => {
        doArithmeticInstruction(0xD6);
    },
    0xD7: () => {
        // RST 0x10
        doCall(0x10);
    },
    0xD8: () => {
        if (Registers.Fc) {
            doReturn();
        }
        else {
            Globals.cycleNumber += 2;
        }
    },
    0xD9: () => {
        // TODO RETI
        Globals.IME = 1;
        doReturn();
    },
    0xDA: () => {
        // JP C, a16
        if (Registers.Fc) {
            doJump();
        }
        else {
            Globals.cycleNumber += 3;
        }
    },
    0xDE: () => {
        doArithmeticInstruction(0xDE);
    },
    0xDF: () => {
        // RST 0x18
        doCall(0x18);
    },
    0xE0: () => {
        // LD (a8), A
        // IO Operation
        writeIO(gameboyRead(Registers.PC++), Registers.A);
        Globals.cycleNumber += 3;
    },
    0xE1: () => {
        // POP HL
        [Registers.L, Registers.H] = doPop();
        Globals.cycleNumber += 3;
    },
    0xE2: () => {
        // LD (0xFF00 & C), A
        // IO Operation
        writeIO(0xFF00 & Registers.C, Registers.A);
        Globals.cycleNumber += 2;
    },
    0xE5: () => {
        doPush(combineRegisters(Registers.H, Registers.L));
    },
    0xE6: () => {
        doArithmeticInstruction(0xE6);
    },
    0xE7: () => {
        // RST 0x20
        doCall(0x20);
    },
    0xE8: () => {
        // ADD SP, s8
        // TODO
    },
    0xE9: () => {
        // JP HL
        Registers.PC = combineRegisters(Registers.H, Registers.L);
        Globals.cycleNumber++;
    },
    0xEA: () => {
        // LD (a16), A
        const address = gameboyRead(Registers.PC++) | (gameboyRead(Registers.PC++) << 8);
        gameboyWrite(address, Registers.A);
    },
    0xEE: () => {
        doArithmeticInstruction(0xEE);
    },
    0xEF: () => {
        // RST 0x28
        doCall(0x28);
    },
    0xF0: () => {
        // LD A, (a16)
        // IO operation
        Registers.A = readIO(gameboyRead(Registers.PC++));
        Globals.cycleNumber += 2;
    },
    0xF1: () => {
        // POP AF
        let F;
        [F, Registers.A] = doPop();
        Registers.Fz = F & 0x80;
        Registers.Fn = F & 0x40;
        Registers.Fh = F & 0x20;
        Registers.Fc = F & 0x10;
        Globals.cycleNumber += 3;
    },
    0xF2: () => {
        // LD A, (0xFF00 & C)
        Registers.A = readIO(0xFF00 & Registers.C);
        Globals.cycleNumber += 1;
    },
    0xF3: () => {
        // DI
        // Disable Interrupts
        Globals.IME = false;
        Globals.cycleNumber++;
    },
    0xF5: () => {
        const F = (Registers.Fz << 7) & (Registers.Fn << 6) & (Registers.Fh << 5) & (Registers.Fc << 4);
        doPush(combineRegisters(Registers.A, F));
    },
    0xF6: () => {
        doArithmeticInstruction(0xF6);
    },
    0xF7: () => {
        // RST 0x30
        doCall(0x30);
    },
    0xF8: () => {
        // TODO
    },
    0xF9: () => {
        // LD SP, HL
        Registers.SP = combineRegisters(Registers.H, Registers.L);
        Globals.cycleNumber += 3;
    },
    0xFA: () => {
        Registers.A = gameboyRead();
    },
    0xFB: () => {
        // EI
        // Enable Interrupts
        Globals.IME = true;
        Globals.cycleNumber++;
    },
    0xFE: () => {
        doArithmeticInstruction(0xFE);
    },
    0xFF: () => {
        // RST 0x38
        doCall(0x38);
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
    let oldFC = Registers.Fc;
    switch (instruction >> 3) {
        case 0x00: // RLC
            Registers.Fc = value >> 7;
            value = (value << 1 & 0xFF) & Registers.Fc;
            Registers.Fz = !value;
            Registers.Fn = 0;
            Registers.Fh = 0;
            break;
        case 0x01: // RRC
            Registers.Fc = value & 0x1;
            value = (value >> 1) | (Registers.Fc << 7);
            Registers.Fz = !value;
            Registers.Fn = 0;
            Registers.Fh = 0;
            break;
        case 0x02: // RL
            Registers.Fc = value >> 7;
            value = (value << 1) | oldFC;
            Registers.Fz = !value;
            Registers.Fn = 0;
            Registers.Fh = 0;
            break;
        case 0x03: // RR
            Registers.Fc = value & 0x01;
            value = (value >> 1) | (oldFC << 7);
            Registers.Fz = !value;
            Registers.Fn = 0;
            Registers.Fh = 0;
            break;
        case 0x04: // SLA
            Registers.Fc = value >> 7;
            value <<= 1;
            Registers.Fz = !value;
            Registers.Fn = 0;
            Registers.Fh = 0;
            break;
        case 0x05: // SRA
            Registers.Fc = value & 0x01;
            value >>= 1;
            Registers.Fz = !value;
            Registers.Fn = 0;
            Registers.Fh = 0;
            break;
        case 0x06: // SWAP
            value = ((value << 4) & 0xFF) | (value >> 4);
            Registers.Fc = 0;
            Registers.Fz = !value;
            Registers.Fn = 0;
            Registers.Fh = 0;
            break;
        case 0x07: // SRL
            Registers.Fc = value & 0x01;
            value >>= 1;
            Registers.Fz = !value;
            Registers.Fn = 0;
            Registers.Fh = 0;
            break;
        case 0x08: // BIT 0
            Registers.Fz = !(value & 0x01);
            Registers.Fn = 0;
            Registers.Fh = 1;
            Globals.cycleNumber += 2;
            return;
        case 0x09: // BIT 1
            Registers.Fz = !(value & 0x02);
            Registers.Fn = 0;
            Registers.Fh = 1;
            Globals.cycleNumber += 2;
            return;
        case 0x0A: // BIT 2
            Registers.Fz = !(value & 0x04);
            Registers.Fn = 0;
            Registers.Fh = 1;
            Globals.cycleNumber += 2;
            return;
        case 0x0B: // BIT 3
            Registers.Fz = !(value & 0x08);
            Registers.Fn = 0;
            Registers.Fh = 1;
            Globals.cycleNumber += 2;
            return;
        case 0x0C: // BIT 4
            Registers.Fz = !(value & 0x10);
            Registers.Fn = 0;
            Registers.Fh = 1;
            Globals.cycleNumber += 2;
            return;
        case 0x0D: // BIT 5
            Registers.Fz = !(value & 0x20);
            Registers.Fn = 0;
            Registers.Fh = 1;
            Globals.cycleNumber += 2;
            return;
        case 0x0E: // BIT 6
            Registers.Fz = !(value & 0x40);
            Registers.Fn = 0;
            Registers.Fh = 1;
            Globals.cycleNumber += 2;
            return;
        case 0x0F: // BIT 7
            Registers.Fz = !(value & 0x80);
            Registers.Fn = 0;
            Registers.Fh = 1;
            Globals.cycleNumber += 2;
            return;
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

    Globals.cycleNumber += 2;
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
        try {
            opcodeTable8Bit[instruction]();
        }
        catch (error){
            throw new Error(`Invalid Opcode: 0x${instruction.toString(16)} at address 0x${Registers.PC.toString(16)}`)
        }
    }

    // Flag normalization to actual
    Registers.Fc = Registers.Fc ? 1 : 0;
    Registers.Fz = Registers.Fz ? 1 : 0;
    Registers.Fh = Registers.Fh ? 1 : 0;
    Registers.Fn = Registers.Fn ? 1 : 0;
}