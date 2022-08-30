#!/usr/bin/env node
const fs = require('fs');
const _ = require('lodash/fp');
const glob = require('glob');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const Color = require('color');

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

const uniqColors = {};
const setColors = (colors, file) => {
    if (colors) {
        colors.forEach(color => {
            const clr = Color(color).rgb();
            const str = clr.toString();
            if (!uniqColors[str]) {
                uniqColors[str] = {
                    color: clr.color,
                    alpha: clr.alpha(),
                    luminosity: clr.luminosity(),
                    strings: new Set(),
                    files: new Set(),
                };
            }
            uniqColors[str].strings.add(color);
            uniqColors[str].files.add(file);
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

function RGBAtoRGB(r, g, b, a, r2, g2, b2) {
    const r3 = Math.round(((1 - a) * r2) + (a * r))
    const g3 = Math.round(((1 - a) * g2) + (a * g))
    const b3 = Math.round(((1 - a) * b2) + (a * b))
    return [r3, g3, b3];
}

Promise.all(promises).then(() => {
    const colorCount = Object.keys(uniqColors).length;
    console.log(`Found ${colorCount} unique colors.`);

    const colorMapJSON = `${__dirname}/color-map.json`;
    const colorMapJS = `${__dirname}/color-map.js`;

    // The object that is written to the file for config read/writes.
    const colorStats = {};

    each(uniqColors, (val, color, idx) => {
        const name = 'color' + idx;
        colorStats[name] = {
            name: val,
            value: color.color,
            rgbaToRgb: RGBAtoRGB(...color.color, color.alpha, 255, 255, 255),
            alpha: color.alpha,
            luminosity: color.luminosity,
            strings: Array.from(color.strings),
            files: Array.from(color.files),
        };
    });

    console.log('Writing color map JSON:', colorMapJSON);
    fs.writeFileSync(colorMapJSON, JSON.stringify(colorStats, null, 4), 'utf8');
    fs.writeFileSync(colorMapJS, `var ColorsJSON = ${JSON.stringify(colorStats, null, 4)};`, 'utf8');
});
