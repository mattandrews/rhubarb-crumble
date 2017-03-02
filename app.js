#!/usr/bin/env node
'use strict';
const generator = require('./generator');

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

// let's a-go!
console.log('0. About to begin... brace yourself');
generator.init(argv);
