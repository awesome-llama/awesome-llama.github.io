/* I have very little experience with JavaScript.
Be warned, this code is probably poorly written! 
If you have feedback, I'd like to hear it. Alternatively, contribute code changes!
*/

import {} from './common/px-processing.js';
import { processImagePreview, copyTextArea, downloadTextArea, clearTextArea } from './common/img-converter-ui.js';

const outputTextArea = document.getElementById('outputTextArea');
const targetImageInput = document.getElementById('imageInput');
const targetImageCanvas = document.getElementById('imageCanvas');

document.getElementById('encodeTextImage').addEventListener('click', encodeTextImage);
document.getElementById('copyTextArea').addEventListener('click', function() {copyTextArea(outputTextArea)});
document.getElementById('downloadTextArea').addEventListener('click', function() {downloadTextArea(outputTextArea)});
document.getElementById('clearTextArea').addEventListener('click', function() {clearTextArea(outputTextArea)});

targetImageInput.addEventListener('change', function() {
    processImagePreview(targetImageInput, targetImageCanvas) // Trigger when a file is selected
});


function encodeTextImage() {
    const canvas = targetImageCanvas;
    const context = canvas.getContext('2d', {willReadFrequently: true});

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
    outputTextArea.value = pixelData.flat().join('\n');

}

