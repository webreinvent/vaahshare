import {
  app, BrowserWindow, ContextBridge, shell,
  ipcMain, screen, desktopCapturer, ipcRenderer, dialog
} from 'electron';
import {release} from 'node:os';
import {join} from 'node:path';


// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..');
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist');
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST;

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win = null;
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js');
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, 'index.html');



ipcMain.on('stopStreaming', (event) => {
  return stopStreaming(stream)
});


ipcMain.handle('getSources', async () => {
  const inputSources = await getVideoSources();
  win.webContents.send('video-sources', inputSources);
  return inputSources;
})

ipcMain.handle('startStreaming', async  (event, id) => {
  console.log("-->", id);
  const stream = await startStreaming(id);
console.log('--> 2')
  const serializedStream = serializeStream(stream);

  // Sending the serialized stream to the renderer process
  event.sender.send('stream', serializedStream);
  // win.webContents.send('stream', stream);
  return stream;
})


async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: join(process.env.PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: true,
      // sandbox: false,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // electron-vite-vue#298
    win.loadURL(url);
    // Open devTool if the app is not packaged
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }

  // Test actively push ~message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });
  win.webContents.send('video-sources')

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({url}) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return {action: 'deny'};
  });
 win.webContents.send('stream')
}





app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  win = null;
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('activate', () => {


  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});


// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });


  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, {hash: arg});
  }
});




async function getVideoSources() {
  try {
    // Use desktopCapturer to get the available screens
    const sources = await desktopCapturer.getSources({types: ['screen', 'window']});

    // Map the sources to an array of objects with id and name properties
    const screens = sources.map((source, index) => ({
      id: index + 1, // You can customize the ID as needed
      name: source.name,
    }));
    console.log(screens);
    return screens;
  } catch (error) {
    console.error('Error getting video sources:', error);
    return [];
  }
}

async function startStreaming(screenId) {
  const IS_MACOS = await ipcRenderer.invoke('getOperatingSystem') === 'darwin';
  console.log('till now');
  const audio = !IS_MACOS
    ? {
      mandatory: {
        chromeMediaSource: 'desktop',
      },
    }
    : false;

  const constraints = {
    audio,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: screenId,
      },
    },
  };
  console.log("till now")
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  console.log(stream)

  return stream;
}

//
function stopStreaming(stream) {
  const tracks = stream.getTracks();
  tracks.forEach(track => track.stop());
}


ipcMain.on('vaah-capture-screenshot', async (event) => {

  console.log("ipc");

  /*const screenShotInfo = await captureScreen();
  const dataURL = screenShotInfo.toDataURL();
  event.sender.send('screenshot-captured', dataURL);*/
});

ipcMain.on('greet', (event, args) =>{
  console.log(args)
})
