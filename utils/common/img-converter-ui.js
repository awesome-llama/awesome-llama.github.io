

export function processImagePreview(targetImageFileInput, targetImagePreview, targetImageStats) {
    // Create an image, set image element to it
    const file = targetImageFileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        targetImagePreview.onload = function () {
            const img = targetImagePreview;
            targetImageStats.innerText = `dimensions: ${img.naturalWidth}x${img.naturalHeight}, total pixels: ${img.naturalWidth*img.naturalHeight}`;
        }

        targetImagePreview.src = e.target.result;
        targetImagePreview.style.display = 'block';
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