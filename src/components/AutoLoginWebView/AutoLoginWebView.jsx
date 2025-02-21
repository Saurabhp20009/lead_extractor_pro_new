import { useEffect, useRef } from "react";

const AutoLoginWebView = ({ platform, onClose }) => {
  const webviewRef = useRef(null);

  // Login scripts for supported platforms
  const loginScripts = {
    Instagram: `
      const waitForElement = (selector) => {
        return new Promise((resolve) => {
          const checkExist = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(checkExist);
              resolve(element);
            }
          }, 100);
        });
      };

      (async () => {
        const usernameField = await waitForElement('input[name="username"]');
        usernameField.value = '{email}';

        const passwordField = await waitForElement('input[name="password"]');
        passwordField.value = '{password}';

        const loginButton = await waitForElement('button[type="submit"]');
        loginButton.click();
      })();
    `,
    Facebook: `
      const waitForElement = (selector) => {
        return new Promise((resolve) => {
          const checkExist = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(checkExist);
              resolve(element);
            }
          }, 100);
        });
      };

      (async () => {
        const emailField = await waitForElement('input[name="email"]');
         await new Promise((resolve) => setTimeout(resolve, 500)); // Delay
        emailField.value = '{email}';

        const passwordField = await waitForElement('input[name="pass"]');
         await new Promise((resolve) => setTimeout(resolve, 500)); // Delay
        passwordField.value = '{password}';

        const loginButton = await waitForElement('button[name="login"]');
        loginButton.click();
      })();
    `,
  };

  // URLs for platforms
  const platformUrls = {
    Instagram: "https://www.instagram.com/accounts/login/",
    Facebook: "https://www.facebook.com/login/",
    Tiktok: "https://www.tiktok.com/login/phone-or-email/email",
    Linkedin: "https://www.linkedin.com/login",
    Twitter: "https://twitter.com/login",
    Reddit: "https://www.reddit.com/login",
  };

  useEffect(() => {
    const webview = webviewRef.current;

    if (!webview) return;

    const handleCredentialsResponse = (event, response) => {
      console.log("Received credentials response:", response);
      if (response.success && webview) {
        const script = loginScripts[platform]
          .replace("{email}", response.data.email)
          .replace("{password}", response.data.password);

        console.log("Executing login script:", script);
        webview.executeJavaScript(script).catch((err) => {
          console.error("Error executing JavaScript in WebView:", err);
        });
      }
    };

    const handleDomReady = () => {
      console.log("WebView ready, requesting credentials for:", platform);
      window.electron.ipcRenderer.send("get-user-credentials", platform);
    };

    // Listen for the dom-ready event
    webview.addEventListener("dom-ready", handleDomReady);

    // Listen for credentials response from main process
    const removeListener = window.electron.ipcRenderer.on(
      "user-credentials",
      handleCredentialsResponse
    );

    // Listen for console messages from the webview
    webview.addEventListener("console-message", (e) => {
      console.log("WebView console:", e.message);
    });

    return () => {
      webview.removeEventListener("dom-ready", handleDomReady);
      removeListener(); // Cleanup the IPC listener
    };
  }, [platform]);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg w-3/4 h-3/4 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <span className="sr-only">Close</span>×
        </button>

        <webview
          ref={webviewRef}
          src={platformUrls[platform]}
          style={{ width: "100%", height: "100%" }}
          webpreferences="contextIsolation,disableBlinkFeatures=Auxclick"
        />
      </div>
    </div>
  );
};

export default AutoLoginWebView;
