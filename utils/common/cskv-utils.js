/* I have very little experience with JavaScript.
Be warned, this code is probably poorly written! 
If you have feedback, I'd like to hear it. Alternatively, contribute code changes!
*/

// Comma-separated key-value pairs... CSKV
// https://awesome-llama.github.io/articles/my-save-code-format
// utilities for reading/writing


export function CSKV_write(data, {magicNumber = null, appendComma = true, includeListLength = true} = {}) {
    // Write a CSKV string. `appendComma` ensures the final item ends with a comma. `includeListLength` inserts the number of list items immediately after the key name.

    function validString(string) {
        // Raise exception if string contains an invalid character, otherwise return string
        string = String(string);
        if (string.includes(',') || string.includes(':')) {
            throw new Error(`${string} contains an invalid character`);
        }
        return string;
    }

    let cskv = [];
    if (magicNumber !== null) {
        cskv.push(validString(magicNumber));
    }

    for (let [k, v] of Object.entries(data)) {
        if (Array.isArray(v) || v instanceof Set) {
            if (includeListLength) {
                v = v.length + ',' + [...v].map(validString).join(',');
            } else {
                v = [...v].map(validString).join(',');
            }
        } else {
            v = validString(v);
        }

        cskv.push(`${validString(k)}:${v}`);
    }

    cskv = cskv.join(',');
    if (appendComma) {
        cskv += ','; // include end comma
    }

    return cskv;
}



export function CSKV_read(data, {removeMagicNumber = false, removeEndComma = true, removeListLength = false} = {}) {
    // Read a CSKV string and return a dictionary. Params make assumptions on the written data as the format does not specify it. See `CSKV_write` for their purpose.

    let items = String(data).split(',');
    if (removeMagicNumber) {
        items.shift();
    }
    if (removeEndComma) {
        items.pop(); // remove empty string at the end
    }

    let output = {};
    let current_key = null; // empty string as key (used by magic number)

    for (let item of items) {
        if (item.includes(':')) {
            let [k, ...v] = item.split(':'); // split the string into a variable and a list for everything after it
            
            if (v.length > 1) {
                throw new Error('unexpected colon');
            }

            output[k] = v;
            current_key = k;
        } else if (current_key === null) {
            output[null] = [item];
        } else {
            output[current_key].push(item);
        }
    }

    // clean up the output
    let output_clean = {};
    for (let [k, v] of Object.entries(output)) {
        if (Array.isArray(v)) {
            if (v.length === 1) {
                v = v[0]; // remove list for single items
            } else if (removeListLength && (v.length>1)) {
                if (v[0] === '0') {
                    v = []; // empty list
                } else {
                    v.shift(); // remove length element
                }
            }

            output_clean[k] = v;
        } else {
            throw new Error('not a list');
        }
    }

    return output_clean;
}


function test_CSKV() {
    // Example usage
    let temp;

    // Original dictionary
    temp = {'a': 1, 'b': 2, 'c': 3, 'd': 4};
    console.log(temp);

    // CSKV_write
    temp = CSKV_write(temp);
    console.log(temp);

    // CSKV_read
    console.log(JSON.stringify(CSKV_read("a:1,b:2,c:3,d:4,")));
    console.log('');

    // Lists
    temp = {'a': [555], 'b': [100, 'test0'], 'c': [], 'd': ['test2', 'test3']};
    console.log(JSON.stringify(temp));
    temp = CSKV_write(temp);
    console.log(JSON.stringify(temp));
    console.log(JSON.stringify(CSKV_read(temp)));
    console.log('');

    // Magic number
    temp = {'a': 'apple', 'b': 'banana', 'c': []};
    console.log(JSON.stringify(temp));
    temp = CSKV_write(temp, 'MAGIC NUM');
    console.log(JSON.stringify(temp));
    console.log(JSON.stringify(CSKV_read(temp)));
    console.log('');

    // Combined
    temp = {'a': 'apple', 'b': 'banana', 'c': [], 'd': ['test2', 'test3']};
    console.log(JSON.stringify(temp));
    temp = CSKV_write(temp, 'MAGIC NUM');
    console.log(JSON.stringify(temp));
    console.log(JSON.stringify(CSKV_read(temp, {removeListLength: true})));
    console.log('');
}