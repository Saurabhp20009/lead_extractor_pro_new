import React, { useEffect, useState } from "react";
import DataTable from "./DataTable";
//const { ipcRenderer } = window.require('electron');

const Dialog = ({ isOpen, onClose,  jobId }) => {
  const [dataTable, setDataTable] = useState([]);



  useEffect(() => {
    const handleProfilesFetched = (event, profiles, error) => {
      if (error) {
        console.error("Error fetching profiles:", error);
        setDataTable([]); // Clear any existing data on error
      } else {
        setDataTable(profiles);
      }
    };

    if (isOpen) {
      window.electron.ipcRenderer.send("fetch-profiles", jobId);
      window.electron.ipcRenderer.on("profile-fetched", handleProfilesFetched);

      return () => {
        window.electron.ipcRenderer.removeAllListeners("profile-fetched", handleProfilesFetched);
      };
    }
  }, [isOpen, jobId]);

  if (!isOpen) return null;

  console.log("dialog",dataTable);

  return (
    <div className="dialog" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <span className="close-button" onClick={onClose}>
          &times;
        </span>
        <h2>Data Table</h2>
        <DataTable data={dataTable} />
      </div>
    </div>
  );
};

export default Dialog;
