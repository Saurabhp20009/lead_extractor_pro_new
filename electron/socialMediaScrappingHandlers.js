const fs = require("fs");
const { chromium, firefox } = require("playwright");
const path = require("path");
const cheerio = require("cheerio");
const { data } = require("autoprefixer");
const { login } = require("./LoginScript");
const crypto = require('crypto');
const { default: knex } = require("knex");
const { app } = require("electron");
// const { dbPromise } = require("./main.cjs");

const Sentry = require('@sentry/electron/main');


const dbPath = path.join(__dirname, 'lead_extractor_pro.sqlite3');

let knexDB = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: dbPath  // Specify your SQLite database file
    },
});









async function scrapeAndInsertData(
    query_id,
    name,
    link,
    emails,
    phoneNumber,
    links,
    jobId
) {
    console.log(query_id, name, emails, phoneNumber, links);



    try {

        const result = await knexDB("Profile_Data").insert({
            query_id: query_id,
            name: name,
            source: link,
            created_at: new Date().toISOString(),
            email: Array.isArray(emails) ? emails.join(", ") : emails,
            phone: Array.isArray(phoneNumber)
                ? phoneNumber.join(", ")
                : phoneNumber,
            links: Array.isArray(links)
                ? links.map((l) => l.url).join(", ")
                : links,
            job_id: jobId,
        });
        console.log("Data inserted successfully:", result);

    } catch (error) {
        Sentry.captureException('Error saving the data in of leads', error);
        console.error("Error inserting data into Profile_data table", error);
    }
}


async function UpdatingValuesIfExist(source, name, emails, phoneNumber, links) {
    try {

        const existingRecord = await knexDB("Profile_Data")
            .where({ source })
            .first();

        if (existingRecord) {
            const updates = {};
            let changesExist = false;

            if (name && name !== existingRecord.name) {
                updates.name = name;
                changesExist = true;
            }
            if (emails && Array.isArray(emails) && emails.join(', ') !== existingRecord.email) {
                updates.email = emails.join(', ');
                changesExist = true;
            }
            if (phoneNumber && Array.isArray(phoneNumber) && phoneNumber.join(', ') !== existingRecord.phone) {
                updates.phone = phoneNumber.join(', ');
                changesExist = true;
            }
            if (links && JSON.stringify(links) !== existingRecord.links) {
                updates.links = JSON.stringify(links);
                changesExist = true;
            }

            if (changesExist) {
                await knexDB("Profile_Data").where({ source }).update(updates);
                console.log("Updated record for source:", source);
                return true;
            } else {
                console.log("No changes detected for source:", source);
                return false;
            }
        } else {
            console.log("No existing record found for source:", source);
            return false;
        }
    } catch (error) {
        console.error("Error updating Profile_Data:", error);
        return false;
    }
}



async function getCookiesName(userId) {
    try {


        console.log("userid", userId)
        const userData = await knexDB("User_data")
            .where({ id: userId }).first();

        console.log(userData)

        const cookieFileName = `${userData.platform}_${userData.email}.json`
        // console.log(userData)
        return cookieFileName
    } catch (error) {
        console.error("Error fetching cookies path:", error);
        return null;
    }
}


async function getUserDataById(id) {

    try {

        // const db = await getDbInstance()

        const user = await knexDB("User_data")
            .where("id", id)
            .first();


        if (!user) {
            return false
        }

        return user

    }
    catch (error) {
        console.error("Error fetching user data:", error);
        return false;
    }

}



//decrypting password
async function decryptPassword(encryptedPassword) {
    try {
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from('85efcc2835cba7ce55f2acf8ce4ca03ae45ea006cf885c3404460e53f3da2a4a', 'hex');;
        const [iv, encrypted] = encryptedPassword.split(':');
        const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        throw new Error("Decryption failed! Invalid data.");
    }
}

// async function checkSessionIdValidity(cookies) {


//     try {

//         // Find sessionid cookie
//         const sessionCookie = cookies.find(cookie => cookie.name === "sessionid");

//         if (!sessionCookie || !sessionCookie.expires) {
//             console.error("❌ No valid sessionid cookie found or expiration missing.");
//             return false;
//         }

//         const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds
//         const oneDayInSeconds = 86400; // 1 day = 86400 seconds

//         if (sessionCookie.expires <= currentTime) {
//             console.error("❌ Instagram sessionid cookie has already expired.");
//             return false;
//         }

//         if (sessionCookie.expires - currentTime < oneDayInSeconds) {
//             console.error("⚠️ Instagram sessionid cookie is expiring soon (less than 24 hours left).");
//             return false;
//         }

//         console.log(`✅ Instagram sessionid is valid. Expires in ${(sessionCookie.expires - currentTime) / 3600} hours.`);
//         return true;
//     } catch (error) {
//         console.error("⚠️ Error reading or parsing the cookie file:", error);
//         return false;
//     }
// }


// async function checkSessionFacebookIdValidity(cookies) {


//     try {

//         // Find sessionid cookie
//         const sessionCookie = cookies.find(cookie => cookie.name === "c_user");

//         if (!sessionCookie || !sessionCookie.expires) {
//             console.error("❌ No valid sessionid cookie found or expiration missing.");
//             return false;
//         }

//         const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds
//         const oneDayInSeconds = 86400; // 1 day = 86400 seconds

//         if (sessionCookie.expires <= currentTime) {
//             console.error(" sessionid cookie has already expired.");
//             return false;
//         }

//         if (sessionCookie.expires - currentTime < oneDayInSeconds) {
//             console.error("sessionid cookie is expiring soon (less than 24 hours left).");
//             return false;
//         }

//         console.log(`✅sessionid is valid. Expires in ${(sessionCookie.expires - currentTime) / 3600} hours.`);
//         return true;
//     } catch (error) {
//         console.error("⚠️ Error reading or parsing the cookie file:", error);
//         return false;
//     }
// }

async function checkCookieValidity(platform, cookies) {
    let cookieName = '';

    // Determine which cookie to check based on the platform
    switch (platform) {
        case 'instagram':
            cookieName = 'sessionid';
            break;
        case 'facebook':
            cookieName = 'c_user';
            break;
        case 'twitter':
            cookieName = 'auth_token';
            break;
        case 'linkedin':
            cookieName = 'li_at';
            break;
        case 'reddit':
            cookieName = 'reddit_session';
            break;
        case 'tiktok':
            cookieName = 'session_id';
            break;
        default:
            console.error("❌ Unknown platform.");
            return false;
    }

    try {
        // Find the cookie for the given platform
        const targetCookie = cookies.find(cookie => cookie.name === cookieName);
        if (!targetCookie || !targetCookie.expires) {
            console.error(`❌ No valid ${cookieName} cookie found or expiration missing.`);
            return false;
        }

        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        const oneDayInSeconds = 86400; // 1 day = 86400 seconds

        if (targetCookie.expires <= currentTime) {
            console.error(`❌ ${platform} ${cookieName} cookie has already expired.`);
            return false;
        }

        if (targetCookie.expires - currentTime < oneDayInSeconds) {
            console.error(`⚠️ ${platform} ${cookieName} cookie is expiring soon (less than 24 hours left).`);
            return false;
        }

        console.log(`✅ ${platform} ${cookieName} is valid. Expires in ${(targetCookie.expires - currentTime) / 3600} hours.`);
        return true;
    } catch (error) {
        console.error("⚠️ Error reading or parsing the cookie file:", error);
        Sentry.captureException('Error reading or parsing the cookie file:', error);
        return false;
    }
}




async function processInstagramJob(job) {


    console.log("instagram running")


    let browser

    try {





        Sentry.captureMessage("Instagram job is started..");




        const userId = job.data.user_data_id;





        //getting cookie name
        let cookieFileName = await getCookiesName(userId);


        //check cookie name is avaialble or not
        if (!cookieFileName) {
            console.error("No cookie file found in database.");
            throw new Error("No cookie file found in database.")


        }



        // Normalize __dirname to use forward slashes
        const normalizedDirname = __dirname.replace(/\\/g, '/');



        // Construct full path using path.join (not posix since it's already normalized)
        let cookiePath = path.posix.join(normalizedDirname, "cookies", cookieFileName);


        console.log("Checking cookie file at:", cookiePath);


        let cookies = [];


        try {
            //accessing the file using the constructed path
            await fs.promises.access(cookiePath);

        } catch (error) {

            console.error("Unable to access the cookie file", cookiePath);

            throw error

            // throw new Error("Unable to access the cookie file")
        }

        try {

            //reading the fiie using the cookie path
            const data = await fs.promises.readFile(cookiePath, "utf8");

            //parsing the data of cookie 
            cookies = JSON.parse(data);


            //checking session validity
            const Session = await checkCookieValidity('instagram', cookies)

            console.log("Session", Session)

            //if session is not valid  
            if (Session == false) {

                //extracting user details which cookie used for this job
                const userData = await getUserDataById(job.data.user_data_id)


                let Hashedpassword = userData.password

                //decrypted password
                const password = await decryptPassword(Hashedpassword);
                console.log(password)

                //make the login again using the email and password
                const resultCheck = await login(userData.platform, userData.email, password)

                //if failed to make the relogin
                if (!resultCheck.result) {
                    console.error("❌ Failed to log in and refresh cookies.");
                    throw new Error("Failed to log in again ,please relogin")



                }


                //getting new cookie data from the database
                const newDataCookies = await fs.promises.readFile(cookiePath, "utf8");

                //parsing the data
                cookies = JSON.parse(newDataCookies);
            }

        } catch (readError) {

            console.error("❌ Error reading cookies file:", readError);

            throw readError
        }




        let executablePath


        if (app.isPackaged) {
            if (process.platform === 'darwin') { // darwin is the platform name for macOS
                executablePath = path.join(process.resourcesPath, 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
            } else if (process.platform === 'win32') { // win32 is the platform name for Windows
                executablePath = path.join(process.resourcesPath, 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');

            }
        } else {
            if (process.platform === 'darwin') {
                executablePath = path.join(__dirname, '..', 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
            } else if (process.platform === 'win32') {
                executablePath = path.join(__dirname, '..', 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
                // executablePath = path.join(__dirname, '..', 'ms-playwright', 'chromium_headless_shell-1155', 'chrome-win', 'headless_shell.exe');
            }
        }


        let browserOptions = {
            headless: true,
            executablePath: executablePath
        };




        Sentry.captureMessage('instagram working here launched the browser')

        //proxy adding 
        if (job.data.proxy) {
            browserOptions.proxy = {
                server: job.data.proxy.server, // Ensure these are defined in your job.data or use placeholders
                username: job.data.proxy.username, // This might also include password if needed
                password: job.data.proxy.password

            };
        }

        // //launching the browser and a new page
        browser = await chromium.launch(
            browserOptions
        );


        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36' });
        const page = await context.newPage();

        //added the cookie into the browser
        await context.addCookies(cookies);


        await page.goto("https://www.instagram.com");

        console.log("Navigating and searching for:", job.data.query);


        // Wait for the search input and perform search
        await page.waitForSelector('svg[aria-label="Search"]');

        await page.click('svg[aria-label="Search"]');

        await page.waitForSelector('input[aria-label="Search input"]', {
            state: "visible",
        });


        Sentry.captureMessage('naviagtion through search')


        await page.type('input[aria-label="Search input"]', job.data.query, {
            delay: Math.floor(Math.random() * (40 - 20 + 1)) + 20,
        });

        await page.waitForTimeout(6000);

        await page.press('input[aria-label="Search input"]', "Enter");

        await page.waitForTimeout(6000);

        // Click on the first element with the long class chain
        await page.click(
            "a.x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz.x1dm5mii.x16mil14.xiojian.x1yutycm.x1lliihq.x193iq5w.xh8yej3",
            { timeout: 5000 }
        );


        //sepcific query or username
        if (job.data.specific_username) {

            const profileLink = "https://www.instagram.com/" + job.data.query + "/";


            // Wait for the page to navigate to the specific profile
            await page.waitForURL(profileLink, { timeout: 5000 });

            await page.waitForTimeout(3000);

            // Extract the profile Name
            const name = await page.$eval("h2", (header) =>
                header.textContent.trim()
            );

            //Extract the profile page Information
            const profileInfo = await page.$eval(
                "div.x7a106z", // The main container class
                async (container) => {
                    // Title
                    const titleElement = container.querySelector('span[dir="auto"]');

                    const title = titleElement ? titleElement.textContent.trim() : null;

                    // Click on "more" if it exists to expand the description
                    const moreButton = container.querySelector(
                        'span[dir="auto"].x1lliihq.x1plvlek.xryxfnj.x1n2onr6.x1ji0vk5.x18bv5gf.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.xo1l8bm.x1roi4f4.x1yc453h.x10wh9bi.x1wdrske.x8viiok.x18hxmgj'
                    );

                    if (moreButton) {
                        moreButton.click();

                        console.log("more button is clicked");

                        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
                    } else {
                        console.log("no more button");
                    }

                    // Description
                    const descriptionElement = container.querySelector(
                        "span._ap3a._aaco._aacu._aacx._aad7._aade"
                    );
                    const description = descriptionElement
                        ? descriptionElement.textContent.trim()
                        : null;

                    // Links in the description
                    const links = Array.from(
                        descriptionElement.querySelectorAll("a")
                    ).map((link) => ({
                        text: link.textContent.trim(),
                        url: link.href,
                    }));

                    return { title, description, links };
                }
            );

            // Regular expression to match email addresses
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

            // Regular expression to match phone numbers (adjusted to handle different formats)
            const phoneRegex = /(\+?\d{1,4}[\s-])?(\d{5}[\s-]?\d{5})/g;

            // Extract emails and phone numbers from str1
            const emails = profileInfo.description.match(emailRegex);
            const phones = profileInfo.description.match(phoneRegex);

            const updataPresent = await UpdatingValuesIfExist(profileLink, name, emails, phones, profileInfo.links)


            if (!updataPresent) {
                console.log("inserting data");
                await scrapeAndInsertData(
                    job.data.id,
                    name,
                    profileLink,
                    emails,
                    phones,
                    profileInfo.links,
                    job.id
                );
            }

            return true;
        } else {

            // Wait for the posts to appear on the page
            await page.waitForSelector('.x1qjc9v5.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1lliihq.xdt5ytf.x2lah0s.xrbpyxo.x1a7h2tk.x14miiyz.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x11njtxf.x1bfs520.xph46j.x9i3mqj.xcghwft.x1bzgcud.xhdunbi', { timeout: 5000 });


            // Initialize an empty array to hold the post information
            let postsInfo = [];




            let lastScrappedData = job.data.last_scrapped_element || "{}"; // Default to an empty object string

            // Ensure lastScrappedData is parsed only if it's a string
            if (typeof lastScrappedData === "string") {
                try {
                    lastScrappedData = JSON.parse(lastScrappedData);
                } catch (error) {
                    console.error("Error parsing lastScrappedData:", error);
                    lastScrappedData = {}; // Set to empty object if parsing fails
                }
            }

            console.log("lastScrappedData", lastScrappedData);


            // Ensure lastScrappedData.lastScroll exists before adding
            let scrollCount = (lastScrappedData.lastScroll || 0) + 2;


            console.log("scrollCount", scrollCount)


            // let scrollCount = job.data.run_count + 2


            // Scroll down multiple times to load more posts
            for (let i = 0; i < scrollCount; i++) {

                await page.evaluate(() => window.scrollBy(0, window.innerHeight));

                await page.waitForTimeout(3000); // Wait for new content to load

                // Extract information from all matching posts after each scroll
                const newPostsInfo = await page.$$eval(
                    '.x1qjc9v5.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1lliihq.xdt5ytf.x2lah0s.xrbpyxo.x1a7h2tk.x14miiyz.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x11njtxf.x1bfs520.xph46j.x9i3mqj.xcghwft.x1bzgcud.xhdunbi',
                    (elements) => elements.map(el => {
                        const link = el.querySelector('a');
                        return {
                            postLink: link ? link.href : null
                        };
                    })
                );

                // Merge new posts information into the main postsInfo array
                postsInfo = postsInfo.concat(newPostsInfo);
            }

            //filtering out the links which present after scarpping
            if (lastScrappedData || !job.data.enforce_update_fetched_data) {


                const lastScrappedIndex = postsInfo.findIndex(
                    (post) => post.postLink === lastScrappedData.last_element
                );
                if (lastScrappedIndex !== -1) {
                    postsInfo = postsInfo.slice(lastScrappedIndex + 1);
                }
            }



            const profileFullData = [];

            let lastProcessedElement = null;


            for (const { postLink } of postsInfo) {
                try {
                    // Navigate to the post link
                    await page.goto(postLink);
                    await page.waitForTimeout(3000);

                    // Extract profile link
                    const profileLink = await page.evaluate(() => {
                        const links = Array.from(document.querySelectorAll("a"));
                        return links
                            .map((link) => link.href)
                            .find((href) =>
                                /^https:\/\/www\.instagram\.com\/[^\/]+\/$/.test(href)
                            );
                    });

                    if (profileLink) {
                        await page.goto(profileLink);
                        await page.waitForTimeout(3000);

                        const name = await page.$eval("h2", (header) =>
                            header.textContent.trim()
                        );

                        const profileInfo = await page.$eval(
                            "div.x7a106z", // The main container class
                            async (container) => {
                                // Title
                                const titleElement = container.querySelector(
                                    'span[dir="auto"]'
                                );
                                const title = titleElement
                                    ? titleElement.textContent.trim()
                                    : null;

                                // Click on "more" if it exists to expand the description
                                const moreButton = container.querySelector(
                                    'span[dir="auto"].x1lliihq.x1plvlek.xryxfnj.x1n2onr6.x1ji0vk5.x18bv5gf.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.xo1l8bm.x1roi4f4.x1yc453h.x10wh9bi.x1wdrske.x8viiok.x18hxmgj'
                                );
                                if (moreButton) {
                                    moreButton.click();
                                    console.log("more button is clicked");
                                    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
                                } else {
                                    console.log("no more button");
                                }

                                // Description
                                const descriptionElement = container.querySelector(
                                    "span._ap3a._aaco._aacu._aacx._aad7._aade"
                                );
                                const description = descriptionElement
                                    ? descriptionElement.textContent.trim()
                                    : null;

                                // Links in the description
                                const links = Array.from(
                                    descriptionElement.querySelectorAll("a")
                                ).map((link) => ({
                                    text: link.textContent.trim(),
                                    url: link.href,
                                }));

                                return { title, description, links };
                            }
                        );

                        console.log(name, profileInfo);

                        // Regular expression to match email addresses
                        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

                        // Regular expression to match phone numbers (adjusted to handle different formats)
                        const phoneRegex = /(\+?\d{1,4}[\s-])?(\d{5}[\s-]?\d{5})/g;

                        // Extract emails and phone numbers from str1
                        const emails = profileInfo.description.match(emailRegex);
                        const phones = profileInfo.description.match(phoneRegex);

                        // const updataPresent = await isLinkInDatabase(profileLink, name, emails, phones, profileInfo.links)

                        // console.log("update_value", updataPresent)

                        const updataPresent = await UpdatingValuesIfExist(profileLink, name, emails, phones, profileInfo.links)


                        if (!updataPresent && (emails || phones) ) {
                            console.log("inserting data");
                            await scrapeAndInsertData(
                                job.data.id,
                                name,
                                profileLink,
                                emails,
                                phones,
                                profileInfo.links,
                                job.id
                            );
                        }
                    }

                    // Store last processed post link in memory
                    lastProcessedElement = postLink;


                    await page.waitForTimeout(5000);
                } catch (error) {
                    console.error(`Error processing ${postLink}: ${error}`);
                }
            }


            if (lastProcessedElement) {
                await knexDB("Jobs")
                    .where({ id: job.data.id })
                    .update({
                        last_scrapped_element: JSON.stringify({
                            last_element: lastProcessedElement,
                            lastScroll: scrollCount,
                        }),
                    });
            }


            await browser.close()
            return profileFullData;
        }
    } catch (error) {
        // await browser.close();
        console.error("Error during scraping:", error);

        Sentry.captureException("Error during instagram scraping:", error);


        if (browser) {
            console.log("Closing the browser due to an error.");
            await browser.close();
        }



        throw error;
    }
}

async function processFacebookJob(job) {


    console.log("facebook running")

    let browser;



    try {

        Sentry.captureMessage("faecbook jobs started");



        const userId = job.data.user_data_id;
        let cookieFileName = await getCookiesName(userId);

        if (!cookieFileName) {
            console.error("No cookie file found in database.");

            throw new Error("No cookie file found in database.")

        }





        // Normalize __dirname to use forward slashes
        const normalizedDirname = __dirname.replace(/\\/g, '/');



        // Construct full path using path.join (not posix since it's already normalized)
        let cookiePath = path.posix.join(normalizedDirname, "cookies", cookieFileName);

        console.log("Checking cookie file at:", cookiePath);



        if (!fs.existsSync(cookiePath)) {
            console.error("❌ No cookies file found at:", cookiePath);
            throw new Error("No cookie file found in database.")

        }



        let cookies = [];

        try {

            const data = await fs.promises.readFile(cookiePath, "utf8");
            cookies = JSON.parse(data);

            const Session = await checkCookieValidity('facebook', cookies)

            console.log("Session", Session)

            if (Session == false) {


                const userData = await getUserDataById(job.data.user_data_id)
                let Hashedpassword = userData.password
                const password = await decryptPassword(Hashedpassword);
                console.log(password)
                const resultCheck = await login(userData.platform, userData.email, password)


                if (!resultCheck) {
                    console.error("❌ Failed to log in and refresh cookies.");
                    throw new Error("Failed to log in and refresh cookies.")

                }


                const newDataCookies = await fs.promises.readFile(cookiePath, "utf8");
                cookies = JSON.parse(newDataCookies);
            }


        } catch (error) {
            console.log("No cookies found or error parsing cookies");
            throw new Error("No cookies found or error parsing cookies")
        }

        let executablePath

        if (app.isPackaged) {
            if (process.platform === 'darwin') { // darwin is the platform name for macOS
               executablePath = path.join(process.resourcesPath, 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');            } else if (process.platform === 'win32') { // win32 is the platform name for Windows
                executablePath = path.join(process.resourcesPath, 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
            }
        } else {
            if (process.platform === 'darwin') {
                executablePath = path.join(__dirname, '..', 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
            } else if (process.platform === 'win32') {
                executablePath = path.join(__dirname, '..', 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
            }
        }




        let browserOptions = {
            headless: true,
            executablePath: executablePath

        };


        if (job.data.proxy) {
            browserOptions.proxy = {
                server: job.data.proxy.server, // Ensure these are defined in your job.data or use placeholders
                username: job.data.proxy.username, // This might also include password if needed
                password: job.data.proxy.password

            };
        }

        browser = await chromium.launch(browserOptions);
        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36' });
        const page = await context.newPage();


        await context.addCookies(cookies);

        await page.goto("https://www.facebook.com");


        if (job.data.specific_username) {

            try {

                // Navigate to the specific username profile    
                const profileLink = "https://www.facebook.com/" + job.data.query;

                await page.goto(profileLink + "/about");
                await page.waitForTimeout(5000);



                //categories section of page
                const categoriesSelector = ".xyamay9.xqmdsaz.x1gan7if.x1swvt13";

                await page.waitForSelector(categoriesSelector, { state: "visible" });


                //Extract 'Contact info' from the page
                const contactInfoSelector = ".xyamay9.xqmdsaz.x1gan7if.x1swvt13";

                const contactInfoContent = await page.$$eval(
                    contactInfoSelector,
                    (nodes) => nodes.map((node) => node.innerText.trim())
                );

                console.log(contactInfoContent);


                //string containing contact information of the page.
                const testString = contactInfoContent.join("");

                const nameElement = await page.$("h1.html-h1");
                const name = nameElement ? await nameElement.innerText() : "Unknown";

                // Regular expressions to match emails, phone numbers, and URLs
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const phoneRegex = /(\+?\d{1,4}[\s-])?(\d{5}[\s-]?\d{5})/g;
                const profileurlRegex = /https?:\/\/[^\s\/$.?#].[^\s]*/gi;

                const emails = testString.match(emailRegex);
                const phoneNumber = testString.match(phoneRegex);
                const links = testString.match(profileurlRegex);


                await scrapeAndInsertData(
                    job.data.id,
                    name,
                    profileLink,
                    emails,
                    phoneNumber,
                    links,
                    job.id
                );

            } catch (error) {
                console.error("Error during scraping:", error);
                await browser.close();
                throw error;
            }
        }
        else {

            await page.fill('input[aria-label="Search Facebook"]', job.data.query);
            await page.waitForTimeout(5000);
            await page.press('input[aria-label="Search Facebook"]', "Enter");




            await page.waitForTimeout(5000)

            // Wait for the search results to stabilize using specific class names
            const resultSelector = ".x9f619.x1n2onr6.x1ja2u2z"; // Combine classes with dots as they need to be in the same element
            await page.waitForSelector(resultSelector, {
                timeout: 10000, // Adjust the timeout based on expected load times
            });

            await page.waitForTimeout(5000);

            let urls = [];

            let lastScrappedData = job.data.last_scrapped_element || "{}"; // Default to an empty object string

            // Ensure lastScrappedData is parsed only if it's a string
            if (typeof lastScrappedData === "string") {
                try {
                    lastScrappedData = JSON.parse(lastScrappedData);
                } catch (error) {
                    console.error("Error parsing lastScrappedData:", error);
                    lastScrappedData = {}; // Set to empty object if parsing fails
                }
            }

            console.log("lastScrappedData", lastScrappedData);

            // Ensure lastScrappedData.lastScroll exists before adding
            let scrollCount = (lastScrappedData.lastScroll || 0) + 6;

            //  scrollCount = scrollCount 


            console.log("scrollCount", scrollCount)

            for (let i = 0; i < scrollCount; i++) {
                // Change the number of scrolls as needed
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(2000); // Wait a bit for the next batch of content to load

                const newUrls = await page.$$eval(
                    'a[attributionsrc*="/privacy_sandbox/comet/register/source/"][tabindex="0"]',
                    (links) => {
                        return links
                            .filter(
                                (link) =>
                                    !link.href.startsWith("https://l.facebook.com/l.php") &&
                                    (link.href.includes("profile.php?id=") ||
                                        link.href.match(/facebook\.com\/[\w\.]+[\?&]/))
                            )
                            .map((link) => new URL(link.href).href);
                    }
                );

                urls = urls.concat(newUrls);
            }


            function removeDuplicates(urls) {
                let uniqueUrls = [];
                let seenUrls = {};

                for (let url of urls) {
                    if (!seenUrls[url]) {
                        uniqueUrls.push(url);
                        seenUrls[url] = true;
                    }
                }

                return uniqueUrls;
            }

            let uniqueUrls = removeDuplicates(urls);




            if (lastScrappedData || !job.data.enforce_update_fetched_data) {

                console.log(job.data.last_scrapped_element);
                const lastScrappedIndex = uniqueUrls.findIndex(
                    (profileLink) => profileLink === job.data.last_scrapped_element
                );
                if (lastScrappedIndex !== -1) {
                    uniqueUrls = uniqueUrls.slice(lastScrappedIndex + 1);
                }
            }


            let lastProcessedElement = null;


            for (const link of uniqueUrls) {
                console.log(`Navigating to URL: ${link}`);
                await page.goto(link);

                await page.waitForTimeout(5000);

                const urlRegex = /facebook\.com\/profile\.php\?id=\d+.*&__cft__\[\d+\]=.*/;

                // Wait for the links to be available on the page
                await page.waitForSelector('a[href*="=about"], a[href*="/about"]');

                // Collect all links matching the updated selector
                const aboutLinks = await page.$$('a[href*="=about"], a[href*="/about"]');

                // Loop through each link and click on it
                for (let link of aboutLinks) {
                    if (await link.isVisible()) {
                        await link.click();
                    }
                }


                await page.waitForTimeout(5000);

                // Wait for the 'About' content to load and extract required details
                const categoriesSelector = ".xyamay9.xqmdsaz.x1gan7if.x1swvt13"; // Adjust selector as needed
                await page.waitForSelector(categoriesSelector, { state: "visible" });

                // Extract 'Categories' and 'Contact info'
                const categoriesContent = await page.$$eval(
                    categoriesSelector,
                    (Element) => Element.map((node) => node.textContent.trim())
                );

                const contactInfoSelector = ".xyamay9.xqmdsaz.x1gan7if.x1swvt13"; // Use specific selectors that uniquely identify these elements
                const contactInfoContent = await page.$$eval(
                    contactInfoSelector,
                    (nodes) => nodes.map((node) => node.innerText.trim())
                );

                console.log(contactInfoContent);

                const testString = contactInfoContent.join("");


                // await page.waitForSelector('.html-h1',{state:"visible"})

                const nameElement = await page.$(".html-h1");
                const name = nameElement ? await nameElement.innerText() : "Unknown";
                console.log("name", name);

                // Regular expressions to match emails, phone numbers, and URLs
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const phoneRegex = /(\+?\d{1,4}[\s-])?(\d{5}[\s-]?\d{5})/g;
                const profileurlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;

                const emails = testString.match(emailRegex);
                const phoneNumber = testString.match(phoneRegex);
                const links = testString.match(profileurlRegex);

                console.log(name, emails, phoneNumber, links);

                const updataPresent = await UpdatingValuesIfExist(link, name, emails, phoneNumber, links)


                if (!updataPresent && (emails || phoneNumber)) {
                    console.log("inserting data");
                    await scrapeAndInsertData(
                        job.data.id,
                        name,
                        link,
                        emails,
                        phoneNumber,
                        links,
                        job.id
                    );
                }

                // Store last processed post link in memory
                lastProcessedElement = link;

                await page.waitForTimeout(10000); // Delay to avoid rate limits or to simulate user browsing
            }


            // const db = await getDbInstance()


            if (lastProcessedElement) {
                await
                    knexDB("Jobs")
                        .where({ id: job.data.id })
                        .update({
                            last_scrapped_element: JSON.stringify({
                                last_element: lastProcessedElement,
                                lastScroll: scrollCount,
                            }),
                        });
            }

        }

        // console.log("last", profileFullData)

    } catch (error) {


        console.error("Error during scraping:", error);
        Sentry.captureException("Error during facebook scraping:", error);

        if (browser) {
            console.log("Closing the browser due to an error.");
            await browser.close();
        }

        // await browser.close();
        throw error;
    } finally {
        // await browser.close()
    }
}

async function processTwitterJob(job) {


    let browser;


    try {


        Sentry.captureMessage("twitter jobs started");


        const userId = job.data.user_data_id;
        let cookieFileName = await getCookiesName(userId);

        if (!cookieFileName) {
            console.error("No cookie file found in database.");
            throw new Error("No cookie file found in database.")
        }


        // Normalize __dirname to use forward slashes
        const normalizedDirname = __dirname.replace(/\\/g, '/');



        // Construct full path using path.join (not posix since it's already normalized)
        let cookiePath = path.posix.join(normalizedDirname, "cookies", cookieFileName);

        console.log("Checking cookie file at:", cookiePath);


        if (!fs.existsSync(cookiePath)) {
            console.error("❌ No cookies file found at:", cookiePath);
            throw new Error("No cookie file found in database.")
        }

        let cookies = [];

        try {

            const data = await fs.promises.readFile(cookiePath, "utf8");
            cookies = JSON.parse(data);

            console.log("twitter", data)

            const Session = await checkCookieValidity('twitter', cookies)
            console.log("Session", Session)


            if (Session == false) {

                console.log("wokring")

                const userData = await getUserDataById(job.data.user_data_id)


                let Hashedpassword = userData.password

                const password = await decryptPassword(Hashedpassword);

                console.log(password)

                const resultCheck = await login(userData.platform, userData.email, password)


                if (!resultCheck.result) {
                    console.error("❌ Failed to log in and refresh cookies.");
                    throw new Error("Failed to log in and refresh cookies.")
                    return false;
                }


                const newDataCookies = await fs.promises.readFile(cookiePath, "utf8");

                cookies = JSON.parse(newDataCookies);
            }



        } catch (error) {
            console.log("No cookies found or error parsing cookies");
            throw new Error("No cookies found or error parsing cookies")

        }



        let executablePath



        // if (app.isPackaged) {
        //     if (process.platform === 'darwin') { // darwin is the platform name for macOS
        //        executablePath = path.join(process.resourcesPath, 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');        //     } else if (process.platform === 'win32') { // win32 is the platform name for Windows
        //         executablePath = path.join(process.resourcesPath, 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
        //     }
        // } else {
        //     if (process.platform === 'darwin') {
        //         executablePath = path.join(__dirname, '..', 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
        //     } else if (process.platform === 'win32') {
        //         executablePath = path.join(__dirname, '..', 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
        //     }
        // }


        if (app.isPackaged) {
            if (process.platform === 'darwin') { // macOS
                executablePath = path.join(process.resourcesPath, 'mac-ms-playwright', 'firefox-1475', 'firefox', 'Nightly.app', 'Contents', 'MacOS', 'firefox');
            } else if (process.platform === 'win32') { // Windows
                executablePath = path.join(process.resourcesPath, 'ms-playwright', 'firefox-1475', 'firefox', 'firefox.exe');
            }
        } else {
            if (process.platform === 'darwin') {
                executablePath = path.join(__dirname, '..', 'mac-ms-playwright', 'firefox-1475', 'firefox', 'Nightly.app', 'Contents', 'MacOS', 'firefox');
            } else if (process.platform === 'win32') {
                executablePath = path.join(__dirname, '..', 'ms-playwright', 'firefox-1475', 'firefox', 'firefox.exe');
            }
        }



        let browserOptions = {
            headless: true,
            executablePath: executablePath
        }


        if (job.data.proxy) {
            browserOptions.proxy = {
                server: job.data.proxy.server, // Ensure these are defined in your job.data or use placeholders
                username: job.data.proxy.username, // This might also include password if needed
                password: job.data.proxy.password

            };
        }



        browser = await firefox.launch(browserOptions);
        const context = await browser.newContext({
            userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36",
        });

        const page = await context.newPage();


        await context.addCookies(cookies);



        if (job.data.specific_username) {


            const profileLink = "https://x.com/" + job.data.query + "/";

            await page.goto(profileLink);

            await page.waitForTimeout(5000);


            var profileDetails = await page.evaluate(() => {
                const displayName = document
                    .querySelector('div[data-testid="UserName"]')
                    ?.textContent.trim();
                const bio = document
                    .querySelector('[data-testid="UserDescription"]')
                    ?.textContent.trim();
                const website = document.querySelector('[data-testid="UserUrl"] a')
                    ?.href;

                // Select the <a> tag within the given element
                const linkElement = document.querySelector(
                    'div[data-testid="UserProfileHeader_Items"] a[data-testid="UserUrl"]'
                );

                // Retrieve the href attribute of the selected <a> tag
                const link = linkElement ? linkElement.getAttribute("href") : null;

                return { displayName, bio, website, link };
            });


            console.log("profileDetails", profileDetails);

            // Define regular expressions to match email addresses and phone numbers
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
            const phoneRegex = /\+?\d{1,4}?\s?\d{10}\b/;

            const email = profileDetails.bio.match(emailRegex);
            const phone = profileDetails.bio.match(phoneRegex);

            console.log(email, phone);

            const displayName = profileDetails.displayName;
            const bio = profileDetails.bio ? profileDetails.bio : null;

            // const updataPresent = await isLinkInDatabase(profileLink, displayName, email, phone, profileDetails.link)

            // console.log("update_value", updataPresent)

            updataPresent = false;

            await scrapeAndInsertData(
                job.data.id,
                displayName,
                profileLink,
                email,
                phone,
                profileDetails.link,
                job.id
            );




        }
        else {
            // Navigate to the URL
            await page.goto("https://x.com/explore");

            // Optional: Perform operations on the page

            // Wait to observe or handle the page
            await page.waitForTimeout(5000); // Wait for 5 seconds to observe the page



            // Find the search input box and type the search query
            const searchSelector = 'input[data-testid="SearchBox_Search_Input"]';
            await page.waitForSelector(searchSelector, { state: "visible" });

            // query = "marketing";

            console.log("Typing search query...");
            for (let char of job.data.query) {
                await page.type(searchSelector, char, {
                    delay: Math.random() * 100 + 50,
                });
            }

            // Optionally, simulate pressing Enter to execute the search
            await page.press(searchSelector, "Enter");

            // const cookies = await context.cookies();
            // await fs.writeFile("../twitter_leads/twitter_cookies.json", JSON.stringify(cookies, null, 2));

            console.log("Search executed. Check the browser for results.");

            // Wait for the navigation bar to be visible
            await page.waitForSelector('nav[role="navigation"]');

            // Click on the "People" link in the navigation bar
            await page.click('div[role="tablist"] >> text=People');

            // Additional actions after clicking the "People" tab
            console.log("Navigated to the People tab.");

            let profileLinks = [];




            let lastScrappedData = job.data.last_scrapped_element || "{}"; // Default to an empty object string

            // Ensure lastScrappedData is parsed only if it's a string
            if (typeof lastScrappedData === "string") {
                try {
                    lastScrappedData = JSON.parse(lastScrappedData);
                } catch (error) {
                    console.error("Error parsing lastScrappedData:", error);
                    lastScrappedData = {}; // Set to empty object if parsing fails
                }
            }

            console.log("lastScrappedData", lastScrappedData);


            // Ensure lastScrappedData.lastScroll exists before adding
            let scrollCount = (lastScrappedData.lastScroll || 0) + 2;





            // let scrollCount = job.data.run_count + 2




            let whoToFollow = []

            for (let i = 0; i < scrollCount; i++) {
                await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
                console.log(`Scrolling iteration ${i + 1}`);

                await page.waitForTimeout(5000); // Wait for additional posts to load

                const newLinks = await page.$$eval('a[role="link"]', (links) =>
                    links.map((link) =>
                        link.href.startsWith("http")
                            ? link.href
                            : `https://x.com${link.getAttribute("href")}`
                    )
                );


                const AsideLinks = await page.$$eval('aside[aria-label="Who to follow"] a', (links) =>
                    links.map((link) =>
                        link.href.startsWith("http")
                            ? link.href
                            : `https://x.com${link.getAttribute("href")}`
                    )
                );

                whoToFollow = whoToFollow.concat(AsideLinks)

                profileLinks = profileLinks.concat(newLinks);
            }





            console.log("profileLinks", profileLinks)

            profileLinks = profileLinks.concat(whoToFollow);

            profileLinks = profileLinks.filter(link => !whoToFollow.includes(link));
            // Remove duplicates and filter out non-profile links
            let uniqueProfileLinks = [...new Set(profileLinks)].filter((link) => {
                const nonProfileKeywords = [
                    "/i/",
                    "/home",
                    "/explore",
                    "/notifications",
                    "/messages",
                    "/compose",
                    "/search",
                    "/grok",
                    "/premium_sign_up",
                    "/verified-orgs-signup",
                ];
                return !nonProfileKeywords.some((keyword) => link.includes(keyword));
            });

            console.log(uniqueProfileLinks, uniqueProfileLinks.length);


            if (lastScrappedData || !job.data.enforce_update_fetched_data) {

                //console.log(job.data.last_scrapped_element);
                const lastScrappedIndex = uniqueProfileLinks.findIndex(
                    (profileLink) => profileLink === lastScrappedData.last_element
                );
                if (lastScrappedIndex !== -1) {
                    uniqueProfileLinks = uniqueProfileLinks.slice(lastScrappedIndex + 1);
                }
            }


            console.log(uniqueProfileLinks, uniqueProfileLinks.length);



            let profileLinkData = [];


            let lastProcessedElement = null;



            // Iterate through each profile URL to extract details
            for (const profileLink of uniqueProfileLinks) {
                try {
                    await page.goto(profileLink);

                    await page.waitForTimeout(3000);

                    var profileDetails = await page.evaluate(() => {
                        const displayName = document
                            .querySelector('div[data-testid="UserName"]')
                            ?.textContent.trim();
                        const bio = document
                            .querySelector('[data-testid="UserDescription"]')
                            ?.textContent.trim();
                        const website = document.querySelector('[data-testid="UserUrl"] a')
                            ?.href;

                        // Select the <a> tag within the given element
                        const linkElement = document.querySelector(
                            'div[data-testid="UserProfileHeader_Items"] a[data-testid="UserUrl"]'
                        );

                        // Retrieve the href attribute of the selected <a> tag
                        const link = linkElement ? linkElement.getAttribute("href") : null;

                        return { displayName, bio, website, link };
                    });

                    // Define regular expressions to match email addresses and phone numbers
                    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
                    const phoneRegex = /\+?\d{1,4}?\s?\d{10}\b/;

                    const email = profileDetails.bio.match(emailRegex);
                    const phone = profileDetails.bio.match(phoneRegex);

                    console.log(email, phone);

                    const displayName = profileDetails.displayName;
                    const bio = profileDetails.bio ? profileDetails.bio : null;

                    console.log(profileDetails);

                    const updataPresent = await UpdatingValuesIfExist(profileLink, displayName, email, phone, profileDetails.link)

                    // console.log("update_value", updataPresent)

                    //updataPresent = false;

                    if (!updataPresent && (email || phone)) {
                        console.log("inserting data");

                        await scrapeAndInsertData(
                            job.data.id,
                            displayName,
                            profileLink,
                            email,
                            phone,
                            profileDetails.link,
                            job.id
                        );
                    }

                    profileLinkData.push(profileDetails);


                    // Store last processed post link in memory
                    lastProcessedElement = profileLink;



                    await page.waitForTimeout(3000);

                } catch (error) {
                    console.error(`Error processing profile link ${profileLink}:`, error);
                }
            }





            if (lastProcessedElement) {
                await knexDB("Jobs")
                    .where({ id: job.data.id })
                    .update({
                        last_scrapped_element: JSON.stringify({
                            last_element: lastProcessedElement,
                            lastScroll: scrollCount,
                        }),
                    });
            }




            //console.log(profileLinkData)
        }

    } catch (error) {
        console.error("An error occurred:", error);
        Sentry.captureException("Error during twitter scraping:", error);

        if (browser) {
            console.log("Closing the browser due to an error.");
            await browser.close();
        }

        throw error
    } finally {
        // Close the browser (optional)
        // await browser.close();
    }
}

async function processLinkedinJob(job) {


    let browser;


    try {


        Sentry.captureMessage("linkedin jobs started");


        let cookies = [];

        const userId = job.data.user_data_id;
        console.log("userID", userId)
        let cookieFileName = await getCookiesName(userId);

        if (!cookieFileName) {
            console.error("No cookie file found in database.");
            throw new Error("No cookie file found in database.")

        }




        // Normalize __dirname to use forward slashes
        const normalizedDirname = __dirname.replace(/\\/g, '/');



        // Construct full path using path.join (not posix since it's already normalized)
        let cookiePath = path.posix.join(normalizedDirname, "cookies", cookieFileName);

        console.log("Checking cookie file at:", cookiePath);


        if (!fs.existsSync(cookiePath)) {
            console.error("❌ No cookies file found at:", cookiePath);
            throw new Error("No cookies file found")
        }


        const data = await fs.promises.readFile(cookiePath, "utf8");
        cookies = JSON.parse(data);




        try {

            const data = await fs.promises.readFile(cookiePath, "utf8");
            cookies = JSON.parse(data);

            console.log("twitter", data)

            const Session = await checkCookieValidity('linkedin', cookies)
            console.log("Session", Session)


            if (Session == false) {

                console.log("wokring")

                const userData = await getUserDataById(job.data.user_data_id)


                let Hashedpassword = userData.password

                const password = await decryptPassword(Hashedpassword);

                console.log(password)

                const resultCheck = await login(userData.platform, userData.email, password)


                if (!resultCheck.result) {
                    console.error("❌ Failed to log in and refresh cookies.");
                    throw new Error("Failed to log in and refresh cookies.")
                }


                const newDataCookies = await fs.promises.readFile(cookiePath, "utf8");

                cookies = JSON.parse(newDataCookies);
            }



        } catch (error) {
            console.log("No cookies found or error parsing cookies");
            throw new Error("No cookies found or error parsing cookies");
        }


        let executablePath



        if (app.isPackaged) {
            if (process.platform === 'darwin') { // darwin is the platform name for macOS
               executablePath = path.join(process.resourcesPath, 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');            } else if (process.platform === 'win32') { // win32 is the platform name for Windows
                executablePath = path.join(process.resourcesPath, 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
            }
        } else {
            if (process.platform === 'darwin') {
                executablePath = path.join(__dirname, '..', 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
            } else if (process.platform === 'win32') {
                executablePath = path.join(__dirname, '..', 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
            }
        }


        let browserOptions = {
            headless: true,
            executablePath: executablePath

        };


        if (job.data.proxy) {
            browserOptions.proxy = {
                server: job.data.proxy.server, // Ensure these are defined in your job.data or use 
                username: job.data.proxy.username, // This might also include password if needed
                password: job.data.proxy.password

            };
        }



        browser = await chromium.launch(browserOptions);

        const context = await browser.newContext();

        const page = await context.newPage();


        await context.addCookies(cookies);



        if (job.data.specific_username) {
            const profileLink = "https://www.linkedin.com/in/" + job.data.query + "/";
            await page.goto(profileLink);



            await page.waitForSelector("section.artdeco-card");

            const profileData = await page.evaluate(() => {
                const nameElement = document.querySelector("h1");
                const titleElement = document.querySelector(
                    ".text-body-medium.break-words"
                );
                const locationElement = document.querySelector(
                    ".wIGJVoSjLPCkBjYPypkkFloaPmPDygCuVY.mt2 span.text-body-small"
                );
                const contactInfoLink = document.querySelector(
                    "#top-card-text-details-contact-info"
                );

                const name = nameElement ? nameElement.innerText.trim() : "N/A";
                const title = titleElement ? titleElement.innerText.trim() : "N/A";
                const location = locationElement
                    ? locationElement.innerText.trim()
                    : "N/A";
                const contactInfoUrl = contactInfoLink ? contactInfoLink.href : null;

                return { name, title, location, contactInfoUrl };
            });

            // If there's a contact info link, extract email and phone
            if (profileData.contactInfoUrl) {
                await page.waitForTimeout(3000);
                await page.goto(profileData.contactInfoUrl);
                const contactDetails = await page.evaluate(() => {
                    const emailElement = document.querySelector('a[href^="mailto:"]');
                    const phoneElement = document.querySelector(
                        "span[data-test-phone-number]"
                    );
                    const linkElements = document.querySelectorAll(
                        "section.pv-contact-info__contact-type a.pv-contact-info__contact-link"
                    );

                    const email = emailElement ? emailElement.innerText.trim() : "N/A";
                    const phone = phoneElement ? phoneElement.innerText.trim() : "N/A";

                    const links = Array.from(linkElements).map((link) => link.href);

                    return { email, phone, links };
                });

                profileData.email = contactDetails.email;
                profileData.phone = contactDetails.phone;
                profileData.links = contactDetails.links;
            }

            console.log("Profile Data:", profileData);

            //const isLinkInDb = await isLinkInDatabase(profileLink, profileData.name, profileData.email, profileData.phone, profileData.links);

            isLinkInDb = false;

            if (!isLinkInDb) {
                console.log("inserting data");
                await scrapeAndInsertData(
                    job.data.id,
                    profileData.name,
                    profileLink,
                    profileData.email,
                    profileData.phone,
                    profileData.links,
                    job.id
                );
            }
        }

        else {

            // await page.screenshot({ path: 'linkedin1.png' });



            await page.goto("https://www.linkedin.com/feed", { waitForTimeout: 10000 });


            // await page.screenshot({ path: 'linkedin2.png' });


            const searchInputSelector = "input.search-global-typeahead__input";

            await page.waitForSelector(searchInputSelector, { visible: true });
            await page.type(searchInputSelector, job.data.query, { delay: 100 });
            await page.keyboard.press("Enter");

            console.log("Waiting for search results to load...");
            await page.waitForSelector("main", { visible: true, timeout: 60000 });

            // Wait for the search filters bar
            await page.waitForSelector('nav[aria-label="Search filters"]', {
                timeout: 10000,
            });
            console.log("Search filters bar found");

            // Find and click the "Posts" filter
            const postsFilterSelector = '//button[contains(., "Posts")]';

            const isPostsFilterVisible = await page.isVisible(postsFilterSelector);

            await page.waitForTimeout(5000);

            if (isPostsFilterVisible) {
                await page.click(postsFilterSelector);
                console.log('Clicked on "Posts" filter');
            } else {
                console.error("Posts filter is not visible or not loaded");

            }

            console.log('Applied "Posts" filter and results are loaded.');



            let lastScrappedData = job.data.last_scrapped_element || "{}"; // Default to an empty object string

            // Ensure lastScrappedData is parsed only if it's a string
            if (typeof lastScrappedData === "string") {
                try {
                    lastScrappedData = JSON.parse(lastScrappedData);
                } catch (error) {
                    console.error("Error parsing lastScrappedData:", error);
                    lastScrappedData = {}; // Set to empty object if parsing fails
                }
            }

            console.log("lastScrappedData", lastScrappedData);


            // Ensure lastScrappedData.lastScroll exists before adding
            let scrollCount = (lastScrappedData.lastScroll || 0) + 2;


            for (let i = 0; i < scrollCount; i++) {
                try {
                    await page.evaluate(() => {
                        window.scrollBy(0, document.body.scrollHeight);
                    });
                    console.log(`Scrolling iteration ${i + 1}`);
                    await page.waitForTimeout(3000); // Wait for the page to load new content

                    const selector = "button.scaffold-finite-scroll__load-button";


                    await page.waitForTimeout(3000); // Wait for the page to load new content

                    const showMoreButton = await page.$(selector);
                    if (showMoreButton) {
                        const isAttached = await showMoreButton.evaluate(
                            (node) => node.isConnected
                        );
                        if (isAttached) {
                            console.log("Show more results button found, clicking...");
                            let retries = 3;
                            while (retries > 0) {
                                try {
                                    await showMoreButton.click();
                                    await page.waitForTimeout(3000); // Wait for additional posts to load
                                    break; // Exit the retry loop if click is successful
                                } catch (clickError) {
                                    console.error(
                                        "Error clicking the show more results button:",
                                        clickError
                                    );
                                    retries--;
                                    if (retries > 0) {
                                        console.log(
                                            `Retrying click... (${3 - retries} retries left)`
                                        );
                                        await page.waitForTimeout(1000); // Wait before retrying
                                    } else {
                                        console.log("Max retries reached. Moving on.");
                                    }
                                }
                            }
                        } else {
                            console.log(
                                "Show more results button is no longer attached to the DOM."
                            );
                            // Exit the loop if the element is no longer attached
                        }
                    } else {
                        console.log("No more results button found.");
                        // Exit the loop if no more results button is found
                    }
                } catch (error) {
                    console.error(`Error during scrolling iteration ${i + 1}:`, error);
                    break; // Exit the loop if an error occurs
                }
            }

            await page.waitForTimeout(10000);

            let profiles = await page.$$eval(
                ".artdeco-card.mb2 a.update-components-actor__meta-link",
                (links) => {
                    // Map over the elements to extract the href attribute directly
                    return links
                        .map((link) => link.href)
                        .filter((href) => href.startsWith("https://www.linkedin.com/in/"));
                }
            );

            console.log("profiles", profiles);


            if (lastScrappedData || !job.data.enforce_update_fetched_data) {

                //console.log(job.data.last_scrapped_element);
                const lastScrappedIndex = profiles.findIndex(
                    (profileLink) => profileLink === lastScrappedData.last_element
                );
                if (lastScrappedIndex !== -1) {
                    profiles = profiles.slice(lastScrappedIndex + 1);
                }
            }



            const profileDetails = [];

            let lastProcessedElement = null;


            // Visit each profile and scrape details
            for (const profileLink of profiles) {
                try {
                    await page.goto(profileLink);
                    await page.waitForTimeout(6000);
                    await page.waitForSelector("section.artdeco-card");

                    const profileData = await page.evaluate(() => {
                        const nameElement = document.querySelector("h1");
                        const titleElement = document.querySelector(
                            ".text-body-medium.break-words"
                        );
                        const locationElement = document.querySelector(
                            ".wIGJVoSjLPCkBjYPypkkFloaPmPDygCuVY.mt2 span.text-body-small"
                        );
                        const contactInfoLink = document.querySelector(
                            "#top-card-text-details-contact-info"
                        );

                        const name = nameElement ? nameElement.innerText.trim() : "N/A";
                        const title = titleElement ? titleElement.innerText.trim() : "N/A";
                        const location = locationElement
                            ? locationElement.innerText.trim()
                            : "N/A";
                        const contactInfoUrl = contactInfoLink ? contactInfoLink.href : null;

                        return { name, title, location, contactInfoUrl };
                    });

                    // If there's a contact info link, extract email and phone
                    if (profileData.contactInfoUrl) {
                        await page.waitForTimeout(3000);
                        await page.goto(profileData.contactInfoUrl);
                        const contactDetails = await page.evaluate(() => {
                            const emailElement = document.querySelector('a[href^="mailto:"]');
                            const phoneElement = document.querySelector(
                                "span[data-test-phone-number]"
                            );
                            const linkElements = document.querySelectorAll(
                                "section.pv-contact-info__contact-type a.pv-contact-info__contact-link"
                            );

                            const email = emailElement ? emailElement.innerText.trim() : "N/A";
                            const phone = phoneElement ? phoneElement.innerText.trim() : "N/A";

                            const links = Array.from(linkElements).map((link) => link.href);

                            return { email, phone, links };
                        });

                        profileData.email = contactDetails.email;
                        profileData.phone = contactDetails.phone;
                        profileData.links = contactDetails.links;
                    }

                    console.log("Profile Data:", profileData);

                    const isLinkInDb = await UpdatingValuesIfExist(profileLink, profileData.name, profileData.email, profileData.phone, profileData.links);

                    //isLinkInDb = false;

                    if (!isLinkInDb && (profileData.email !='N/A' || profileData.phone !='N/A')) {
                        console.log("inserting data");
                        await scrapeAndInsertData(
                            job.data.id,
                            profileData.name,
                            profileLink,
                            profileData.email,
                            profileData.phone,
                            profileData.links,
                            job.id
                        );
                    }


                    // Store last processed post link in memory
                    lastProcessedElement = profileLink;

                    profileDetails.push(profileData);

                    await page.waitForTimeout(3000);

                    console.log("Scraped Profile:", profileData);





                } catch (profileError) {
                    console.error("Error scraping profile:", profileError);
                }
            }




            if (lastProcessedElement) {
                await knexDB("Jobs")
                    .where({ id: job.data.id })
                    .update({
                        last_scrapped_element: JSON.stringify({
                            last_element: lastProcessedElement,
                            lastScroll: scrollCount,
                        }),
                    });
            }



            await browser.close()


            console.log("Final Profile Details:", profileDetails);
        }

    } catch (error) {
        Sentry.captureException("Error during linkedin scraping:", error);


        console.error("Error during LinkedIn search and scrape:", error);

        if (browser) {
            console.log("Closing the browser due to an error.");
            await browser.close();
        }

        throw error
    }
}

async function processRedditJob(job) {

    let browser;


    try {

        let cookies = [];
        Sentry.captureMessage("reddit jobs started");



        const userId = job.data.user_data_id;
        let cookieFileName = await getCookiesName(userId);

        if (!cookieFileName) {
            console.error("No cookie file found in database.");
            throw new Error("No cookie file found in database.");
        }


        // Normalize __dirname to use forward slashes
        const normalizedDirname = __dirname.replace(/\\/g, '/');



        // Construct full path using path.join (not posix since it's already normalized)
        let cookiePath = path.posix.join(normalizedDirname, "cookies", cookieFileName);

        console.log("Checking cookie file at:", cookiePath);


        if (!fs.existsSync(cookiePath)) {
            console.error("❌ No cookies file found at:", cookiePath);
            throw new Error("No cookies file found at:")
        }




        const data = await fs.promises.readFile(cookiePath, "utf8");
        cookies = JSON.parse(data);



        try {

            const data = await fs.promises.readFile(cookiePath, "utf8");
            cookies = JSON.parse(data);

            console.log("twitter", data)

            const Session = await checkCookieValidity('reddit', cookies)
            console.log("Session", Session)


            if (Session == false) {

                console.log("wokring")

                const userData = await getUserDataById(job.data.user_data_id)


                let Hashedpassword = userData.password

                const password = await decryptPassword(Hashedpassword);

                console.log(password)

                const resultCheck = await login(userData.platform, userData.email, password)


                if (!resultCheck.result) {
                    console.error("❌ Failed to log in and refresh cookies.");

                    // return false;
                }


                const newDataCookies = await fs.promises.readFile(cookiePath, "utf8");

                cookies = JSON.parse(newDataCookies);
            }



        } catch (error) {
            console.log("No cookies found or error parsing cookies");
            throw new Error("No cookies file or error parsing cookies")
        }


        let executablePath


        if (app.isPackaged) {
            if (process.platform === 'darwin') { // darwin is the platform name for macOS
               executablePath = path.join(process.resourcesPath, 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');            } else if (process.platform === 'win32') { // win32 is the platform name for Windows
                executablePath = path.join(process.resourcesPath, 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
            }
        } else {
            if (process.platform === 'darwin') {
                executablePath = path.join(__dirname, '..', 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
            } else if (process.platform === 'win32') {
                executablePath = path.join(__dirname, '..', 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
            }
        }


        let browserOptions = {
            headless: true,
            executablePath: executablePath

        };


        if (job.data.proxy) {
            browserOptions.proxy = {
                server: job.data.proxy.server, // Ensure these are defined in your job.data or use placeholders
                username: job.data.proxy.username, // This might also include password if needed
                password: job.data.proxy.password

            };
        }



        browser = await chromium.launch(browserOptions);

        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36' });
        const page = await context.newPage();



        console.log("reddit");



        await context.addCookies(cookies);


        if (job.data.specific_username) {


            const profileLink = "https://www.reddit.com/" + job.data.query;

            await page.goto(profileLink);

            await page.waitForTimeout(5000);

            const profileName = await page
                .locator("shreddit-subreddit-header")
                .getAttribute("prefixed-name")
                .catch(() => "No profile name");
            const displayName = await page
                .locator("shreddit-subreddit-header")
                .getAttribute("display-name")
                .catch(() => "No display name");
            const description = await page
                .locator("shreddit-subreddit-header")
                .getAttribute("description")
                .catch(() => "No description");
            const subscribers = await page
                .locator("shreddit-subreddit-header")
                .getAttribute("subscribers")
                .catch(() => "No subscribers");
            const activeMembers = await page
                .locator("shreddit-subreddit-header")
                .getAttribute("active")
                .catch(() => "No active members");
            const createdDate = await page
                .locator('faceplate-tooltip:has-text("Created") time')
                .getAttribute("datetime")
                .catch(() => "No created date");
            const communityVisibility = await page
                .locator('faceplate-tooltip:has-text("Public")')
                .innerText()
                .catch(() => "No visibility info");

            const Details = {
                profileName,
                displayName,
                description,
                subscribers,
                activeMembers,
                createdDate,
                communityVisibility,
            };

            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const phoneRegex = /(\+?\d{1,4}[\s-])?(\d{5}[\s-]?\d{5})/g;

            const emails = description ? description.match(emailRegex) : null;
            const phoneNumber = description ? description.match(phoneRegex) : null;

            console.log(displayName, emails, phoneNumber);

            // const isLinkInDB = await isLinkInDatabase(link, displayName, emails ? emails : null, phoneNumber ? phoneNumber : null, null);

            isLinkInDB = false;

            if (!isLinkInDB) {
                await scrapeAndInsertData(
                    job.data.id,
                    displayName,
                    profileLink,
                    emails ? emails : null,
                    phoneNumber ? phoneNumber : null,
                    null,
                    job.id
                );
            }

            profileFullDetailsArray.push(Details);
            console.log("Extracted Profile Details:", Details);


        }
        else {
            await page.goto("https://www.reddit.com");

            console.log("Login successful! Now searching...");

            // const searchBar = page.locator('input[placeholder="Search Reddit"]').first();

            const searchBar = page.locator('input[placeholder="Search Reddit"][enterkeyhint="search"]');

            // await page.screenshot({ path: 'screenshot.png' });



            console.log("searchBar", searchBar);

            console.log(
                "Resolved searchBar HTML:",
                await searchBar.evaluate((el) => el.outerHTML)
            );

            await searchBar.waitFor({ state: "visible" });
            await searchBar.focus();
            console.log("Search bar is visible and focused");

            // const cookies = await context.cookies();
            // await fs.writeFile("../reddit_leads/reddit_cookies.json", JSON.stringify(cookies, null, 2));

            await searchBar.type(job.data.query, { delay: 100 });
            await searchBar.press("Enter");

            await page.waitForSelector('div[data-testid="search-post-unit"]', {
                timeout: 10000,
            });
            console.log("Search results loaded.");

            await page.waitForTimeout(3000);

            const posts = await page.locator('div[data-testid="search-post-unit"]');
            console.log(posts);


            // let lastScrappedData = job.data.last_scrapped_element || {};
            // let scrollCount = lastScrappedData.lastScroll || 0;
            // scrollCount = scrollCount + 2


            let lastScrappedData = job.data.last_scrapped_element || "{}"; // Default to an empty object string

            // Ensure lastScrappedData is parsed only if it's a string
            if (typeof lastScrappedData === "string") {
                try {
                    lastScrappedData = JSON.parse(lastScrappedData);
                } catch (error) {
                    console.error("Error parsing lastScrappedData:", error);
                    lastScrappedData = {}; // Set to empty object if parsing fails
                }
            }




            // Ensure lastScrappedData.lastScroll exists before adding
            let scrollCount = (lastScrappedData.lastScroll || 0) + 2;

            console.log("scrollCount", scrollCount)


            for (let i = 0; i < scrollCount; i++) {
                await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
                console.log(`Scrolling iteration ${i + 1}`);

                await page.waitForTimeout(5000);
            }

            let postDetailsArray = [];
            const postHandles = await posts.elementHandles();
            postHandles.forEach(async (post, index) => {
                try {
                    const profileLink = await post
                        .$eval('a[href^="/r/"]', (el) => el.href)
                        .catch(() => "No profile link");
                    postDetailsArray.push(profileLink);
                } catch (error) {
                    console.warn(`Failed to extract details for post ${index + 1}:`, error);
                }
            });

            await page.waitForTimeout(5000);
            console.log("Extracted Post Details:", postDetailsArray);


            if (lastScrappedData || !job.data.enforce_update_fetched_data) {


                const lastScrappedIndex = postDetailsArray.findIndex(
                    (link) => link === lastScrappedData.last_element
                );

                console.log("lastScrpperd", lastScrappedIndex)
                if (lastScrappedIndex !== -1) {
                    postDetailsArray = postDetailsArray.slice(lastScrappedIndex + 1);
                }
            }


            console.log("filtred_data", postDetailsArray)

            const profileFullDetailsArray = [];

            let lastProcessedElement = null;


            for (const link of postDetailsArray) {
                try {
                    console.log(`Navigating to: ${link}`);
                    await page.goto(link);
                    await page.waitForTimeout(2000);

                    const profileName = await page
                        .locator("shreddit-subreddit-header")
                        .getAttribute("prefixed-name")
                        .catch(() => "No profile name");
                    const displayName = await page
                        .locator("shreddit-subreddit-header")
                        .getAttribute("display-name")
                        .catch(() => "No display name");
                    const description = await page
                        .locator("shreddit-subreddit-header")
                        .getAttribute("description")
                        .catch(() => "No description");
                    const subscribers = await page
                        .locator("shreddit-subreddit-header")
                        .getAttribute("subscribers")
                        .catch(() => "No subscribers");
                    const activeMembers = await page
                        .locator("shreddit-subreddit-header")
                        .getAttribute("active")
                        .catch(() => "No active members");
                    const createdDate = await page
                        .locator('faceplate-tooltip:has-text("Created") time')
                        .getAttribute("datetime")
                        .catch(() => "No created date");
                    const communityVisibility = await page
                        .locator('faceplate-tooltip:has-text("Public")')
                        .innerText()
                        .catch(() => "No visibility info");

                    const Details = {
                        profileLink: link,
                        profileName,
                        displayName,
                        description,
                        subscribers,
                        activeMembers,
                        createdDate,
                        communityVisibility,
                    };

                    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                    const phoneRegex = /(\+?\d{1,4}[\s-])?(\d{5}[\s-]?\d{5})/g;

                    const emails = description ? description.match(emailRegex) : null;
                    const phoneNumber = description ? description.match(phoneRegex) : null;

                    console.log(displayName, emails, phoneNumber);

                    const isLinkInDB = await UpdatingValuesIfExist(link, displayName, emails ? emails : null, phoneNumber ? phoneNumber : null, null);


                    lastProcessedElement = link;


                    //isLinkInDB = false;

                    if (!isLinkInDB && (emails || phoneNumber)) {
                        await scrapeAndInsertData(
                            job.data.id,
                            displayName,
                            link,
                            emails ? emails : null,
                            phoneNumber ? phoneNumber : null,
                            null,
                            job.id
                        );
                    }

                    profileFullDetailsArray.push(Details);
                    console.log("Extracted Profile Details:", Details);
                } catch (error) {
                    console.warn(
                        `Failed to extract details for profile at ${link}:`,
                        error
                    );
                }


            }





            if (lastProcessedElement) {
                await knexDB("Jobs")
                    .where({ id: job.data.id })
                    .update({
                        last_scrapped_element: JSON.stringify({
                            last_element: lastProcessedElement,
                            lastScroll: scrollCount,
                        }),
                    });
            }



            console.log("Search completed.");

        }

        await browser.close();
    } catch (error) {
        console.error("An error occurred during the navigation process:", error);

        if (browser) {
            console.log("Closing the browser due to an error.");
            await browser.close();
        }

        Sentry.captureException("Error during reddit scraping:", error);


        throw error
    } finally {

    }
}

async function processTiktokJob(job) {

    let browser;

    try {


        Sentry.captureMessage("tiktok jobs started");

        console.log("tiktok job started");


        let cookies = [];


        const userId = job.data.user_data_id;
        let cookieFileName = await getCookiesName(userId);

        if (!cookieFileName) {
            console.error("No cookie file found in database.");
            throw new Error("No cookie file found in database.")
        }


        // Normalize __dirname to use forward slashes
        const normalizedDirname = __dirname.replace(/\\/g, '/');



        // Construct full path using path.join (not posix since it's already normalized)
        let cookiePath = path.posix.join(normalizedDirname, "cookies", cookieFileName);

        console.log("Checking cookie file at:", cookiePath);


        if (!fs.existsSync(cookiePath)) {
            console.error("❌ No cookies file found at:", cookiePath);
            throw new Error("No cookies file found at:")
        }

        const data = await fs.promises.readFile(cookiePath, "utf8");
        cookies = JSON.parse(data);





        try {

            const data = await fs.promises.readFile(cookiePath, "utf8");
            cookies = JSON.parse(data);


            // const Session = await checkCookieValidity('tiktok', cookies)
            // console.log("Session", Session)


            // if (Session == false) {

            //     console.log("wokring")

            //     const userData = await getUserDataById(job.data.user_data_id)


            //     let Hashedpassword = userData.password

            //     const password = await decryptPassword(Hashedpassword);

            //     console.log(password)

            //     const resultCheck = await login(userData.platform, userData.email, password)


            //     if (!resultCheck.result) {
            //         console.error("❌ Failed to log in and refresh cookies.");
            //         return false;
            //     }


            //     const newDataCookies = await fs.promises.readFile(cookiePath, "utf8");

            //     cookies = JSON.parse(newDataCookies);
            // }



        } catch (error) {
            console.log("No cookies found or error parsing cookies");

            throw new Error("No cookies found or error parsing cookies")
        }



        let executablePath


        if (app.isPackaged) {
            if (process.platform === 'darwin') { // darwin is the platform name for macOS
               executablePath = path.join(process.resourcesPath, 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');            } else if (process.platform === 'win32') { // win32 is the platform name for Windows
                executablePath = path.join(process.resourcesPath, 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
            }
        } else {
            if (process.platform === 'darwin') {
                executablePath = path.join(__dirname, '..', 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
            } else if (process.platform === 'win32') {
                executablePath = path.join(__dirname, '..', 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
            }
        }

        let browserOptions = {
            headless: true,
            executablePath: executablePath

        };


        if (job.data.proxy) {
            browserOptions.proxy = {
                server: job.data.proxy.server, // Ensure these are defined in your job.data or use placeholders
                username: job.data.proxy.username, // This might also include password if needed
                password: job.data.proxy.password

            };
        }






        // Launch the browser in headful mode for debugging; set headless: false if you want to see the browser
        browser = await chromium.launch(browserOptions);
        const context = await browser.newContext();

        // Create a new page
        const page = await context.newPage();

        await context.addCookies(cookies);


        if (job.data.specific_username) {

            const profileLink = 'https://www.tiktok.com/' + '@' + job.data.query

            await page.goto(profileLink);

            await page.waitForTimeout(3000)

            // Wait for the user container to load
            const containerSelector =
                'div[data-e2e="user-title"], div[class*="DivShareTitleContainer"]';
            await page.waitForSelector(containerSelector);

            // Extract user details dynamically
            const data = await page.evaluate(() => {
                const container = document.querySelector(
                    'div[data-e2e="user-title"], div[class*="DivShareTitleContainer"]'
                );
                if (!container) return null;

                // Extract user title and subtitle
                const userTitle =
                    container
                        .querySelector('[data-e2e="user-title"]')
                        ?.textContent.trim() || null;
                const userSubtitle =
                    container
                        .querySelector('[data-e2e="user-subtitle"]')
                        ?.textContent.trim() || null;

                // Extract metrics: Following, Followers, and Likes
                const following =
                    container
                        .querySelector('[data-e2e="following-count"]')
                        ?.textContent.trim() || null;
                const followers =
                    container
                        .querySelector('[data-e2e="followers-count"]')
                        ?.textContent.trim() || null;
                const likes =
                    container
                        .querySelector('[data-e2e="likes-count"]')
                        ?.textContent.trim() || null;

                // Extract bio
                let bio =
                    container
                        .querySelector('[data-e2e="user-bio"] .css-lesntn-DivBioText')
                        ?.textContent.trim() || null;

                const linkElements = document.querySelectorAll(
                    'a[target="_blank"][rel="noindex nofollow noreferrer noopener"]'
                );

                const links = Array.from(linkElements).map((link) => link.href);

                return {
                    userTitle,
                    userSubtitle,
                    following,
                    followers,
                    likes,
                    bio,
                    links,
                };
            });


            // Handle "more" button for bio expansion
            const moreButton = await page.locator(
                '[data-e2e="user-bio"] .css-oq7mmz-DivBioMore'
            );

            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
            const phoneRegex = /\b\d{10}\b/;

            if (await moreButton.isVisible()) {
                await moreButton.click();

                // Wait for the popover to appear
                const popoverSelector = ".TUXPopover-popover";
                await page.waitForSelector(popoverSelector, { timeout: 5000 });

                // Extract expanded bio from the popover
                const expandedBio = await page
                    .locator(`${popoverSelector} h2`)
                    .textContent()
                    .catch(() => null);

                data.bio = expandedBio?.trim() || data.bio; // Use expanded bio if available
            } else {
                // Fallback to basic bio extraction if "more" button is not present
                const basicBio = await page
                    .locator('[data-e2e="user-bio"]')
                    .textContent()
                    .catch(() => null);
                data.bio = basicBio?.trim() || null;
            }

            const email = data.bio.match(emailRegex);
            const phone = data.bio.match(phoneRegex);

            isLinkPresent = false;

            if (!isLinkPresent) {
                await scrapeAndInsertData(
                    job.data.id,
                    data.userTitle,
                    profileLink,
                    email,
                    phone,
                    data.links,
                    job.id
                );
            }




        }


        else {
            // Navigate to a page that requires authentication to verify if the session is recognized
            // Change this URL to the appropriate one for your use case


            try {

                await page.goto("https://www.tiktok.com/explore", {
                    waitUntil: "domcontentloaded",
                });

                await page.waitForTimeout(10000);

                await page.waitForSelector('button[role="searchbox"]', { state: 'visible', timeout: 600000 })

                // Find the search button using aria-label="Search"
                const searchButton = page.locator('button[role="searchbox"]').first();


                await page.waitForTimeout(5000);



                // Debug: Check if the button is visible
                const isVisible = await searchButton.isVisible();
                console.log(`Search button visibility: ${isVisible}`);

                if (!isVisible) {
                    console.log("Search button is not visible. Trying to scroll and hover...");
                    await searchButton.scrollIntoViewIfNeeded();
                    await searchButton.hover();
                    await page.waitForTimeout(500);
                }

                // Click the button (force if needed)
                console.log("Clicking the search button...");
                await searchButton.click({ force: true });



                // // Click and type the search query
                const searchInput = page.locator('input[type="search"][role="combobox"]').first();
                //await searchInput.click({ force: true });
                await searchInput.type(job.data.query, { delay: 10 });

                // Press Enter to search
                await searchInput.press("Enter");

                // Wait for search results to load
                await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 });

                console.log("Search completed successfully.");
            } catch (error) {
                console.error("Error performing search:", error);
                throw error
            }



            let lastScrappedData = job.data.last_scrapped_element || "{}"; // Default to an empty object string

            // Ensure lastScrappedData is parsed only if it's a string
            if (typeof lastScrappedData === "string") {
                try {
                    lastScrappedData = JSON.parse(lastScrappedData);
                } catch (error) {
                    console.error("Error parsing lastScrappedData:", error);
                    lastScrappedData = {}; // Set to empty object if parsing fails
                }
            }




            // Ensure lastScrappedData.lastScroll exists before adding
            let scrollCount = (lastScrappedData.lastScroll || 0) + 6;




            // Function to scroll the page dynamically
            const scrollPage = async (page, scrollCount, delay = 1000) => {
                for (let i = 0; i < scrollCount; i++) {
                    await page.evaluate(() => {
                        window.scrollBy(0, window.innerHeight); // Scroll down by one viewport height
                    });
                    await page.waitForTimeout(delay); // Wait for content to load
                }
            };

            // Scroll the page 3 times dynamically
            await scrollPage(page, scrollCount);

            // Wait for the elements to ensure they're loaded
            await page.waitForSelector('a[href*="/video/"]');
            await page.waitForTimeout(10000);

            // Extract and transform links after scrolling
            let links = await page.evaluate(() => {
                // Find all anchor tags with hrefs containing '/video/'
                const anchors = Array.from(
                    document.querySelectorAll('a[href*="/video/"]')
                );

                // Transform the links by removing '/video/{id}' segment
                return anchors.map((anchor) => {
                    const href = anchor.href;
                    const baseUrl = href.split("/video/")[0]; // Remove the '/video/{id}' part
                    return baseUrl;
                });
            });

            // Print the transformed links
            console.log("Extracted Links:", links);
            await page.waitForTimeout(10000);

            const userData = []; // Array to store extracted user data


            if (lastScrappedData || !job.data.enforce_update_fetched_data) {
                const lastScrappedIndex = links.findIndex(
                    (link) => link === lastScrappedData.last_element
                );
                if (lastScrappedIndex !== -1) {
                    links = links.slice(lastScrappedIndex + 1);
                }
            }

            console.log("new", links)

            let lastProcessedElement = null;


            // Function to extract user data
            for (const link of links) {
                try {
                    // Navigate to the profile page
                    await page.goto(link, { waitUntil: "domcontentloaded" });
                    await page.waitForTimeout(10000);

                    // Wait for the user container to load
                    const containerSelector =
                        'div[data-e2e="user-title"], div[class*="DivShareTitleContainer"]';
                    await page.waitForSelector(containerSelector);

                    // Extract user details dynamically
                    const data = await page.evaluate(() => {
                        const container = document.querySelector(
                            'div[data-e2e="user-title"], div[class*="DivShareTitleContainer"]'
                        );
                        if (!container) return null;

                        // Extract user title and subtitle
                        const userTitle =
                            container
                                .querySelector('[data-e2e="user-title"]')
                                ?.textContent.trim() || null;
                        const userSubtitle =
                            container
                                .querySelector('[data-e2e="user-subtitle"]')
                                ?.textContent.trim() || null;

                        // Extract metrics: Following, Followers, and Likes
                        const following =
                            container
                                .querySelector('[data-e2e="following-count"]')
                                ?.textContent.trim() || null;
                        const followers =
                            container
                                .querySelector('[data-e2e="followers-count"]')
                                ?.textContent.trim() || null;
                        const likes =
                            container
                                .querySelector('[data-e2e="likes-count"]')
                                ?.textContent.trim() || null;

                        // Extract bio
                        let bio =
                            container
                                .querySelector('[data-e2e="user-bio"] .css-lesntn-DivBioText')
                                ?.textContent.trim() || null;

                        const linkElements = document.querySelectorAll(
                            'a[target="_blank"][rel="noindex nofollow noreferrer noopener"]'
                        );

                        const links = Array.from(linkElements).map((link) => link.href);

                        return {
                            userTitle,
                            userSubtitle,
                            following,
                            followers,
                            likes,
                            bio,
                            links,
                        };
                    });

                    // Handle "more" button for bio expansion
                    const moreButton = await page.locator(
                        '[data-e2e="user-bio"] .css-oq7mmz-DivBioMore'
                    );

                    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
                    const phoneRegex = /\b\d{10}\b/;

                    if (await moreButton.isVisible()) {
                        await moreButton.click();

                        // Wait for the popover to appear
                        const popoverSelector = ".TUXPopover-popover";
                        await page.waitForSelector(popoverSelector, { timeout: 5000 });

                        // Extract expanded bio from the popover
                        const expandedBio = await page
                            .locator(`${popoverSelector} h2`)
                            .textContent()
                            .catch(() => null);

                        data.bio = expandedBio?.trim() || data.bio; // Use expanded bio if available
                    } else {
                        // Fallback to basic bio extraction if "more" button is not present
                        const basicBio = await page
                            .locator('[data-e2e="user-bio"]')
                            .textContent()
                            .catch(() => null);
                        data.bio = basicBio?.trim() || null;
                    }

                    const email = data.bio.match(emailRegex);
                    const phone = data.bio.match(phoneRegex);

                    const userDataObject = { profileLink: link, ...data };

                    const isLinkPresent = await UpdatingValuesIfExist(link, data.userTitle, email, phone, data.links);


                    if (!isLinkPresent && (email || phone)) {
                        await scrapeAndInsertData(
                            job.data.id,
                            data.userTitle,
                            link,
                            email,
                            phone,
                            data.links,
                            job.id
                        );
                    }



                    // Add data to the array
                    userData.push(userDataObject);

                    lastProcessedElement = link;

                } catch (error) {
                    console.error(`Failed to extract data for ${link}:`, error);
                    // await page.screenshot({ path: `error-${link.split("@")[1]}.png` }); // Capture screenshot for debugging
                }

                await page.waitForTimeout(2000);
            }


            // const db = await getDbInstance()

            if (lastProcessedElement) {
                await knexDB("Jobs")
                    .where({ id: job.data.id })
                    .update({
                        last_scrapped_element: JSON.stringify({
                            last_element: lastProcessedElement,
                            lastScroll: scrollCount,
                        }),
                    });
            }




            console.log(userData);
        }

        await browser.close();
    } catch (error) {
        Sentry.captureException("Error during tiktok scraping:", error);
        console.error("An error occurred during the navigation process:", error);
        if (browser) {
            console.log("Closing the browser due to an error.");
            await browser.close();
        }
        throw error
    }
}

// async function processGoogleMapJob(job) {
//     try {
//         const start = Date.now();
//         const browser = await chromium.launch({
//             headless: false,
//         });
//         const context = await browser.newContext();
//         const page = await context.newPage();
//         //const query = "book store";

//         // console.log("job", job)

//         try {
//             await page.goto(
//                 `https://www.google.com/maps/search/${job.data.query
//                     .split(" ")
//                     .join("+")}`
//             );
//         } catch (error) {
//             console.log("error going to page", error);
//         }



//         let lastScrappedData = job.data.last_scrapped_element || {};
//         let scrollCount = lastScrappedData.lastScroll || 0;
//         scrollCount = scrollCount + 2



//         console.log(lastScrappedData, scrollCount)

//         await autoScroll(page, scrollCount);

//         const html = await page.content();
//         const $ = cheerio.load(html);
//         const aTags = $("a");
//         const parents = [];
//         aTags.each((_, el) => {
//             const href = $(el).attr("href");
//             if (href && href.includes("/maps/place/")) {
//                 parents.push($(el).parent());
//             }
//         });

//         const businesses = await extractBusinessDetails(
//             parents,
//             context,
//             job.data.id,
//             job.id,
//             scrollCount,
//             lastScrappedData
//         );
//         const end = Date.now();
//         console.log(`Time in seconds: ${Math.floor((end - start) / 1000)}`);
//         console.log("business", businesses);


//         // await browser.close();
//         return businesses;
//     } catch (error) {
//         console.log("error at googleMaps", error.message);
//     }
// }

async function processGoogleMapJob(job) {



    console.log("google maps working......")



    if (!job || !job.data || !job.data.query) {
        console.error("Job data is incomplete or missing.");
        throw new Error("Job data is incomplete or missing.")
    }


    Sentry.captureMessage("Google maps jobs started");


    let executablePath

    if (app.isPackaged) {
        if (process.platform === 'darwin') { // darwin is the platform name for macOS
           executablePath = path.join(process.resourcesPath, 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');        } else if (process.platform === 'win32') { // win32 is the platform name for Windows
            executablePath = path.join(process.resourcesPath, 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
        }
    } else {
        if (process.platform === 'darwin') {
            executablePath = path.join(__dirname, '..', 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
        } else if (process.platform === 'win32') {
            executablePath = path.join(__dirname, '..', 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
        }
    }



    let browserOptions = {
        headless: true,
        executablePath: executablePath

    };


    if (job.data.proxy) {
        browserOptions.proxy = {
            server: job.data.proxy.server, // Ensure these are defined in your job.data or use placeholders
            username: job.data.proxy.username, // This might also include password if needed
            password: job.data.proxy.password

        };
    }


    const browser = await chromium.launch(browserOptions);
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36' });
    const page = await context.newPage();

    try {

        const inputQuery = job.data.query.replace('/#(\w+)/g;', job.data.query)

        const url = `https://www.google.com/maps/search/${encodeURIComponent(inputQuery)}`;
        await page.goto(url, { waitForTimeout: 10000 });





        let lastScrappedData = job.data.last_scrapped_element || "{}"; // Default to an empty object string

        // Ensure lastScrappedData is parsed only if it's a string
        if (typeof lastScrappedData === "string") {
            try {
                lastScrappedData = JSON.parse(lastScrappedData);
            } catch (error) {
                console.error("Error parsing lastScrappedData:", error);
                lastScrappedData = {}; // Set to empty object if parsing fails
            }
        }




        // Ensure lastScrappedData.lastScroll exists before adding
        let scrollCount = (lastScrappedData.lastScroll || 0) + 2;


        console.log(lastScrappedData, scrollCount)
        await autoScroll(page, scrollCount);

        await page.waitForTimeout(5000)

        const html = await page.content();
        const $ = cheerio.load(html);
        const parents = $("a[href*='/maps/place/']").map((i, el) => $(el).parent()).get();

        const businesses = await extractBusinessDetails(parents, context, job.data.id, job.id, scrollCount, job.data.last_scrapped_element || {}, job);
        await browser.close()
        // console.log("Extracted businesses:", businesses);
    } catch (error) {
        console.error("Error processing Google Maps job:", error);
        Sentry.captureException("Error during google maps scraping:", error);


        throw error

    } finally {
        await page.close();
        await context.close();
        await browser.close();
    }
}



async function autoScroll(page, scrollCount) {
    await page.evaluate(async (scrollCount) => {
        const wrapper = document.querySelector('div[role="feed"]');
        if (!wrapper) {
            console.error("❌ Scroll wrapper not found! Exiting scroll function.");
            return;
        }

        let currentScrolls = 0;
        const maxScrolls = scrollCount;
        const distance = 1000;
        const scrollDelay = 500; // Increased delay to avoid rate limits

        await new Promise((resolve) => {
            const timer = setInterval(() => {
                if (currentScrolls >= maxScrolls ||
                    (wrapper.scrollHeight - wrapper.scrollTop <= wrapper.clientHeight)) {
                    clearInterval(timer);
                    console.log(`✅ Stopped scrolling after ${currentScrolls} iterations`);
                    resolve();
                    return;
                }

                wrapper.scrollBy(0, distance);
                currentScrolls++;
            }, scrollDelay);
        });
    }, scrollCount); // Pass `scrollCount` correctly
}



async function extractBusinessDetails(parents, context, query_id, jobId, scrollCount, lastScrappedData, job) {
    const businesses = [];



    let lastScrapedElement = lastScrappedData?.last_element || null;
    let startIndex = 0;

    // Find the index of the last scrapped element
    if (lastScrapedElement) {
        const lastScrapedIndex = parents.findIndex(parent => parent.find("a").attr("href") === lastScrapedElement);
        if (lastScrapedIndex !== -1) {
            startIndex = lastScrapedIndex + 1;
        }
    }


    let lastProcessedElement = null;



    for (const [index, parent] of parents.slice(startIndex).entries()) {
        const url = parent.find("a").attr("href");
        const website = parent.find('a[data-value="Website"]').attr("href");
        const storeName = parent.find("div.fontHeadlineSmall").text();
        const ratingText = parent.find("span.fontBodyMedium > span").attr("aria-label");

        const bodyDiv = parent.find("div.fontBodyMedium").first();
        const children = bodyDiv.children();
        const lastChild = children.last();
        const firstOfLast = lastChild.children().first();

        const displayName = storeName;
        const description = firstOfLast?.text()?.split("·")?.[1]?.trim();

        try {
            const newPage = await context.newPage();
            await newPage.goto(url, { waitUntil: "load" });

            let phoneNumber = "";
            let cleanedPhoneNumber = "";
            let extractedWebsite = "";

            try {
                phoneNumber = await newPage.$eval(
                    'button[data-tooltip="Copy phone number"]',
                    (div) => div.textContent.trim()
                );

                const websiteElement = await newPage.$('a[aria-label^="Website:"]');
                if (websiteElement) {
                    extractedWebsite = await newPage.$eval(
                        'a[aria-label^="Website:"]',
                        (link) => link.href
                    );
                }

                cleanedPhoneNumber = phoneNumber.replace(/[^\d]/g, "");
            } catch (error) {
                console.error("Error extracting phone number or website:", error);
            }

            await newPage.waitForTimeout(2000);
            await newPage.close();

            const data = {
                placeId: `ChI${url?.split("?")?.[0]?.split("ChI")?.[1]}`,
                address: firstOfLast?.text()?.split("·")?.[1]?.trim(),
                category: firstOfLast?.text()?.split("·")?.[0]?.trim(),
                phone: cleanedPhoneNumber,
                googleUrl: url,
                bizWebsite: extractedWebsite,
                description: description,
                ratingText,
                stars: parseFloat(ratingText?.split(" stars ")[0]),
                numberOfReviews: parseInt(ratingText?.split(" stars ")[1]?.replace("Reviews", "").trim()),
                link: extractedWebsite,
            };

            // businesses.push(data);

            try {


                const updateExist = await UpdatingValuesIfExist(data.googleUrl, data.storeName, null, data.phone, data.link)

                console.log("updateExist", updateExist)

                if (!updateExist && (data.phone)) {
                    console.log("scrape & check")
                    await scrapeAndInsertData(
                        query_id,
                        storeName,
                        data.googleUrl,
                        null,
                        data.phone,
                        data.link,
                        jobId
                    );
                }


                lastProcessedElement = url

                // console.log(lastProcessedElement,"lasprcoes")
            } catch (error) {
                console.error(`Database query failed for: ${displayName}`, error);
            }
        } catch (error) {
            console.error(`Failed to navigate to URL: ${url}`, error);
        }



        // const db = await getDbInstance()

        if (lastProcessedElement) {
            await knexDB("Jobs")
                .where({ id: job.data.id })
                .update({
                    last_scrapped_element: JSON.stringify({
                        last_element: lastProcessedElement,
                        lastScroll: scrollCount,
                    }),
                });
        }



    }




    console.log("All business details extracted successfully:", businesses);
    return businesses;
}

module.exports = {
    processInstagramJob,
    processFacebookJob,
    processTwitterJob,
    processLinkedinJob,
    processRedditJob,
    processTiktokJob,
    processGoogleMapJob,
};
