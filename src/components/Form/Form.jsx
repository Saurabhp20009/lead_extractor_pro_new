import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const Form = ({ closeModelAddJobs, setRefreshPage }) => {
  const [formData, setFormData] = useState({
    title: "",
    platforms: "instagram",
    frequency: "30",
    query: "",
    state: JSON.stringify({status: "stopped",message: "" }),
    specific_username: false,
    enforce_update_fetched_data: false,
    user_data_id: null,
    proxy: "",
  });

  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    console.log(FormData);

    console.log(name, value);

    if (name === "platforms") {
      fetchPlatformCookiesData(value);
    }
  };

  const fetchPlatformCookiesData = (platform) => {
    window.electron.ipcRenderer.send("get-platform-cookies-data", platform);

    window.electron.ipcRenderer.on("user-cookies-data", (event, response) => {
      if (response.success) {
        console.log("response", response);
        const filteredAccounts = response.data.filter(
          (account) => account.Cookies_path
        );
        setAccounts(filteredAccounts);
      } else {
        console.error("Error fetching platform cookies data:", response.error);
      }
    });
  };

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on(
      "form-submission",
      (event, response) => {
        if (response.success) {
          toast.success("Job submitted successfully!");
        } else {
          toast.error(`Failed to submit job: ${response.message}`);
        }
      }
    );

    fetchPlatformCookiesData(formData.platforms);

    //window.addEventListener("submit-form");

    return () => {
      // window.electron.ipcRenderer.removeAllListeners("submit-form");
      unsubscribe(); // Properly cle
    };
  }, []);

  console.log(accounts);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);

    
    window.electron.ipcRenderer.send("submit-form", formData);

    window.electron.ipcRenderer.on("form-submission", (event, response) => {
      if (response.success) {
        console.log("running", response);
        toast.success("Job submitted successfully!");
        // setTimeout(closeModelAddJobs(),200)
      } else {
        toast.error(`Failed to submit job: ${response.message}`);
      }
    });

    setFormData({
      title: "",
      platforms: "Instagram",
      frequency: "",
      query: "",
      specific_username: false,
      enforce_update_fetched_data: false,
      user_data_id: null,
    });

    return () => {
      window.electron.ipcRenderer.removeAllListeners("submit-form");
      window.electron.ipcRenderer.removeAllListeners("form-submission");
      // window.location.reload();
    };
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="relative z-50"
    >
      <ToastContainer position="top-right" autoClose={3000} />
      <DialogPanel className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full">
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Add Job</h3>
              <button
                onClick={() => {
                  closeModelAddJobs();
                  setRefreshPage(false);
                  window.location.reload();
                }}
                className="rounded-md p-1.5 text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-7 px-2 ">
              {/* Input fields and labels */}
              <label htmlFor="title" className="block">
                <span className="text-sm font-medium text-gray-700">
                  Title:
                </span>
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </label>

              <label htmlFor="platform" className="block">
                <span className="text-sm font-medium text-gray-700">
                  Platform:
                </span>
                <select
                  name="platforms"
                  id="platform"
                  value={formData.platforms}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">Linkedin</option>
                  <option value="google_maps">Google Maps</option>
                  <option value="tiktok">Tiktok</option>
                  <option value="reddit">Reddit</option>
                  {/* Other options */}
                </select>
              </label>

              <label htmlFor="frequency" className="block">
                <span className="text-sm font-medium text-gray-700">
                  Frequency:
                </span>
                <select
                  name="frequency"
                  id="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="30">30min</option>
                  <option value="45">45min</option>
                  <option value="60">Hourly</option>
                  <option value="weekly">Weekly</option>
                  {/* Other options */}
                </select>
              </label>

              <label htmlFor="title" className="block">
                <span className="text-sm font-medium text-gray-700">
                  Proxy Server
                </span>
                <input
                  type="text"
                  name="proxy"
                  id="title"
                  value={formData.proxy}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </label>

              <label htmlFor="account" className="block">
                <span className="text-sm font-medium text-gray-700">
                  Account Selection:
                </span>
                <select
                  name="user_data_id"
                  id="account"
                  value={formData.account}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.email}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="specificQuery"
                  name="specificQuery"
                  checked={formData.specific_username}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specific_username: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label
                  htmlFor="specificQuery"
                  className="text-sm font-medium text-gray-700"
                >
                  Specific Username:
                </label>
              </div>

              <div className="flex items-center space-x-3">
                {/* <label
                  htmlFor="specificQuery"
                  className="text-sm font-medium text-gray-700"
                >
                  Query
                </label> */}

                <textarea
                  id="query"
                  name="query"
                  value={formData.query}
                  onChange={handleChange}
                  rows="4"
                  className="block w-full px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-50 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
};

export default Form;
