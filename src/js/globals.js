const BYTE_VALUES = Object.freeze({
    KiB: 1024,
    MiB: 1048576,
    UINT_8_MAX: Math.pow(2, 8) - 1,
    UINT_16_MAX: Math.pow(2, 16) - 1,
    UINT_32_MAX: Math.pow(2, 32) - 1,
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
 * @property {string}  gameTitle       Simply the title of the game
 * @property {boolean} supportsColor   Whether or not the ROM supports color. This enables/disables CGB features
 * @property {boolean} supportsSGB     Whether or not the ROM supports Super Gameboy features.
 * @property {boolean} supportsRumble  Whether or not the ROM supports Rumble. This affects cartridge RAM accessing
 * @property {number}  ROMSize         How much space the ROM takes up
 * @property {number}  ROMBankNum      How many ROM banks this cartridge has 
 * @property {number}  RAMSize         How much space the cartridge RAM takes up
 * @property {number}  RAMBankNum      How many RAM banks this cartridge has
 * @property {string}  filename        Name of the file the ROM came from
 */

/**
 * @typedef GlobalVariables
 * @prop {ROMMetadata} metadata
 * @prop {Uint8Array | null} ROM                Contains the bytes in the rom. Can be addressed directly
 * @prop {"MBC1" | "MBC2" | "MBC3" | "MBC5" | "MBC6" | "MBC7" | "MMM01" | "M161" | "HuC1" | "HuC3" | null} MBC Type of Memory Bank Controller in ROM
 * @prop {Uint8Array}        RAM                32 KiB of RAM
 * @prop {Uint8Array}        OAM                Object Attribute Memory. Home of objects to be displayed
 * @prop {Uint8Array}        HRAM               Small memory space used for certain flags
 * @prop {Uint8Array}        VRAM0              32 KiB of VRAM
 * @prop {Uint8Array}        VRAM1              32 KiB of VRAM (For Gameboy Color)
 * @prop {Uint8Array}        BGCRAM             Color RAM for backgrounds (For Gameboy Color)
 * @prop {Uint8Array}        OBJCRAM            Color RAM for objects aka sprites (For Gameboy Color)
 * @prop {Uint8Array | null} cartridgeRAM       RAM on the cartridge itself. Size is specified in the ROM header
 * @prop {number}            cycleNumber        How many cycles the gameboy has gone through.
 * @prop {boolean}           halted             Halt is called. Low power mode where the CPU stops until an interrupt
 * @prop {boolean}           standby            Very low power mode. Very low power mode
 * @prop {boolean}           frozen             Program does not run because of the emulator saying to stop.
 * @prop {boolean}           doubleSpeed        Says whether or not the gameboy is in double CPU speed mode
 * @prop {number}            IME                Interrupt Master Enable flag. 1 if interrupts are enabled
 * @prop {number}            IE                 Interrupt Enable flag. Says what interrupts are allowed to be called
 * @prop {number}            IMERequested       Says whether the IME was requested. This is used to simulate the fact that interrupts are delayed by one instruction
 * @prop {string}            serialOutput       Characters outputted to serial port
 * @prop {Array<number>}     breakpoints        Addresses in which the program should stop (Freezes the program)
 * @prop {Array<string>}     callStack          Addresses the given ROM has called (Not acccurate if the stack moves)
 * @prop {number}            iterationsPerTick  States the amount of times doProgramIteration() is called per tick
 * @prop {number}            masterVolume       Maximum gain of any audio channel
 * 
 */

/**  
 * @type {GlobalVariables}
*/
const Globals = {
    metadata: {
        filename: "",
        gameTitle: "",
        supportsColor: false,
        supportsSGB: false,
        supportsRumble: false,
        ROMSize: 0, // Cartridge ROM size in bytes
        ROMBankNum: 0,
        RAMSize: 0, // Cartridge RAM size in bytes
        RAMBankNum: 0,
    },
    ROM: null,
    MBC: null,
    RAM: new Uint8Array(32 * BYTE_VALUES.KiB),
    HRAM: new Uint8Array(400),
    OAM: new Uint8Array(256),
    VRAM0: new Uint8Array(8 * BYTE_VALUES.KiB),
    VRAM1: new Uint8Array(8 * BYTE_VALUES.KiB),
    OBJCRAM: new Uint8Array(64),
    BGCRAM: new Uint8Array(64),
    cartridgeRAM: null,
    cycleNumber: 0,
    halted: false,
    standby: false,
    frozen: true,
    doubleSpeed: false,
    IME: 0,
    IE: 0x01,
    IMERequested: false,
    serialOutput: "",
    breakpoints: [],
    callStack: [],
    iterationsPerTick: 7000,
    masterVolume: 0.1,
}

Object.preventExtensions(BYTE_VALUES);
Object.preventExtensions(ROMHeaderAddresses);
Object.preventExtensions(Globals);


/**
 * @typedef AudioChannel
 * @prop {"pulse" | "wave" | "noise"}                 type        What type of channel this is. This defines what type
 * @prop {boolean}                                    enabled     Whether the channel is currently enabled
 * @prop {number}                                     dutyCycle   2-bit value that determines the type of pulse wave emitted by pulse wave channels 
 * @prop {number | undefined}                         lfsr        Linear feedback shift register used for pseudo-random noise
 * @prop {Array<Wave> | null | undefined}             waveforms   Collection of waves that the channel can play
 * @prop {PulseWave | CustomWave | NoiseWave | null}  currentWave Current wave that the channel is playing
 */

/** @type {Array<AudioChannel>} */
const audioChannels = [
    {
        type: "pulse",
        enabled: false,
        dutyCycle: 0,
        waveforms: null,
        currentWave: null,
    },
    {
        type: "pulse",
        enabled: false,
        dutyCycle: 0,
        currentWave: null,
    },
    {
        type: "wave",
        enabled: false,
        dutyCycle: 0,
        currentWave: null,
    },
    {
        type: "noise",
        enabled: false,
        dutyCycle: 0,
        lfsr: 0x2A76, // Could be any 15 bit number
        currentWave: null,
    },
];