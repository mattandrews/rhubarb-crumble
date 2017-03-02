const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const generator = require('./generator');
const os = require('os');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let windows = [];

// set up ffmpeg binaries
const ffBinaries = require('ffbinaries');
const ffBinariesDest = __dirname + '/binaries'; // @TODO make config item
const requiredFfBinaries = ['ffmpeg', 'ffprobe'];

// which ones do we need?
const binariesNeeded = requiredFfBinaries.filter((binary, i) => {
   return !fs.existsSync(ffBinariesDest + '/' + binary);
});

// fetch binaries on first run
// (has to be done on host platform, not when packaging)
const getBinaries = function () {
    let w = getWindow('main');

    if (binariesNeeded.length > 0) {
        ffBinaries.downloadFiles({
            components: binariesNeeded,
            quiet: true,
            destination: ffBinariesDest
        }, function () {
            if (w) { w.webContents.send('dependencies-ready', {}); }
        });
    } else {
        if (w) { w.webContents.send('dependencies-ready', {}); }
    }
};

function getWindow(windowName) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].name == windowName) {
            return windows[i].window;
        }
    }
    return null;
}

function createWindow () {
    // Create the browser window.
    let win = new BrowserWindow({ width: 900, height: 700 });

    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Open the DevTools.
    //win.webContents.openDevTools();

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
    });

    windows.push({
        name: 'main',
        window: win
    });

    // fetch ffmpeg binaries
    win.webContents.on('did-finish-load', () => {
        getBinaries();
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (windows.length === 0) {
        createWindow()
    }
});

ipcMain.on('render', (event, data) => {

    let renderData = {
        speech: data.speech,
        transcript: data.transcript,
        out: data.outputdir + '/' + data.outputfile,
        imgset: data.imageset,
        skipExtended: data.shapes
    };

    generator.init(renderData, function (msg, data) {
        event.sender.send('debug', msg, data)
    });
});
