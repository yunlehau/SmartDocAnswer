import { useState, useEffect } from 'react';
import Header from './components/Header';
import ChatBot from './components/ChatBot';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  // Check if user previously set dark mode
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <main className="flex-1 container mx-auto p-4">
        <div className={`shadow-lg rounded-lg h-[600px] flex flex-col overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-200`}>
          <ChatBot darkMode={darkMode} />
        </div>
        
        <div className={`mt-4 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>This demo AI Q&A chatbot supports file uploads (PDF, DOC/DOCX, TXT only).</p>
          <p className="mt-1">Files are processed locally and would be sent to the AI API in a production environment.</p>
        </div>
      </main>
      
      <footer className={`border-t p-4 text-center text-sm ${
        darkMode 
          ? 'bg-gray-800 border-gray-700 text-gray-400' 
          : 'bg-white border-gray-200 text-gray-500'
      } transition-colors duration-200`}>
        <p>&copy; {new Date().getFullYear()} AI Q&A Chatbot | Built with React and TailwindCSS</p>
      </footer>
    </div>
  );
}

export default App;