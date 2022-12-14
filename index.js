const fs = require('fs');
const { exit } = require('process');
const sharp = require('sharp');

sharp.cache(false);

const errors = {
    "invalid_flag": "One or more provided flags are invalid. Please refer to the instructions (-help) for troubleshooting."
}
const commands_help = {
    "auto": "Is the default flag if none other is provided. It optimizes every image file in the target directory without changing its filetype.",
    "toWEBP": "Converts all image files of filetype (PNG, JPEG, SVG) to WEBP files."
}

if(require.main === module) { main(); }

async function main() {
    let run_flags = get_run_flags();

    if(check_run_flag_error(run_flags)) {
        console.log(`${errors.invalid_flag} -> ${print_text_in_color("red", check_run_flag_error(run_flags).join(", "))}`);
        process.exit();
    }

    if(run_flags.includes("help")) { run_help_dialogue(); }

    if(!run_flags.length) {
        print_execution_report('compression', ... await compress_image_files());
    } else {
        for(let i=0;i<run_flags.length;i++) {
            switch(run_flags[i].toLowerCase()) {
                case "auto":
                    print_execution_report('compression', ... await compress_image_files());
                    break;
                case "towebp":
                    console.log("Converting...");
                    break;
                default:
                    break;
            }
        }
    }
}

function print_execution_report(process_type, processed_amount, process_duration) {
    switch(process_type) {
        case 'compression':
            console.log(`Finished compressing ${processed_amount} files, in ${process_duration} Milliseconds.`);
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
function compress_png_file(tmp_path, path, new_extension) {
    return new Promise(resolve => {
        sharp(tmp_path)
            .png({
                compressionLevel: 9,
                adaptiveFiltering: false,
                effort: 1
            })
            .toFile(`${path}.${new_extension}`, (err, info) => {
                fs.unlinkSync(tmp_path);

                resolve(true);
            });
    });
}
function compress_jpeg_file(tmp_path, path, new_extension) {
    return new Promise(resolve => {
        sharp(tmp_path)
            .jpeg({
                quality: 80,
                progressive: true,
                optimizeScans: true,
                trellisQuantisation: true,
                overshootDeringing: true,
                quantizationTable: 3,
                optimizeCoding: true
            })
            .toFile(`${path}.${new_extension}`, (err, info) => {
                fs.unlinkSync(tmp_path);

                resolve(true);
            });
    });
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

    return new Promise(resolve => {

        for(let i=0;i<image_files.length;i++) {
            const file_name_extension = get_file_name_extension(image_files[i]);
            const file_name = get_file_name_without_extension(image_files[i]);
            const tmp_file_indicator = 'tmp_';

            fs.copyFileSync(working_directory + image_files[i], `${working_directory + tmp_file_indicator + file_name}.${file_name_extension}`);

            fs.unlinkSync(working_directory + image_files[i]);
            
            if(file_name_extension == 'png') {
                compress_png_file(working_directory + tmp_file_indicator + image_files[i], working_directory + file_name, 'png').then(() => {
                    if(i == image_files.length-1) {
                        const process_end_time = performance.now();
                        resolve([image_files.length, process_end_time - process_start_time]);
                    }
                });
            } else if(file_name_extension == 'jpeg' || file_name_extension == 'jpg') {
                if(file_name_extension == 'jpg') {
                    fs.copyFileSync(working_directory + tmp_file_indicator + image_files[i], `${working_directory + tmp_file_indicator + file_name}.jpeg`);
                    fs.unlinkSync(working_directory + tmp_file_indicator + image_files[i]);
                }

                compress_jpeg_file(`${working_directory + tmp_file_indicator + file_name}.jpeg`, working_directory + file_name, 'jpeg').then(() => {
                    if(i == image_files.length-1) {
                        const process_end_time = performance.now();
                        resolve([image_files.length, process_end_time - process_start_time]);
                    }
                });
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
    const supported_flags = ["auto", "towebp", "help"];
    let invalid_flags = [];

    for(let i=0;i<run_flags.length;i++) {
        if(!supported_flags.includes(run_flags[i].toLowerCase())) {
            invalid_flags.push(run_flags[i]);
        }
    }

    return invalid_flags.length == 0 ? false : invalid_flags;
}
function get_run_flags() {
    let _tmp_flags = [];

    for(let i=0;i<process.argv.length;i++) {
        if(process.argv[i].slice(0, 1) == "-") {
            _tmp_flags.push(process.argv[i].slice(1, process.argv[i].length));
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