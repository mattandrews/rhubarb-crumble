# rhubarb crumble

This is just a wrapper around other smart tools. [rhubarb-lip-sync](https://github.com/DanielSWolf/rhubarb-lip-sync) is a tool for generating a sequence of mouth shapes for a given audio file (and transcript). This tool takes `rhubarb`'s output, converts it into `ffconcat` instructions, and sends this to `ffmpeg` to output a video made up of still mouth shape images, accompanied by the original audio track.

## Dependencies
1. `ffmpeg` installed globally
2. A local copy of `rhubarb` (https://github.com/DanielSWolf/rhubarb-lip-sync)
3. A `.wav` audio file of speech
4. A plain text transcript of this speech

## Configuration
1. Place the `rhubarb` executable for your system inside the `/rhubarb` directory and ensure the path to it in `app.js` is correct
2. (optional) add image sets to `data/img/<shape-name>/<shape>.jpg` – or use the built in ones (taken from rhubarb)

## Usage
Generate an animation video from the default images:

    node app.js -t speech.txt -s speech.wav -o out.mp4

Specify a custom set of shape images:
   
    node app.js -t speech.txt -s speech.wav -o out.mp4 -i shape-name

Skip the extended shapes (see rhubarb docs):
    
    node app.js -t speech.txt -s speech.wav -o out.mp4 --skipExtended
