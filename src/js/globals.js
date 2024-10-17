/////////////////////////////////////////////////////////////
///////////////////////// Universal /////////////////////////
/////////////////////////////////////////////////////////////

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
 * @prop {number}            iterationsPerTick  States the amount of times doProgramIteration() is called per tick
 * @prop {number}            targetFrequency    How fast the gameboy should run (in mcycles/second)
 * @prop {number}            masterVolume       Maximum gain of any audio channel
 * @prop {boolean}           audioMuted         True if IOValues.audioCtx either doesn't exist or the user has requested to suspend IOValues.audioCtx 
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
    iterationsPerTick: 7000,
    targetFrequency: 4194304,
    masterVolume: 0.1,
    audioMuted: true,
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

/////////////////////////////////////////////////////////////
///////////////////////// Memory/IO /////////////////////////
/////////////////////////////////////////////////////////////

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