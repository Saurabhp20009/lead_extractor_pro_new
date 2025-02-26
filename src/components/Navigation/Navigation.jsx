import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import Settings from "../Settings/Settings";
import Form from "../Form/Form";
import Cron_jobs from "../Cron_Jobs/Cron_jobs";
import DataTable from "../DataTable/DataTable";

import { MdDashboard } from "react-icons/md";
import { MdLeaderboard } from "react-icons/md";
import { IoIosSettings } from "react-icons/io";
import { IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";

const user = {
  name: "user",
  email: "",
  imageUrl: (
    <IoIosSettings
      style={{ color: "white", margin: "1vh", height: "30px", width: "30px" }}
    />
  ),
};

const navigation = [
  {
    name: "Dashboard",
    href: "#",
    icon: <MdDashboard style={{ color: "white", margin: "1vh" }} />,
    current: false,
  },
  {
    name: "Leads",
    href: "#",
    icon: <MdLeaderboard style={{ color: "white", margin: "1vh" }} />,
    current: false,
  },
];
const userNavigation = [
  // { name: "Your Profile", href: "#" },
  { name: "Settings", icon: <IoIosSettings />, href: "#" },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Navigation() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [notification, setNotification] = useState([]);

  const handleJobNotification = () => {
    window.electron.ipcRenderer.send("get-job-notification");

    window.electron.ipcRenderer.on("reply-job-notification", (event, data) => {
      // console.log(data);
      if (data.success) {
        setNotification(data.notifications);
      } else {
        console.log("Error in getting notification");
      }
    });
  };

  const handleClearNotification = () => {
    window.electron.ipcRenderer.send("clear-job-notification");

    window.location.reload();
  };

  useEffect(() => {
    handleJobNotification();
    // Set up the interval
    const intervalId = setInterval(handleJobNotification, 300000); // 300000 milliseconds = 5 minutes

    console.log("iner", intervalId);

    // Clean up the interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return <Cron_jobs />;
      case "Settings":
        return <Settings />;
      case "Leads":
        return <DataTable />;
      default:
        return <div>{activeTab} Content</div>;
    }
  };

  return (
    <>
      <div className="min-h-full">
        <Disclosure as="nav" className="bg-gray-800">
          <div className="override-margin px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-4">
                    <img
                      src="./LeadExtractorPro2.png"
                      style={{ height: "20px", width: "100px" }}
                      alt="Lead Extractor Pro"
                    />
                    {navigation.map((item) => (
                      <div key={item.name}>
                        <div style={{ display: "flex" }}>
                          <a
                            href={item.href}
                            aria-current={item.current ? "page" : undefined}
                            className={classNames(
                              activeTab === item.name
                                ? "bg-gray-900 text-white"
                                : "text-gray-300 hover:bg-gray-700 hover:text-white",
                              "rounded-md px-3 py-2 text-sm font-medium"
                            )}
                            onClick={() => {
                              setActiveTab(item.name);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {item.icon}
                            {item.name}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="ml-4 flex items-center md:ml-6">
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <MenuButton className="relative flex max-w-xs items-center rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                        <button
                          type="button"
                          className="relative rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                        >
                          <span className="absolute -inset-1.5" />

                          <span className="sr-only">View notifications</span>

                          <BellIcon aria-hidden="true" className="size-6" />
                        </button>
                      </MenuButton>
                    </div>

                    <MenuItems
                      transition
                      className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-3 shadow-lg ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                      style={{
                        width: "450px",
                        maxHeight: "600px",
                        overflowY: "auto",
                      }}
                    >
                      <h4 className="text-lg font-medium text-gray-900 text-center px-3 py-2">
                        Notifications
                      </h4>
                      {notification.length > 0 ? (
                        notification.map((item) => (
                          <MenuItem
                            key={item.name}
                            style={{
                              padding: "2vh",
                              display: "flex",
                              justifyContent: "space-between",
                              borderBottom: "1px solid whitesmoke",
                              borderTop: "1px solid whitesmoke",

                              overflow: "hidden", // Optional, hides text that overflows
                            }}
                          >
                            <div>
                              {/* {item.status === "completed" ? (
                                <IoCheckmarkCircle
                                  style={{
                                    color: "green",
                                    margin: "1vh",
                                    height: "1.5rem",
                                    width: "1.5rem",
                                  }}
                                />
                              ) : (
                                <IoCloseCircle
                                  style={{
                                    color: "red",
                                    margin: "1vh",
                                    height: "1.5rem",
                                    width: "1.5rem",
                                  }}
                                />
                              )} */}

                              <p className="text-sm font-medium text-gray-900 text-left ">
                                {item.jobName} is {item.status} : {item.message}{" "}
                              </p>
                            </div>
                          </MenuItem>
                        ))
                      ) : (
                        <p className="text-xs font-small text-gray-900 text-center px-1 py-10">
                          You're all caught up!
                        </p>
                      )}

                      <div
                        style={{
                          textAlign: "right",
                          padding: "1vh",
                          marginRight: "1.5vh",
                        }}
                      >
                        {" "}
                        {notification.length > 0 && (
                          <button
                            type="button"
                            className="rounded bg-green-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 mb-2 "
                            onClick={() => handleClearNotification()}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </MenuItems>
                  </Menu>

                  {/* Profile dropdown */}
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <MenuButton className="relative flex max-w-xs items-center rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                        <span className="absolute -inset-1.5" />
                        <span className="sr-only">Open user menu</span>
                        {user.imageUrl}
                      </MenuButton>
                    </div>
                    <MenuItems
                      transition
                      className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                    >
                      {userNavigation.map((item) => (
                        <MenuItem key={item.name}>
                          <a
                            href={item.href}
                            className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:outline-none"
                            onClick={() => setActiveTab(item.name)}
                          >
                            {item.name}
                          </a>
                        </MenuItem>
                      ))}
                    </MenuItems>
                  </Menu>
                </div>
              </div>
              <div className="-mr-2 flex md:hidden">
                {/* Mobile menu button */}
                <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  <Bars3Icon
                    aria-hidden="true"
                    className="block size-6 group-data-[open]:hidden"
                  />
                  <XMarkIcon
                    aria-hidden="true"
                    className="hidden size-6 group-data-[open]:block"
                  />
                </DisclosureButton>
              </div>
            </div>
          </div>

          <DisclosurePanel className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              {navigation.map((item) => (
                <DisclosureButton
                  key={item.name}
                  as="a"
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  className={classNames(
                    item.current
                      ? "bg-gray-900 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white",
                    "block rounded-md px-3 py-2 text-base font-medium"
                  )}
                >
                  {item.name}
                </DisclosureButton>
              ))}
            </div>
            {/* <div className="border-t border-gray-700 pb-3 pt-4">
              <div className="flex items-center px-5">
                <div className="shrink-0">
                  <img
                    alt=""
                    src={user.imageUrl}
                    className="size-10 rounded-full"
                  />
                </div>
                <div className="ml-3">
                  <div className="text-base/5 font-medium text-white">
                    {user.name}
                  </div>
                  <div className="text-sm font-medium text-gray-400">
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  className="relative ml-auto shrink-0 rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">View notifications</span>
                  <BellIcon aria-hidden="true" className="size-6" />
                </button>
              </div>
              <div className="mt-3 space-y-1 px-2">
                {userNavigation.map((item) => (
                  <DisclosureButton
                    key={item.name}
                    as="a"
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
                  >
                    {item.name}
                  </DisclosureButton>
                ))}
              </div>
            </div> */}
          </DisclosurePanel>
        </Disclosure>

        {/* <header className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Dashboard
            </h1>
          </div>
        </header> */}
        <main>
          <div className="px-4 py-6 sm:px-6 lg:px-8">{renderContent()}</div>
        </main>
      </div>
    </>
  );
}
