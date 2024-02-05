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