/* I have very little experience with JavaScript.
Be warned, this code is probably poorly written! 
If you have feedback, I'd like to hear it. Alternatively, contribute code changes!
*/


import { arrayRGBAToRGB } from './px-processing.js';
import { processImagePreview, copyTextbox, downloadTextbox, clearTextbox } from './converter-ui.js';

// Buttons
document.getElementById('convertImage').addEventListener('click', convertImage);
document.getElementById('copyTextbox').addEventListener('click', copyTextbox);
document.getElementById('downloadTextbox').addEventListener('click', downloadTextbox);
document.getElementById('clearTextbox').addEventListener('click', clearTextbox);

// Trigger processImagePreview when a file is selected
document.getElementById('imageInput').addEventListener('change', processImagePreview);


function convertImage() {
    const canvas = document.getElementById('imageCanvas');
    const context = canvas.getContext('2d', {willReadFrequently: true});
    const outputTextArea = document.getElementById('outputTextbox');

    // Get pixel values as array
    let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    let pixelData = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
        pixelData.push([imageData.data[i], imageData.data[i+1], imageData.data[i+2], imageData.data[i+3]]);
    }

    // Pixel ordering
    switch (document.getElementById('pixelOrder').value) {
        case ("+x+y"):
            let result = [];
            for (let i = pixelData.length-canvas.width; i >= 0; i -= canvas.width) {
                result.push(pixelData.slice(i, i+canvas.width))
            }
            pixelData = result.flat();
            break;
        
        case ("+x-y"):
            break;
        
        default:
            alert("Unknown pixel order");
    }

    // Choose correct encoder for pixelData
    switch (document.getElementById('encodingFormat').value) {
        case ("RGBA list"):
            outputTextArea.value = pixelData.flat().join('\n');
            break;

        case ("RGBA JSON"):
            outputTextArea.value = JSON.stringify(pixelData, null, 0);
            break;
        
        case ("RGB list"):
            outputTextArea.value = arrayRGBAToRGB(pixelData).flat().join('\n');
            break;
        
        case ("Combined RGB list"):
            outputTextArea.value = arrayRGBAToRGB(pixelData).map(e => [65536*e[0] + 256*e[1] + e[2]]).flat().join('\n');
            break;
            
        case ("RGB JSON"):
            outputTextArea.value = JSON.stringify(arrayRGBAToRGB(pixelData), null, 0);
            break;
        
        default:
            alert("Unknown format");

    }
}
