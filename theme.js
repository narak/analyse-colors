#!/usr/bin/env node
const fs = require('fs');
const _ = require('lodash/fp');
const glob = require('glob');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const Color = require('color');

const themeFile = argv.f || argv.file;

if (!themeFile) {
    throw new Error("Theme file JSON not provided");
}

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

console.log('Reading and parsing:', themeFile);
const fileRaw = fs.readFileSync(themeFile, 'utf8');
const themeJSON = JSON.parse(fileRaw);
const colorStats = {};
each(themeJSON, (key, val) => {
    try {
        const clr = Color(val);
        colorStats[key] = {
            value: clr.rgb().color,
            alpha: clr.alpha(),
            luminosity: clr.luminosity(),
        };
    } catch(e) {
        console.warn("Ignoring:", key, '-', e.message);
    }
});
const colorThemeFile = `${__dirname}/color-theme.js`;
console.log('Writing color theme JSON:', colorThemeFile);
fs.writeFileSync(colorThemeFile, `var ThemeJSON = ${JSON.stringify(colorStats, null, 4)};`, 'utf8');
