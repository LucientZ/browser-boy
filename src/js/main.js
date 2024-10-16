/**
 * 
 * @param {DragEvent} event 
*/
function dragOverHandler(event) {
    event.preventDefault();
}

/**
 * 
 * @param {DragEvent} event 
 */
async function dropHandler(event) {
    event.preventDefault();

    if (event.dataTransfer.items) {
        for (const item of event.dataTransfer.items) {
            const file = item.getAsFile();
            if (file !== null) {
                Globals.ROM = new Uint8Array(await file.arrayBuffer());
                Globals.metadata.filename = file.name;
            }
            else {
                alert(`Invalid ROM got ${file} instead`);
            }
        }
    }

    Globals.halted = true;
    if (Globals.ROM) {
        clearVideoBuffer();
        try {
            parseROM(Globals.ROM);
            document.getElementById("game-title").innerText = `${Globals.metadata.title} Version ${Globals.ROM[ROMHeaderAddresses.ROM_VERSION]}`;
            resetRegs();
        }
        catch (error) {
            alert(error);
        }
    }
    Globals.halted = false;
}

function downloadSaveData() {
    if (Globals.cartridgeRAM) {
        const blob = new Blob([Globals.cartridgeRAM], {
            type: "application/octet-stream"
        });
        const url = (window.URL || window.webkitURL).createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = Globals.metadata.filename.replace(/\.gb.*/, ".sav");
        a.style = "display: none;";
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
    else {
        alert("Cartridge does not have savable data (external RAM)");
    }
}

function uploadSaveData() {
    const input = document.getElementById("save-upload");
    input.click();
}

/**
 * Resets all registers to their default values
 */
function resetRegs() {
    // CPU
    Registers.A = 0x11;
    Registers.Fz = 0x1; // Zero flag
    Registers.Fn = 0x0; // Subtraction flag
    Registers.Fh = 0x0; // Half Carry flag
    Registers.Fc = 0x0; // Carry flag
    Registers.B = 0x00;
    Registers.C = 0x00;
    Registers.D = 0xFF;
    Registers.E = 0x08;
    Registers.H = 0x01;
    Registers.L = 0x0D;
    Registers.SP = 0xFFFE; // Stack Pointer
    Registers.PC = 0x0100; // Program counter

    // MBC
    MBCRegisters.RAMEnable = 0x00;
    MBCRegisters.ROMBankNumber = 0x01;
    MBCRegisters.RAMBankNumber = 0x00;
    MBCRegisters.WRAMBankNumber = 0x01;
    MBCRegisters.bankingModeSelect = 0x00;
    MBCRegisters.RTC = 0x00;

    // IO Registers
    IORegisters.joypad = 0x00;
    IORegisters.serialData = 0x00;
    IORegisters.serialControl = 0x00;
    IORegisters.divider = 0x00;
    IORegisters.timerCounter = 0x00;
    IORegisters.timerModulo = 0x00;
    IORegisters.timerControl = 0x00;
    IORegisters.IF = 0xE0;
    IORegisters.LCDC = 0x80;
    IORegisters.LY = 0x00;
    IORegisters.LYC = 0x00;
    IORegisters.STAT = 0x00;
    IORegisters.SCY = 0x00;
    IORegisters.SCX = 0x00;
    IORegisters.WY = 0x00;
    IORegisters.WX = 0x00;
    IORegisters.backgroundPalette = 0x00;
    IORegisters.OBP0 = 0x00;
    IORegisters.OBP1 = 0x00;
    IORegisters.VRAMBankNumber = 0x00;
    IORegisters.bootROMDisabled = 0x00;

    // Reset audio channels
    for (const channel of audioChannels) {
        if (channel.currentWave) {
            channel.currentWave.stop();
        }
        channel.enabled = false;
    }
}

/**
 * 
 * @param {Uint8Array} rom 
 */
function parseROM(rom) {
    if (rom.length < 0x150) {
        throw new Error("Invalid ROM header size");
    }

    // Check logo
    const logo = [
        0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B, 0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D,
        0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E, 0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99,
        0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC, 0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E,
    ];

    for (let i = 0; i < logo.length; i++) {
        if (logo[i] != Globals.ROM[ROMHeaderAddresses.LOGO + i]) {
            throw new Error("Invalid ROM header (Logo not correct)");
        }
    }

    // Check header checksum
    // https://gbdev.io/pandocs/The_Cartridge_Header.html#014d--header-checksum
    checksum = 0;
    for (let address = 0x134; address <= 0x14C; address++) {
        checksum = (checksum - Globals.ROM[address] - 1) & 0xFF;
    }

    if (checksum != Globals.ROM[ROMHeaderAddresses.HEADER_CHECKSUM]) {
        throw new Error(`Invalid ROM (Checksum Failed) ${checksum} != ${Globals.ROM[ROMHeaderAddresses.HEADER_CHECKSUM]}`);
    }

    // Parse game title
    Globals.metadata.title = "";
    for (let i = ROMHeaderAddresses.TITLE; i < ROMHeaderAddresses.TITLE + 16; i++) {
        characterCode = Globals.ROM[i];
        if (characterCode == 0x00) {
            break;
        }
        Globals.metadata.title += String.fromCharCode(characterCode);
    }

    // ROM Size
    switch (Globals.ROM[ROMHeaderAddresses.ROM_SIZE]) {
        case 0x00:
        case 0x01:
        case 0x02:
        case 0x03:
        case 0x04:
        case 0x05:
        case 0x06:
        case 0x07:
        case 0x08:
            Globals.metadata.ROMSize = 32 * BYTE_VALUES.KiB * (1 << Globals.ROM[ROMHeaderAddresses.ROM_SIZE]);
            Globals.metadata.ROMBankNum = Math.floor(Globals.metadata.ROMSize / (16 * BYTE_VALUES.KiB));
            break;
        case 0x52:
            Globals.metadata.ROMSize = Math.floor(1.1 * BYTE_VALUES.MiB);
            Globals.metadata.ROMBankNum = 72;
            break;
        case 0x53:
            Globals.metadata.ROMSize = Math.floor(1.2 * BYTE_VALUES.MiB);
            Globals.metadata.ROMBankNum = 80;
            break;
        case 0x54:
            Globals.metadata.ROMSize = Math.floor(1.5 * BYTE_VALUES.MiB);
            Globals.metadata.ROMBankNum = 96;
            break;
        default:
            throw new Error("Invalid ROM (Invalid ROM size given)")
    }

    // RAM Size
    switch (Globals.ROM[ROMHeaderAddresses.RAM_SIZE]) {
        case 0x00:
            Globals.metadata.RAMSize = 0;
            Globals.metadata.RAMBankNum = 0;
            break;
        case 0x01:
            Globals.metadata.RAMSize = 0;
            Globals.metadata.RAMBankNum = 0;
            break;
        case 0x02:
            Globals.metadata.RAMSize = 8 * BYTE_VALUES.KiB;
            Globals.metadata.RAMBankNum = 1;
            break;
        case 0x03:
            Globals.metadata.RAMSize = 32 * BYTE_VALUES.KiB;
            Globals.metadata.RAMBankNum = 4;
            break;
        case 0x04:
            Globals.metadata.RAMSize = 128 * BYTE_VALUES.KiB;
            Globals.metadata.RAMBankNum = 16;
            break;
        case 0x05:
            Globals.metadata.RAMSize = 64 * BYTE_VALUES.KiB;
            Globals.metadata.RAMBankNum = 8;
            break;
        default:
            throw new Error("Invalid ROM (Invalid RAM size given)");
    }

    Globals.cartridgeRAM = Globals.metadata.RAMSize ? new Uint8Array(Globals.metadata.RAMSize) : null;

    // MBC type
    // https://gbdev.io/pandocs/The_Cartridge_Header.html#0147--cartridge-type
    switch (Globals.ROM[ROMHeaderAddresses.CARTRIDGE_TYPE]) {
        case 0x00:
        case 0x08:
        case 0x09:
            Globals.MBC = null;
            break;
        case 0x01:
        case 0x02:
        case 0x03:
            Globals.MBC = "MBC1";
            break;
        case 0x05:
        case 0x06:
            Globals.MBC = "MBC2";
            MBCRegisters.builtInRAM = new Uint8Array(512);
            break;
        case 0x0B:
        case 0x0C:
        case 0x0D:
            Globals.MBC = "MMM01";
            break;
        case 0x0F:
        case 0x10:
        case 0x11:
        case 0x12:
        case 0x13:
            Globals.MBC = "MBC3";
            break;
        case 0x19:
        case 0x1A:
        case 0x1B:
        case 0x1C:
        case 0x1D:
        case 0x1E:
            Globals.MBC = "MBC5";
            break;
        case 0x20:
            Globals.MBC = "MBC6";
            break;
        case 0x22:
            Globals.MBC = "MBC7";
            break;
        case 0xFE:
            Globals.MBC = "HuC3"
            break;
        case 0xFF:
            Globals.MBC = "HuC1"
            break;
        default:
            throw new Error("Unsupported cartridge type");
    }

    switch (Globals.ROM[ROMHeaderAddresses.CARTRIDGE_TYPE]) {
        case 0x1C:
        case 0x1D:
        case 0x1E:
        case 0x22:
            Globals.metadata.supportsRumble = true;
        default:
            Globals.metadata.supportsRumble = false;
    }

    // Flags
    Globals.metadata.supportsColor = (Globals.ROM[ROMHeaderAddresses.CGB_FLAG] & 0x80) != 0;
    Globals.metadata.supportsSGB = Globals.ROM[ROMHeaderAddresses.SGB_FLAG] == 0x03;

}

function freezeProgram() {
    Globals.frozen = true;
    for (const channel of audioChannels) {
        if (channel.currentWave) {
            channel.currentWave.stop();
        }
    }
}

function doProgramIteration() {
    doLCDUpdate();
    doTimerUpdate();
    doAudioUpdate();
    handleInterrupts();
    if (!Globals.standby) {
        doNext8BitInstruction();
    }
    else {
        Globals.cycleNumber++;
    }

    if (Globals.HRAM[0x46] !== 0) {
        doDMATransfer();
    }

    // GBC only
    if (IOValues.HDMAInProgress && Globals.metadata.supportsColor) {
        doHDMATransfer();
    }
}

function doProgramTick() {
    if (Globals.ROM && !Globals.frozen) {
        for (let i = 0; i < Globals.iterationsPerTick * (1 << (!!Globals.doubleSpeed)); i++) {
            if (Globals.frozen) {
                break;
            }
            const currentCycles = Globals.cycleNumber;
            doProgramIteration();
            const cycleDelta = Globals.cycleNumber - currentCycles;
            i += cycleDelta;
        }
    }
}

setInterval(() => requestAnimationFrame(flushVideoBuffer), 16.74270);
setInterval(() => {
    updateVRAMInspector();
}, 1000);

window.onload = () => {
    const speedSlider = document.getElementById("runtime-speed-slider");
    speedSlider.value = localStorage.iterationsPerTick || Globals.iterationsPerTick;
    Globals.iterationsPerTick = speedSlider.value;
    speedSlider.oninput = () => {
        Globals.iterationsPerTick = speedSlider.value;
        localStorage.iterationsPerTick = Globals.iterationsPerTick;
    }

    const volumeSlider = document.getElementById("volume-slider");
    volumeSlider.value = localStorage.volumeSliderValue || 10;
    Globals.masterVolume = volumeSlider.value / 100;
    volumeSlider.oninput = () => {
        Globals.masterVolume = volumeSlider.value / 100;
        localStorage.volumeSliderValue = volumeSlider.value;
    }

    const saveDataInput = document.getElementById("save-upload");
    saveDataInput.addEventListener("change", async () => {
        if (typeof saveDataInput.files === "object" && saveDataInput.files.length >= 1) {
            const file = saveDataInput.files[0];
            Globals.cartridgeRAM = new Uint8Array(await file.arrayBuffer());
            resetRegs();
        }
    });
}

(function main() {
    let intervalEndTime = null;
    let intervalID = null;

    function interval() {
        if (intervalEndTime !== null) {
            for (let i = 0; i < (performance.now() - intervalEndTime); i++) {
                doProgramTick();
            }
        }
        intervalEndTime = performance.now();
    }

    intervalID = setInterval(interval);
})();
