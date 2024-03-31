
import { setPixelOrder, getImageAsPixelData, arrayRGBAToRGB } from './common/px-processing.js';
import { processImagePreview, copyTextArea, downloadTextArea, clearTextArea } from './common/img-converter-ui.js';

const outputTextArea = document.getElementById('outputTextArea');
const imageFileInput = document.getElementById('imageFileInput');
const imagePreview = document.getElementById('imagePreview');
const imageStats = document.getElementById('imageStats');

document.getElementById('convertImageToText').addEventListener('click', convertImageToText);
document.getElementById('copyTextArea').addEventListener('click', function() {copyTextArea(outputTextArea)});
document.getElementById('downloadTextArea').addEventListener('click', function() {downloadTextArea(outputTextArea)});
document.getElementById('clearTextArea').addEventListener('click', function() {clearTextArea(outputTextArea)});

imageFileInput.addEventListener('change', function() {
    processImagePreview(imageFileInput, imagePreview, imageStats); // Trigger when a file is selected
});


function pad(value, targetLength, padChar="0") {
    // Add chars to the start of a string until it reaches a given length.
    let outputVal = value.toString();
    while (outputVal.length < targetLength) {outputVal = padChar + outputVal}
    return outputVal;
}


function convertImageToText() {
    /* Image converter function - convert to various text formats (but not TextImage) */ 
    if (imagePreview.src == '') {return null}

    let pixelData = getImageAsPixelData(imagePreview);
    pixelData = setPixelOrder(pixelData, [imagePreview.naturalWidth, imagePreview.naturalHeight], document.getElementById('pixelOrder').value);

    // generate an array of colours using the correct colour format
    switch (document.getElementById('colourFormat').value) { 
        case ("RGB int"):
            pixelData = arrayRGBAToRGB(pixelData);
            break;

        case ("RGBA int"):
            // this is the original format
            break;
        
        case ("c RGB int"):
            pixelData = pixelData.map(e => (65536*e[0] + 256*e[1] + e[2]));
            break;
        
        case ("c ARGB int"):
            pixelData = pixelData.map(e => (16777216*e[3] + 65536*e[0] + 256*e[1] + e[2]));
            break;
            
        case ("c RGB hex"):
            pixelData = pixelData.map(e => pad((65536*e[0] + 256*e[1] + e[2]).toString(16), 6));
            break;

        case ("c ARGB hex"):
            pixelData = pixelData.map(e => pad((16777216*e[3] + 65536*e[0] + 256*e[1] + e[2]).toString(16), 8));
            break;
    }

    switch (encodingFormat.value) {
        case ("JSON"):
            outputTextArea.value = JSON.stringify(pixelData, null, 0);
            break;
        case ("text"):
            const delimiters = {'newline':'\n', 'space':' ', 'none':'', 'comma':',', 'underscore':'_'};
            outputTextArea.value = pixelData.flat().join(delimiters[document.getElementById('textDelimiter').value]);
            break;
    }

    document.getElementById('encodedTextImageStats').innerText = `length (chars): ${outputTextArea.value.length}`;
}

