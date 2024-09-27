/**
 * https://gbdev.io/pandocs/Memory_Map.html#memory-map
 * @param {number} addr 
 */
function readMem(addr) {
    if (addr <= 0x3FFF) {
        // ROM bank 1
        return Globals.ROM[addr];
    }
    else if (addr <= 0x7FFF) {
        // TODO 
        // ROM bank 1-N (Handled by MBC)
        switch (Globals.MBC) {
            case "MBC1":
            case "MBC2":
            case "MBC3":
                return Globals.ROM[addr + (Globals.selectedROMBank || 1) * 16 * BYTE_VALUES.KiB];
            case "MBC5":
            case "MBC7":
            case "HuC3":
                return Globals.ROM[addr + Globals.selectedROMBank * 16 * BYTE_VALUES.KiB];
            case "MBC6":
                throw new Error("MBC6 not supported");
            case "HuC1":
                throw new Error("HuC1 not supported");
            case "M161":
            case null:
            default:
                return Globals.ROM[addr];
        }
    }
    else if (addr <= 0x9FFF) {
        // VRAM
        return Globals.RAM[addr];
    }
    else if (addr <= 0xBFFF) {
        // Cartridge RAM
        return Globals.cartridgeRAM[addr - 0xA000];
    }
    else if (addr <= 0) {

    }

    console.error(`Invalid Address read: ${addr}`);
    return 0xFF;
}

/**
 * 
 * @param {number} addr 
 * @param {number} val 
 */
function writeMem(addr, val) {

}