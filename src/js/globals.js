const BYTE_VALUES = Object.freeze({
    KB: 1024
});

const ADDRESSES = Object.freeze({
    ROM_BANK: 0x000
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
    ROM: null,
    RAM: new Uint8Array(),
}
