/* I have very little experience with JavaScript.
Be warned, this code is probably poorly written! 
If you have feedback, I'd like to hear it. Alternatively, contribute code changes!
*/

export function processImagePreview(targetImageInput, targetImageCanvas) {
    // For displaying the image preview in a canvas
    const context = targetImageCanvas.getContext('2d', {willReadFrequently: true});
    const file = targetImageInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        let img = new Image();
        img.onload = function () {
            targetImageCanvas.width = img.width;
            targetImageCanvas.height = img.height;
            context.drawImage(img, 0, 0);
            document.getElementById("imageStats").innerText = `dimensions: ${img.width}x${img.height}, total pixels: ${img.width*img.height}`;
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

export function copyTextArea(targetTextArea) {
    navigator.clipboard.writeText(targetTextArea.value);
}

export function clearTextArea(targetTextArea) {
    targetTextArea.value = "";
}

export function downloadTextArea(targetTextArea) {
    const textareaContent = targetTextArea.value;
    
    if (textareaContent.trim() == "") return;
    
    let blob = new Blob([textareaContent], { type: 'text/plain' });

    // create a link element and set its attributes
    let link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'image.txt';

    // append the link to the document and trigger a click event
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


export function downloadImage(targetImageCanvas) {
    // Download a canvas as an image

    targetImageCanvas.toBlob(function(blob) {
        // create image
        const url = URL.createObjectURL(blob);

        // create a link element and set its attributes
        let link = document.createElement('a');
        link.download = 'image.png';
        link.href = url
        
        // append the link to the document and trigger a click event
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    })
}