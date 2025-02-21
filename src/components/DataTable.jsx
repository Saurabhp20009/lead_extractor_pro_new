import React, { useState, useMemo } from "react";
import { useTable } from "react-table";
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';



const DataTable = ({ data }) => {
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  const toggleRowSelected = (rowId) => {
    const newSelectedRowIds = new Set(selectedRowIds);
    if (newSelectedRowIds.has(rowId)) {
      newSelectedRowIds.delete(rowId);
    } else {
      newSelectedRowIds.add(rowId);
    }
    setSelectedRowIds(newSelectedRowIds);
  };

  const columns = useMemo(
    () => [
      {
        Header: "Select",
        accessor: "select",
        Cell: ({ row }) => {
   
          let { key, ...cellProps } = row.getToggleRowSelectedProps()

          return (<input
            type="checkbox"
            checked={selectedRowIds.has(row.original.id)}
            onChange={() => toggleRowSelected(row.original.id)}
          />)
        },
      },
      { Header: "Id", accessor: "id" },
      { Header: "Name", accessor: "name" },
      { Header: "Source", accessor: "source" },
      { Header: "Email", accessor: "email" },
      { Header: "Phone", accessor: "phone" },
      { Header: "Links", accessor: "links" },
    ],
    [selectedRowIds]
  ); // Add selectedRowIds as a dependency to recalculate when selections change

  const prepareDataForExport = (data) => {
    return data.map(({ job_id, query_id,created_at, ...rest }) => rest);
};

const exportToCSV = () => {
    const exportData = prepareDataForExport(data.filter(item => selectedRowIds.has(item.id)));
    console.log("exportedData", exportData)
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'exported-data.csv');
};

const exportToExcel = () => {
    const exportData = prepareDataForExport(data.filter(item => selectedRowIds.has(item.id)));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, 'exported-data.xlsx');
};

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({ columns, data });

  return (
    <div className="scrollable-table">
      {" "}
     
      <button onClick={exportToCSV}>Export Selected to CSV</button>
      <button onClick={exportToExcel}>Export Selected to Excel</button>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>{column.render("Header")}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) =>   
                  {
                    const { key, ...cellProps } = cell.getCellProps();
                    return (<td key={key} {...cell.getCellProps()}>{cell.render("Cell")}</td>)}
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
