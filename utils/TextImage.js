/* I have very little experience with JavaScript.
Be warned, this code is probably poorly written! 
If you have feedback, I'd like to hear it. Alternatively, contribute code changes!
*/

import { processImagePreview, copyTextArea, downloadTextArea, clearTextArea, downloadImage } from './common/img-converter-ui.js';
import { CHARS, indexToTxt, charIndex, colToVolIndex, volIndexToCol, colToFtup, ftupToCol, chunkRLE } from './common/px-processing.js';
import { CSKV_write, CSKV_read } from './common/cskv-utils.js';


/* ENCODE UI */
const encodeImageInput = document.getElementById('encodeImageInput'); // choose file
const encodeImageCanvas = document.getElementById('encodeImageCanvas'); // image preview
const encodeOutputTextArea = document.getElementById('encodeOutputTextArea'); // output textarea

document.getElementById('encodeConvertTextImage').addEventListener('click', encode);
document.getElementById('encodeCopyTextArea').addEventListener('click', function() {copyTextArea(encodeOutputTextArea)});
document.getElementById('encodeDownloadTextArea').addEventListener('click', function() {downloadTextArea(encodeOutputTextArea)});
document.getElementById('encodeClearTextArea').addEventListener('click', function() {clearTextArea(encodeOutputTextArea)});

encodeImageInput.addEventListener('change', function() {
    processImagePreview(encodeImageInput, encodeImageCanvas) // Trigger when a file is selected
});


/* DECODE UI */
const decodeImageInput = document.getElementById('decodeImageInput'); // choose file
const decodeInputTextArea = document.getElementById('decodeInputTextArea'); // input textarea
const decodeImageCanvas = document.getElementById('decodeImageCanvas'); // output image canvas

document.getElementById('decodeConvertTextImage').addEventListener('click', decode);
document.getElementById('decodeDownloadImage').addEventListener('click', function() {downloadImage(decodeImageCanvas)});

decodeImageInput.addEventListener('change', function() {
    const file = decodeImageInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        decodeInputTextArea.value = e.target.result;
    };

    reader.readAsText(file);
});


function decode() {
    alert("unimplemented")
    throw new Error('unimplemented');
}


/////////////////

function encode() {
    const canvas = encodeImageCanvas;
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
    
    //encodeOutputTextArea.value = pixelData.flat().join('\n'); // testing
    
    const compressionTolerance = document.getElementById('encodeTolerance').value;
    const includeAlpha = document.getElementById('encodeIncludeAlpha').checked;
    const encodeMainAsA8 = document.getElementById('encodeMainUseA8').checked;
    
    encodeOutputTextArea.value = encodeTextImage(pixelData, [canvas.width, canvas.height], compressionTolerance, encodeMainAsA8, includeAlpha);

}


///////////////
// TextImage handling RGBA or RGB

const MAGIC_NUM = 'txtimg'


function encodeTextImage(pixelData, imageDimensions, compressionTolerance=0, mainUseA8=false, includeAlpha=true) {
    // pixelData is a list of 4-element colour channels

    let layers = {};

    // main layer
    if (mainUseA8) {
        layers['main'] = {
            'type':'A8',
            'version':'0',
            'data_stream':compressA8(pixelData.map(element => Math.round(0.25*element[1]+0.5*element[1]+0.25*element[1])), imageDimensions, true, compressionTolerance),
        }
    } else {
        layers['main'] = {
            'type':'RGB8',
            'version':'0',
            'data_stream':compressRGB8(pixelData.map(element => element.slice(0, 3)), imageDimensions, true, compressionTolerance),
        }
    }

    // alpha layer
    if (includeAlpha) {
        const alphaPixelData = pixelData.map(element => [element[3]]).flat()
        if (!(alphaPixelData.every(value => value === 255))) { 
            layers['alpha'] = {
                'type':'A8',
                'version':'0',
                'data_stream':compressA8(alphaPixelData, imageDimensions, true, compressionTolerance),
            }
        }
    }
    
    // Construct file:

    let header = {
        'v': 0,
        'x': imageDimensions[0],
        'y': imageDimensions[1],
        'p': [], // layer properties
    };

    // Layers
    let layerDataStreams = []; // the actual data streams
    for (const [k, l] of Object.entries(layers)) {
        header['p'].push(
            String(k),
            String(l['type']),
            String(l['version']),
            String(l['data_stream'].length)
        );
        layerDataStreams.push(l['data_stream']);
    }

    // Concatenate everything into a single string...
    let file = [];
    file = CSKV_write(header, {magicNumber: MAGIC_NUM, appendComma: false}) + '|' + layerDataStreams.join('');

    return file;
}



function compressA8(datastream, dimensions, RLE=true, lossyTolerance=0) {
    // Compress generic 8 bit per channel data stream (e.g. alpha)

    let chunks = dataStreamToChunksA8(datastream, dimensions, lossyTolerance); // get a list of chunks
    
    if (RLE) chunks = chunkRLE(chunks, ChunkA8); // second pass for RLE

    // final pass to convert chunks into strings:
    const stringChunks = chunks.map(chunk => {
        chunk instanceof ChunkA8;
        return indexToTxt(chunk.indices());
    });

    return stringChunks.join('');
}

function dataStreamToChunksA8(imageArray, dimensions, lossyTolerance=0) {
    function isSimilar(a, b, tol = 0) {
        // Check if two numbers are similar based on a tolerance value.
        return Math.abs(a - b) <= tol;
    }

    function limitA(a) {
        // Ensure generic value is an int in the range 0-255.
        return Math.max(0, Math.min(255, parseInt(a)));
    }

    function addVal(colour) {
        colPrev.unshift(colour);
        colPrev.pop();
    }

    const A8_DEFAULT_VAL = 0; 
    const colPrev = new Array(dimensions[0] + 2).fill(A8_DEFAULT_VAL);
    const chunks = [];

    for (const col of imageArray) {
        const limitedCol = limitA(col);

        // find chunk to encode with:
        if (isSimilar(limitedCol, colPrev[0], lossyTolerance)) {
            chunks.push(new ChunkA8('copy_prev'));
            addVal(limitedCol);
            continue;
        }

        if (isSimilar(limitedCol, colPrev[dimensions[0] - 2], lossyTolerance)) {
            chunks.push(new ChunkA8('copy_vert_fwd'));
            addVal(limitedCol);
            continue;
        }

        if (isSimilar(limitedCol, colPrev[dimensions[0] - 1], lossyTolerance)) {
            chunks.push(new ChunkA8('copy_vert'));
            addVal(limitedCol);
            continue;
        }

        if (isSimilar(limitedCol, colPrev[dimensions[0]], lossyTolerance)) {
            chunks.push(new ChunkA8('copy_vert_back'));
            addVal(limitedCol);
            continue;
        }

        const diff = (((limitedCol - colPrev[0]) + 128) % 256) - 128;

        if (0 < diff && diff < 42) {
            chunks.push(new ChunkA8('inc', diff-1));
            addVal(limitedCol);
            continue;
        }

        if (-42 < diff && diff < 0) {
            chunks.push(new ChunkA8('dec', -1-diff));
            addVal(limitedCol);
            continue;
        }

        // raw pixel, do not compress
        chunks.push(new ChunkA8('raw', Math.floor(limitedCol / 94), [limitedCol % 94]));
        addVal(limitedCol);
    }

    return chunks;
}




function compressRGB8(datastream, dimensions, RLE=true, lossyTolerance=0) {
    // Compress RGB 8 bit per channel data stream

    let chunks = dataStreamToChunksRGB8(datastream, dimensions, lossyTolerance); // get a list of chunks

    if (RLE) {chunks = chunkRLE(chunks, ChunkRGB8)} // second pass for RLE

    // final pass to convert chunks into strings:
    const stringChunks = chunks.map(chunk => {
        chunk instanceof ChunkRGB8;
        return indexToTxt(chunk.indices());
    });

    return stringChunks.join('');
}

function dataStreamToChunksRGB8(imageArray, dimensions, lossyTolerance=0) {
    // Convert an array of pixels into chunks

    const RGB8_DEFAULT_VAL = [0,0,0]
    const VOLUMES = [[[-2,-1,-1],[5,4,4],1],[[-2,3,-1],[5,4,4],1],[[-2,-5,-1],[5,4,4],1],[[-2,-5,2],[5,4,4],1],[[-2,3,2],[5,4,4],1],[[-2,-1,2],[5,4,4],1],[[-2,-5,-5],[5,4,4],1],[[-2,3,-5],[5,4,4],1],[[-2,-1,-5],[5,4,4],1],[[3,-1,-5],[5,4,4],1],[[3,3,-5],[5,4,4],1],[[3,-5,-5],[5,4,4],1],[[3,-1,2],[5,4,4],1],[[3,3,2],[5,4,4],1],[[3,-5,2],[5,4,4],1],[[3,-5,-1],[5,4,4],1],[[3,3,-1],[5,4,4],1],[[3,-1,-1],[5,4,4],1],[[8,-1,-1],[5,4,4],1],[[8,3,-1],[5,4,4],1],[[8,-5,-1],[5,4,4],1],[[8,-5,2],[5,4,4],1],[[8,3,2],[5,4,4],1],[[8,-1,2],[5,4,4],1],[[8,-5,-5],[5,4,4],1],[[8,3,-5],[5,4,4],1],[[8,-1,-5],[5,4,4],1],[[-7,-1,-5],[5,4,4],1],[[-7,3,-5],[5,4,4],1],[[-7,-5,-5],[5,4,4],1],[[-7,-1,2],[5,4,4],1],[[-7,3,2],[5,4,4],1],[[-7,-5,2],[5,4,4],1],[[-7,-5,-1],[5,4,4],1],[[-7,3,-1],[5,4,4],1],[[-7,-1,-1],[5,4,4],1],[[-12,-1,-1],[5,4,4],1],[[-12,3,-1],[5,4,4],1],[[-12,-5,-1],[5,4,4],1],[[-12,-5,2],[5,4,4],1],[[-12,3,2],[5,4,4],1],[[-12,-1,2],[5,4,4],1],[[-12,-5,-5],[5,4,4],1],[[-12,3,-5],[5,4,4],1],[[-12,-1,-5],[5,4,4],1],[[-10,7,-9],[21,20,20],2],[[-10,-25,-9],[21,20,20],2],[[-10,-9,7],[21,20,20],2],[[-10,-9,-24],[21,20,20],2],[[11,-9,-8],[21,20,20],2],[[-31,-9,-8],[21,20,20],2],[[32,-9,-8],[21,20,20],2],[[-52,-9,-8],[21,20,20],2],[[53,-9,-8],[21,20,20],2],[[-73,-9,-8],[21,20,20],2],[[11,-9,-24],[21,20,20],2],[[11,-9,7],[21,20,20],2],[[11,-25,-9],[21,20,20],2],[[11,7,-9],[21,20,20],2],[[-31,7,-9],[21,20,20],2],[[-31,-25,-9],[21,20,20],2],[[-31,-9,7],[21,20,20],2],[[-10,11,-29],[21,20,20],2]]

    function addColour(colour) {
        colPrev.unshift(colour);
        colPrev.pop();
        colTable[(colour[0] * 3 + colour[1] * 5 + colour[2] * 7) % 94] = colour; // hashed index
    }

    function limitRGB(col) {
        // Ensure the colour is a 3-tuple of ints in the range 0-255
        const r = Math.max(0, Math.min(255, Math.round(col[0])));
        const g = Math.max(0, Math.min(255, Math.round(col[1])));
        const b = Math.max(0, Math.min(255, Math.round(col[2])));
        return [r, g, b];
    }

    function RGBToYUV(rgb) {
        // R'G'B' to Y'UV (g, b-g, r-g)
        return [rgb[1], rgb[2] - rgb[1], rgb[0] - rgb[1]];
    }

    function isSimilar(a, b, tol = 0) {
        // Check if two RGB colours are similar based on a tolerance value.
        if (tol === 0) return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    
        tol /= 255;
        const G = 0.45; // gamma
        const a2 = [(a[0] / 255) ** G, (a[1] / 255) ** G, (a[2] / 255) ** G];
        const b2 = [(b[0] / 255) ** G, (b[1] / 255) ** G, (b[2] / 255) ** G];
    
        return (Math.abs(a2[0] - b2[0]) <= tol && Math.abs(a2[1] - b2[1]) <= tol && Math.abs(a2[2] - b2[2]) <= tol);
    }

    function similarInList(srcList, find, tol = 0) {
        // Check if an item exists in a source list and return index if so.
        for (let i = 0; i < srcList.length; i++) {
            if (isSimilar(srcList[i], find, tol)) return i
        }
        return null;
    }

    let colPrev = new Array(dimensions[0] + 2).fill(RGB8_DEFAULT_VAL);
    let colTable = new Array(CHARS.length).fill(RGB8_DEFAULT_VAL);
    let chunks = [];
    
    for (const col of imageArray) {
        let limitedCol = limitRGB(col);

        // find chunk to encode with:
        if (isSimilar(limitedCol, colPrev[0], lossyTolerance)) {
            chunks.push(new ChunkRGB8('copy_prev'));
            addColour(colPrev[0]);
            continue;
        }

        if (isSimilar(limitedCol, colPrev[dimensions[0] - 2], lossyTolerance)) {
            chunks.push(new ChunkRGB8('copy_vert_fwd'));
            addColour(colPrev[dimensions[0] - 2]);
            continue;
        }

        if (isSimilar(limitedCol, colPrev[dimensions[0] - 1], lossyTolerance)) {
            chunks.push(new ChunkRGB8('copy_vert'));
            addColour(colPrev[dimensions[0] - 1]);
            continue;
        }

        if (isSimilar(limitedCol, colPrev[dimensions[0] + 0], lossyTolerance)) {
            chunks.push(new ChunkRGB8('copy_vert_back'));
            addColour(colPrev[dimensions[0] + 0]);
            continue;
        }

        const similarIndex = similarInList(colTable, limitedCol, lossyTolerance);
        if (similarIndex !== null) {
            chunks.push(new ChunkRGB8('hash_table', 0, [similarIndex]));
            addColour(colTable[similarIndex]);
            continue;
        }

        let inVolume = false;
        let colDiff = [limitedCol[0] - colPrev[0][0], limitedCol[1] - colPrev[0][1], limitedCol[2] - colPrev[0][2]];
        let YUVDiff = RGBToYUV(colDiff);

        for (let i = 0; i < VOLUMES.length; i++) {
            let volume = VOLUMES[i];
            let index = colToVolIndex(YUVDiff, volume[0], volume[1]);

            if (index !== null) {
                if (volume[2] === 1) {
                    chunks.push(new ChunkRGB8('vol', i, [index]));
                } else if (volume[2] === 2) {
                    chunks.push(new ChunkRGB8('vol', i, [Math.floor(index / 94), index % 94]));
                } else {
                    throw new Error('Volume size disallowed (waste of space)');
                }

                addColour(limitedCol);
                inVolume = true;
                break;
            }
        }

        // raw pixel, do not compress
        if (!inVolume) {
            const ftup = colToFtup(limitedCol);
            chunks.push(new ChunkRGB8('raw', ftup[0], [...ftup.slice(1)]));
            addColour(limitedCol);
        }
    }

    return chunks;
}









///////////////////
/* CHUNK CLASSES */
///////////////////

const RGB8_OPERATIONS = [["raw",0,3],["raw",1,3],["raw",2,3],["raw",3,3],["raw",4,3],["raw",5,3],["raw",6,3],["raw",7,3],["raw",8,3],["raw",9,3],["raw",10,3],["raw",11,3],["raw",12,3],["raw",13,3],["raw",14,3],["raw",15,3],["raw",16,3],["raw",17,3],["raw",18,3],["raw",19,3],["raw",20,3],["unassigned",3,0],["copy_prev",0,0],["copy_vert_fwd",0,0],["copy_vert",0,0],["copy_vert_back",0,0],["hash_table",0,1],["repeat_op",0,null],["vol",0,1],["vol",1,1],["vol",2,1],["vol",3,1],["vol",4,1],["vol",5,1],["vol",6,1],["vol",7,1],["vol",8,1],["vol",9,1],["vol",10,1],["vol",11,1],["vol",12,1],["vol",13,1],["vol",14,1],["vol",15,1],["vol",16,1],["vol",17,1],["vol",18,1],["vol",19,1],["vol",20,1],["vol",21,1],["vol",22,1],["vol",23,1],["vol",24,1],["vol",25,1],["vol",26,1],["vol",27,1],["vol",28,1],["vol",29,1],["vol",30,1],["vol",31,1],["vol",32,1],["vol",33,1],["vol",34,1],["vol",35,1],["vol",36,1],["vol",37,1],["vol",38,1],["vol",39,1],["vol",40,1],["vol",41,1],["vol",42,1],["vol",43,1],["vol",44,1],["vol",45,2],["vol",46,2],["vol",47,2],["vol",48,2],["vol",49,2],["vol",50,2],["vol",51,2],["vol",52,2],["vol",53,2],["vol",54,2],["vol",55,2],["vol",56,2],["vol",57,2],["vol",58,2],["vol",59,2],["vol",60,2],["vol",61,2],["vol",62,2],["unassigned",0,0],["unassigned",1,0],["unassigned",2,0]]
const RGB8_OPERATIONS_DICT = Object.fromEntries(RGB8_OPERATIONS.map((o, i) => [[o[0], o[1]], i]));

class ChunkRGB8 {
    /* A single chunk containing operation name and data */
    
    constructor(short_name, short_name_index = 0, op_data = []) {
        if (short_name === null) {
            this.name = [short_name, short_name_index];
            this.index = null;
            this.size = null;
            this.data = op_data;
            return;
        }

        this.name = [short_name, short_name_index];
        this.index = RGB8_OPERATIONS_DICT[this.name];
        this.size = RGB8_OPERATIONS[this.index][2];

        if (this.index === undefined) {throw new Error(`Unrecognised operation name: ${this.name}`);}
        if (this.size !== null && op_data.length !== this.size) {throw new Error('Data does not match expected length');}

        this.data = op_data;
    }

    toString() {
        return `${this.constructor.name}(${this.name[0]}${this.name[1]} [${this.data}])`;
    }

    indices() {
        return [this.index, ...this.data];
    }
}


const A8_OPERATIONS = [["raw",0,1],["raw",1,1],["raw",2,1],["copy_prev",0,0],["copy_vert_fwd",0,0],["copy_vert",0,0],["copy_vert_back",0,0],["repeat_op",0,null],["inc",0,0],["inc",1,0],["inc",2,0],["inc",3,0],["inc",4,0],["inc",5,0],["inc",6,0],["inc",7,0],["inc",8,0],["inc",9,0],["inc",10,0],["inc",11,0],["inc",12,0],["inc",13,0],["inc",14,0],["inc",15,0],["inc",16,0],["inc",17,0],["inc",18,0],["inc",19,0],["inc",20,0],["inc",21,0],["inc",22,0],["inc",23,0],["inc",24,0],["inc",25,0],["inc",26,0],["inc",27,0],["inc",28,0],["inc",29,0],["inc",30,0],["inc",31,0],["inc",32,0],["inc",33,0],["inc",34,0],["inc",35,0],["inc",36,0],["inc",37,0],["inc",38,0],["inc",39,0],["inc",40,0],["inc",41,0],["inc",42,0],["dec",0,0],["dec",1,0],["dec",2,0],["dec",3,0],["dec",4,0],["dec",5,0],["dec",6,0],["dec",7,0],["dec",8,0],["dec",9,0],["dec",10,0],["dec",11,0],["dec",12,0],["dec",13,0],["dec",14,0],["dec",15,0],["dec",16,0],["dec",17,0],["dec",18,0],["dec",19,0],["dec",20,0],["dec",21,0],["dec",22,0],["dec",23,0],["dec",24,0],["dec",25,0],["dec",26,0],["dec",27,0],["dec",28,0],["dec",29,0],["dec",30,0],["dec",31,0],["dec",32,0],["dec",33,0],["dec",34,0],["dec",35,0],["dec",36,0],["dec",37,0],["dec",38,0],["dec",39,0],["dec",40,0],["dec",41,0],["dec",42,0]]
const A8_OPERATIONS_DICT = Object.fromEntries(A8_OPERATIONS.map((o, i) => [[o[0], o[1]], i]));

class ChunkA8 {
    /* A single chunk containing operation name and data */
    
    constructor(short_name, short_name_index = 0, op_data = []) {
        if (short_name === null) {
            this.name = [short_name, short_name_index];
            this.index = null;
            this.size = null;
            this.data = op_data;
            return;
        }

        this.name = [short_name, short_name_index];
        this.index = A8_OPERATIONS_DICT[this.name];
        this.size = A8_OPERATIONS[this.index][2];

        if (this.index === undefined) {throw new Error(`Unrecognised operation name: ${this.name}`);}
        if (this.size !== null && op_data.length !== this.size) {throw new Error('Data does not match expected length');}

        this.data = op_data;
    }

    toString() {
        return `${this.constructor.name}(${this.name[0]}${this.name[1]} [${this.data}])`;
    }

    indices() {
        return [this.index, ...this.data];
    }
}

