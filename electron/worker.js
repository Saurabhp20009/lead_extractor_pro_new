const createQueue = require('./createQueue');
const { processInstagramJob, processFacebookJob, processTwitterJob, processLinkedinJob, processRedditJob, processTiktokJob, processGoogleMapJob } = require('./socialMediaScrappingHandlers');
const queue = createQueue('job-processing');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const Sentry = require('@sentry/electron/main');
const redis = require('redis');
const { ipcMain, app } = require("electron");
const { chromium, firefox } = require("playwright");
const { createBullBoard } = require('bull-board');
const { BullAdapter } = require('bull-board/bullAdapter');
const express = require('express');
const server = express(); // Using 'server' instead of 'app'
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const PORT = 3010;


const { fileURLToPath } = require('url');
const { dirname } = require('path');
const { default: knex } = require('knex');




const filePath = path.join(__dirname, 'unique_id.txt');  // Define the path for the file

function getOrCreateUniqueId() {
  try {
    if (!fs.existsSync(filePath)) {
      const uniqueId = uuidv4();
      fs.writeFileSync(filePath, uniqueId, 'utf8');
      console.log('Unique ID created:', uniqueId);
      return uniqueId;
    } else {
      const uniqueId = fs.readFileSync(filePath, 'utf8');
      console.log('Retrieved existing unique ID:', uniqueId);
      return uniqueId;
    }
  } catch (error) {
    console.error('Error handling the unique ID file:', error);
    return null;
  }
}


// const express = express();



console.log("wroker is running")








// Handlers dictionary for easier management
const handlers = {
  instagram: processInstagramJob,
  facebook: processFacebookJob,
  twitter: processTwitterJob,
  linkedin: processLinkedinJob,
  reddit: processRedditJob,
  tiktok: processTiktokJob,
  google_maps: processGoogleMapJob
};


let db;


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);


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


// Initialize the database
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

    // Check if the database connection is working
    try {
      await db.raw('select 1+1 as result');
      console.log("Database connection is up and running.");
    } catch (error) {
      console.error("Failed to connect to the database:", error);
      Sentry.captureException(error);
    }

  }
}



initializeDatabase()





const queues = {};

function initializeQueues() {
  const platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'reddit', 'tiktok', 'google_maps'];  // List platforms

  const unique_id = getOrCreateUniqueId()  // Ensure this function is called safely and correctly retrieves the IP.



  platforms.forEach(platform => {

    console.log("platform_queue", platform)



    queues[platform] = createQueue(`${unique_id}-${platform}-job-processing`);


    // Job options with retry configuration
    const jobOptions = {
      attempts: 3, // Initial attempt + 2 retries
      backoff: {
        type: 'fixed',  // Can be 'exponential' if desired
        delay: 5000     // Delay in milliseconds between retries
      }
    };



    queues[platform].process(async (job) => {

      console.log(`Processing ${unique_id}  ${platform} job: ${job.id}`);

      Sentry.captureMessage(`Processing ${platform} job: ${job.id}`);

      return handlers[platform](job);
    });


    // Attach event listeners to each platform-specific queue 
    queues[platform].on('completed', async (job, result) => {

      console.log(`Job ${job.id} in ${platform} queue completed with result: `);

      await db('Job_notification').insert({ jobName: job.data.title, message: "Job is finished", status: 'completed' });

      // Additional logic for handling completed jobs, e.g., removing them from the queue
    });

    queues[platform].on('failed', async (job, error) => {

      console.error(`Job ${job.id} in ${platform} queue failed with error: ${error.message}`);

      let errorMessage;



      if (error.message.includes('TimeoutError')) {
        errorMessage = 'Page load timed out. Please try again later.';
      } else if (error.message.includes('page.waitForSelector:')) {
        errorMessage = 'Failed to find required element on the page.';
      } else if (error.message.includes('NavigationError')) {
        errorMessage = 'Navigation failed. The page could not be reached.';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Check your internet connection and try again.';
      }
      else if (error.message.includes('browserContext.close') || error.message.includes('Target page, context or browser has been closed')) {
        errorMessage = 'Operation attempted on a closed browser or context. Ensure all pages and contexts are appropriately managed.';
      }
      else{
        errorMessage = error.message;
      }



      // Emit an ipcMain event to handle this failure elsewhere in your Electron app

      if (job.attemptsMade >= job.opts.attempts) {

        await db('Job_notification').insert({ jobName: job.data.title, message: errorMessage, status: 'failed' });
      }



      Sentry.captureException(error);
      // Additional logic for handling job failures
    });


  });







  console.log('Queues initialized for all platforms.');
  log.info('Queues initialized for all platforms.')
}

function addJob(platform, jobData) {
  try {

    const jobOptions = {
      attempts: 3,
      backoff: {
        type: 'fixed',
        delay: 5000
      }
    };

    if (queues[platform]) {
      // queues[platform].add returns a Promise that resolves to a Job object
      return queues[platform].add(jobData, jobOptions)
        .then(job => {

          console.log(`Job added to ${platform} queue with ID: ${job.id}`);

          Sentry.captureMessage(`Job added to ${platform} queue with ID: ${job.id}`);

          log.info(`Job added to ${platform} queue with ID: ${job.id}`);

          return job.id;  // Return the job ID
        })
        .catch(error => {
          console.error(`Failed to enqueue job to ${platform} queue:`, error);
          Sentry.captureException(error);
          log.error(`Failed to enqueue job to ${platform} queue:`, error);
          throw error;  // Re-throw the error to handle it in the caller
        });
    } else {

      console.log(`Queue for ${platform} does not exist.`);

      log.info(`Queue for ${platform} does not exist.`);

      throw new Error(`Queue for ${platform} does not exist.`);  // Throw an error if the queue does not exist
    }
  } catch (error) {

    console.error(`Failed to add job to ${platform} queue:`, error);

    Sentry.captureException(error);

    log.error(`Failed to add job to ${platform} queue:`, error);

    throw error;  // Ensure errors are propagated up
  }
}




console.log('All platform-specific queues are initialized.');



queue.on('error', (err) => {
  console.error('Redis connection error:', err);
});







initializeQueues()





// // Setup Bull Board
// const { router } = createBullBoard(
//   Object.keys(queues).map(key => new BullAdapter(queues[key]))
// );
// server.use('/admin/queues', router);

// // Start the server
// server.listen(PORT, () => console.log(`Bull Board running on http://localhost:${PORT}/admin/queues`));




module.exports = { initializeQueues, addJob, db };
