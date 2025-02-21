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
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

export default function AddKey({ closeModal }) {
  const [formDetails, setFormDetails] = useState({
    Key: "",
  });

  const [open, setOpen] = useState(true);
  const [buttonText, setButtonText] = useState("Save");

  const [showPassword, setShowPassword] = useState(false);

  // const [alert, setAlert] = useState({
  //   show: false,
  //   type: "",
  //   message: "",
  //   details: [],
  // });

  // const handleAlertClose = () => {
  //   setAlert({ ...alert, show: false });
  // };

  const handlePasswordChange = (e) => {
    setFormDetails({
      Key: e.target.value,
    });
    // console.log("FORMDATE", formDetails);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await axios
      .post("https://videoo.org/validate-list-key", formDetails)
      .then((response) => {
        // console.log("Success:", response);

        if (window.electron && window.electron.ipcRenderer) {
          const form = {
            ProductKey: formDetails.key,
          };

          // Send data to main process
          window.electron.ipcRenderer.send("add-productKey", form);

          // Set up a one-time listener for the response
          window.electron.ipcRenderer.receiveOnce(
            "response-add-productKey",
            (response) => {
              if (response.success) {
                // console.log("alert", alert);
                // setTimeout(closeModal, 2000); // Close modal after showing success message

                // console.log("Account created successfully");
                setButtonText(response.message);
                setFormDetails({ Key: "" });
              } else {
                // console.error("Failed to create account:", response.message);
                setButtonText(response.message);
              }
            }
          );
        } else {
          // console.error("Electron IPC Renderer is not available");
          setButtonText("Electron IPC Renderer is not available");
        }
      })
      .catch((error) => {
        toast.error("Unable to validate key");
      });

    // try {
    //   if (window.electron && window.electron.ipcRenderer) {
    //     // Send data to main process
    //     window.electron.ipcRenderer.send("add-productKey", formDetails);

    //     // Set up a one-time listener for the response
    //     window.electron.ipcRenderer.receiveOnce(
    //       "response-add-productKey",
    //       (response) => {
    //         if (response.success) {

    //           // console.log("alert", alert);
    //           // setTimeout(closeModal, 2000); // Close modal after showing success message

    //           console.log("Account created successfully");
    //           setButtonText(response.message);
    //           setFormDetails({productKey: ""})

    //         } else {
    //           console.error("Failed to create account:", response.message);
    //           setButtonText(response.message);
    //         }
    //       }
    //     );
    //   } else {
    //     console.error("Electron IPC Renderer is not available");
    //     setButtonText('Electron IPC Renderer is not available');
    //   }
    // } catch (error) {
    //   console.error("Error saving user data:", error);
    //   setButtonText(error);
    // }
  };

  return (
    <div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="relative z-50"
      >
        <DialogPanel className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <ToastContainer />
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
                Add Product Key
              </h2>

              <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="password"
                      style={{ textAlign: "left" }}
                      className="block text-sm font-medium text-gray-900"
                    >
                      Product Key
                    </label>
                    <div className="relative mt-2">
                      <input
                        id="password"
                        name="key"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formDetails.Key}
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
