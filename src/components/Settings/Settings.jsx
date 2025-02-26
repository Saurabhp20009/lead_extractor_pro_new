// import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
// import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import { useState, useEffect } from "react";
import SignUp from "../SignUp/SignUp";
// import AutoLoginWebView from "../AutoLoginWebView/AutoLoginWebView";
import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaLinkedin,
  FaReddit,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import AddKey from "../AddKey/AddKey";
import RemoveAccountModel from "../RemoveAccountModel/RemoveAccountModel";
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import { FaKey } from "react-icons/fa6";
import { toast, ToastContainer } from "react-toastify";

const secondaryNavigation = [
  {
    name: "instagram",
    href: "#",
    icon: <FaInstagram style={{ height: "20px", width: "20px" }} />,
    UserCircleIcon,
    current: true,
  },
  {
    name: "facebook",
    href: "#",
    icon: <FaFacebook style={{ height: "20px", width: "20px" }} />,
    current: false,
  },
  {
    name: "tiktok",
    href: "#",
    icon: <FaTiktok style={{ height: "20px", width: "20px" }} />,
    current: false,
  },
  {
    name: "twitter",
    href: "#",
    icon: <FaXTwitter style={{ height: "20px", width: "20px" }} />,
    current: false,
  },
  {
    name: "linkedin",
    href: "#",
    icon: <FaLinkedin style={{ height: "20px", width: "20px" }} />,
    current: false,
  },
  {
    name: "reddit",
    href: "#",
    icon: <FaReddit style={{ height: "20px", width: "20px" }} />,
    current: false,
  },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Settings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalRemoveModelOpen, setIsModalRemoveModelOpen] = useState(false);
  const [platform, setPlatform] = useState("instagram");
  const [buttonProductKey, setButtonProductKey] = useState("Add product key");

  const [accounts, setAccounts] = useState([]);
  const [delId, setDelId] = useState(null);
  const [isModalProductKeyOpen, setIsModalProductKeyOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    Redis: false,
    HeadlessBrowser: false,
    Database: false,
  });

  const [isDropDownOpen, setDropDownOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const closePlatformModel = () => setDropDownOpen(false);

  const handlePlatformAndModelOpenChange = () => {
    setIsModalOpen(true);
  };

  const fetchCookiesData = (platformName) => {
    console.log("checkig this function");
    if (platformName !== "") {
      // console.log("platform", platformName);
      window.electron.ipcRenderer.send(
        "get-platform-cookies-data",
        platformName
      );
      window.electron.ipcRenderer.on("user-cookies-data", (event, response) => {
        if (response.success) {
          // console.log("response", response.data);
          setAccounts(response.data);
        } else {
          // console.error(
          //   `Error fetching cookies data for ${platform}:`,
          //   response.error
          // );
        }
      });
    }
  };

  const handleLoginUser = (id) => {
    window.electron.ipcRenderer.send("login-user", id);

    const loginUserResponseHandler = (event, response) => {
      if (response.success) {
        // console.log("login-response-success",response)
        toast.success(response.message);
        fetchCookiesData(platform);
      } else {
        // console.log("response", response);
        fetchCookiesData(platform);
        toast.error(response.error);
      }
      window.electron.ipcRenderer.removeListener(
        "login-user-response",
        loginUserResponseHandler
      );
    };
    window.electron.ipcRenderer.on(
      "login-user-response",
      loginUserResponseHandler
    );
    fetchCookiesData(platform);
  };

  const handleRemoveUser = (id) => {
    window.electron.ipcRenderer.send("remove-user-account", id);
    const removeUserResponseHandler = (event, response) => {
      if (response.success) {
      } else {
        toast.success(response.success);
      }
      window.electron.ipcRenderer.removeListener(
        "user-account-removed",
        removeUserResponseHandler
      );
    };
    window.electron.ipcRenderer.on(
      "user-account-removed",
      removeUserResponseHandler
    );
  };

  const handleProductKeyCheck = async () => {
    // Define the response handler
    const handleResponse = (event, response) => {
      // console.log("Received response:", response);
      if (response.success) {
        // console.log("**********", response);
        setButtonProductKey("Product Key Added");
      } else {
        // alert(`Error: ${response.message}`);
        // setButtonProductKey("Unable to add the key")
      }
      // Remove the event listener after handling the response
      window.electron.ipcRenderer.removeListener(
        "response-check-productKey-exist",
        handleResponse
      );
    };

    // Attach the event listener before sending the IPC message
    window.electron.ipcRenderer.on(
      "response-check-productKey-exist",
      handleResponse
    );

    // Send the IPC message to check the product key
    window.electron.ipcRenderer.send("check-productKey-exist");
    // console.log("Product key check requested");
  };

  // console.log(platform, isModalOpen);

  useEffect(() => {
    fetchCookiesData(platform);
  }, [platform, isModalOpen, isModalRemoveModelOpen, isModalProductKeyOpen]);

  const handleDropDown = (platformName) => {
    // setDropDownOpen(true);
    setPlatform(platformName);
    fetchCookiesData(platformName);

    secondaryNavigation.forEach((item) => {
      item.current = item.name === platformName;
    });
  };

  const handleTestDatabaseConnection = () => {
    window.electron.ipcRenderer.send("test-database-connection");

    window.electron.ipcRenderer.on(
      "database-connection-result",
      (event, response) => {
        if (response.success) {
          setConnectionStatus((prevState) => ({
            ...prevState,
            Database: true,
          }));
        } else {
          setConnectionStatus((prevState) => ({
            ...prevState,
            Database: false,
          }));
        }
        console.log("database-response", response);
      }
    );
  };

  const handleTestRedisConnection = () => {
    window.electron.ipcRenderer.send("test-redis-connection");

    window.electron.ipcRenderer.on(
      "redis-connection-result",
      (event, response) => {
        if (response.success) {
          setConnectionStatus((prevState) => ({ ...prevState, Redis: true }));
        } else {
          setConnectionStatus((prevState) => ({ ...prevState, Redis: false }));
        }
        console.log("redis-response", response);
      }
    );
  };

  const handleTestHeadlessBrowserConnection = () => {
    window.electron.ipcRenderer.send("test-headless-browser");

    window.electron.ipcRenderer.on(
      "headless-browser-result",
      (event, response) => {
        if (response.success) {
          setConnectionStatus((prevState) => ({
            ...prevState,
            HeadlessBrowser: true,
          }));
        } else {
          setConnectionStatus((prevState) => ({
            ...prevState,
            HeadlessBrowser: false,
          }));
        }
        console.log("headless-browser-result", response);
      }
    );
  };

  useEffect(() => {
    handleTestRedisConnection();
    handleTestDatabaseConnection();
    handleTestHeadlessBrowserConnection();
  }, []);

  // console.log(isModalOpen, "IUS");

  return (
    <div>
      <ToastContainer />

      <h2
        className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
        style={{ textAlign: "left", paddingTop: "1vh" }}
      >
        Settings
      </h2>

      <p
        className="mt-1 text-sm text-gray-500"
        style={{ textAlign: "left", paddingTop: "1vh" }}
      >
        manage social accounts and product key
      </p>
      <div className="max-w-7xl  lg:flex lg:gap-x-16 lg:px-0">
        <h1 className="sr-only">General Settings</h1>

        <aside className="flex overflow-x-auto border-b border-gray-900/5 py-4 lg:block lg:w-64 lg:flex-none lg:border-0 lg:">
          <nav className="flex-none px-4 sm:px-6 lg:px-0">
            <ul
              role="list"
              className="flex gap-x-3 gap-y-1 whitespace-nowrap lg:flex-col"
            >
              {secondaryNavigation.map((item) => (
                <li key={item.name} onClick={() => handleDropDown(item.name)}>
                  <a
                    href={item.href}
                    className={classNames(
                      item.current
                        ? "bg-gray-50 text-indigo-600"
                        : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600",
                      "group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm/6 font-semibold"
                    )}
                    style={{ alignItems: "center" }}
                  >
                    {item.icon}
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="px-4  sm:px-6 lg:flex-auto lg:px-0 lg:">
          <div className="mx-auto max-w-2xl space-y-16 sm:space-y-20 lg:mx-0 lg:max-w-none">
            <div>
              <div className="flex justify-end mb-6">
                {/* <div>
                  <button
                    type="button"
                    className="rounded-full bg-indigo-600 px-3.5 py-2 m-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={() => setIsModalProductKeyOpen(true)}
                  >
                    {buttonProductKey}
                  </button>
                </div> */}

                <button
                  type="button"
                  className="rounded-full bg-indigo-600 px-3.5 py-2 m-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  onClick={() => handlePlatformAndModelOpenChange()}
                >
                  Add social media account
                </button>
              </div>
            </div>

            <div>
              <h2
                className="text-base/7 font-semibold text-gray-900"
                style={{ textAlign: "left" }}
              >
                Profile
              </h2>

              <dl
                className="mt-6 divide-y divide-gray-100 border-t border-gray-200"
                style={{ textAlign: "left" }}
              >
                {accounts.map((item, index) => (
                  <div key={index} className="py-6 sm:flex">
                    <dt className="font-sm text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
                      {item.email}
                    </dt>
                    <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                      <div className="text-gray-900">{item.name}</div>{" "}
                      {/* Assuming each account item has a 'name' */}
                      {!item.Cookies_path ? (
                        <button
                          type="button"
                          className="bg-indigo-600 px-3 py-2 text-xs text-white rounded hover:bg-indigo-500"
                          onClick={() => handleLoginUser(item.id)}
                        >
                          Login
                        </button>
                      ) : (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            fontSize: "small",
                          }}
                        >
                          {" "}
                          <IoCheckmarkDoneCircleOutline
                            style={{
                              height: "20px",
                              width: "20px",
                              margin: "1vh",
                            }}
                          />{" "}
                          Already Login
                        </span>
                      )}
                      <button
                        type="button"
                        className="font-medium text-indigo-600 hover:text-indigo-500"
                        onClick={() => {
                          setIsModalRemoveModelOpen(true);
                          setDelId(item.id);
                        }}
                      >
                        Remove
                      </button>
                      {/* {isModalRemoveModelOpen && <RemoveAccountModel handleRemoveUser={()=>handleRemoveUser(item.id)} closeModal={setIsModalRemoveModelOpen}  /> } */}
                    </dd>
                  </div>
                ))}
              </dl>

              {accounts.length == 0 && (
                <p
                  className="mt-5 text-sm text-gray-500"
                  style={{ textAlign: "left" }}
                >
                  No account found
                </p>
              )}
            </div>

            <div>
              <h2 className="text-base/7 font-semibold text-gray-900 text-left">
                Connections 
              </h2>

              <ul
                role="list"
                className="mt-6 divide-y divide-gray-100 border-t border-gray-200 text-sm/6"
              >
                <li className="flex justify-between gap-x-6 py-6">
                  <div className="font-medium text-gray-900">
                    Redis 
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    {connectionStatus.Redis ? "Connected" : "Not Connected"}
                  </button>
                </li>
                <li className="flex justify-between gap-x-6 py-6">
                  <div className="font-medium text-gray-900">
                    Headless browser
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    {connectionStatus.HeadlessBrowser
                      ? "Connected"
                      : "Not Connected"}
                  </button>
                </li>

                <li className="flex justify-between gap-x-6 py-6">
                  <div className="font-medium text-gray-900">Database</div>
                  <button
                    type="button"
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    {connectionStatus.Database ? "Connected" : "Not Connected"}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && <SignUp closeModal={closeModal} />}
      {isModalProductKeyOpen && (
        <AddKey
          closeModal={() =>
            setIsModalProductKeyOpen(() => setIsModalProductKeyOpen(false))
          }
        />
      )}
      {isModalRemoveModelOpen && (
        <RemoveAccountModel
          handleRemoveUser={() => handleRemoveUser(delId)}
          setIsModalRemoveModelOpen={setIsModalRemoveModelOpen}
        />
      )}
    </div>
  );
}
