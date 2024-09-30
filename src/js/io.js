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
    return 0xFF;
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
        Globals.serialOutput += String.fromCharCode(val);
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