
function PlatformModel(props) {
  
  console.log(props.accountsData);
  const accountsData = props.accountsData;




  const handleLoginUser = (id) => {
    window.electron.ipcRenderer.send("login-user", id);
    const loginUserResponseHandler = (event, response) => {
      if (response.success) {
        props.refreshAccounts();
      } else {
        alert(`Error: ${response.message}`);
      }
      window.electron.ipcRenderer.removeListener("login-user-response", loginUserResponseHandler);
    };
    window.electron.ipcRenderer.on("login-user-response", loginUserResponseHandler);

    
  };


  // const handleRemoveUser = (id) => {
  //   window.electron.ipcRenderer.send("remove-user-account", id);
  //   window.electron.ipcRenderer.on("user-account-removed", (event, response) => {
  //     if (response.success) {
  //       // alert(response.message);
  //       props.refreshAccounts();
  //     } else {
  //       alert(`Error: ${response.message}`);
  //     }
  //   });
  // };



  const handleRemoveUser = (id) => {
    window.electron.ipcRenderer.send("remove-user-account", id);
    const removeUserResponseHandler = (event, response) => {
      if (response.success) {
        props.refreshAccounts();
      } else {
        alert(`Error: ${response.message}`);
      }
      window.electron.ipcRenderer.removeListener("user-account-removed", removeUserResponseHandler);
    };
    window.electron.ipcRenderer.on("user-account-removed", removeUserResponseHandler);
  };
 

  

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-50" onClick={props.closeDropdownModel}></div>
      
      <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h1 className="text-lg font-semibold text-gray-900">{props.platform} accounts  </h1>
          <button onClick={props.closeDropDownModel} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full table-fixed border border-gray-300">
            <thead className="bg-gray-100 text-gray-900 text-sm">
              <tr>
                <th className="px-4 py-3 text-center font-semibold w-1/6 border">S.no</th>
                <th className="px-4 py-3 text-center font-semibold w-3/6 border">Email</th>
                <th className="px-4 py-3 text-center font-semibold w-2/6 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accountsData.map((data, index) => (
                <tr key={data.email} className="border-t text-sm">
                  <td className="px-4 py-2 text-center">{index + 1}</td>
                  <td className="px-4 py-2 text-center">{data.email}</td>
                  <td className="px-4 py-2 flex justify-center gap-1">
                    {!data.Cookies_path && 
                    
                    // (
                    //   <button type="button" className="bg-red-600 px-2 py-1 text-xs text-white rounded hover:bg-red-500">
                    //     Del cookies
                    //   </button>
                    // ) : 
                    
                      <button type="button" className="bg-indigo-600 px-2 py-1 text-xs text-white rounded hover:bg-indigo-500" onClick={() => handleLoginUser(data.id)}>
                        Add cookies
                      </button>
                    }
                    <button type="button" className="bg-blue-600 px-2 py-1 text-xs text-white rounded hover:bg-blue-500" onClick={() => handleRemoveUser(data.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {accountsData.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center py-3 text-sm text-gray-500">
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PlatformModel;
