import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';

export const AuthDebug: React.FC = () => {
  const auth = useAuth();
  const [logs, setLogs] = useState<string[]>([]);

  // Capturar logs de la consola
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev, `LOG: ${args.join(' ')}`]);
    };

    console.error = (...args) => {
      originalError(...args);
      setLogs(prev => [...prev, `ERROR: ${args.join(' ')}`]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 w-96 h-64 bg-black text-green-400 p-4 rounded-lg overflow-auto text-xs font-mono z-50">
      <h3 className="text-white mb-2">Auth Debug</h3>
      
      <div className="mb-2">
        <div>loggedIn: {auth.loggedIn ? '✅' : '❌'}</div>
        <div>loadingLogin: {auth.loadingLogin ? '⏳' : '✅'}</div>
        <div>user: {auth.user ? '✅' : '❌'}</div>
        <div>jwt: {auth.jwt ? '✅' : '❌'}</div>
        <div>error: {auth.error || 'none'}</div>
      </div>

      <div className="border-t border-gray-600 pt-2">
        <h4 className="text-white mb-1">Logs:</h4>
        <div className="max-h-32 overflow-auto">
          {logs.slice(-10).map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setLogs([])}
        className="mt-2 px-2 py-1 bg-red-600 text-white rounded text-xs"
      >
        Clear Logs
      </button>
    </div>
  );
};
