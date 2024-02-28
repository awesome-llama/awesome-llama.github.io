/* Utilities for processing pixels */


export function arrayRGBAToRGB(pixelData) {
    let pixelDataRGB = [];
    pixelData.forEach(element => {
        pixelDataRGB.push([
            element[0],
            element[1],
            element[2],
        ])
    });
    return pixelDataRGB;
}



/* The following are used by TextImage */


export const CHARS = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
export const CHAR_LOOKUP = {};
for (let i = 0; i < CHARS.length; i++) {
    CHAR_LOOKUP[CHARS[i]] = i;
}


export function indexToTxt(indices) {
    // characters is a string of all characters
    return indices.map(i => CHARS[i]).join('');
}


export function charIndex(char) {
    // Get the index of a character
    return CHAR_LOOKUP[char];
}





export function colToVolIndex(colour, origin=[0, 0, 0], dimensions=[21, 20, 20]) {
    // Return the index of the colour inside the volume, None if out of bounds

    let relativeColour = [colour[0] - origin[0], colour[1] - origin[1], colour[2] - origin[2]];

    if (
        relativeColour[0] >= 0 && relativeColour[0] < dimensions[0] &&
        relativeColour[1] >= 0 && relativeColour[1] < dimensions[1] &&
        relativeColour[2] >= 0 && relativeColour[2] < dimensions[2]
    ) {
        return dimensions[1] * dimensions[2] * relativeColour[0] + dimensions[2] * relativeColour[1] + relativeColour[2];
    }

    return null;
}


export function volIndexToCol(index, origin=[0, 0, 0], dimensions=[21, 20, 20]) {
    // Return the colour inside the volume, None if out of bounds
    if (index === null) return null;

    if (index >= 0 && index < dimensions[2] * dimensions[1] * dimensions[0]) {
        const relativeColour = [
            Math.floor(index / (dimensions[2] * dimensions[1]) % dimensions[0]),
            Math.floor((index / dimensions[2]) % dimensions[1]),
            Math.floor(index % dimensions[2])
        ];

        return [
            relativeColour[0] + origin[0],
            relativeColour[1] + origin[1],
            relativeColour[2] + origin[2]
        ];
    }

    return null;
}


export function colToFtup(colour) {
    // ftup, or 4-tuple uses a mixed base of (21, 94, 94, 94) for representing a 3-tuple with bases (256, 256, 256).
    let dec = 65536 * colour[0] + 256 * colour[1] + colour[2];
    return [
        Math.floor(dec / (94 * 94 * 94) % 21),
        Math.floor(dec / (94 * 94) % 94),
        Math.floor(dec / 94 % 94),
        dec % 94
    ];
}


export function ftupToCol(ftup) {
    // ftup, or 4-tuple uses a mixed base of (21,94,94,94) for representing a 3-tuple with bases (256,256,256).
    const dec = 830584 * ftup[0] + 8836 * ftup[1] + 94 * ftup[2] + ftup[3];
    return [
        Math.floor((dec / 65536) % 256),
        Math.floor((dec / 256) % 256),
        Math.floor(dec % 256)
    ];
}



export function chunkRLE(chunks, chunkClass) {
    // Perform run-length encoding on an array of chunks.

    function nameEqual(name0, name1) {
        return name0[0] == name1[0] && name0[1] == name1[1];
    }

    let output = [];
    let buffer = [];
    let bufferOp = null;

    function _bufferContents(buffer) {
        let repeatSizeChars = 3 + buffer.length * buffer[0].size;
        let bufferSizeChars = buffer.length * (1 + buffer[0].size);

        if (repeatSizeChars < bufferSizeChars) {
            let cd = [buffer[0].index, buffer.length];
            for (const elem of buffer) {
                cd.push(...elem.data);
            }

            if (repeatSizeChars !== 1 + cd.length) {
                throw new Error('Mismatch in size measurements for RLE');
            }
            
            let rep = new chunkClass('repeat_op', 0, cd)
            //console.debug(rep)
            return [rep];
        } else {
            return buffer;
        }
    }

    for (const chunk of chunks) {
        //console.debug(chunk.toString())
        if (bufferOp !== null && (!nameEqual(bufferOp, chunk.name) || buffer.length >= 93)) {
            output.push(..._bufferContents(buffer));
            buffer = [];
        }

        bufferOp = chunk.name;
        buffer.push(chunk);

        //console.debug(output)
    }

    if (bufferOp !== null) {
        output.push(..._bufferContents(buffer));
    }
    
    return output;
}
