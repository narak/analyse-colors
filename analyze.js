#!/usr/bin/env node
const fs = require('fs');
const _ = require('lodash/fp');
const glob = require('glob');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const Color = require('color');

// TEMPLATES
const tplClrContainer = `
    <div class="grid-container">
        {{colorBlocks}}
    </div>
`;
const tplClrBlock = `
        <div title="{{title}}" data-tooltip="{{tooltip}}">
            <div style="background-color: {{value}}" class="grid-color-display"></div><br />
            {{name}} <span class="grid-color-count">{{count}}</span>
        </div>
`;

const tplClrHTML = fs.readFileSync(`${__dirname}/color-map.tpl`, 'utf8');

const promises = [];
const extensions = {
    jsx: true,
    js: true,
    ts: true,
    tsx: true,
    less: true,
    cssm: true,
};

const rootDirectory = argv.r || argv.root || '';
const directory = argv.d || argv.directory;
const dirArray = directory
    .split(/,|\s/)
    .map(d => d ? path.join(rootDirectory, d) : false)
    .filter(Boolean);

if (!directory) {
    console.error('no directory supplied. use -d');
}

console.log("Analyzing directories:", dirArray);

const DISTANCE_THRESHOLD = 7;
const colorDifference = ([h1, s1, l1], [h2, s2, l2]) => {
    var sumOfSquares = 0;

    sumOfSquares += Math.pow(h1 - h2, 2);
    sumOfSquares += Math.pow(s1 - s2, 2);
    sumOfSquares += Math.pow(l1 - l2, 2);

    return Math.sqrt(sumOfSquares);
};

const tpl = (string, values = {}) => {
    let replacedStr = string;
    Object.keys(values).forEach(text => {
        const reg = new RegExp('{{' + text + '}}', 'g');
        replacedStr = replacedStr.replace(reg, values[text]);
    });
    return replacedStr;
};

const uniqColors = {};
const setColors = (colors, file) => {
    if (colors) {
        colors.forEach(color => {
            const clr = Color(color).hsl();
            const hslStr = clr.toString();
            if (!uniqColors[hslStr]) {
                uniqColors[hslStr] = {
                    color: clr.color,
                    strings: new Set(),
                    files: new Set(),
                };
            }
            uniqColors[hslStr].strings.add(color);
            uniqColors[hslStr].files.add(file);
        });
    }
};

const each = (obj, cb) => {
    let i = 0;
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            cb(prop, obj[prop], i++);
        }
    }
};

dirArray.forEach(dir => {
    promises.push(
        new Promise(resolve => {
            glob(`${dir}/**/**`, {}, (err, files) => {
                _.flow(
                    _.compact,
                    _.uniq,
                    _.flattenDeep,
                    _.each(file => {
                        const fileBits = file.split('.');
                        const ext =
                            fileBits.length >= 2 ? fileBits[fileBits.length - 1] : undefined;
                        if (!ext || !extensions[ext]) {
                            return;
                        }

                        const trunkFN = file.replace(/^src\/components\//, '');

                        const text = fs.readFileSync(file, 'utf8').replace(/\n/g, '');

                        const hexMatch = /#([0-9a-fA-F]{3,8})/g;
                        const hexResult = text.match(hexMatch);
                        setColors(hexResult, trunkFN);

                        const rgbMatch = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/g;
                        const rgbResult = text.match(rgbMatch);
                        setColors(rgbResult, trunkFN);

                        const hslMatch = /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*(\d+(?:\.\d+)?))?\)/g;
                        const hslResult = text.match(hslMatch);
                        setColors(hslResult, trunkFN);
                    })
                )(files);

                resolve();
            });
        })
    );
});

Promise.all(promises).then(() => {
    const colorCount = Object.keys(uniqColors).length;
    console.log(`Found ${colorCount} unique colors.`);

    const colorMapJSON = `${__dirname}/color-map.json`;
    const colorMapJS = `${__dirname}/color-map.js`;
    const colorMapHTML = `${__dirname}/color-map.html`;

    // The object that is written to the file for config read/writes.
    const colorStats = {};
    const colorNameMap = {};

    // An object that stores the distance between all colors within the distance threshold.
    const distances = {};

    each(uniqColors, (val, color, idx) => {
        const name = 'color' + idx;
        colorStats[name] = {
            hsl: val,
            value: color.color,
            strings: Array.from(color.strings),
            files: Array.from(color.files),
        };
        colorNameMap[val] = name;

        distances[val] = {};
        each(uniqColors, (_val, _color) => {
            if (_val === val) return;
            const dist = colorDifference(color.color, _color.color);
            if (dist <= DISTANCE_THRESHOLD) {
                distances[val][_val] = dist;
            }
        });
    });

    const seen = {};
    const blocks = [];

    each(uniqColors, val => {
        if (!seen[val]) {
            const block = [val];
            seen[val] = true;
            each(distances[val], val2 => {
                seen[val2] = true;
                block.push(val2);
            });
            blocks.push(block);
        }
    });
    const colorBlocksHtml = blocks.map((block, i) => {
        block.sort((a, b) => {
            return colorStats[colorNameMap[a]].files.length <
                colorStats[colorNameMap[b]].files.length
                ? 1
                : -1;
        });
        return tpl(tplClrContainer, {
            colorBlocks: block
                .map(clr => {
                    const name = colorNameMap[clr];
                    return tpl(tplClrBlock, {
                        name,
                        value: clr,
                        count: colorStats[name].files.length,
                        tooltip: colorStats[name].files.map(file => file.replace(rootDirectory, '')).join(', '),
                        title: clr,
                    });
                })
                .join(''),
        });
    });

    console.log('Writing color map JSON:', colorMapJSON);
    fs.writeFileSync(colorMapJSON, JSON.stringify(colorStats, null, 4), 'utf8');
    fs.writeFileSync(colorMapJS, `var ColorsJSON = ${JSON.stringify(colorStats, null, 4)};`, 'utf8');

    console.log('Writing color map HTML:', colorMapHTML);
    fs.writeFileSync(
        colorMapHTML,
        tpl(tplClrHTML, {
            colors: colorBlocksHtml.join(''),
            colorCount,
            clusterCount: blocks.length,
        }),
        'utf8'
    );
});
