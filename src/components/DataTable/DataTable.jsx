import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx"; // Import the XLSX library

export default function DataTable() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("all");
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  useEffect(() => {
    window.electron.ipcRenderer.on("jobs-fetched", (event, fetchedJobs) => {
      setJobs(fetchedJobs);
    });
    window.electron.ipcRenderer.send("fetch-jobs");

    return () => {
      window.electron.ipcRenderer.removeAllListeners("jobs-fetched");
    };
  }, []);

  useEffect(() => {
    if (selectedJob || selectedJob==null) {
      window.electron.ipcRenderer.send("fetch-profiles", selectedJob);
      window.electron.ipcRenderer.on(
        "profile-fetched",
        (event, fetchedProfiles, error) => {
          if (error) {
            // console.error("Error fetching profiles:", error);
            setProfiles([]);
            setCurrentPage(1); // Reset to the first page on error or no data

          } else {
            setProfiles(fetchedProfiles);
            setSelectedRows(new Set());
          }
        }
      );

      return () => {
        window.electron.ipcRenderer.removeAllListeners("profile-fetched");
      };
    } else {
      setProfiles([]);
    }
  }, [selectedJob]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const handleRowSelect = (profileId) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      newSet.has(profileId) ? newSet.delete(profileId) : newSet.add(profileId);
      return newSet;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(filteredAndSortedProfiles.map((p) => p.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) return;

    const idsToDelete = Array.from(selectedRows);
    // console.log(idsToDelete);
    window.electron.ipcRenderer.send("delete-profiles", idsToDelete);

    window.electron.ipcRenderer.on(
      "profiles-deleted",
      (event, success, error) => {
        if (error) {
          console.error("Error deleting profiles:", error);
        } else {
          window.electron.ipcRenderer.send("fetch-profiles", selectedJob);
        }
      }
    );
  };

  console.log(selectedRows, typeof selectedRows);

  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return profiles;
    return profiles.filter(
      (profile) =>
        profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.source?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);

  const filteredAndSortedProfiles = useMemo(() => {
    if (sortConfig.key) {
      return [...filteredProfiles].sort((a, b) => {
        const aValue = a[sortConfig.key]?.toString().toLowerCase() || "";
        const bValue = b[sortConfig.key]?.toString().toLowerCase() || "";
        return sortConfig.direction === "ascending"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
    }
    return filteredProfiles;
  }, [filteredProfiles, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(
    filteredAndSortedProfiles.length / recordsPerPage
  );
  const paginatedProfiles = filteredAndSortedProfiles.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const exportToCSV = () => {
    const selectedData = profiles.filter((profile) =>
      selectedRows.has(profile.id)
    );
    if (selectedData.length === 0) return;

    const csvContent = [
      [
        "Sno.",
        "Name",
        "Source",
        "Created At",
        "Email",
        "Phone Number",
        "Links",
      ],
      ...selectedData.map((profile, index) => [
        index + 1,
        profile.name,
        profile.source,
        profile.created_at,
        profile.email,
        profile.phone,
        profile.links,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exported_profiles.csv";
    a.click();
  };

  const exportToExcel = () => {
    const selectedData = profiles.filter((profile) =>
      selectedRows.has(profile.id)
    );
    if (selectedData.length === 0) return;

    const filteredData = selectedData.map((profile, index) => ({
      SNo: index + 1,
      name: profile.name,
      source: profile.source,
      created_at: profile.created_at,
      email: profile.email,
      phone: profile.phone,
      links: profile.links,
    }));

    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profiles");
    XLSX.writeFile(wb, "exported_profiles.xlsx");
  };

  return (
    <div>
      <h2
        className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
        style={{ textAlign: "left", paddingTop: "1vh" }}
      >
        Leads
      </h2>

      <p
        className="mt-1 text-sm text-gray-500"
        style={{ textAlign: "left", paddingTop: "1vh" }}
      >
       All captured leads from all jobs or specific job
      </p>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-base font-semibold text-gray-900">Select Jobs</h1>
          <div className="flex space-x-4">
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-xs"
            >
              <option key={null} value="all"> All job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} - {job.platform}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search profiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-xs"
            />
            <button
              onClick={handleDeleteSelected}
              disabled={selectedRows.size === 0}
              className={`px-4 py-2 text-sm font-semibold text-white shadow-sm  text-xs rounded-md font-semibold text-white ${
                selectedRows.size === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-500"
              }`}
            >
              Delete Selected
            </button>

            <button
              onClick={exportToCSV}
              disabled={selectedRows.size === 0}
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Export CSV
            </button>
            <button
              onClick={exportToExcel}
              disabled={selectedRows.size === 0}
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Export XLSX
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="custom-table min-w-full border-collapse border border-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-100 text-xs text-gray-600 uppercase tracking-wider">
                <th className="p-3 border">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      paginatedProfiles.length > 0 &&
                      paginatedProfiles.every((p) => selectedRows.has(p.id))
                    }
                  />
                </th>
                <th
                  className="p-3 text-xs border cursor-pointer"
                  onClick={() => requestSort("id")}
                >
                  Sno.
                </th>
                <th
                  className="p-3 text-xs border cursor-pointer"
                  onClick={() => requestSort("name")}
                >
                  Name
                </th>
                <th className="p-3 text-xs border">Source</th>
                <th
                  className="p-3 border cursor-pointer"
                  onClick={() => requestSort("created_at")}
                >
                  Created At
                </th>
                <th className="p-3 border">Email</th>
                <th className="p-3 border">Phone Number</th>
                <th className="p-3 border">Links</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProfiles.map((profile, index) => (
                 <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="p-3 border text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(profile.id)}
                      onChange={() => handleRowSelect(profile.id)}
                    />
                  </td>
                  <td className="p-3 border">
                    {(currentPage - 1) * recordsPerPage + index + 1}
                  </td>
                  <td className="p-3 border">{profile.name}</td>
                  <td className="p-3 border">{profile.source}</td>
                  <td className="p-3 border">
                    {new Date(profile.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 border">{ profile.email ?  profile.email : "N/A" }</td>
                  <td className="p-3 border">{profile.phone ? profile.phone : "N/A"}</td>
                  <td className="p-3 border">{profile.links ? profile.links : "N/A" }</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-center items-center space-x-2 mt-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-xs border rounded-md"
          >
            Previous
          </button>
          <span className="text-xs">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-xs border rounded-md"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
