const BYTE_VALUES = Object.freeze({
    KB: 1024
});

const RomHeaderAddresses = Object.freeze({
    ENTRY: 0x100,
    LOGO: 0x104,
    TITLE: 0x134,
    MANUFACTURER_CODE: 0x13F,
    CGB_FLAG: 0x143,
    NEW_LICENSEE_CODE: 0x144,
    SGB_FLAG: 0x146,
    CARTRIDGE_TYPE: 0x147,
    ROM_SIZE: 0x148,
    RAM_SIZE: 0x149,
    DESTINATION_CODE: 0x14A,
    OLD_LICENSEE_CODE: 0x14B,
    ROM_VERSION: 0x14C,
    HEADER_CHECKSUM: 0x14D,
    GLOBAL_CHECKSUM: 0x14E
});


/**
 * @typedef GlobalVariables
 * @property {Uint8Array | null} ROM
 * @property {Uint8Array} SRAM
 * 
 */

/**  
 * @type {GlobalVariables}
*/
const GLOBALS = {
    GAME_TITLE: "",
    ROM: null,
    RAM: new Uint8Array(),
}
