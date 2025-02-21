import { useState } from "react";
// const { ipcRenderer } = window.require('electron');
import { Eye, EyeOff } from "lucide-react";
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
import Alert from "../Alert/Alert";

export default function SignUp({ closeModal }) {
  const [formDetails, setFormDetails] = useState({
    email: "",
    password: "",
    platform: "instagram",
  });

  const [open, setOpen] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [buttonText, setButtonText] = useState("Save");

  const handleEmailChange = (e) => {
    setFormDetails({
      ...formDetails,
      email: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setFormDetails({
      ...formDetails,
      password: e.target.value,
    });
  };

  const handlePlatformChange = (e) => {
    setFormDetails({ ...formDetails, platform: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // console.log(formDetails)

    try {
      if (window.electron && window.electron.ipcRenderer) {
        // Send data to main process
        window.electron.ipcRenderer.send("add-user-data", formDetails);

        // Set up a one-time listener for the response
        window.electron.ipcRenderer.receiveOnce(
          "user-data-added",
          async (response) => {
            if (response.success) {
              console.log("Account created successfully");

              setButtonText("Account saved successfully");

              setFormDetails({ email: "", password: "", platform: "" });

              //
              //  closeModal();
            } else {
              console.error("Failed to create account:", response.message);
              setButtonText(`${response.message}  !!!`);
              // Optionally, handle UI feedback here to show error to the user
            }
          }
        );
      } else {
        console.error("Electron IPC Renderer is not available");
      }
    } catch (error) {
      console.error("Error saving user data:", error);
    }
  };

  return (
    <div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="relative z-50"
      >
        <DialogPanel className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="fixed inset-0  bg-opacity-75 flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
            <div className="relative bg-white p-6 rounded-lg shadow-xl sm:mx-auto sm:w-full sm:max-w-sm">
              <button
                onClick={closeModal}
                className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>

              <h2
                className="text-base/7 font-bold text-gray-900  "
                style={{ textAlign: "left" }}
              >
                Add Account
              </h2>

              <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm/6 font-medium text-gray-900"
                      style={{ textAlign: "left" }}
                    >
                      Email address/ username
                    </label>
                    <div className="mt-2">
                      <input
                        id="email"
                        name="email"
                        style={{ marginTop: "1vh" }}
                        type="text"
                        onChange={handleEmailChange}
                        required
                        value={formDetails.email}
                        autoComplete="email"
                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      style={{ textAlign: "left" }}
                      className="block text-sm font-medium text-gray-900"
                    >
                      Password
                    </label>
                    <div
                      className="relative mt-2"
                      style={{ display: "flex", align: "center" }}
                    >
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        style={{ marginTop: "1vh" }}
                        value={formDetails.password}
                        onChange={handlePasswordChange}
                        autoComplete="current-password"
                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex !flex-col  ">
                      <div style={{ textAlign: "left" }}>
                        <label
                          htmlFor="password"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Platform
                        </label>
                      </div>

                      <select
                        id="platforms"
                        name="platforms"
                        value={formDetails.platform}
                        onChange={handlePlatformChange}
                        style={{ marginTop: "1vh" }}
                        className="block w-full px-3 py-2 mb-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="twitter">Twitter</option>
                        <option value="linkedin">Linkedin</option>
                        {/* <option value="google_maps">Google Maps</option> */}
                        <option value="tiktok">Tiktok</option>
                        <option value="reddit">Reddit</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      {buttonText}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </div>
  );
}
