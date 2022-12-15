### Features

- Reduce image file sizes by compressing them
- Convert image files to .webp format for better performance on the web

# Image optimizer for the web

How to use:
```javascript
//run from directory in which the desired optimization should take place
node /path/to/index.js <flags>
```

### Currently supported flags

- toWEBP
"Converts **JPEG**/**JPG**, **PNG** to **WEBP**
- o
"Image optimization"
- auto
"Automatically runs image optimization" -> equivalent to no flag

###### *By prepending "-" to a supported flag you can use it`s features without providing additional information*
