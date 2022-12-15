### Features

- Reduce image file sizes by compressing them
- Convert image files to .webp format for better performance on the web

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

###### *By prepending "-" to a supported flag you can use it`s features without providing additional information*

####Example:
```javascript
node /path/to/index.js -o -toWEBP
```
