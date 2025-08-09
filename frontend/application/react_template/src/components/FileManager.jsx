import { useState, useEffect, useRef } from 'react';
import { TEMP_API } from './config';

const FileManager = ({ darkMode }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isOpenReady, setIsOpenReady] = useState(false);
  const [selectedNewFile, setSelectedNewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  // Accepted file types
  const acceptedFileTypes = [
    'application/pdf',                                                   // PDF
    'application/msword',                                                // DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'text/plain'                                                         // TXT
  ];
  
  const fileTypeExtensions = '.pdf,.doc,.docx,.txt';

  // Mock function to load files (in a real app, this would call your API)
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };


  const handleGetAllFiles = async () => {
    const response = await fetch(`${TEMP_API}/files`, {
          method: 'GET',
        });

     const result = await response.json();
    setFiles(result);
  }

  const formatDate = (dateString) => {
    if(!dateString) return "None";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf' || fileType ===  'pdf') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 384 512">
          <path fill="currentColor" d="M181.9 256.1c-5.1-9.9-9.1-19.2-11.3-29.2H52.1c1.5 5.9 3.5 11.6 5.9 17.1L82.8 288H177l-54-31.9zm310.4 86.2L405.3 335.8c-1.1-1.5-2.2-3-3.1-4.6C363.3 312.3 321.9 305 279 305h-39.1l37.9 42H342c32.4 0 63.9 4.9 94.3 12.3zM0 387.5V124.4c0-12.4 2.7-24.3 7.6-35h276.6c-7 12.9-10.9 26.8-10.9 42.1 0 12.8 2.7 24.9 7.5 36H124.3c-37.8 0-64 56.8-32 89.2l73.8 73.9H0zm336 119.9H16c-8.8 0-16-7.2-16-16v-50.9l82.1-82h334c8.8 0 16 7.2 16 16v50.9l-82.1 82z"/>
        </svg>
      );
    } else if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 384 512">
          <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm57.1 120H305c7.7 0 13.4 7.1 11.7 14.7l-38 168c-1.2 5.5-6.1 9.3-11.7 9.3h-38c-5.5 0-10.3-3.8-11.6-9.1-25.8-103.5-20.8-81.2-25.6-110.5h-.5c-1.1 14.3-2.4 17.4-25.6 110.5-1.3 5.3-6.1 9.1-11.6 9.1H117c-5.6 0-10.5-3.9-11.7-9.4l-37.8-168c-1.7-7.5 4-14.6 11.7-14.6h24.5c5.7 0 10.7 4 11.8 9.7 15.6 78 20.1 109.5 21 122.2 1.6-10.2 7.3-32.7 29.4-122.7 1.3-5.4 6.1-9.1 11.7-9.1h29.1c5.6 0 10.4 3.8 11.7 9.2 24 100.4 28.8 124 29.6 129.4-.2-11.2-2.6-17.8 21.6-129.2 1-5.6 5.9-9.5 11.5-9.5zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
        </svg>
      );
    } else if (fileType === 'text/plain' || fileType ===  'txt') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 384 512">
          <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm64 236c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8zm0-64c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8zm0-72v8c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12zm96-114.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" viewBox="0 0 384 512">
        <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm160-14.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
      </svg>
    );
  };

  const isValidFileType = (file) => {
    return acceptedFileTypes.includes(file.type);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    
    if (!isValidFileType(file)) {
      setError(`Invalid file type. Please upload only PDF, DOC/DOCX, or TXT files.`);
      return;
    }

    setSelectedNewFile(file);
  };

  const handleUpload = async () => {
    if (!selectedNewFile) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // In a real app, replace this with your actual API endpoint
     
      const formData = new FormData();
      formData.append('file', selectedNewFile);
      formData.append('title', name);
      const response = await fetch(`${TEMP_API}/files/upload`, {
        method: 'POST',
        headers: {
         
        },
        // body: formData
        body: formData
      });

      const data = await response.json();
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setUploadProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          setSelectedFile(null);
          setIsUploading(false);
          setSelectedNewFile(null);
          handleGetAllFiles();
          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }, 100);
      
    } catch (error) {
      setError('Upload failed: ' + (error.response?.data?.message || error.message));
      setIsUploading(false);
    }
  };

  const handleFileDelete = async (fileId) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
    
    try {
     const response = await fetch(`${TEMP_API}/files/${fileId}`, {
          method: 'Delete',
       });

     if (selectedFile && selectedFile.id === fileId) {
      setSelectedFile(null);
      setPreviewUrl('');
     }  
     handleGetAllFiles();
    } catch (error) {
      setError('Delete failed: ' + (error.response?.data?.message || error.message));
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    setIsOpenReady(false);
    try {
    setPreviewUrl(`${TEMP_API}/files/${file?.id}/preview`);
     setIsOpenReady(true);
    } catch (error) {
      setError('Get file Failed: ' + (error.response?.data?.message || error.message));
      setIsOpenReady(false);
      setPreviewUrl("");
    }
   
  };

  useEffect(() => {
    handleGetAllFiles();
  }, []);


  return (
    <div className={`flex flex-col h-full ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
      <div className="flex-none p-4">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>File Manager</h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Upload, manage and view your files</p>
      </div>
      
      {/* Upload Section */}
      <div className={`flex-none p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-grow">
            <input
              type="file"
              ref={fileInputRef}
              accept={fileTypeExtensions}
              onChange={handleFileChange}
              className={`w-full p-2 text-sm rounded border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-200' 
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
              disabled={isUploading}
            />
            {error && (
              <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
            {selectedNewFile && !isUploading && (
              <div className={`flex items-center gap-2 mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {getFileIcon(selectedNewFile.type)}
                <span>{selectedNewFile.name}</span>
                <span>({formatFileSize(selectedNewFile.size)})</span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleUpload}
            disabled={!selectedNewFile || isUploading}
            className={`px-4 py-2 rounded-md transition-colors ${
              !selectedNewFile || isUploading
                ? darkMode 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
        
        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Uploading...</span>
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{uploadProgress}%</span>
            </div>
            <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* File List & Preview Section */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* File List */}
        <div className={`w-full md:w-1/2 overflow-y-auto border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`p-3 border-b font-medium ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex justify-between pr-3">
              <span>Your Files</span>
              <span className="text-sm">{files.length} items</span>
            </div>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {files?.length === 0 ? (
              <li className={`p-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No files uploaded yet
              </li>
            ) : (
              files?.map((file) => (
                <li 
                  key={file.id} 
                  onClick={() => handleFileSelect(file)}
                  className={`p-3 hover:bg-opacity-10 transition-colors cursor-pointer ${
                    selectedFile && selectedFile.id === file.id
                      ? darkMode 
                        ? 'bg-blue-900 bg-opacity-25' 
                        : 'bg-blue-100'
                      : darkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(file?.file_name.split(".")[1])}
                      <div>
                        <p className="font-medium truncate max-w-xs">{file?.file_name}</p>
                        <div className={`flex text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {/* <span>{formatFileSize(file.size)}</span> */}
                          <span className="mx-1">•</span>
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileDelete(file.id);
                      }}
                      className={`p-1 rounded-full transition-colors ${
                        darkMode 
                          ? 'text-gray-400 hover:bg-red-900 hover:bg-opacity-30 hover:text-red-400' 
                          : 'text-gray-500 hover:bg-red-100 hover:text-red-500'
                      }`}
                      aria-label="Delete file"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
        
        {/* File Preview */}
        <div className="flex-1 h-full flex flex-col">
          {selectedFile ? (
            <div className="h-full flex flex-col">
              <div className={`flex-none p-3 border-b flex justify-between items-center ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  {getFileIcon(selectedFile.file_name.split(".")[1])}
                  <span className="font-medium truncate max-w-xs">{selectedFile.file_name}</span>
                </div>
                <div>
                  <a 
                    href={previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`px-3 py-1 text-sm rounded ${
                      darkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    Download
                  </a>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-auto p-4">
                {selectedFile.file_name.split(".")[1] === 'pdf' ? (
                  <div className={`text-center p-8 border-2 rounded-lg ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-red-500" viewBox="0 0 384 512">
                      <path fill="currentColor" d="M181.9 256.1c-5.1-9.9-9.1-19.2-11.3-29.2H52.1c1.5 5.9 3.5 11.6 5.9 17.1L82.8 288H177l-54-31.9zm310.4 86.2L405.3 335.8c-1.1-1.5-2.2-3-3.1-4.6C363.3 312.3 321.9 305 279 305h-39.1l37.9 42H342c32.4 0 63.9 4.9 94.3 12.3zM0 387.5V124.4c0-12.4 2.7-24.3 7.6-35h276.6c-7 12.9-10.9 26.8-10.9 42.1 0 12.8 2.7 24.9 7.5 36H124.3c-37.8 0-64 56.8-32 89.2l73.8 73.9H0zm336 119.9H16c-8.8 0-16-7.2-16-16v-50.9l82.1-82h334c8.8 0 16 7.2 16 16v50.9l-82.1 82z"/>
                    </svg>
                    <p className="text-lg font-semibold">PDF Document</p>
                    <p className="mt-2">Click "Download" to download this PDF file</p>
                  </div>
                ) : selectedFile.file_name.split(".")[1] === 'txt' ? (
                  <div className={`text-center p-8 border-2 rounded-lg ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-500" viewBox="0 0 384 512">
                      <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm64 236c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8zm0-64c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8zm0-72v8c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12zm96-114.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
                    </svg>
                    <p className="text-lg font-semibold">Text File</p>
                    <p className="mt-2">Click "Download" to download this text file</p>
                  </div>
                ) : (
                  <div className={`text-center p-8 border-2 rounded-lg ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-blue-500" viewBox="0 0 384 512">
                      <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm57.1 120H305c7.7 0 13.4 7.1 11.7 14.7l-38 168c-1.2 5.5-6.1 9.3-11.7 9.3h-38c-5.5 0-10.3-3.8-11.6-9.1-25.8-103.5-20.8-81.2-25.6-110.5h-.5c-1.1 14.3-2.4 17.4-25.6 110.5-1.3 5.3-6.1 9.1-11.6 9.1H117c-5.6 0-10.5-3.9-11.7-9.4l-37.8-168c-1.7-7.5 4-14.6 11.7-14.6h24.5c5.7 0 10.7 4 11.8 9.7 15.6 78 20.1 109.5 21 122.2 1.6-10.2 7.3-32.7 29.4-122.7 1.3-5.4 6.1-9.1 11.7-9.1h29.1c5.6 0 10.4 3.8 11.7 9.2 24 100.4 28.8 124 29.6 129.4-.2-11.2-2.6-17.8 21.6-129.2 1-5.6 5.9-9.5 11.5-9.5zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
                    </svg>
                    <p className="text-lg font-semibold">Document File</p>
                    <p className="mt-2">Click "Download" to download this document</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <p className={`mt-4 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Select a file to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileManager;