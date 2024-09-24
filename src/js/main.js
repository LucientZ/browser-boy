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
                console.log(file);
                GLOBALS.ROM = new Uint8Array(await file.arrayBuffer());
            }
            else{
                alert("Invalid ROM")
            }
        }
    }

    if (GLOBALS.ROM) {
        parseROM(GLOBALS.ROM);
    }
}

/**
 * 
 * @param {Uint8Array} rom 
 */
function parseROM(rom) {
    if(rom.length < 0x150){
        alert("Invalid ROM");
        return
    }

    GLOBALS.GAME_TITLE = "";
    for(let i = RomHeaderAddresses.TITLE; i < RomHeaderAddresses.TITLE + 16; i++){
        characterCode = GLOBALS.ROM[i];
        if(characterCode == 0x00){
            break;
        }
        GLOBALS.GAME_TITLE += String.fromCharCode(character);
    }

    console.log(GLOBALS.GAME_TITLE);
}

function stringifyROM(rom) {

}
