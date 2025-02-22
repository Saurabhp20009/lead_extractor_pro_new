import dotenv from 'dotenv';
import knex from 'knex';
dotenv.config();  // ✅ Load environment variables first
import { app, Tray, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import log from 'electron-log'; // Import electron-log
import fs from 'fs'; // Import the file system module
import * as Sentry from "@sentry/electron/main";


// Ensure the database is initialized
import { fork } from 'child_process';
import cron from 'node-cron';
import crypto from 'crypto';
import { login } from './LoginScript.js';
import { initializeQueues, addJob } from './worker.js';



Sentry.init({
  dsn: "https://af607297da72366e0aefc3db025726db@o4508829213065216.ingest.us.sentry.io/4508829214507008",
});



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Get the directory where the current script is running
const currentDir = __dirname;

// Properly resolve the paths using `path.resolve` which handles absolute paths correctly
const dbFilePath = path.resolve(currentDir, 'Lead_extractor_pro.sqlite3');
const migrationsPath = path.resolve(currentDir, '../migrations');

// Print paths to check what's actually resolved
console.log("Resolved database path:", dbFilePath);
console.log("Resolved migrations path:", migrationsPath);

const knexConfig = {
  client: 'sqlite3',
  connection: { filename: dbFilePath },
  migrations: { directory: migrationsPath, tableName: 'knex_migrations' },
  useNullAsDefault: true,
};

log.info("Resolved database path:", dbFilePath);
log.info("Resolved migrations path:", migrationsPath);

let db;




async function initializeDatabase() {
  const dbPath = knexConfig.connection.filename;

  if (!fs.existsSync(dbPath)) {
    console.log("Database does not exist. Creating and running migrations...");
    db = knex(knexConfig);
    try {
      await db.migrate.latest();
      console.log("Database created and migrations are up to date.");
    } catch (error) {
      Sentry.captureException(error)
      console.error("Error running migrations:", error);
    }
  } else {
    console.log("Database already exists. Ensuring migrations are up to date...");
    db = knex(knexConfig);
    try {
      await db.migrate.latest();
      console.log("Migrations are up to date.");
    } catch (error) {
     
      Sentry.captureException(error)
      console.error("Error ensuring migrations are up to date:", error);
      log.error("Error ensuring migrations are up to date:", error);
    }
  }
}

console.log("****path",process.resourcesPath)

Sentry.captureMessage("****path",process.resourcesPath)


let mainWindow;


function createWindow() {
  console.log('Creating window...');

  if (mainWindow && !mainWindow.isDestroyed()) {
    return;
  }


  console.log("Setting icon with path:", path.join(__dirname, '../assets/images/LeadExtractorPro2.png'));


  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, '../assets/images/LeadExtractorPro 2.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,  // Enable the webview tag
      webSecurity: true
    },
    autoHideMenuBar: true, // ✅ Hides the menu bar
  });

  const startURL = 'http://localhost:3000'


  const indexPath = `file://${path.join(__dirname, "../build", "index.html")}`;
  mainWindow.loadURL(startURL);




  mainWindow.on('close', (event) => {

    if (!app.isQuitting) {
      event.preventDefault();
      if (mainWindow) mainWindow.hide();
    }
    return false;

  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });


  // Start the worker
  const worker = fork(`${__dirname}/worker.js`);
}

let tray

function setupTray() {
  tray = new Tray(path.join(__dirname, '..', 'assets', 'images', 'LeadExtractorPro 2.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    {
      label: 'Quit', click: () => {
        app.isQuiting = true; if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.close();
        } else {
          app.quit();
        }
      }
    }
  ]);
  tray.setToolTip('Lead extractor pro');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });
}


function encryptPassword(password) {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from('85efcc2835cba7ce55f2acf8ce4ca03ae45ea006cf885c3404460e53f3da2a4a', 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function decryptPassword(encryptedPassword) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from('85efcc2835cba7ce55f2acf8ce4ca03ae45ea006cf885c3404460e53f3da2a4a', 'hex');
    const [iv, encrypted] = encryptedPassword.split(':');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return false
    throw new Error("Decryption failed! Invalid data.");

  }
}




app.on('ready', async () => {

  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true, // Optional, on macOS it opens the app hidden.
    path: app.getPath('exe')
  });

  await initializeDatabase();
  await initializeQueues()
  createWindow();
  setupTray();
  setupCronJobs();
  // launchBrowser()
  // Additional ready setups
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
  cron.schedule('*/30 * * * * ', async () => {
    console.log('Running a task every 30 mins');

    const jobs = await db('jobs').select('*').where('frequency', '30');
    jobs.forEach(async (task) => {
      try {

        console.log("+++task", task)

        const newTask = JSON.parse(task.state)

        if (newTask.status === 'started') {

          // Sentry.addBreadcrumb({
          //   category: 'ipc-event',
          //   message: 'task started',
          //   level: Sentry.Severity.Info
          // });

          console.log(`Emitting add-job event for job ID: ${task.id}`);
          console.log(task);
          ipcMain.emit('add-job', null, task);
          await db('jobs').where('id', task.id).update({ last_time_run: new Date().toLocaleString(), run_count: task.run_count + 1 });
          // Additional logic for each job can also be enclosed in this try block
        }
      } catch (error) {
        console.error(`Error processing job ID ${task.id}:`, error);
        Sentry.captureException('Error processing job ID ${task.id}:`', error)
        log.error(`Error processing job ID ${task.id}:`, error);
        // Handle errors that occur during the processing of each individual job
      }
    });
  });

  // Every 30 minutes
  cron.schedule('*/45 * * * *', async () => {
    console.log('Running a task every 45 minutes');
    const jobs = await db('jobs').select('*').where('frequency', '45');
    jobs.forEach(async (task) => {
      try {

        console.log()
        const newTask = JSON.parse(task.state)
        if (newTask.status === 'started') {
          console.log(`Emitting add-job event for job ID: ${task.id}`);
          ipcMain.emit('add-job', null, task);
          await db('jobs').where('id', task.id).update({ last_time_run: new Date().toLocaleString(), run_count: task.run_count + 1 });
          // Additional logic for each job can also be enclosed in this try block
        }
      } catch (error) {
        console.error(`Error processing job ID ${task.id}:`, error);
        log.error(`Error processing job ID ${task.id}:`, error);

        Sentry.captureException(error);

        // Handle errors that occur during the processing of each individual job
      }
    })
  });

  // Every 60 minutes
  cron.schedule('*/60 * * * *', async () => {
    console.log('Running a task every hour');
    const jobs = await db('jobs').select('*').where('frequency', '60');
    jobs.forEach(async (task) => {
      try {

        const newTask = JSON.parse(task.state)
        if (newTask.status === 'started') {
          console.log(`Emitting add-job event for job ID: ${task.id}`);
          ipcMain.emit('add-job', null, task);
          await db('jobs').where('id', task.id).update({ last_time_run: new Date().toLocaleString(), run_count: task.run_count + 1 });
          // Additional logic for each job can also be enclosed in this try block
        }
      } catch (error) {
        console.error(`Error processing job ID ${task.id}:`, error);
        Sentry.captureException(error);
        log.error(`Error processing job ID ${task.id}:`, error);
        // Handle errors that occur during the processing of each individual job
      }
    })

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
          // Additional logic for each job can also be enclosed in this try block
        }
      } catch (error) {
        console.error(`Error processing job ID ${task.id}:`, error);
        Sentry.captureException(error);
        log.error(`Error processing job ID ${task.id}:`, error);
        // Handle errors that occur during the processing of each individual job
      }
    })
  });
}




ipcMain.on('submit-form', async (event, formData) => {
  console.log('Form submitted', formData);
  try {

    console.log('Form submitted', formData);
    //await db('jobs').insert(formData);

    if (formData.id) {
      await db('jobs').where('id', formData.id).update(formData);
    }
    else {


      formData.timeCreated = new Date().toLocaleString();;

      await db('jobs').insert(formData);
    }

    event.reply('form-submission', { success: true, message: 'Form data saved successfully!' });



    // const queue = createQueue('job-processing');
    // queue.add({ data: formData });
    console.log('Job submitted:', formData);

  } catch (error) {
    event.reply('form-submission', { success: true, message: `Failed to save form data. ${error} ` });
    Sentry.captureException(error);
    console.error('Failed to save form data', error);

  }
});


ipcMain.on('update-job', async (event, jobId) => {

  try {
    await db('jobs').where('id', formData.id).update(formData);

    event.reply('job-update', 'Job data updated successfully!');

  } catch (error) {
    console.error('Failed to update job data', error);
    Sentry.captureException(error);
    event.reply('job-update', 'Failed to update job data.');
  }

})


ipcMain.on('add-job', async (event, jobData) => {
  // const queue = createQueue('job-processing');
  const job = await addJob(jobData.platforms, jobData);
  console.log(`Added job: ${job.id}`);
  log.error('Job is added:')
});

ipcMain.on('show-dialog', async (event, args) => {
  const { type, title, message, buttons } = args;
  const result = await dialog.showMessageBox({
    type: type,
    title: title,
    message: message,
    // buttons: buttons
  });
  event.reply('dialog-result', result.response);
});


// Assuming db is already set up and available here
ipcMain.on('remove-job', async (event, jobId) => {
  console.log('Deleting job with ID:', jobId);
  try {
    // Execute the deletion query
    const result = await db('jobs')
      .where({ id: jobId }) // assuming 'id' is the primary key for jobs
      .del();

    if (result === 0) {
      // No rows were deleted, meaning the job was not found
      console.log('No job found with ID:', jobId);
      event.reply('job-remove', { success: false, message: 'No job found with that ID' });
    } else {
      // Job was successfully deleted
      console.log('Job remove successfully');
      event.reply('job-remove', { success: true, message: 'Job deleted successfully' });
    }
  } catch (error) {
    console.error('Failed to delete job', error);
    event.reply('job-remove', { success: false, message: 'Failed to remove job' });
  }
});

ipcMain.on('jobs-failed', (event, { jobId, jobData, errorMessage }) => {
  console.log(`Job failed received for jobId ${jobId} with message: ${errorMessage}`);
  // You might handle further actions here, such as logging or sending notifications
});

ipcMain.on('jobs-started', (event, { message }) => {
  console.log(`********Job started received for jobId  with message: ${message}`);
  // You might handle further actions here, such as logging or sending notifications
});



ipcMain.on('fetch-jobs', async (event) => {
  try {
    const jobs = await db('jobs').select('*');
    event.reply('jobs-fetched', jobs);
  } catch (error) {
    console.error('Failed to fetch jobs', error);
    event.reply('jobs-fetched', []);
    Sentry.captureException(error);
  }
});


ipcMain.on('start-job', async (event, jobId) => {
  try {

    console.log(jobId)
    // Update job records from 'stopped' to 'started'
    const updatedCount = await db("Jobs").where({ id: jobId }).update({ state: JSON.stringify({ status: "started", message: "Job is started" }) });

    console.log(`${updatedCount} jobs updated from 'stopped' to 'started'`);
    event.reply('start-job', { success: true, message: 'Job started successfully' });

    Sentry.captureMessage("Job is set for started");


  } catch (error) {
    console.error('Failed to start the job', error);
    Sentry.captureException(error);
    event.reply('reply-start-job', { success: false, message: 'Failed to start the job' });
  }

}
)


ipcMain.on('stop-job', async (event, jobId) => {
  try {

    console.log(jobId)
    // Update job records from 'stopped' to 'started'
    const updatedCount = await db('jobs')
      .where('id', jobId)  // Condition to match the current status
      .update({ state: JSON.stringify({ status: "stopped", message: "Job is stopped" }) });

    console.log(`${updatedCount} jobs updated from 'started ' to 'stopped'`);
    event.reply('stop-job', { success: true, message: 'Job stopped successfully' });


  } catch (error) {
    console.error('Failed to stop the job', error);
    Sentry.captureException(error);
    event.reply('reply-stop-job', { success: false, message: 'Failed to stop the job' });
  }

})

ipcMain.on('fetch-profiles', async (event, jobId) => {

  try {

    let profiles
    if (jobId == "all") {
      console.log("jobId", jobId)
      profiles = await db('Profile_Data').select('*')
    }
    else {
      profiles = await db('Profile_Data').select('*').where('query_id', jobId);

    }
    console.log("jobId", jobId)
    console.log("profiles", profiles)
    event.reply('profile-fetched', profiles);
  } catch (error) {
    console.error('Failed to fetch job', error);
    event.reply('profile-fetched', [], error);
    Sentry.captureException(error);
  }

})
ipcMain.on('add-user-data', async (event, data) => {
  try {
    const { email, password, platform } = data;

    // Check if the same email with the same platform already exists
    const existingUser = await db('User_data')
      .where({ email, platform })
      .first();

    if (existingUser) {
      console.log("❌ User with this email and platform already exists:", email, platform);
      event.reply('user-data-added', { success: false, message: 'User already exists for this platform' });
      return;
    }

    // Hash the password before inserting
    const hashedPassword = encryptPassword(password);

    console.log("✅ Adding new user:", email, platform);

    // Insert the user data into the User_data table  
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
    event.reply('user-data-added', { success: false, message: error });
    Sentry.captureException(error);
  }
});

ipcMain.on('add-productKey', async (event, data) => {
  try {
    const { productKey } = data;

    // Insert the user data into the User_data table  
    await db('MainUserAccount').insert({
      ProductKey: productKey
    });

    event.reply('response-add-productKey', { success: true, message: 'product key added successfully' });

  } catch (error) {
    console.error('❌ Failed to add product key', error);
    event.reply('response-add-productKey', { success: false, message: error });
  }
});

ipcMain.on('check-productKey-exist', async (event) => {
  try {

    // Insert the user data into the User_data table  
    const key = await db('MainUserAccount').select();

    console.log("keyy", key)

    if (key.length > 0) {

      event.reply('response-check-productKey-exist', { success: true, message: 'product key already exist' });


    }
    else {
      event.reply('response-check-productKey-exist', { success: false, message: 'no key found' });
    }


  } catch (error) {
    console.log(error)
    Sentry.captureException(error);
    event.reply('response-add-productKey', { success: false, message: error });
  }
});




ipcMain.on('delete-user-data', async (event, id) => {

  try {
    const result = await db('User_data')
      .where({ id: id }) // assuming 'id' is the primary key for User_data
      .del();

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

})

ipcMain.on('get-platform-cookies-data', async (event, platform) => {
  try {
    const platformCookiesData = await db('User_data').select('*').where('platform', platform);

    console.log(platform)


    event.reply('user-cookies-data', {
      success: true,
      data: platformCookiesData
    });

  } catch (error) {
    console.error('Error fetching credentials:', error);
    Sentry.captureException(error);
    event.reply('user-credentials', {
      success: false,
      error: error.message
    });
  }
});

ipcMain.on('get-user-data', async (event, userId) => {
  try {
    const user = await db('User_data')
      .where('id', userId)
      .first();

    if (!user) {
      event.reply('get-user-data-response', { success: false, message: 'user not found' });
    } else {
      event.reply('get-user-data-response', { success: true, user: user });
    }
  } catch (error) {
    console.error('Failed to fetch user by ID', error);
    Sentry.captureException(error);
    event.reply('get-user-data-response', { success: false, message: 'Failed to fetch user by ID' });
  }
});


ipcMain.on('login-user', async (event, id) => {
  let user = null;  // Declare user outside try block to broaden its scope safely

  try {
    user = await db('User_data')
      .where('id', id)
      .first();

    console.log("user", user);

    if (!user) {
      throw new Error("User not found in database");
    }

    const decryptedPassword = await decryptPassword(user.password);

    // Fix the function check here
    if (!decryptedPassword) {
      throw new Error("Decryption of password failed");
    }

    // Use Playwright to perform the login
    const cookiesPath = await login(user.platform, user.email, decryptedPassword);
    console.log("cookiePath", cookiesPath)

    if (cookiesPath && cookiesPath.result) {
      await db('User_data')
        .where('id', id)
        .update({ "Cookies_path": cookiesPath.result });

      event.reply('login-user-response', {
        success: true,
        message: cookiesPath.message
      });
    } else {
      throw new Error(cookiesPath ? cookiesPath.message : "Failed to login without error message");
    }

  } catch (error) {
    console.error('Error logging in user:', error);
    // Sentry.captureException(error);
    event.reply('login-user-response', {
      success: false,
      error: error.message,
      userid: user ? user.id : 'unknown'
    });
  }
});


ipcMain.on('remove-user-account', async (event, userId) => {
  try {
    const result = await db('User_data')
      .where({ id: userId })
      .del();

    if (result === 0) {
      console.log('No user found with ID:', userId);
      event.reply('user-account-removed', { success: false, message: 'No user found with that ID' });
    } else {
      console.log('User account removed successfully');
      event.reply('user-account-removed', { success: true, message: 'User account removed successfully' });
    }
  } catch (error) {
    console.error('Failed to remove user account', error);
    Sentry.captureException(error);
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
    Sentry.captureException(error);
    event.reply("profiles-deleted", false, error.message);
  }
});


// export {db}

