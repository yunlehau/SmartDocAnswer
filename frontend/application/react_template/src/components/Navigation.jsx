import { useState } from 'react';

const Navigation = ({ activeTab, setActiveTab, darkMode }) => {
  return (
    <div className={`py-3 px-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex space-x-4">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'chat'
              ? darkMode
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white'
              : darkMode
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            <span>Chat</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'files'
              ? darkMode
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white'
              : darkMode
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
              <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
            </svg>
            <span>Files</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Navigation;