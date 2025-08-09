import { useState, useRef, useEffect } from 'react';
import { TEMP_API } from './config';
import { useAudioPlayer } from "react-use-audio-player"

const ChatBot = ({ darkMode }) => {
  const { load, togglePlayPause, isPlaying, isLoading: isAudioLoading } = useAudioPlayer()
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileError, setFileError] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Accepted file types
  const acceptedFileTypes = [
    'application/pdf',                                                   // PDF
    'application/msword',                                                // DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'text/plain'                                                        // TXT
  ];
  
  const fileTypeExtensions = '.pdf,.doc,.docx,.txt';

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isValidFileType = (file) => {
    return acceptedFileTypes.includes(file.type);
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf') {
      return 'pdf';
    } else if (fileType === 'application/msword' || 
              fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'doc';
    } else if (fileType === 'text/plain') {
      return 'txt';
    }
    return 'file';
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFileError('');
    
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      return;
    }

    if (!isValidFileType(selectedFile)) {
      setFileError(`Invalid file type. Please upload only PDF, DOC/DOCX, or TXT files.`);
      setFile(null);
      setFilePreview(null);
      fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
    setFilePreview(null); // No visual previews since we're only accepting document files
  };

  const clearFileSelection = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() && !file) return;
    
    // Create message content based on text and/or file
    let userMessageContent = input;
    let fileInfo = '';
    
    if (file) {
      fileInfo = `[File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)]`;
      userMessageContent = `${input}`;
    }

    // Add user message to chat
    const userMessage = { role: 'user', content: userMessageContent, filePreview, fileInfo: `${fileInfo}` };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    clearFileSelection();
    setIsLoading(true);

    try {
        const formData = new FormData();
        formData.append('message', input.trim() || '');
      if (file) {
        // For now, we'll just simulate sending the file to the API
        console.log('Would send file to API:', file);
        // In a real implementation, you would use FormData to send the file
        formData.append('context_file', file);
      }

      const response = await fetch(`${TEMP_API}/chat`, {
          method: 'POST',
          headers: {},
          // body: formData
          body: formData
        });
        
        const data = await response.json();
        const aiResponse = { 
          role: 'assistant', 
          content: data?.response || "Sorry, there was an error processing your request."
        };
        setMessages(prevMessages => [...prevMessages, aiResponse]);
        setIsLoading(false);
      
    } catch (error) {
      console.error('Error calling AI API:', error);
      setMessages(prevMessages => [...prevMessages, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.'
      }]);
      setIsLoading(false);
    }
  };

  const handleLoadAudio = (url) => {
    try {
      if (isPlaying) {
        togglePlayPause();
      } else {
        load(url || 'https://stream.toohotradio.net/128', {
          autoplay: true,
          html5: true,
          format: "mp3"
        })
        togglePlayPause();
      }
    } catch (error) {
      console.log(">>error", error);
    }
    
  }

  return (
    <div className={`flex flex-col h-full max-w-2xl mx-auto ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className={`text-center my-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>Ask me anything! I'm here to help.</p>
            <p className="mt-2 text-sm">You can upload PDF, DOC/DOCX, or TXT files for analysis.</p>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user' 
                  ? 'bg-blue-500 text-white rounded-br-none' 
                  : darkMode 
                    ? 'bg-gray-700 text-gray-200 rounded-bl-none' 
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              {msg.filePreview && (
                <div className="mb-2">
                  <img 
                    src={msg.filePreview} 
                    alt="Uploaded file preview" 
                    className="max-h-40 rounded"
                  />
                </div>
              )}
              {msg.content}
              <p><i>{msg?.fileInfo ? `File Uploaded: ${msg?.fileInfo}`  : ""}</i></p>
              { msg.role === 'assistant' && 
                (
                  
                <div onClick={() => handleLoadAudio(msg?.url)} className="grid grid-flow-col justify-items-end mt-2 cursor-pointer">
                  {
                   isAudioLoading ? 
                   <svg width="20" height="20" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Loading">
                      <circle cx="25" cy="25" r="20" fill="none" stroke="white" strokeWidth="4" opacity="0.4" />
                      <circle cx="25" cy="25" r="20" fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" strokeDasharray="60 150">
                        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
                      </circle>
                  </svg> :
                 ( isPlaying ? 
                 <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none">
                    <path d="M16.0004 9.00009C16.6281 9.83575 17 10.8745 17 12.0001C17 13.1257 16.6281 14.1644 16.0004 15.0001M18 5.29177C19.8412 6.93973 21 9.33459 21 12.0001C21 14.6656 19.8412 17.0604 18 18.7084M4.6 9.00009H5.5012C6.05213 9.00009 6.32759 9.00009 6.58285 8.93141C6.80903 8.87056 7.02275 8.77046 7.21429 8.63566C7.43047 8.48353 7.60681 8.27191 7.95951 7.84868L10.5854 4.69758C11.0211 4.17476 11.2389 3.91335 11.4292 3.88614C11.594 3.86258 11.7597 3.92258 11.8712 4.04617C12 4.18889 12 4.52917 12 5.20973V18.7904C12 19.471 12 19.8113 11.8712 19.954C11.7597 20.0776 11.594 20.1376 11.4292 20.114C11.239 20.0868 11.0211 19.8254 10.5854 19.3026L7.95951 16.1515C7.60681 15.7283 7.43047 15.5166 7.21429 15.3645C7.02275 15.2297 6.80903 15.1296 6.58285 15.0688C6.32759 15.0001 6.05213 15.0001 5.5012 15.0001H4.6C4.03995 15.0001 3.75992 15.0001 3.54601 14.8911C3.35785 14.7952 3.20487 14.6422 3.10899 14.4541C3 14.2402 3 13.9601 3 13.4001V10.6001C3 10.04 3 9.76001 3.10899 9.54609C3.20487 9.35793 3.35785 9.20495 3.54601 9.10908C3.75992 9.00009 4.03995 9.00009 4.6 9.00009Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg> : 
                  <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none">
                    <path d="M18 9.00009C18.6277 9.83575 18.9996 10.8745 18.9996 12.0001C18.9996 13.1257 18.6277 14.1644 18 15.0001M6.6 9.00009H7.5012C8.05213 9.00009 8.32759 9.00009 8.58285 8.93141C8.80903 8.87056 9.02275 8.77046 9.21429 8.63566C9.43047 8.48353 9.60681 8.27191 9.95951 7.84868L12.5854 4.69758C13.0211 4.17476 13.2389 3.91335 13.4292 3.88614C13.594 3.86258 13.7597 3.92258 13.8712 4.04617C14 4.18889 14 4.52917 14 5.20973V18.7904C14 19.471 14 19.8113 13.8712 19.954C13.7597 20.0776 13.594 20.1376 13.4292 20.114C13.239 20.0868 13.0211 19.8254 12.5854 19.3026L9.95951 16.1515C9.60681 15.7283 9.43047 15.5166 9.21429 15.3645C9.02275 15.2297 8.80903 15.1296 8.58285 15.0688C8.32759 15.0001 8.05213 15.0001 7.5012 15.0001H6.6C6.03995 15.0001 5.75992 15.0001 5.54601 14.8911C5.35785 14.7952 5.20487 14.6422 5.10899 14.4541C5 14.2402 5 13.9601 5 13.4001V10.6001C5 10.04 5 9.76001 5.10899 9.54609C5.20487 9.35793 5.35785 9.20495 5.54601 9.10908C5.75992 9.00009 6.03995 9.00009 6.6 9.00009Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>  )
                }
                 
                </div>
                )
              }
             
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className={`rounded-lg rounded-bl-none px-4 py-2 max-w-[80%] ${
              darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'
            }`}>
              <div className="flex space-x-1">
                <div className={`w-2 h-2 rounded-full animate-bounce ${
                  darkMode ? 'bg-gray-400' : 'bg-gray-500'
                }`}></div>
                <div className={`w-2 h-2 rounded-full animate-bounce delay-75 ${
                  darkMode ? 'bg-gray-400' : 'bg-gray-500'
                }`}></div>
                <div className={`w-2 h-2 rounded-full animate-bounce delay-150 ${
                  darkMode ? 'bg-gray-400' : 'bg-gray-500'
                }`}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {fileError && (
        <div className="bg-red-100 dark:bg-red-900 p-2 text-red-700 dark:text-red-300 text-sm border-t border-red-200 dark:border-red-800">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {fileError}
          </div>
        </div>
      )}
      
      {file && (
        <div className={`p-2 border-t ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* File type icon based on file type */}
              {getFileIcon(file.type) === 'pdf' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 384 512">
                  <path fill="currentColor" d="M181.9 256.1c-5.1-9.9-9.1-19.2-11.3-29.2H52.1c1.5 5.9 3.5 11.6 5.9 17.1L82.8 288H177l-54-31.9zm310.4 86.2L405.3 335.8c-1.1-1.5-2.2-3-3.1-4.6C363.3 312.3 321.9 305 279 305h-39.1l37.9 42H342c32.4 0 63.9 4.9 94.3 12.3zM0 387.5V124.4c0-12.4 2.7-24.3 7.6-35h276.6c-7 12.9-10.9 26.8-10.9 42.1 0 12.8 2.7 24.9 7.5 36H124.3c-37.8 0-64 56.8-32 89.2l73.8 73.9H0zm336 119.9H16c-8.8 0-16-7.2-16-16v-50.9l82.1-82h334c8.8 0 16 7.2 16 16v50.9l-82.1 82z"/>
                </svg>
              )}
              {getFileIcon(file.type) === 'doc' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 384 512">
                  <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm57.1 120H305c7.7 0 13.4 7.1 11.7 14.7l-38 168c-1.2 5.5-6.1 9.3-11.7 9.3h-38c-5.5 0-10.3-3.8-11.6-9.1-25.8-103.5-20.8-81.2-25.6-110.5h-.5c-1.1 14.3-2.4 17.4-25.6 110.5-1.3 5.3-6.1 9.1-11.6 9.1H117c-5.6 0-10.5-3.9-11.7-9.4l-37.8-168c-1.7-7.5 4-14.6 11.7-14.6h24.5c5.7 0 10.7 4 11.8 9.7 15.6 78 20.1 109.5 21 122.2 1.6-10.2 7.3-32.7 29.4-122.7 1.3-5.4 6.1-9.1 11.7-9.1h29.1c5.6 0 10.4 3.8 11.7 9.2 24 100.4 28.8 124 29.6 129.4-.2-11.2-2.6-17.8 21.6-129.2 1-5.6 5.9-9.5 11.5-9.5zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
                </svg>
              )}
              {getFileIcon(file.type) === 'txt' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" viewBox="0 0 384 512">
                  <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm64 236c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8zm0-64c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8zm0-72v8c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12zm96-114.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
                </svg>
              )}
              <span className={`text-sm truncate max-w-[200px] ${
                darkMode ? 'text-blue-300' : 'text-blue-700'
              }`}>{file.name}</span>
              <span className={`ml-2 text-xs ${
                darkMode ? 'text-blue-400' : 'text-blue-500'
              }`}>({(file.size / 1024).toFixed(2)} KB)</span>
            </div>
            <button 
              type="button"
              onClick={clearFileSelection}
              className={`${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className={`border-t p-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className={`flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-600'
                  : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500'
              }`}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={`px-3 py-2 rounded-full transition ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400'
              }`}
              title="Upload file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="file"
              accept={fileTypeExtensions}
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !file)}
              className={`text-white px-4 py-2 rounded-full transition ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:text-blue-300'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
              }`}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          <div className={`text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Supported file types: PDF, DOC/DOCX, TXT
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;