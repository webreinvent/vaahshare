const { app, BrowserWindow, desktopCapturer, ipcMain, Menu, dialog }  = require('electron');
import os from 'os'



export const getSources = () => {
   return desktopCapturer.getSources({ types: ['window', 'screen'] });
}

export const getMachineInfo = () => {
    const operatingSystem = os.type();
    const username = os.userInfo().username;
    const hostname = os.hostname();
    const platform = os.platform();
    const macAddress = os.networkInterfaces().Ethernet[0].mac;
    const user_host = `${username}@${hostname}`

    //@TODO : Sometimes hostname and username are not available, need to find a way to get them.
    const machineInfo = {
        operatingSystem,
        username,
        hostname,
        macAddress,
        platform,
        user_host
    }
    return machineInfo;
}

export const getAppInfo = () => {
    const packageJson = require('../package.json');
    const appVersion = packageJson.version;
    return { appVersion };
}