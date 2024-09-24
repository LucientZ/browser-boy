const BYTE_VALUES = Object.freeze({
    KiB: 1024,
    MiB: 1048576,
});

const ROMHeaderAddresses = Object.freeze({
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
 * @typedef ROMMetadata
 * @property {string} gameTitle
 * @property {boolean} supportsColor
 * @property {boolean} supportsSGB
 * @property {number} ROMSize
 * @property {number} ROMBankNum
 * @property {number} RAMSize
 * @property {number} RAMBankNum
 */

/**
 * @typedef GlobalVariables
 * @property {ROMMetadata} metadata
 * @property {Uint8Array | null} cartridgeROM
 * @property {Uint8Array | null} cartridgeRAM
 * 
 */

/**  
 * @type {GlobalVariables}
*/
const Globals = {
    metadata: {
        gameTitle: "",
        supportsColor: false,
        supportsSGB: false,
        ROMSize: 0, // Cartridge ROM size in bytes
        ROMBankNum: 0,
        RAMSize: 0, // Cartridge RAM size in bytes
        RAMBankNum: 0,
    },
    ROM: null,
    cartridgeRAM: null,
}
