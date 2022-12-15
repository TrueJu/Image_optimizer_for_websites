const fs = require('fs');
const { exit } = require('process');
const sharp = require('sharp');
const { spawn } = require('child_process');

sharp.cache(false);

const errors = {
    "invalid_flag": "One or more provided flags are invalid. Please refer to the instructions (-help) for troubleshooting."
}
const commands_help = {
    "auto": `Is the default flag if none other is provided. It optimizes every image file in the target directory without changing its filetype. ${print_text_in_color('magenta', 'EXCEPTION')}: .jpg -> .jpeg`,
    "toWEBP": "Converts all image files of filetype (PNG, JPEG, SVG) to WEBP files."
}

if(require.main === module) { main(); }
//TODO: TMP FILES SAME NAME IN TMP FOLDER THEN AFTER THE WHOLE SCRIPT DELETE TMP FOLDER
async function main() {
    let run_flags = get_run_flags();

    if(check_run_flag_error(run_flags)) {
        console.log(`${errors.invalid_flag} -> ${print_text_in_color("red", check_run_flag_error(run_flags).join(", "))}`);
        process.exit();
    }

    run_flags = order_run_flags_by_execution(run_flags);

    if(run_flags.includes("help")) { run_help_dialogue(); }

    if(!run_flags.length) {
        print_execution_report('compression', ... await compress_image_files());
    } else {
        for(let i=0;i<run_flags.length;i++) {
            run_flags[i] = run_flags[i].toLocaleLowerCase();

            switch(run_flags[i]) {
                case "auto":
                    print_execution_report('compression', ... await compress_image_files());
                    break;
                case "o":
                    console.log("start compression");
                    print_execution_report('compression', ... await compress_image_files());
                    console.log("stop compression");
                    break;
                case "towebp":
                    console.log("start conversion");
                    print_execution_report('conversion', ... await image_files_to_webp());

                    /* setTimeout(() => {
                        const files = fs.readdirSync('.');

                        // Filter the list of files to only include files that end with .jpg
                        const jpegFiles = files.filter(file => file.endsWith('.jpeg'));

                        // Loop through the list of .jpg files and delete each one
                        jpegFiles.forEach(file => {
                            fs.unlinkSync(file);
                        });
                    }, 5000); */

                    console.log("stop conversion");
                    break;
                default:
                    break;
            }
        }
    }
}
function image_files_to_webp() {
    const process_start_time = performance.now();
    const working_directory = `${process.cwd().replaceAll('\\', '/')}/`;
    const supported_file_types = ['jpeg', 'jpg', 'png'];
    const image_files = [];

    fs.readdirSync(working_directory).forEach(file => {
        if(supported_file_types.includes(get_file_name_extension(file))) {
            image_files.push(file);
        }
    });

    return new Promise(async resolve => {
        if(image_files.length < 1) {
            const process_end_time = performance.now();
            resolve([image_files.length, process_end_time - process_start_time]);
        }

        for(let i=0;i<image_files.length;i++) {
            await convert_image_file(working_directory + image_files[i], 'webp').then(() => {
                if(i == image_files.length-1) {
                    const process_end_time = performance.now();
                    resolve([image_files.length, process_end_time - process_start_time]);
                }
            });
        }
    });
}
async function convert_image_file(path, new_extension) {
    if(get_file_name_extension(path) == new_extension) {
        resolve(true);
    } else {
        await sharp(path)
            .toFormat(new_extension)
            .toFile(`${get_file_name_without_extension(path)}.${new_extension}`);

        await fs.promises.unlink(path);
    }
}
function print_execution_report(process_type, processed_amount, process_duration) {
    switch(process_type) {
        case 'compression':
            console.log(`Finished compressing ${processed_amount} files, in ${process_duration} Milliseconds.`);
            break;
        case 'conversion':
            console.log(`Finished converting ${processed_amount} files, in ${process_duration} Milliseconds.`);
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
async function compress_png_file(tmp_path, path, new_extension) {
    let buffer = await sharp(`${path}.${new_extension}`)
        .png({
            compressionLevel: 9,
            adaptiveFiltering: false,
            effort: 1
        })
        .toBuffer();

    await sharp(buffer).toFile(`${path}.${new_extension}`);
}
async function compress_jpeg_file(tmp_path, path, new_extension) {
    let buffer = await sharp(`${path}.${new_extension}`)
        .jpeg({
            quality: 80,
            progressive: true,
            optimizeScans: true,
            trellisQuantisation: true,
            overshootDeringing: true,
            quantizationTable: 3,
            optimizeCoding: true
        })
        .toBuffer();

    await sharp(buffer).toFile(`${path}.${new_extension}`);
}
async function compress_webp_file(tmp_path, path, new_extension) {
    let buffer = await sharp(`${path}.${new_extension}`)
        .webp({
            quality: 80,
            effort: 0
        })
        .toBuffer();

    await sharp(buffer).toFile(`${path}.${new_extension}`);
}
function compress_image_files() {
    const process_start_time = performance.now();
    const working_directory = `${process.cwd().replaceAll('\\', '/')}/`;
    const _tmp_directory = working_directory + '_tmp_/';
    const supported_file_types = ['jpeg', 'jpg', 'png', 'svg', 'webp'];
    const image_files = [];

    fs.readdirSync(working_directory).forEach(file => {
        if(supported_file_types.includes(get_file_name_extension(file))) {
            image_files.push(file);
        }
    });

    return new Promise(async resolve => {
        if(image_files.length < 1) {
            const process_end_time = performance.now();
            resolve([image_files.length, process_end_time - process_start_time]);
        }

        for(let i=0;i<image_files.length;i++) {
            const file_name_extension = get_file_name_extension(image_files[i]);
            const file_name = get_file_name_without_extension(image_files[i]);
            /* const tmp_file_indicator = 'tmp_';

            await fs.promises.copyFile(working_directory + image_files[i], `${_tmp_directory + file_name}.${file_name_extension}`);

            try {
                await fs.promises.unlink(working_directory + image_files[i], (err) => {
                    //console.log(err);
                });
            } catch(error) {
                //console.log(error);
            } */
            
            if(file_name_extension == 'png') {
                await compress_png_file(_tmp_directory + image_files[i], working_directory + file_name, 'png');

                if(i == image_files.length-1) {
                    const process_end_time = performance.now();
                    resolve([image_files.length, process_end_time - process_start_time]);
                }
            } else if(file_name_extension == 'jpeg' || file_name_extension == 'jpg') {
                if(file_name_extension == 'jpg') {
                    //await fs.promises.copyFile(`${working_directory + file_name}.${file_name_extension}`, `${working_directory + file_name}.jpeg`);
                    //await fs.promises.unlink(`${working_directory + file_name}.${file_name_extension}`);
                    await fs.promises.rename(`${working_directory + file_name}.${file_name_extension}`, `${working_directory + file_name}.jpeg`);
                }

                await compress_jpeg_file(`${_tmp_directory + file_name}.jpeg`, working_directory + file_name, 'jpeg');

                if(i == image_files.length-1) {
                    const process_end_time = performance.now();
                    resolve([image_files.length, process_end_time - process_start_time]);
                }
            } else if(file_name_extension == 'webp') {
                await compress_webp_file(_tmp_directory + image_files[i], working_directory + file_name, 'webp');

                if(i == image_files.length-1) {
                    const process_end_time = performance.now();
                    resolve([image_files.length, process_end_time - process_start_time]);
                }
            }
        }
    });
}
function run_help_dialogue() {
    let _tmp_help_dialogue = '-----------------------------------\n';
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
    const supported_flags = ["auto", "towebp", "help", "o"];
    let invalid_flags = [];

    for(let i=0;i<run_flags.length;i++) {
        if(!supported_flags.includes(run_flags[i].toLowerCase())) {
            invalid_flags.push(run_flags[i]);
        }
    }

    return invalid_flags.length == 0 ? false : invalid_flags;
}
function order_run_flags_by_execution(run_flags) {
    if(run_flags.includes('towebp')) {
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
    } else {
        return run_flags;
    }
}
function get_run_flags() {
    let _tmp_flags = [];

    for(let i=0;i<process.argv.length;i++) {
        if(process.argv[i].slice(0, 1) == "-") {
            _tmp_flags.push(process.argv[i].slice(1, process.argv[i].length).toLocaleLowerCase());
        }
    }

    return _tmp_flags;
}
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