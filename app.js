#!/usr/bin/env node
'use strict';
const spawn = require('child_process').spawn;
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const md5 = require('md5');


const argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .example('$0 -t transcript.txt -s speech.wav -o out.avi', 'produce animation of speech')
    // transcript
    .alias('t', 'transcript')
    .describe('t', 'Specify a transcript text file')
    .nargs('t', 1)
    .demandOption(['t'])
    // speech audio
    .alias('s', 'speech')
    .describe('s', 'Specify a .wav speech file')
    .nargs('s', 1)
    .demandOption(['s'])
    // video output
    .alias('o', 'out')
    .describe('o', 'Video file to output')
    .nargs('o', 1)
    .demandOption(['o'])
    // image set
    .alias('i', 'imgset')
    .describe('i', 'Image set to use')
    .default('i', 'pixel')
    // skip extended shapes
    .alias('skip', 'skipExtended')
    .describe('skip', 'Skip extended shapes')
    .default('skip', false)
    // help
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2015')
    .argv;

console.log('0. About to begin... brace yourself');

const hashedSpeechFile = md5(argv.speech);
const jsonOutputPath = './data/' + hashedSpeechFile + '.json';
const concatOutputPath = './data/' + hashedSpeechFile + '.ffconcat';

// use concat instructions to make our video
// (used as a callback)
const generateVideo = function (err, fileExistedAlready) {
    if (!fileExistedAlready && err) {
        return console.error('3. Failed to write ffconcat data to file!');
    }
    console.log('3. Successfully parsed mouth shapes!');

    // now encode with ffmpeg
    let command = ffmpeg(argv.speech)
        .input(concatOutputPath)
        .audioCodec('aac')
        .videoCodec('libx264')
        .outputOptions('-pix_fmt yuv420p')
        .size('1200x1200')
        .fps(25)
        .on('start', function (commandLine) {
            console.log('4. Starting video encoding...');
            console.log(commandLine);
        }).on('stderr', function (stderrLine) {
            console.log('4. Error encoding video', stderrLine);
        }).on('end', function (stdout, stderr) {
            console.log('5. Finished! Video available at ' + argv.out);
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

    console.log('2. Converted mouth shapes to ffconcat commands');
    return commands.join("\n");
};

// have we already generated the shapes for ffmpeg?
if (!fs.existsSync(jsonOutputPath)) {

    let shapesToUse = (argv.skipExtended) ? '' : 'GHX';

    // spawn rhubarb to work out shapes
    const rhubarb = spawn('./rhubarb/rhubarb', [
        argv.speech,
        '--dialogFile ' + argv.transcript,
        '--exportFormat json',
        '--quiet',
        '--extendedShapes',
        shapesToUse
    ]);

    // log errors parsing shapes from speech
    rhubarb.stderr.on('data', (data) => {
        console.error('1. Failed to run rhubarb', data.toString('ascii'));
    });

    // parse shape output into ffmpeg commands
    rhubarb.stdout.on('data', (data) => {
        let json = JSON.parse(data);
        if (json.mouthCues) {
            console.log('1. Successfully parsed mouth shapes!');
            // save json to file
            writeDataToFile(jsonOutputPath, JSON.stringify(json.mouthCues));
            // now generate video
            writeDataToFile(concatOutputPath, parseMouthCues(json.mouthCues), generateVideo);
        } else {
            console.error('1. Failed to find mouthCues data in JSON');
        }
    });

} else {
    let json = require(jsonOutputPath);
    // skip straight to video
    console.log('1-2. Skipping a few steps as this speech file has already been scanned.');
    writeDataToFile(concatOutputPath, parseMouthCues(json), generateVideo);
}
