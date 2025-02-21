const createQueue = require('./createQueue');
const { processInstagramJob, processFacebookJob, processTwitterJob, processLinkedinJob, processRedditJob, processTiktokJob, processGoogleMapJob } = require('./socialMediaScrappingHandlers');
const queue = createQueue('job-processing');
const path = require('path');
const fs = require('fs');
const  log  = require('electron-log');
const Sentry = require('@sentry/electron/main');



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


const queues = {};

function initializeQueues() {
  const platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'reddit', 'tiktok', 'google_maps'];  // List platforms

  platforms.forEach(platform => {

    console.log("platform_queue", platform)
    queues[platform] = createQueue(`${platform}-job-processing`);
    queues[platform].process(async (job) => {
      console.log(`Processing ${platform} job: ${job.id}`);
      return handlers[platform](job);
    });
  });


 

  console.log('Queues initialized for all platforms.');
  log.info('Queues initialized for all platforms.')
}

function addJob(platform, jobData) {
  if (queues[platform]) {
    queues[platform].add(jobData);
    console.log(`Job added to ${platform} queue.`);

 
    log.info(`Job added to ${platform} queue.`);


    if (mainWindow && !mainWindow.isDestroyed()) {

      console.log("MainWindow+++++++++++")
      mainWindow.webContents.send('jobs-started', {

        jobData: jobData
      });

    }

  } else {
    console.log(`Queue for ${platform} does not exist.`);
    log.info(`Queue for ${platform} does not exist.`)

  }
}



console.log('All platform-specific queues are initialized.');





queue.on('error', (err) => {
  console.error('Redis connection error:', err);
});




queue.on('completed', async (job, result) => {
  console.log(`Job ${job.id} completed with result: ${result}`);
  process.send({ type: 'job-completed', jobId: job.id, result: result }); // If this worker is a child process

  try {
    await job.remove();

  } catch (error) {
    console.error(`Failed to remove completed job ${job.id} from queue`, error);
    log.info('Failed to remove complete job', error)


  }
});

// Handling job failure
queue.on('failed', async (job, error) => {
  console.log(`Job ${job.id} failed with error: ${error}`);
  log.info(`Job ${job.id} failed with error: ${error}`)
  console.error(`Failed to remove completed job ${job.id} from queue`, error);

  process.send({ type: 'job-failed', jobId: job.id, error: error.message }); // If this worker is a child process
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('jobs-failed', {
      jobId: job.id,
      jobData: job.data,
      error: error.message,
    });

  }
  else {
    console.log("Main window is not available")
  }

  try {
    await job.remove();

  } catch (error) {
    log.info('Failed to remove complete job', error)
    console.error(`Failed to remove completed job ${job.id} from queue`, error);

  }


});


module.exports = { initializeQueues, addJob };
