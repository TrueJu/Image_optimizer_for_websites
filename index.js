const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

sharp.cache(false);

const errors = {
    "invalid_flag": "One or more provided flags are invalid. Please refer to the instructions (-help) for troubleshooting."
}
const commands_help = {
    "auto": `Is the default flag if none other is provided. It optimizes every image file in the target directory without changing its filetype. ${print_text_in_color('magenta', 'EXCEPTION')}: .jpg -> .jpeg`,
    "toWEBP": "Converts all image files of filetype (PNG, JPEG, SVG) to WEBP files."
}

if(require.main === module) { main(); }
async function main() {
    let run_flags = get_run_flags();

    if(check_run_flag_error(run_flags)) {
        console.log(`${errors.invalid_flag} -> ${print_text_in_color("red", check_run_flag_error(run_flags).join(", "))}`);
        process.exit();
    }

    run_flags = order_run_flags_by_execution(run_flags);

    if(run_flags.includes("help")) { run_help_dialogue(); }

    const working_directory = `${process.cwd().replaceAll('\\', '/')}/`;
    const dir_size = [await get_directory_size(working_directory), 0];

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
                    print_execution_report('compression', ... await compress_image_files());
                    break;
                case "towebp":
                    print_execution_report('conversion', ... await image_files_to_webp());
                    break;
                default:
                    break;
            }
        }

        dir_size[1] = await get_directory_size(working_directory);

        print_directory_size_change(dir_size[0], dir_size[1]);
    }
}
function print_directory_size_change(size_before, size_after) {
    const formatted_bytes = [size_before.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "`"), size_after.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "`")];
    const converted_bytes = [0, 0];

    converted_bytes[0] = [convert_bytes(size_before)[0], Math.round((convert_bytes(size_before)[1] + Number.EPSILON) * 100) / 100];
    converted_bytes[1] = [convert_bytes(size_after)[0], Math.round((convert_bytes(size_after)[1] + Number.EPSILON) * 100) / 100];

    console.log(`\nFiles size before execution: ${converted_bytes[0][1]} ${converted_bytes[0][0]} (${formatted_bytes[0]} bytes)\nFiles size after execution: ${converted_bytes[1][1]} ${converted_bytes[1][0]} (${formatted_bytes[1]} bytes)`);
}
function convert_bytes(bytes) {
    const kilobytes = bytes / 1024;
    let megabytes = false;

    if(bytes.toString().length > 6) {
        megabytes = kilobytes / 1024;
    }

    return megabytes ? ['MB', megabytes] : ['KB', kilobytes];
}
async function get_directory_size(directory) {
    const files = await fs.promises.readdir(directory); 
    const stats = files.map(async file => await fs.promises.stat(path.join(directory, file)));
  
    return (await Promise.all(stats)).reduce((accumulator, {size}) => accumulator + size, 0 );
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
    const formatted_process_duration = Math.round((process_duration / (process_duration.toString().length >= 4 ? 1000 : 1) + Number.EPSILON) * 100) / 100;
    const process_duration_without_comma_str = process_duration.toString().split('.')[0];

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
async function compress_jpeg_file(path, extension) {
    let buffer = await sharp(`${path}.${extension}`)
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

    await sharp(buffer).toFile(`${path}.${extension}`);
}
async function compress_webp_file(path, extension) {
    let buffer = await sharp(`${path}.${extension}`)
        .webp({
            quality: 80,
            effort: 0
        })
        .toBuffer();

    await sharp(buffer).toFile(`${path}.${extension}`);
}
function compress_image_files() {
    const process_start_time = performance.now();
    const working_directory = `${process.cwd().replaceAll('\\', '/')}/`;
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
            
            if(file_name_extension == 'png') {
                await compress_png_file(working_directory + file_name, 'png');

                if(i == image_files.length-1) {
                    const process_end_time = performance.now();
                    resolve([image_files.length, process_end_time - process_start_time]);
                }
            } else if(file_name_extension == 'jpeg' || file_name_extension == 'jpg') {
                if(file_name_extension == 'jpg') {
                    await fs.promises.rename(`${working_directory + file_name}.${file_name_extension}`, `${working_directory + file_name}.jpeg`);
                }

                await compress_jpeg_file(working_directory + file_name, 'jpeg');

                if(i == image_files.length-1) {
                    const process_end_time = performance.now();
                    resolve([image_files.length, process_end_time - process_start_time]);
                }
            } else if(file_name_extension == 'webp') {
                await compress_webp_file(working_directory + file_name, 'webp');

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