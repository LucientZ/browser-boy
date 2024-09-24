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
        }
    }

    if (GLOBALS.ROM) {
    }
}

function stringifyROM(rom) {
    
}
