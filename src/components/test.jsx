import React, { useEffect, useState } from "react";
import "./test.css";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";
import Dialog from "./Dialogue";
import WebViewComponent from "./Weview";

const TestComponent = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    platforms: "",
    frequency: "15",
    state: "stopped",
    query: "",
    timeCreated: "",
  });
  const [message, setMessage] = useState("");
  const [showJobs, setShowJobs] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // const data = React.useMemo(
  //   () => [
  //     { name: "Alice", age: 24, job: "Engineer" },
  //     { name: "Bob", age: 29, job: "Designer" },
  //     { name: "Clara", age: 31, job: "Manager" },
  //   ],
  //   []
  // );

  useEffect(() => {
    if (window.electron) {
      console.log(window.electron);
      window.electron.ipcRenderer.on(
        "form-submission-success",
        (event, message) => {
          setMessage(message);
        }
      );

      window.electron.ipcRenderer.on(
        "form-submission-failure",
        (event, message) => {
          setMessage(message);
        }
      );

      window.electron.ipcRenderer.on("jobs-fetched", (event, jobs) => {
        console.log(message);
        setJobs(jobs);
      });

      window.electron.ipcRenderer.on("remove-job", (event, message) => {
        console.log(message);
        toast(message);
      });

      window.electron.ipcRenderer.on("start-job", (event, message) => {
        console.log(message);
        toast(message);
      });

      window.electron.ipcRenderer.on("stop-job", (event, message) => {
        console.log(message);

        toast(message);
      });

      return () => {
        window.electron.ipcRenderer.removeAllListeners(
          "form-submission-success"
        );
        window.electron.ipcRenderer.removeAllListeners(
          "form-submission-failure"
        );

        window.electron.ipcRenderer.removeAllListeners("jobs-fetched");

        window.electron.ipcRenderer.removeAllListeners("remove-job");

        window.electron.ipcRenderer.removeAllListeners("start-job");

        window.electron.ipcRenderer.removeAllListeners("stop-job");
      };
    }
  }, []);

  const handleButtonClick = () => {
    if (showForm) {
      setShowForm(false);
      return;
    }
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    window.electron.ipcRenderer.send("submit-form", formData);
  };

  const handleShowJobs = () => {
    setShowJobs(!showJobs);
    if (!showJobs) {
      window.electron.ipcRenderer.send("fetch-jobs");
    }
  };

  const handleStartJob = (jobId) => {
    //console.log(`Starting  data: ${JSON.stringify(jobData)}`);
    // Add logic to start the job
    window.electron.ipcRenderer.send("start-job", jobId);
    // const jobData = jobs.find((job) => job.id === jobId);
    //window.electron.ipcRenderer.send("add-job", jobData);
  };

  const handleStopJob = (jobId) => {
    //console.log(`Starting  data: ${JSON.stringify(jobData)}`);
    // Add logic to start the job
    window.electron.ipcRenderer.send("stop-job", jobId);
    // const jobData = jobs.find((job) => job.id === jobId);
    //window.electron.ipcRenderer.send("add-job", jobData);
  };

  const handleEditJob = (job) => {
    setFormData(job);
  };

  const handleDelete = (jobId) => {
    console.log(`Deleting job with ID: ${jobId}`);
    // Add logic to delete the job
    window.electron.ipcRenderer.send("remove-job", jobId);
  };

  const handleTable = (jobId) => {
    setShowTable(!showTable);
    console.log(`Fetching table data for job with ID: ${jobId}`);
    // Add logic to fetch the table data
    window.electron.ipcRenderer.send("fetch-table", jobId);
  };

  return (
    <div>
      <div className="test-component">
        {" "}
        <ToastContainer />
        <button onClick={handleButtonClick}>Add job</button>
        {showForm && (
          <form className="job-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Target platforms</label>
              <input
                type="text"
                name="platforms"
                value={formData.platforms}
                onChange={handleChange}
                placeholder="instagram, reddit, etc."
              />
            </div>
            <div className="form-group">
              <label>Frequency</label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
              >
                <option value="15">every 15 mins</option>
                <option value="30">every 30 mins</option>
                <option value="60">hourly</option>
                <option value="weekly">weekly</option>
              </select>
            </div>
            {/* <div className="form-group">
              <label>State</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
              >
                <option value="started">started</option>
                <option value="paused">paused</option>
                <option value="stopped">stopped</option>
              </select>
            </div> */}
            <div className="form-group">
              <label>Query</label>
              <input
                type="text"
                name="query"
                value={formData.query}
                onChange={handleChange}
                placeholder="hashtag, account id, search input"
              />
            </div>
            {/* <div className="form-group">
              <label>Time created</label>
              <input
                type="datetime-local"
                name="timeCreated"
                value={formData.timeCreated}
                onChange={handleChange}
              />
            </div> */}
            <button type="submit">Submit</button>
          </form>
        )}
        {message && <p>{message}</p>}
      </div>

      <div className="test-component" style={{ marginleft: "0px" }}>
        <button onClick={handleShowJobs}>Show all jobs</button>
        {showJobs && (
          <div>
            {jobs.length > 0 ? (
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Title</th>
                    <th>Platforms</th>
                    <th>Frequency</th>
                    <th>State</th>
                    <th>Query</th>
                    <th>Time Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.id}</td>
                      <td>{job.title}</td>
                      <td>{job.platforms}</td>
                      <td>{job.frequency}</td>
                      <td>{job.state}</td>
                      <td>{job.query}</td>
                      <td>{job.timeCreated}</td>
                      <td>
                        {job.state === "stopped" ? (
                          <button onClick={() => handleStartJob(job.id)}>
                            Start Job
                          </button>
                        ) : (
                          <button onClick={() => handleStopJob(job.id)}>
                            {" "}
                            Stopped Job{" "}
                          </button>
                        )}
                        <button onClick={() => handleEditJob(job)}>
                          Edit Job
                        </button>
                        <button onClick={() => handleDelete(job.id)}>
                          Delete Job
                        </button>
                        <button onClick={() => setIsOpen(true)}>
                          Show table
                        </button>

                        {/* <Dialog
                          isOpen={isOpen}
                          jobId={job.id}
                          onClose={() => setIsOpen(false)}
                        /> */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No jobs found</p>
            )}
          </div>
        )}
      </div>

      <div>
        <WebViewComponent url={"https://www.instagram.com"} />
      </div>
    </div>
  );
};

export default TestComponent;
