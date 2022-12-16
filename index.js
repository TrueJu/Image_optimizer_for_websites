const fs = require('fs');       //Communication with the filesystem
const path = require('path');   //Format system paths
const sharp = require('sharp'); //Handels image file conversion & image manipulation

sharp.cache(false); //Disable aggressive caching

const errors = {    //Contains all errors that could be displayed when running the script
    "invalid_flag": "One or more provided flags are invalid. Please refer to the instructions (-help) for troubleshooting."
}
const commands_help = {     //-help flag content
    "auto": `Is the default flag if none other is provided. It optimizes every image file in the target directory without changing its filetype. ${print_text_in_color('cyan', 'EXCEPTION')}: .jpg -> .jpeg`,
    "toWEBP  ": "Converts all image files of filetype (PNG, JPEG/JPG) to WEBP files.",
    "toLC  ": "Renames all image files of filetype (PNG, JPEG/JPG, WEBP) to lowercase format.",
    "quality<?>": `Set the quality percentage for image compression (default is 80). Has to be between 1 and 100 (best). ${print_text_in_color('magenta', 'Example: ')} -quality75`,
    "silent": "Hide all logs and information"
}
const working_directory = `${process.cwd().replaceAll('\\', '/')}/`;    //Holds a string of the directory the script got called from != index.js directory

let quality_compression = 80;
let silent_mode = false;

if(require.main === module) { main(); }
async function main() {
    let run_flags = get_run_flags();    //Parse flags provided on script execution

    if(check_run_flag_error(run_flags)) {   //Check if provided flags are supported and in the right format
        console.log(`${errors.invalid_flag} -> ${print_text_in_color("red", check_run_flag_error(run_flags).join(", "))}`);
        process.exit();
    }

    //Run flags need to be ordered in some cases.
    //If e.g. -toWEBP and -o are provided, the script 
    //should first convert all files according to the
    //-toWEBP flag and then optimize them (-o)
    //This ordering makes it possible to provide script
    //flags without thinking about their execution order
    run_flags = order_run_flags_by_execution(run_flags);

    if(['help', 'h'].some(flag => run_flags.includes(flag))) { run_help_dialogue(); }

    run_flags.map(flag => { 
        //Check if the quality flag is set and if so, assign the quality to the
        //global quality_compression variable
        if(flag.slice(0, 7) == 'quality') { 
            quality_compression = parseInt(flag.slice(7, flag.length));
        }  else if(flag == 'silent') { 
            silent_mode = true;
        }
    });

    const dir_size = [await get_directory_size(working_directory), 0];

    if(!run_flags.length) {     //If no flags are provided the script should perfom the 'auto' mode = -o
        print_execution_report('compression', ... await compress_image_files());
    } else {
        for(let i=0;i<run_flags.length;i++) {
            switch(run_flags[i]) {
                case "auto":    //Using this flag is the equivalent to using no flag
                    print_execution_report('compression', ... await compress_image_files());
                    break;
                case "o":       //Optimizes/compresses images
                    print_execution_report('compression', ... await compress_image_files());
                    break;
                case "towebp":  //Converts PNG/JPEG/JPG to WEBP file
                    print_execution_report('conversion', ... await image_files_to_webp());
                    break;
                case "tolc":  //Renames files to lowercase format
                    await files_to_lowercase();
                    break;
                default:
                    break;
            }
        }

        dir_size[1] = await get_directory_size(working_directory);

        //For comparison of how much the script was able to optimize/compress
        //A size change dialogue is displayed
        print_directory_size_change(dir_size[0], dir_size[1]);
    }
}
async function files_to_lowercase() {
    const supported_file_types = ['jpeg', 'jpg', 'png', 'svg', 'webp'];
    const directory_files = await fs.promises.readdir(working_directory);
    
    directory_files.forEach(async file => {     //Loop through supported image files
        if(supported_file_types.includes(get_file_name_extension(file))) {
            await fs.promises.rename(working_directory + file, working_directory + file.toLowerCase());   //Rename file to lowercase format
        }
    });
}
//Takes the directory size before running the script and after running it.
//The two inputs are in bytes and need to be formated with ` for better
//readability. Then these bytes are converted to either be displayed as
//e.g. 10 MB or e.g. 460 KB
function print_directory_size_change(size_before, size_after) {
    if(silent_mode) {   //Skip console logs
        return true;
    }

    const formatted_bytes = [size_before.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "`"), size_after.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "`")];
    const converted_bytes = [0, 0];

    converted_bytes[0] = [convert_bytes(size_before)[0], Math.round((convert_bytes(size_before)[1] + Number.EPSILON) * 100) / 100];
    converted_bytes[1] = [convert_bytes(size_after)[0], Math.round((convert_bytes(size_after)[1] + Number.EPSILON) * 100) / 100];

    //Displays the before and after files size in MB/KB and bytes
    console.log(`\nFiles size before execution: ${converted_bytes[0][1]} ${converted_bytes[0][0]} (${formatted_bytes[0]} bytes)\nFiles size after execution: ${converted_bytes[1][1]} ${converted_bytes[1][0]} (${formatted_bytes[1]} bytes)`);
}
//Bytes are converted to either be displayed as
//e.g. 10 MB or e.g. 460 KB
function convert_bytes(bytes) {
    const kilobytes = bytes / 1024;
    let megabytes = false;

    if(bytes.toString().length > 6) {   //If the length of the bytes is 7, KB should be replaced by MB
        megabytes = kilobytes / 1024;
    }

    return megabytes ? ['MB', megabytes] : ['KB', kilobytes];
}
//Calculates the size of the input directory without any subfolders
//since for this script, only the image files, inside the first layer
//of the folder, are important.
async function get_directory_size(directory) {
    const files = await fs.promises.readdir(directory); 
    const stats = files.map(async file => await fs.promises.stat(path.join(directory, file)));
  
    return (await Promise.all(stats)).reduce((accumulator, {size}) => accumulator + size, 0 ); //Only return directory size
}
//Converts PNG/JPEG to WEBP
//JPG files are converted to JPEG beforhand
function image_files_to_webp() {
    const process_start_time = performance.now();
    const supported_file_types = ['jpg', 'jpeg', 'png'];
    const image_files = [];

    fs.readdirSync(working_directory).forEach(file => {     //Create an array of files that have the correct filetype to be converted to WEBP
        if(supported_file_types.includes(get_file_name_extension(file))) {
            image_files.push(file);
        }
    });

    return new Promise(async resolve => {
        if(image_files.length < 1) {    //If there are no files to be converted end the -toWEBP flag process
            const process_end_time = performance.now();
            resolve([image_files.length, process_end_time - process_start_time]);
        }

        for(let i=0;i<image_files.length;i++) {     //For each file run the convert_image_file function
            await convert_image_file(working_directory + image_files[i], 'webp').then(() => {
                if(i == image_files.length-1) {     //If the last image file was converted, end the -toWEBP flag process
                    const process_end_time = performance.now();
                    resolve([image_files.length, process_end_time - process_start_time]);
                }
            });
        }
    });
}
//Takes the path of an image and it's wanted extension
//as input.
async function convert_image_file(path, new_extension) {
    if(get_file_name_extension(path) == new_extension) {
        resolve(true);
    } else {
        await sharp(path)
            .toFormat(new_extension)    //Forces new file format (conversion)
            .toFile(`${get_file_name_without_extension(path)}.${new_extension}`);   //Write to the file with the new format

        await fs.promises.unlink(path); //Delete the original file as it's been converted
    }
}
//Prints information to the console about what process has finished
//What amount of data it has processed and how long that took in either Milliseconds or Seconds
function print_execution_report(process_type, processed_amount, process_duration) {
    if(silent_mode) {   //Skip console logs
        return true;
    }

    //(process_duration / (process_duration.toString().length >= 4 ? 1000 : 1)
    //Moves the decimal point depending on the process duration. 
    //If process_duration >= 1000 milliseconds then divide by 1000 = 1 Second
    //The number with the moved decimal point is then being rounded to 2 decimal points.
    const formatted_process_duration = Math.round((process_duration / (process_duration.toString().length >= 4 ? 1000 : 1) + Number.EPSILON) * 100) / 100;
    const process_duration_without_comma_str = process_duration.toString().split('.')[0];

    //Logs the stats and formats the log to plural/singular, display Milliseconds/Seconds 
    switch(process_type) {
        case 'compression':
            console.log(`Finished compressing ${processed_amount} ${processed_amount > 1 || processed_amount < 1 ? 'files' : 'file'}, in ${formatted_process_duration} ${process_duration_without_comma_str.length >= 4 ? formatted_process_duration == 1 ? 'Second' : 'Seconds' : formatted_process_duration == 1 ? 'Millisecond' : 'Milliseconds' }.`);
            break;
        case 'conversion':
            console.log(`Finished converting ${processed_amount} ${processed_amount > 1 || processed_amount < 1 ? 'files' : 'file'}, in ${formatted_process_duration} ${process_duration_without_comma_str.length >= 4 ? formatted_process_duration == 1 ? 'Second' : 'Seconds' : formatted_process_duration == 1 ? 'Millisecond' : 'Milliseconds' }.`);
            break;

        default:
            break;
    }
}
function get_file_name_extension(file_name) {
    let file_name_seperated = file_name.split('.');
    return file_name_seperated[file_name_seperated.length-1].toLowerCase();
}
function get_file_name_without_extension(file_name) {
    return file_name.slice(0, file_name.length-(1+get_file_name_extension(file_name).length));
}
//By writing the image manipulation to a buffer
//the script is able to change (overwrite) the file without
//creating a temporary file.
async function compress_png_file(path, extension) {
    let buffer = await sharp(`${path}.${extension}`)
        .png({
            compressionLevel: 9,
            adaptiveFiltering: false,
            effort: 1
        })
        .toBuffer();

    await sharp(buffer).toFile(`${path}.${extension}`);
}
//By writing the image manipulation to a buffer
//the script is able to change (overwrite) the file without
//creating a temporary file.
async function compress_jpeg_file(path, extension) {
    let buffer = await sharp(`${path}.${extension}`)
        .jpeg({
            quality: quality_compression,
            progressive: true,
            optimizeScans: true,
            trellisQuantisation: true,
            overshootDeringing: true,
            quantizationTable: 3,
            optimizeCoding: true
        })
        .toBuffer();

    await sharp(buffer).toFile(`${path}.${extension}`);
}
//By writing the image manipulation to a buffer
//the script is able to change (overwrite) the file without
//creating a temporary file.
async function compress_webp_file(path, extension) {
    let buffer = await sharp(`${path}.${extension}`)
        .webp({
            quality: quality_compression,
            effort: 0
        })
        .toBuffer();

    await sharp(buffer).toFile(`${path}.${extension}`);
}
//Compresses all supported image files in a directory
function compress_image_files() {
    const process_start_time = performance.now();
    const supported_file_types = ['jpeg', 'jpg', 'png', 'svg', 'webp'];     //Feature to compress/optimize SVG files is yet missing. SVGs are skipped
    const image_files = [];

    fs.readdirSync(working_directory).forEach(file => {     //Create an array of files that have the correct filetype to be converted to WEBP
        if(supported_file_types.includes(get_file_name_extension(file))) {
            image_files.push(file);
        }
    });

    return new Promise(async resolve => {
        if(image_files.length < 1) {    //If there are no image files to be compressed then the process (-o or -auto) is ended
            const process_end_time = performance.now();
            resolve([image_files.length, process_end_time - process_start_time]);
        }

        for(let i=0;i<image_files.length;i++) {
            const file_name_extension = get_file_name_extension(image_files[i]);
            const file_name = get_file_name_without_extension(image_files[i]);
            
            if(file_name_extension == 'png') {
                await compress_png_file(working_directory + file_name, 'png');

                if(i == image_files.length-1) {     //If this was the last image file to be compressed then end the process
                    const process_end_time = performance.now();
                    resolve([image_files.length, process_end_time - process_start_time]);
                }
            } else if(file_name_extension == 'jpeg' || file_name_extension == 'jpg') {
                if(file_name_extension == 'jpg') {
                    //JPG files are renamed to JPEG (modern format). No conversion needed
                    await fs.promises.rename(`${working_directory + file_name}.${file_name_extension}`, `${working_directory + file_name}.jpeg`);
                }

                await compress_jpeg_file(working_directory + file_name, 'jpeg');

                if(i == image_files.length-1) {     //If this was the last image file to be compressed then end the process
                    const process_end_time = performance.now();
                    resolve([image_files.length, process_end_time - process_start_time]);
                }
            } else if(file_name_extension == 'webp') {
                await compress_webp_file(working_directory + file_name, 'webp');

                if(i == image_files.length-1) {     //If this was the last image file to be compressed then end the process
                    const process_end_time = performance.now();
                    resolve([image_files.length, process_end_time - process_start_time]);
                }
            }
        }
    });
}
function run_help_dialogue() {
    let _tmp_help_dialogue = 'To use flag(s) add a "-" in front of each flag you want to use\n\nList of flags\n-----------------------------------\n';
    let counter = 1;

    for(const [cmd, help] of Object.entries(commands_help)) {
        _tmp_help_dialogue += `${counter}. ${cmd} -> \t"${help}"\n${(process.stdout.columns || defaultColumns) < 155 ? '\n' : ''}`;
        counter++;
    }

    _tmp_help_dialogue += '\nCommands are case insensitive\n';

    _tmp_help_dialogue += '-----------------------------------\n';

    console.log(_tmp_help_dialogue);
    process.exit();
}
function check_run_flag_error(run_flags) {
    const supported_flags = ['auto', 'towebp', 'help', 'h', 'o', 'tolc', 'silent'];   //Quality flag listed below
    let invalid_flags = [];

    for(let i=0;i<run_flags.length;i++) {
        if(!supported_flags.includes(run_flags[i].toLowerCase())) {
            //Check if quality flag is present - only check first 7 chars because the last chars are individual (percentage of quality)
            //If the length of the percentage is less than 1 and more than 3 return error
            if(run_flags[i].slice(0, 7).toLowerCase() == 'quality' && run_flags[i].length > 7 && run_flags[i].length < 11) {
                //pass
            } else {
                invalid_flags.push(run_flags[i]);
            }
        }
    }

    return invalid_flags.length == 0 ? false : invalid_flags;
}
//Run flags need to be ordered in some cases.
//If e.g. -toWEBP and -o are provided, the script 
//should first convert all files according to the
//-toWEBP flag and then optimize them (-o)
//This ordering makes it possible to provide script
//flags without thinking about their execution order
function order_run_flags_by_execution(run_flags) {
    if(run_flags.includes('towebp')) {      //If the flag -toWEBP is given, this block reorders it to be in first place
        if(run_flags.length > 1) {
            const _tmp_run_flags = ['towebp'];
            const towebp_index = run_flags.indexOf('towebp');

            run_flags.splice(towebp_index, 1);

            for(let i=0;i<run_flags.length;i++) {
                _tmp_run_flags.push(run_flags[i]);
            }

            return _tmp_run_flags;
        } else {
            return run_flags;
        }
    } else {    //If no flags need to be moved then return the flags as is. To add new sorting rule, insert else if statement above
        return run_flags;
    }
}
//Takes the script run arguments and returns them as a flag array
function get_run_flags() {
    let _tmp_flags = [];

    for(let i=0;i<process.argv.length;i++) {    //Loop through arguments and save them as flags without a "-"
        if(process.argv[i].slice(0, 1) == "-") {
            _tmp_flags.push(process.argv[i].slice(1, process.argv[i].length).toLowerCase());
        }
    }

    return _tmp_flags;
}
//Console color-code formatting for displaying text in color
function print_text_in_color(color, txt) {
    switch(color) {
        case "black":
            return `\x1b[30m${txt}\x1b[0m`;
        case "red":
            return `\x1b[31m${txt}\x1b[0m`;
        case "green":
            return `\x1b[32m${txt}\x1b[0m`;
        case "yellow":
            return `\x1b[33m${txt}\x1b[0m`;
        case "blue":
            return `\x1b[34m${txt}\x1b[0m`;
        case "magenta":
            return `\x1b[35m${txt}\x1b[0m`;
        case "cyan":
            return `\x1b[36m${txt}\x1b[0m`;
        case "white":
            return `\x1b[37m${txt}\x1b[0m`;

        default:
            return `\x1b[30m${txt}\x1b[0m`;
    }
}