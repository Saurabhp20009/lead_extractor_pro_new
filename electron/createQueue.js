const Bull = require('bull');
const log = require('electron-log');
const Sentry = require('@sentry/electron/main');




const createQueue = (queueName) => {
  // Define the Redis connection string and options
  const redisOptions = {
    redis: {
      // url: 'rediss://default:AVNS_G9q6fgLvhsm3iBmQEoF@valkey-10c04ba5-vijayantskatyal-23af.h.aivencloud.com:24218',
      url: 'redis://127.0.0.1:6379',
      connectTimeout: 5000,         // Connection timeout in milliseconds
    }
  };

  try {



    const queue = new Bull(queueName, redisOptions);  // Pass the Redis options object


    // await queue.isReady();

    // console.log('Queue successfully created:', queue);
    log.info('Queue successfully created:', queueName);


    // Access the Redis client directly from the Bull queue
    const redisClient = queue.client;


    // Setup event listeners on the Redis client
    redisClient.on('connect', () => {
      const connection = redisClient.options; // Access the connection options
      console.log('Redis connection successfully established');
      console.log(`Connected to Redis at host: ${connection.host}, port: ${connection.port}`);
      Sentry.captureMessage(`Connected to Redis at host: ${connection.host}, port: ${connection.port}`);
    });


    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });



    queue.on('ready', () => {
      console.log("Redis conection is successful..")
    })


    Sentry.captureMessage("Queue successfully created :", queue);

    return queue;
  } catch (error) {
    console.error('Failed to create queue:', queueName, error);

    Sentry.captureException("Failed to create queue:", error);

    log.info('Failed to create queue:', queueName, error)
    return null; // Return null or appropriate error handling
  }
};



// const createQueue = (queueName) => {


//   console.log("queuname:",queueName)
//   const redisOptions = {
//     redis: {

//       port: 24218, // Redis port
//       host: 'valkey-10c04ba5-vijayantskatyal-23af.h.aivencloud.com', // Redis host
//       password: 'AVNS_G9q6fgLvhsm3iBmQEoF', // Password if needed
//       reconnectOnError: (err) => {
//         console.log('Reconnect on error', err);
//         return true; // This instructs ioredis to reconnect on every disconnect event
//       },
//       retryStrategy: (times) => {
//         const delay = Math.min(times * 50, 2000);
//         console.log('Redis retry strategy, attempt:', times, 'delay:', delay);
//         return delay;
//       }  
//     }
//   };

//   const queue = new Bull(queueName, redisOptions);

//   // Access the Redis client directly from the Bull queue
//   const redisClient = queue.client;


//   // Setup event listeners on the Redis client
//   redisClient.on('connect', () => {
//     const connection = redisClient.options; // Access the connection options
//     console.log('Redis connection successfully established');
//     console.log(`Connected to Redis at host: ${connection.host}, port: ${connection.port}`);
//   });


//   redisClient.on('error', (err) => {
//     console.error('Redis connection error:', err);
//   });

//   return queue;
// };










module.exports = createQueue;
