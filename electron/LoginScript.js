const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');


async function ensureCookiesDirectory() {
    try {
        const cookiesDir = path.join(__dirname, 'cookies');
        await fs.promises.mkdir(cookiesDir, { recursive: true }); // Ensures directory exists
        return cookiesDir;
    } catch (error) {
        console.error("❌ Error creating cookies directory:", error);
        throw error;
    }
}

async function saveCookiesToFile(context, platform, email) {
    try {
        const cookiesDir = await ensureCookiesDirectory();
        const cookieFileName = `${platform}_${email}.json`;
        const cookiesPath = path.join(cookiesDir, cookieFileName);

        const cookies = await context.cookies();
        if (!cookies || cookies.length === 0) {
            console.error("❌ No cookies found. Skipping save.");
            return false;
        }

        await fs.promises.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log(`✅ Cookies saved successfully at: ${cookiesPath}`);
        return cookieFileName;
    } catch (error) {
        console.error("❌ Error saving cookies:", error);
        return false;
    }
}

async function login(platform, email, password) {

    let executablePath
  
    if (app.isPackaged) {
        if (process.platform === 'darwin') { // darwin is the platform name for macOS
            executablePath = path.join(process.resourcesPath, 'mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
        } else if (process.platform === 'win32') { // win32 is the platform name for Windows
            executablePath = path.join(process.resourcesPath, 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
        }
    } else {
        if (process.platform === 'darwin') {
            executablePath = path.join(__dirname, '..','mac-ms-playwright', 'chromium-1161', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
        } else if (process.platform === 'win32') {
            executablePath = path.join(__dirname, '..', 'ms-playwright', 'chromium-1155', 'chrome-win', 'chrome.exe');
        }
    }



    const browser = await chromium.launch({ executablePath: executablePath, headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    const platformUrls = {
        instagram: "https://www.instagram.com",
        facebook: "https://www.facebook.com/",
        tiktok: "https://www.tiktok.com/login/phone-or-email/email",
        linkedin: "https://www.linkedin.com/login",
        twitter: "https://x.com/login",
        reddit: "https://www.reddit.com/login",
    };

    const loginScripts = {
        instagram: async () => {
            let shouldSaveCookies = false; // Flag to determine if cookies should be saved
            try {
                await page.goto(platformUrls.instagram);
                await page.waitForTimeout(10000);
                await page.waitForSelector('input[name="username"]');
                await page.type('input[name="username"]', email, { delay: 50 });
                await page.type('input[name="password"]', password, { delay: 50 });
                await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
                await page.waitForTimeout(10000);


               

                // Define the URL you expect to be on after successful login
                const waitUrl = 'https://www.instagram.com/';

                // Wait for the expected URL. If the URL does not match within the timeout, an error will be thrown
                await page.waitForURL(waitUrl, {
                    timeout: 10000 // Timeout after 10000 ms
                });

                shouldSaveCookies = true; // Set the flag to true if no exceptions have been thrown

            } catch (error) {
                console.error('Error during Instagram login:', error);
                return { result: false, message: error }
                // Return false to indicate login failure
            } finally {
                if (shouldSaveCookies) {
                    console.log('Saving cookies...');
                    const fileResult = await saveCookiesToFile(context, 'instagram', email); // Save cookies only if the flag is true
                    await browser.close(); // Always close the browser


                    if (fileResult) {
                        return { result: true, message: "saved successfully cookies" }
                    }
                    else {
                        return { result: false, message: "unable to save the cookies" }
                    }
                }
            }
        }
        ,
        facebook: async () => {
            try {
                await page.goto(platformUrls.facebook);
                await page.waitForTimeout(10000);
                await page.type('input[name="email"]', email, { delay: 50 });
                await page.type('input[name="pass"]', password, { delay: 50 });

                // Attempt to login and wait for the navigation
                const navigationPromise = page.waitForNavigation();
                await page.click('button[name="login"]');
                await navigationPromise;

                // After navigation, check the current URL
                const currentUrl = page.url();
                if (currentUrl.includes('privacy_mutation_token')) {
                    console.error('Login redirected to an unexpected URL:', currentUrl);
                    throw new Error('Login redirected due to privacy concerns.'); // Custom error message
                }

                // Selector for any potential error message on the login page
                const errorSelector = 'div._9ay7';

                // Check for the presence of an error message
                const errorMessage = await page.$(errorSelector);
                if (errorMessage) {
                    const errorText = await errorMessage.evaluate(node => node.textContent);
                    console.error('Login failed:', errorText);
                    throw new Error('Login failed with error message: ' + errorText); // Throw an error and do not proceed
                }

                // Wait for the page to navigate to the expected URL after successful login
                await page.waitForURL('https://www.facebook.com/', {
                    timeout: 10000 // Define a reasonable timeout to wait for the URL
                });


            } catch (error) {
                console.error('Error during Facebook login:', error);
                return { result: false, message: error }
                throw error; // Rethrow to handle it in finally if necessary

            } finally {

                console.log('Saving cookies before closing the browser...');

                const fileResult = await saveCookiesToFile(context, platform, email); // Save cookies only if page is still open
                await browser.close()

                if (fileResult) {
                    return { result: true, message: "saved successfully cookies" }
                }
                else {
                    return { result: false, message: "unable to save the cookies" }
                }

                // return { result: true, message: "saved successfully cookies" }

            }


        },
        tiktok: async () => {
            try {
                await page.goto(platformUrls.tiktok);
                await page.waitForTimeout(10000);
                await page.type('.tiktok-11to27l-InputContainer.etcs7ny1[type="text"]', email, { delay: 50 });
                await page.type('.tiktok-wv3bkt-InputContainer.etcs7ny1[type="password"]', password, { delay: 50 });
                await page.click('.tiktok-11sviba-Button-StyledButton.ehk74z00');
                await page.waitForNavigation();
                await page.waitForTimeout(60000);
                const fileResult = await saveCookiesToFile(context, platform, email);
                if (fileResult) {
                    return { result: true, message: "saved successfully cookies" }
                }
                else {
                    return { result: false, message: "unable to save the cookies" }
                }

            } catch (error) {
                console.error('Error during TikTok login:', error);
                await browser.close();
                return { result: false, message: error }

            }
        },
        twitter: async () => {
            try {
                await page.goto(platformUrls.twitter);
                await page.waitForTimeout(10000);
                await page.type('input[name="text"]', email, { delay: 50 });
                await page.press('input[name="text"]', "Enter");
                await page.waitForSelector('input[name="password"]', { state: "visible" });
                await page.type('input[name="password"]', password, { delay: 50 });
                await page.click('button[data-testid="LoginForm_Login_Button"]');
                await page.waitForURL('https://x.com/home', { timeout: 60000 });
                const fileResult = await saveCookiesToFile(context, platform, email);
                if (fileResult) {
                    return { result: true, message: "saved successfully cookies" }
                }
                else {
                    return { result: false, message: "unable to save the cookies" }
                }
            } catch (error) {
                console.error('Error during Twitter login:', error);
                return { result: false, message: error }

            }
        },
        linkedin: async () => {
            try {
                await page.goto(platformUrls.linkedin);
                await page.waitForTimeout(10000);
                await page.type('#username', email, { delay: 50 });
                await page.type('#password', password, { delay: 50 });
                await page.click('[type="submit"]');
                await page.waitForURL('https://www.linkedin.com/feed/', { timeout: 60000 });
                const fileResult = await saveCookiesToFile(context, platform, email);
                if (fileResult) {
                    return { result: true, message: "saved successfully cookies" }
                }
                else {
                    return { result: false, message: "unable to save the cookies" }
                }
            } catch (error) {
                console.error('Error during LinkedIn login:', error);
                return { result: false, message: error }
            }
        },
        reddit: async () => {
            try {
                await page.goto(platformUrls.reddit);
                await page.waitForTimeout(10000);
                await page.type('input[name="username"]', email, { delay: 50 });
                await page.type('input[name="password"]', password, { delay: 50 });
                await page.press('input[name="password"]', "Enter");
                // await page.waitForTimeout(10000)
                await page.waitForURL('https://www.reddit.com/', { timeout: 60000 });
                const fileResult = await saveCookiesToFile(context, platform, email);
                if (fileResult) {
                    return { result: true, message: "saved successfully cookies" }
                }
                else {
                    return { result: false, message: "unable to save the cookies" }
                }

            } catch (error) {
                console.error('Error during Reddit login:', error);
                return { result: false, message: error }
            }
        }
    };

    if (loginScripts[platform]) {
        const result = await loginScripts[platform]();
        await browser.close()
        return result;
    } else {
        console.error(`No login script for platform: ${platform}`);
        await browser.close();
        return { result: false, message: "No login script for platform: ${platform}" };
    }
}

module.exports = { login };
