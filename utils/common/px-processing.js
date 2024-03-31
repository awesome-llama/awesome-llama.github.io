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


export function getImageAsPixelData(targetImage) {
    // WebGL method, get RGBA image pixel data
    // previous canvas method is wrong due to premultiplication
    // https://stackoverflow.com/a/60564905

    const canvas = document.createElement('canvas');
    canvas.width = targetImage.naturalWidth;
    canvas.height = targetImage.naturalHeight;

    const gl = canvas.getContext("webgl2");

    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, targetImage);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    
    let data = new Uint8Array(targetImage.naturalWidth * targetImage.naturalHeight * 4);
    gl.readPixels(0, 0, targetImage.naturalWidth, targetImage.naturalHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);

    // make arrays for each pixel
    let pixelData = [];
    for (let i = 0; i < data.length; i += 4) {
        pixelData.push([data[i], data[i+1], data[i+2], data[i+3]]);
    }

    return pixelData;
}


export function setPixelOrder(image, dimensions, order) {
    // Pixel ordering assuming it started as +x-y
    switch (order) {
        case ("+x+y"):
            let result = [];
            for (let i = image.length-dimensions[0]; i >= 0; i -= dimensions[0]) {
                result.push(image.slice(i, i+dimensions[0]))
            }
            return result.flat();
        
        case ("+x-y"):
            break;
    }
    return image;
}
    

/* The following are used by TextImage */


export const CHARS = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';


export function indicesToTxt(indices) {
    // Convert a list of indices into a string using the character table
    return indices.map(i => CHARS[i]).join('');
}

export function txtToIndices(text) {
    // Convert string into a list of indices using the character table
    return Array.from(text, char => CHARS.indexOf(char));
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
        Math.floor(dec / 65536) % 256,
        Math.floor(dec / 256) % 256,
        Math.floor(dec) % 256,
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

   
export function splitByLengths(data, lengths) {
    // Split indexable data by a list of desired resulting lengths
    const result = [];
    let start = 0;
    for (const length of lengths) {
        result.push(data.slice(start, start + length));
        start += length;
    }
    return result;
}


