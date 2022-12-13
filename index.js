const fs = require('fs');
const { exit } = require('process');
const sharp = require('sharp');

const errors = {
    "invalid_flag": "One or more provided flags are invalid. Please refer to the instructions (-help) for troubleshooting."
}
const commands_help = {
    "auto": "Is the default flag if none other is provided. It optimizes every image file in the target directory without changing its filetype.",
    "toWEBP": "Converts all image files of filetype (PNG, JPEG, SVG) to WEBP files."
}

if(require.main === module) { main(); }

function main() {
    var run_flags = get_run_flags();

    if(check_run_flag_error(run_flags)) {
        console.log(`${errors.invalid_flag} -> ${print_text_in_color("red", check_run_flag_error(run_flags).join(", "))}`);
        process.exit();
    }

    if(run_flags.includes("help")) { run_help_dialogue(); }

    if(run_flags.length == 0) {
        console.log("Optimizing...");
    } else {
        for(let i=0;i<run_flags.length;i++) {
            switch(run_flags[i].toLowerCase()) {
                case "auto":
                    console.log("Optimizing...");
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

function run_help_dialogue() {
    var _tmp_help_dialogue = '-----------------------------------\n';
    var counter = 1;

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
    var supported_flags = ["auto", "towebp", "help"];
    var invalid_flags = [];

    for(let i=0;i<run_flags.length;i++) {
        if(!supported_flags.includes(run_flags[i].toLowerCase())) {
            invalid_flags.push(run_flags[i]);
        }
    }

    return invalid_flags.length == 0 ? false : invalid_flags;
}
function get_run_flags() {
    var _tmp_flags = [];

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