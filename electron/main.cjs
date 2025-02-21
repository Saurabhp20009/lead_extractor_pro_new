const dotenv = require('dotenv');
const knex = require('knex');
dotenv.config();  // ✅ Load environment variables first
const { app, Tray, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');
const { dirname } = require('path');
const { fork } = require('child_process');
const cron = require('node-cron');
const crypto = require('crypto');
const { login } = require('./LoginScript.js');

let createQueue;
try {
   createQueue = require('./createQueue.js');
  // createQueue = createQueueModule.default || createQueueModule;
  console.log('createQueue function:', createQueue); // Check if it's properly imported


} catch (error) {
  console.error('Failed to load createQueue module', error);
}

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

let mainWindow;

function createWindow() {
  console.log('Creating window...');

 

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,  // Enable the webview tag
      webSecurity: true
    },
    autoHideMenuBar: true, // ✅ Hides the menu bar
  });

  const startURL = 'http://localhost:3000';

  mainWindow.loadURL(startURL);

  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
  });

 
  const workerPath=path.join(__dirname, './worker.js') 

  // Start the worker
  const worker = fork(workerPath);
  console.log("worker", worker)
  worker.on('message', (message) => {
    console.log('Message from worker:', message);
  });
  worker.on('exit', (code) => {
    console.log(`Worker exited with code ${code}`);
  });

  worker.on('error', (error) => {
    console.error('Error in worker process:', error);
  });
}



function setupTray() {
  let tray = new Tray(path.join(__dirname, '..', 'assets', 'images', 'icon.jpg'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setToolTip('Lead extractor pro');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}

function getEncryptionKey() {
  if (!process.env.SECRET_KEY) {
    throw new Error("SECRET_KEY is missing in environment variables!");
  }
  return Buffer.from(process.env.SECRET_KEY, 'hex');
}

function encryptPassword(password) {
  const algorithm = 'aes-256-cbc';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function decryptPassword(encryptedPassword) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = getEncryptionKey();
    const [iv, encrypted] = encryptedPassword.split(':');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error("Decryption failed! Invalid data.");
  }
}

let db;

const initializeDb = async () => {
  const dbPath = path.join(app.getPath('userData'), 'Lead_extractor_pro.sqlite3');

  const knexConfig = {
    client: 'sqlite3',
    connection: { filename: dbPath },
    migrations: { directory: './migrations', tableName: 'knex_migrations' },
    useNullAsDefault: true,
  };

  db = await knex(knexConfig);
  console.log('**db', db);
  return db;
};

const dbPromise = initializeDb();

// app.disableHardwareAcceleration();


app.on('ready', async () => {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true, // Optional, on macOS it opens the app hidden.
    path: app.getPath('exe')
  });

  await dbPromise; // Ensure db is initialized

  createWindow();
  setupTray();
  setupCronJobs();
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function setupCronJobs() {
  // Every 15 minutes
  cron.schedule('*/1 * * * *', async () => {
    console.log('Running a task every 2 minutes');

    const jobs = await db('jobs').select('*').where('frequency', '15');
    jobs.forEach(async (task) => {
      try {
        if (task.state === 'started') {
          console.log(`Emitting add-job event for job ID: ${task.id}`);
          console.log(task);
          ipcMain.emit('add-job', null, task);
          await db('jobs').where('id', task.id).update({ last_time_run: new Date().toLocaleString(), run_count: task.run_count + 1 });
        }
      } catch (error) {
        console.error(`Error processing job ID ${task.id}:`, error);
      }
    });
  });

  // Every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('Running a task every 30 minutes');
    const jobs = await db('jobs').select('*').where('frequency', '30');
    jobs.forEach(async (task) => {
      try {
        if (task.state === 'started') {
          console.log(`Emitting add-job event for job ID: ${task.id}`);
          ipcMain.emit('add-job', null, task);
          await db('jobs').where('id', task.id).update({ last_time_run: new Date().toLocaleString(), run_count: task.run_count + 1 });
        }
      } catch (error) {
        console.error(`Error processing job ID ${task.id}:`, error);
      }
    });
  });

  // Every 60 minutes
  cron.schedule('*/60 * * * *', async () => {
    console.log('Running a task every hour');
    const jobs = await db('jobs').select('*').where('frequency', '60');
    jobs.forEach(async (task) => {
      try {
        if (task.state === 'started') {
          console.log(`Emitting add-job event for job ID: ${task.id}`);
          ipcMain.emit('add-job', null, task);
          await db('jobs').where('id', task.id).update({ last_time_run: new Date().toLocaleString(), run_count: task.run_count + 1 });
        }
      } catch (error) {
        console.error(`Error processing job ID ${task.id}:`, error);
      }
    });
  });

  // Weekly task (e.g., every Monday at 00:00)
  cron.schedule('0 0 * * MON', async () => {
    console.log('Running a weekly task');
    const jobs = await db('jobs').select('*').where('frequency', 'weekly');
    jobs.forEach(async (task) => {
      try {
        if (task.state === 'started') {
          console.log(`Emitting add-job event for job ID: ${task.id}`);
          ipcMain.emit('add-job', null, task);
          await db('jobs').where('id', task.id).update({ last_time_run: new Date().toLocaleString(), run_count: task.run_count + 1 });
        }
      } catch (error) {
        console.error(`Error processing job ID ${task.id}:`, error);
      }
    });
  });
}

ipcMain.on('submit-form', async (event, formData) => {
  console.log('Form submitted', formData);
  try {
    if (formData.id) {
      await db('jobs').where('id', formData.id).update(formData);
    } else {
      formData.timeCreated = new Date().toLocaleString();
      await db('jobs').insert(formData);
    }
    event.reply('form-submission', { success: true, message: 'Form data saved successfully!' });
  } catch (error) {
    console.error('Failed to save form data', error);
    event.reply('form-submission', { success: true, message: `Failed to save form data. ${error} ` });
  }
});

ipcMain.on('update-job', async (event, jobId) => {
  try {
    await db('jobs').where('id', formData.id).update(formData);
    event.reply('job-update', 'Job data updated successfully!');
  } catch (error) {
    console.error('Failed to update job data', error);
    event.reply('job-update', 'Failed to update job data.');
  }
});

ipcMain.on('add-job', async (event, jobData) => {
  const queue = createQueue('job-processing');
  // console.log("queue", queue)
  const job = await queue.add(jobData);
  console.log("job",job)
  console.log(`Added job: ${job.id}`);
});

ipcMain.on('remove-job', async (event, jobId) => {
  console.log('Deleting job with ID:', jobId);
  try {
    const result = await db('jobs').where({ id: jobId }).del();
    if (result === 0) {
      console.log('No job found with ID:', jobId);
      event.reply('job-remove', { success: false, message: 'No job found with that ID' });
    } else {
      console.log('Job remove successfully');
      event.reply('job-remove', { success: true, message: 'Job deleted successfully' });
    }
  } catch (error) {
    console.error('Failed to delete job', error);
    event.reply('job-remove', { success: false, message: 'Failed to remove job' });
  }
});

ipcMain.on('fetch-jobs', async (event) => {
  try {
    const jobs = await db('jobs').select('*');
    event.reply('jobs-fetched', jobs);
  } catch (error) {
    console.error('Failed to fetch jobs', error);
    event.reply('jobs-fetched', []);
  }
});

ipcMain.on('start-job', async (event, jobId) => {
  try {
    const updatedCount = await db('jobs').where('id', jobId).update({ state: 'started' });
    console.log(`${updatedCount} jobs updated from 'stopped' to 'started'`);
    event.reply('start-job', { success: true, message: 'Job started successfully' });
  } catch (error) {
    console.error('Failed to start the job', error);
    event.reply('start-job', { success: false, message: 'Failed to start the job' });
  }
});

ipcMain.on('stop-job', async (event, jobId) => {
  try {
    const updatedCount = await db('jobs').where('id', jobId).update({ state: 'stopped' });
    console.log(`${updatedCount} jobs updated from 'started ' to 'stopped'`);
    event.reply('stop-job', { success: true, message: 'Job stopped successfully' });
  } catch (error) {
    console.error('Failed to stop the job', error);
    event.reply('stop-job', { success: false, message: 'Failed to stop the job' });
  }
});

ipcMain.on('fetch-profiles', async (event, jobId) => {
  try {
    const profiles = await db('Profile_Data').select('*').where('query_id', jobId);
    console.log("jobId", jobId);
    console.log("profiles", profiles);
    event.reply('profile-fetched', profiles);
  } catch (error) {
    console.error('Failed to fetch job', error);
    event.reply('profile-fetched', [], error);
  }
});

ipcMain.on('add-user-data', async (event, data) => {
  try {
    const { email, password, platform } = data;
    const existingUser = await db('User_data').where({ email, platform }).first();
    if (existingUser) {
      console.log("❌ User with this email and platform already exists:", email, platform);
      event.reply('user-data-added', { success: false, message: 'User already exists for this platform' });
      return;
    }
    const hashedPassword = encryptPassword(password);
    console.log("✅ Adding new user:", email, platform);
    await db('User_data').insert({
      email,
      password: hashedPassword,
      platform,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    event.reply('user-data-added', { success: true, message: 'User data added successfully' });
  } catch (error) {
    console.error('❌ Failed to add user data', error);
    event.reply('user-data-added', { success: false, message: 'Failed to add user data' });
  }
});

ipcMain.on('delete-user-data', async (event, id) => {
  try {
    const result = await db('User_data').where({ id: id }).del();
    if (result === 0) {
      console.log('No user found with ID:', email);
      event.reply('user-data-deleted', { success: false, message: 'No user found with that ID' });
    } else {
      console.log('User data deleted successfully');
      event.reply('user-data-deleted', { success: true, message: 'User data deleted successfully' });
    }
  } catch (error) {
    console.error('Failed to delete user data', error);
    event.reply('user-data-deleted', { success: false, message: 'Failed to delete user data' });
  }
});

ipcMain.on('get-platform-cookies-data', async (event, platform) => {
  try {
    const platformCookiesData = await db('User_data').select('*').where('platform', platform);
    console.log(platform);
    event.reply('user-cookies-data', { success: true, data: platformCookiesData });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    event.reply('user-credentials', { success: false, error: error.message });
  }
});

ipcMain.on('get-user-data', async (event, userId) => {
  try {
    const user = await db('User_data').where('id', userId).first();
    if (!user) {
      event.reply('get-user-data-response', { success: false, message: 'user not found' });
    } else {
      event.reply('get-user-data-response', { success: true, user: user });
    }
  } catch (error) {
    console.error('Failed to fetch user by ID', error);
    event.reply('get-user-data-response', { success: false, message: 'Failed to fetch user by ID' });
  }
});

ipcMain.on('login-user', async (event, id) => {
  try {
    const user = await db('User_data').where('id', id).first();
    if (!user) {
      throw new Error('User not found');
    }
    console.log("user", user);
    const decryptedPassword = await decryptPassword(user.password);
    const cookiesPath = await login(user.platform, user.email, decryptedPassword);
    if (cookiesPath) {
      await db('User_data').where('id', id).update({ "Cookies_path": cookiesPath });
      event.reply('login-user-response', { success: true, message: "User logged in successfully & cookies are saved" });
    } else {
      event.reply('login-user-response', { success: false, message: "Failed to login user" });
    }
  } catch (error) {
    console.error('Error logging in user:', error);
    event.reply('login-user-response', { success: false, error: error.message });
  }
});

ipcMain.on('remove-user-account', async (event, userId) => {
  try {
    const result = await db('User_data').where({ id: userId }).del();
    if (result === 0) {
      console.log('No user found with ID:', userId);
      event.reply('user-account-removed', { success: false, message: 'No user found with that ID' });
    } else {
      console.log('User account removed successfully');
      event.reply('user-account-removed', { success: true, message: 'User account removed successfully' });
    }
  } catch (error) {
    console.error('Failed to remove user account', error);
    event.reply('user-account-removed', { success: false, message: 'Failed to remove user account' });
  }
});

ipcMain.on("delete-profiles", async (event, profileIds) => {
  try {
    if (!Array.isArray(profileIds) || profileIds.length === 0) {
      return event.reply("profiles-deleted", false, "Invalid input");
    }
    await db("Profile_Data").whereIn("id", profileIds).del();
    event.reply("profiles-deleted", true);
  } catch (error) {
    console.error("Error deleting profiles:", error);
    event.reply("profiles-deleted", false, error.message);
  }
});

module.exports = { db };

























