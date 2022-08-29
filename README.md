## What is this?
This is just a color analyzer to see how many distinct colors we have/use in the code base. This does the following:
* search across all css files to look for hex/rgb (hsl needs to be added) color codes
* use euclidean distance to find similar colors and cluster them together
* render it out into an html file 

## What??!
Just open `color-map.html` in a browser.

Run `node analyze.js  -d 'src'` from the repo's root folder to regenerate the html file, if you're making some changes.
