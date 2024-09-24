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
            if (file !== null && file.type === "") {
                Globals.ROM = new Uint8Array(await file.arrayBuffer());
            }
            else {
                alert("Invalid ROM")
            }
        }
    }

    if (Globals.ROM) {
        try {
            parseROM(Globals.ROM);
            document.getElementById("game-title").innerText = Globals.metadata.title;
        }
        catch (error) {
            alert(error);
        }
    }
}

function mod(n, m) {
    return ((n % m) + m) % m;
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
    logo = [0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B, 0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D,
        0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E, 0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99,
        0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC, 0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E,];

    for (let i = 0; i < logo.length; i++) {
        if (logo[i] != Globals.ROM[ROMHeaderAddresses.LOGO + i]) {
            throw new Error("Invalid ROM header (Logo not correct)");
        }
    }

    // Check header checksum
    // https://gbdev.io/pandocs/The_Cartridge_Header.html#014d--header-checksum
    checksum = 0;
    for (let address = 0x134; address <= 0x14C; address++) {
        checksum = mod((checksum - Globals.ROM[address] - 1), 256);
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

    Globals.metadata.supportsColor = (Globals.ROM[ROMHeaderAddresses.CGB_FLAG] & 0x80) != 0;
    Globals.metadata.supportsSGB = Globals.ROM[ROMHeaderAddresses.SGB_FLAG] == 0x03;

}

function stringifyROM(rom) {

}
