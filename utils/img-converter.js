/* I have very little experience with JavaScript.
Be warned, this code is probably poorly written! 
If you have feedback, I'd like to hear it. Alternatively, contribute code changes!
*/

function processImagePreview() {
    // For displaying the image preview in a canvas
    const input = document.getElementById('imageInput');
    const canvas = document.getElementById('imageCanvas');
    const context = canvas.getContext('2d', {willReadFrequently: true});
    
    let file = input.files[0];
    let reader = new FileReader();

    reader.onload = function (e) {
        let img = new Image();
        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
            document.getElementById("imageStats").innerText = `dimensions: ${img.width}x${img.height}, total pixels: ${img.width*img.height}`;
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

// Trigger processImagePreview when a file is selected
document.getElementById('imageInput').addEventListener('change', processImagePreview);


function copyTextbox() {
    navigator.clipboard.writeText(document.getElementById('outputTextbox').value)
}


function clearTextbox() {
    document.getElementById('outputTextbox').value = "";
}


function downloadTextbox() {
    const textareaContent = document.getElementById('outputTextbox').value;

    if (textareaContent == "") {
        return;
    }
    
    // Create a Blob containing the text
    let blob = new Blob([textareaContent], { type: 'text/plain' });

    // Create a link element and set its attributes
    let link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'image.txt';

    // Append the link to the document and trigger a click event
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


function convertImage() {
    // Get pixel values as list
    const canvas = document.getElementById('imageCanvas');
    const context = canvas.getContext('2d');
    const outputTextArea = document.getElementById('outputTextbox');

    let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    let pixelData = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
        let rgba = [
            imageData.data[i],     // Red
            imageData.data[i + 1], // Green
            imageData.data[i + 2], // Blue
            imageData.data[i + 3]  // Alpha
        ];
        pixelData.push(rgba);
    }

    // get properties
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

    

    // choose correct encoder for pixelData
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


function arrayRGBAToRGB(pixelData) {
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

