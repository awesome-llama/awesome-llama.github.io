/* I have very little experience with JavaScript.
Be warned, this code is probably poorly written! 
If you have feedback, I'd like to hear it. Alternatively, contribute code changes!
*/


export function processImagePreview() {
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

export function copyTextbox() {navigator.clipboard.writeText(document.getElementById('outputTextbox').value)}
export function clearTextbox() {document.getElementById('outputTextbox').value = ""}

export function downloadTextbox() {
    const textareaContent = document.getElementById('outputTextbox').value;

    if (textareaContent == "") {return}
    
    let blob = new Blob([textareaContent], { type: 'text/plain' });

    // Create a link element and set its attributes
    let link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'image.txt';

    // Append the link to the document and trigger a click event
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // is there a better way?
}