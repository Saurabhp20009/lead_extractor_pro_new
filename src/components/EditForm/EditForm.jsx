import React, { useState, useEffect } from "react";
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

const EditForm = ({ job, onClose, onFetchJobs }) => {
  const [formData, setFormData] = useState({
    id: job.id,
    title: job.title,
    platforms: job.platforms,
    frequency: job.frequency,
    query: job.query,
    specific_username: job.specific_username,
    enforce_update_fetched_data: job.enforce_update_fetched_data || false,
    user_data_id: job.user_data_id,
    proxy: job.proxy,
  });

  console.log(job);

  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(true);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    console.log(name, value, type, checked);
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    if (name === "platforms") {
      console.log();
      fetchPlatformCookiesData(value);
    }
  };

  useEffect(() => {
    const handleFormSubmission = (event, message) => {
      console.log("form-submission", message);
    };

    // Add the listener
    window.electron.ipcRenderer.on("form-submission", handleFormSubmission);

    // Cleanup listener on unmount
    return () => {
      window.electron.ipcRenderer.removeListener(
        "form-submission",
        handleFormSubmission
      );
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("submit-form", formData);
      
      
      
      await window.electron.ipcRenderer.send("submit-form", formData);
      
      window.electron.ipcRenderer.send("fetch-jobs");

      onClose();
    } catch (error) {
      console.error("Failed to submit form:", error);
    }
  };

  console.log("editform", formData.user_data_id);

  useEffect(() => {
    fetchPlatformCookiesData(formData.platforms);
  }, []);

  console.log("acc", accounts);

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

  console.log("editform");

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="relative z-50"
    >
      <DialogPanel className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full relative">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="flex justify-between items-center pb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Job</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Existing form fields */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              {/* ...existing form fields... */}

              <div>
                <label
                  htmlFor="platform"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Platform:
                </label>
                <select
                  id="platforms"
                  name="platforms"
                  value={formData.platforms}
                  // onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">Linkedin</option>
                  <option value="google_maps">Google Maps</option>
                  <option value="tiktok">Tiktok</option>
                  <option value="reddit">Reddit</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="frequency"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Frequency:
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="30">30min</option>
                  <option value="45">45min</option>
                  <option value="60">Hourly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <label htmlFor="title" className="block">
                <span className="text-sm font-medium text-gray-700">
                  Proxy Server
                </span>
                <input
                  type="text"
                  name="proxy"
                  id="proxy"
                  value={formData.proxy}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </label>

              <div>
                <label
                  htmlFor="frequency"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Account Selection
                </label>
                <select
                  id="user_data_id"
                  name="user_data_id"
                  value={formData.user_data_id}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value={null}>Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* New checkbox for enforce_update_fetched_data */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enforce_update_fetched_data"
                  name="enforce_update_fetched_data"
                  checked={formData.enforce_update_fetched_data}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label
                  htmlFor="enforce_update_fetched_data"
                  className="text-sm font-medium text-gray-700"
                >
                  Enforce Update Fetched Data
                </label>
              </div>

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

              <div>
                <textarea
                  id="query"
                  name="query"
                  value={formData.query}
                  onChange={handleChange}
                  rows="4"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
};

export default EditForm;
