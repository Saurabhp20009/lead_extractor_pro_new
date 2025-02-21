// import { XCircleIcon, CheckCircleIcon } from '@heroicons/react/solid';
// import { XIcon } from '@heroicons/react/outline'; // This is assuming XIcon 
import { XCircleIcon,CheckCircleIcon  } from '@heroicons/react/20/solid'
import { XIcon } from 'lucide-react';

function Alert({ type, message, details, onClose }) {

    console.log("close")

  return (
    <div className={`rounded-md p-4 ${type === 'error' ? 'bg-red-50' : 'bg-green-50'}`}>
      <div className="flex justify-between ">
        <div className="flex">
          <div className="shrink-0">
            {type === 'error' ? (
              <XCircleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
            ) : (
              <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
            )}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${type === 'error' ? 'text-red-800' : 'text-green-800'}`}>{message}</h3>
            {details && <div className={`mt-2 text-sm ${type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
              <ul role="list" className="list-disc pl-5 space-y-1">
                {/* {details.map((detail, index) => <li key={index}>{detail}</li>)} */}
              </ul>
            </div>}
          </div>
        </div>
        <div className="ml-4">
          <button
            onClick={onClose}
            className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <span className="sr-only">Close</span>
            <XIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Alert;
