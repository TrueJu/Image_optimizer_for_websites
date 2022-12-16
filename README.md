### Features

- Reduce image file sizes by compressing them
- Convert image files to .webp format for better performance on the web
- Rename files to lowercase format
- Change quality for JPEG/JPG and PNG files between 1% & 100%

# Image optimizer for the web

How to use:
```shell 
node /path/to/index.js <flags>
```

### Currently supported flags
*Flags are case insensitive*

- toWEBP
"Converts **JPEG**/**JPG**, **PNG** to **WEBP**
- o
"Image optimization"
- auto
"Automatically runs image optimization" -> equivalent to no flag
- toLC
"Renames all image files of filetype (PNG, JPEG/JPG, WEBP) to lowercase format."
-quality<?>
"Set the quality percentage for image compression (default is 80). Has to be between 1 and 100 (best). Example -quality75"
-silent
"Hide all logs and information"

###### *Prepend "-" to a supported flag to use it`s features*

#### Example:
```javascript
node /path/to/index.js -o -toWEBP -toLC -silent
```
