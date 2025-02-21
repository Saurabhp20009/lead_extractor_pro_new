const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    on: (channel, func) => {


      ipcRenderer.removeAllListeners(channel); // 🔹 Remove existing listeners before adding a new one

      const subscription = (event, ...args) => func(event, ...args);

      ipcRenderer.on(channel, subscription);

      // Return a function to allow unsubscribing easily
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    receiveOnce: (channel, func) => {
      ipcRenderer.once(channel, (event, ...args) => func(...args));
    },
    removeListener: (channel, listener) => {
      ipcRenderer.removeListener(channel, listener);
    },
    addJob: (jobData) => ipcRenderer.send('add-job', jobData),
    removeJob: (jobId) => ipcRenderer.send('remove-job', jobId),
    fetchJobs: () => ipcRenderer.send('fetch-jobs'),
    startJob: (jobId) => ipcRenderer.send('start-job', jobId),
    fetchProfiles: (jobId) => ipcRenderer.send('fetch-profiles', jobId),
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  showDialog: (options, callback) => {
    ipcRenderer.send('show-dialog', options);
    ipcRenderer.once('dialog-response', (event, response) => callback(response));
  },
});