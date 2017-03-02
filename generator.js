'use strict';
const spawn = require('child_process').spawn;
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const md5 = require('md5');

// configure binary paths
ffmpeg.setFfmpegPath(__dirname + '/binaries/ffmpeg');
ffmpeg.setFfprobePath(__dirname + '/binaries/ffprobe');

let CUSTOM_LOGGER;

const log = function (level, msg, data) {
    if (!CUSTOM_LOGGER) {
        if (level === 'error') {
            console.error(msg, data)
        } else {
            console.log(msg, data);
        }
    } else {
        CUSTOM_LOGGER(msg, data);
    }
};


const init = function (argv, customLoggerOption) {

    if (customLoggerOption) {
        CUSTOM_LOGGER = customLoggerOption;
    }

    const hashedSpeechFile = md5(argv.speech);
    const jsonOutputPath = __dirname + '/data/' + hashedSpeechFile + '.json';
    const concatOutputPath = __dirname + '/data/' + hashedSpeechFile + '.ffconcat';

    // use concat instructions to make our video
    // (used as a callback)
    const generateVideo = function (err, fileExistedAlready) {
        if (!fileExistedAlready && err) {
            return log('error', 'Failed to write ffconcat data to file!');
        }
        log('info', 'Successfully parsed mouth shapes!');

        // now encode with ffmpeg
        let command = ffmpeg(argv.speech)
            .input(concatOutputPath)
            .audioCodec('aac')
            .videoCodec('libx264')
            .outputOptions('-pix_fmt yuv420p')
            .size('1200x1200')
            .fps(25)
            .on('start', function (commandLine) {
                log('info', 'Starting video encoding...');
                //log('info', commandLine);
            }).on('stderr', function (stderrLine) {
                // this captures all output, not just errors...
                log('info', 'Encoding video...', stderrLine);
            }).on('end', function (stdout, stderr) {
                log('info', 'Finished! Video available at ' + argv.out);
            }).output(argv.out).run();
    };

    // write ffmpeg command data to a file
    const writeDataToFile = function (path, data, callback) {
        fs.writeFile(path, data, callback);
    };

    // convert rhubarb output to ffmpeg concat commands
    const parseMouthCues = function (mouthCues) {
        let commands = ['ffconcat version 1.0'];

        const getImg = function (shape) {
            return 'img/' + argv.imgset + '/' + shape + '.jpg';
        };

        mouthCues.forEach(function (cue) {
            let diff = cue.end - cue.start;
            commands.push('file ' + getImg(cue.value));
            commands.push('duration ' + diff);
        });

        log('info', 'Converted mouth shapes to ffconcat commands');
        return commands.join("\n");
    };

    const makeVideo = function (cueData) {
        writeDataToFile(concatOutputPath, parseMouthCues(cueData), generateVideo);
    };

    // have we already generated the shapes for ffmpeg?
    if (!fs.existsSync(jsonOutputPath)) {

        let shapesToUse = (argv.skipExtended) ? '' : 'GHX';

        log('info', 'Parsing mouth shapes from audio...');

        // spawn rhubarb to work out shapes
        const rhubarb = spawn(
            __dirname + '/rhubarb/rhubarb',
            [
                argv.speech,
                '--dialogFile ' + argv.transcript,
                '--exportFormat json',
                '--quiet',
                '--extendedShapes',
                shapesToUse
            ],
            {
                env: {
                    "ATOM_SHELL_INTERNAL_RUN_AS_NODE": "0"
                },
            }
        );

        // log errors parsing shapes from speech
        rhubarb.stderr.on('data', (data) => {
            log('error', 'Failed to run rhubarb', data.toString('ascii'));
        });

        // parse shape output into ffmpeg commands
        rhubarb.stdout.on('data', (data) => {
            let json = JSON.parse(data);
            if (json.mouthCues) {
                log('info', 'Successfully parsed mouth shapes!');
                // save json to file
                writeDataToFile(jsonOutputPath, JSON.stringify(json.mouthCues));
                // now generate video
                makeVideo(json.mouthCues)
            } else {
                log('error', 'Failed to find mouthCues data in JSON');
            }
        });

    } else {
        let json = require(jsonOutputPath);
        // skip straight to video
        log('info', 'Skipping a few steps as this speech file has already been scanned.');
        makeVideo(json);
    }

};

module.exports = {
    init: init
};
