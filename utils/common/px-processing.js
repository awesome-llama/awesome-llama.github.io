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


export const CHARS = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'

export function index_to_txt(indices) {
    // characters is a string of all characters
    return indices.map(i => CHARS[i]).join('');
}


export function col_to_vol_index(colour, origin=[0, 0, 0], dimensions=[21, 20, 20]) {
    // Return the index of the colour inside the volume, None if out of bounds

    let relative_colour = [colour[0] - origin[0], colour[1] - origin[1], colour[2] - origin[2]];

    if (
        relative_colour[0] >= 0 && relative_colour[0] < dimensions[0] &&
        relative_colour[1] >= 0 && relative_colour[1] < dimensions[1] &&
        relative_colour[2] >= 0 && relative_colour[2] < dimensions[2]
    ) {
        return dimensions[1] * dimensions[2] * relative_colour[0] + dimensions[2] * relative_colour[1] + relative_colour[2];
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