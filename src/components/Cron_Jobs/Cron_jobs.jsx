import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import EditForm from "../EditForm/EditForm";
import Form from "../Form/Form";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { EllipsisHorizontalIcon } from "@heroicons/react/20/solid";
import DialogueModel from "../DialogueModel/DialogueModel";

const statuses = {
  started: "text-green-700 bg-green-50 ring-green-600/20",
  Withdraw: "text-gray-600 bg-gray-50 ring-gray-500/10",
  stopped: "text-red-700 bg-red-50 ring-red-600/10",
};

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function CronJobs() {
  const [cronJobs, setCronJobs] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isAddJobsModalOpen, setIsAddJobsModalOpen] = useState(false);
  const [refreshPage, setRefreshPage] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showButton, setShowButton] = useState(true);

  // Memoized functions to prevent unnecessary re-creations
  const handleStartJob = useCallback((jobId) => {
    window.electron.ipcRenderer.send("start-job", jobId);
    window.electron.ipcRenderer.send("fetch-jobs");
  }, []);

  const handleStopJob = useCallback((jobId) => {
    window.electron.ipcRenderer.send("stop-job", jobId);
    window.electron.ipcRenderer.send("fetch-jobs");
  }, []);

  const handleRemoveJob = useCallback((jobId) => {
    window.electron.ipcRenderer.send("remove-job", jobId);
    window.electron.ipcRenderer.send("fetch-jobs");
  }, []);

  const handleEditClick = useCallback((job) => {
    setSelectedJob(job);
    setIsEditModalOpen(true);
  }, []);

  const handleEditSubmit = useCallback(async (updatedData) => {
    try {
      await window.electron.ipcRenderer.send("update-job", updatedData);
      setIsEditModalOpen(false);
      // Refresh jobs list
      window.electron.ipcRenderer.send("fetch-jobs");
    } catch (error) {
      // console.error("Failed to update job:", error);
    }
  }, []);

  useEffect(() => {
    // Setup to receive job error messages from the Electron main process
    const handleJobError = (event, errorInfo) => {
      // Display error using react-toastify
      toast.error(`Job Error: ${errorInfo.error}`);
    };

    window.electron.ipcRenderer.on("display-job-error", handleJobError);

    // Cleanup listener when component unmounts
    return () => {
      window.electron.ipcRenderer.removeListener(
        "display-job-error",
        handleJobError
      );
    };
  }, []);

  useEffect(() => {
    const fetchJobs = () => {
      window.electron.ipcRenderer.send("fetch-jobs");
    };

    // Set up listeners
    const handleJobsFetched = (event, data) => {
      // console.log(data, "**data");
      setCronJobs((prevJobs) => {
        if (JSON.stringify(prevJobs) !== JSON.stringify(data)) {
          // Sort data based on 'last_time_run'
          const sortedData = data.sort((a, b) => {
            const dateA = a.last_time_run
              ? new Date(a.last_time_run)
              : new Date(0);
            const dateB = b.last_time_run
              ? new Date(b.last_time_run)
              : new Date(0);
            return dateB - dateA; // For descending order
          });

          // Clean and parse the 'state' field for each job
          const cleanedData = sortedData.map((job) => {
            try {
              // Clean the 'state' field and parse it
              const cleanState = job.state
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, "\\");
              job.state = JSON.parse(cleanState);
            } catch (error) {
              // console.error("Error parsing job.state:", error);
              // Fallback to a default state if parsing fails
              job.state = { status: "unknown", message: "" };
            }
            return job;
          });

          return cleanedData;
        }
        return prevJobs;
      });
    };

    const handleStartJobResponse = (event, response) => {
      response.success
        ? toast.success(response.message)
        : toast.error(response.message);
    };

    const handleStopJobResponse = (event, response) => {
      response.success
        ? toast.success(response.message)
        : toast.error(response.message);
    };

    const handleRemoveJobResponse = (event, response) => {
      response.success
        ? toast.success(response.message)
        : toast.error(response.message);
    };

    const cleanupJobsFetched = window.electron.ipcRenderer.on(
      "jobs-fetched",
      handleJobsFetched
    );
    const cleanupStartJob = window.electron.ipcRenderer.on(
      "start-job",
      handleStartJobResponse
    );
    const cleanupStopJob = window.electron.ipcRenderer.on(
      "stop-job",
      handleStopJobResponse
    );
    const cleanupRemoveJob = window.electron.ipcRenderer.on(
      "remove-job",
      handleRemoveJobResponse
    );

    // Fetch jobs initially
    fetchJobs();

    return () => {
      cleanupJobsFetched();
      cleanupStartJob();
      cleanupStopJob();
      cleanupRemoveJob();
    };
  }, []);

  useEffect(() => {
    // Define the response handler inside useEffect to capture the latest state correctly
    const handleResponse = (event, response) => {
      if (response.success) {
        // console.log("Product key valid");
        setShowButton(true);
      } else {
        // console.log(`Error: ${response.message}`);
        setShowButton(false); // Hide button if no key found
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

    // Cleanup function to remove the listener when the component unmounts or dependencies change
    return () => {
      window.electron.ipcRenderer.removeListener(
        "response-check-productKey-exist",
        handleResponse
      );
    };
  }, []);

  useEffect(() => {
    const handleJobAdded = (event, data) => {
      console.log("****data****", data);
      if (data.success) {
        // setJobMessage(`Job added successfully: ID ${data.jobId}`);
      } else {
        // setJobMessage(`Failed to add job: ${data.message}`);
      }
    };

    window.electron.ipcRenderer.on("job-added", handleJobAdded);

    console.log("first")

    // Cleanup function to remove the listener when the component unmounts
    // return () => {
    //   window.electron.ipcRenderer.removeListener("job-added", handleJobAdded);
    // };
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h2
        className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
        style={{ textAlign: "left", paddingTop: "1vh" }}
      >
        Dashboard
      </h2>

      <p
        className="mt-1 text-sm text-gray-500"
        style={{ textAlign: "left", paddingTop: "1vh" }}
      >
        Add, Track & Execute Jobs Seamlessly
      </p>

      <div style={{ display: "flex", justifyContent: "end", padding: "2vh" }}>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => {
            setIsAddJobsModalOpen(true);
          }}
        >
          Add Jobs
        </button>
      </div>

      <ToastContainer />

      {/* Responsive Table Wrapper */}

      {/* Edit Form Modal */}
      {isEditModalOpen && (
        <EditForm
          job={selectedJob}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSubmit}
          onFetchJobs={() => window.electron.ipcRenderer.send("fetch-jobs")}
        />
      )}

      {isAddJobsModalOpen && (
        <Form
          closeModelAddJobs={() => {
            setIsAddJobsModalOpen(false);
          }}
          setRefreshPage={setRefreshPage}
        />
      )}

      {/* cron jobs */}

      <ul
        role="list"
        className="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 xl:gap-x-8"
      >
        {cronJobs.map((job, index) => (
          <li
            key={job.id}
            className="overflow-hidden rounded-xl border border-gray-200"
          >
            <div className="flex items-center gap-x-4 border-b border-gray-900/5 bg-gray-50 p-6">
              {/* <img
                alt={job.name}
                src={job.imageUrl}
                className="size-12 flex-none rounded-lg bg-white object-cover ring-1 ring-gray-900/10"
              /> */}
              <div className="text-sm/6 font-medium text-gray-900">
                {job.title}
              </div>

              <Menu as="div" className="relative ml-auto">
                <MenuButton className="-m-2.5 block p-2.5 text-gray-400 hover:text-gray-500">
                  <span className="sr-only">Open options</span>
                  <EllipsisHorizontalIcon
                    aria-hidden="true"
                    className="size-5"
                  />
                </MenuButton>
                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-0.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                >
                  <MenuItem>
                    <a
                      href="#"
                      className="block px-3 py-1 text-sm/6 text-gray-900 data-[focus]:bg-gray-50 data-[focus]:outline-none"
                      onClick={() => handleEditClick(job)}
                    >
                      Edit<span className="sr-only">, {job.name}</span>
                    </a>
                  </MenuItem>

                  <MenuItem>
                    <a
                      href="#"
                      className="block px-3 py-1 text-sm/6 text-gray-900 data-[focus]:bg-gray-50 data-[focus]:outline-none"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      Delete
                    </a>
                  </MenuItem>
                </MenuItems>
              </Menu>

              <div className="text-sm/6 font-medium text-gray-900">
                {job.state.status == "stopped" ? (
                  <button
                    className="px-2 py-1 text-xs font-semibold bg-indigo-700 text-white rounded hover:bg-indigo-700"
                    onClick={() => handleStartJob(job.id)}
                  >
                    Start
                  </button>
                ) : (
                  <button
                    className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => handleStopJob(job.id)}
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>

            <dl className="-my-3 divide-y divide-gray-100 px-6 py-4 text-sm/6">
              <div className="flex justify-between gap-x-4 py-3">
                <dt className="text-gray-500">Platform</dt>
                <dd className="flex items-start gap-x-2">
                  <div className="font-medium text-gray-900">
                    {job.platforms}
                  </div>
                </dd>
              </div>

              <div className="flex justify-between gap-x-4 py-3">
                <dt className="text-gray-500">Last time run</dt>
                <dd className="text-gray-700">
                  <time>{job.last_time_run ? job.last_time_run : "N/A"}</time>
                </dd>
              </div>
              <div className="flex justify-between gap-x-4 py-3">
                <dt className="text-gray-500">Query</dt>
                <dd className="flex items-start gap-x-2">
                  <div className="font-medium text-gray-900">{job.query}</div>
                  <div
                    className={classNames(
                      statuses[job.state],
                      "rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
                    )}
                  >
                    {job.state.status}
                  </div>
                </dd>
              </div>

              <div className="flex justify-between gap-x-4 py-3">
                <dt className="text-gray-500">Frequency</dt>
                <dd className="text-gray-700">
                  <time>{job.frequency}</time>
                </dd>
              </div>

              <div className="flex justify-between gap-x-4 py-3">
                <dt className="text-gray-500">Total Run</dt>
                <dd className="text-gray-700">
                  <time>{job.run_count}</time>
                </dd>
              </div>
            </dl>

            {isDeleteModalOpen && (
              <DialogueModel
                setIsDeleteModalOpen={setIsDeleteModalOpen}
                handleRemoveJob={() => handleRemoveJob(job.id)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default React.memo(CronJobs);
