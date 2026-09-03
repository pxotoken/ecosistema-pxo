import React from 'react';

export const EnvStatus: React.FC = () => {
  // This app is Vite, which only exposes VITE_*. The NEXT_PUBLIC_* fallbacks
  // that used to sit here were Next.js leftovers that could never resolve,
  // and they made the panel report variable names that do not exist.
  const envVars = {
    'VITE_SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL,
    'VITE_SUPABASE_ANON_KEY': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'VITE_THIRDWEB_CLIENT_ID': import.meta.env.VITE_THIRDWEB_CLIENT_ID,
    'VITE_THIRDWEB_AUTH_DOMAIN': import.meta.env.VITE_THIRDWEB_AUTH_DOMAIN,
  };

  return (
    <div className="fixed top-4 right-4 w-80 bg-white border rounded-lg p-4 shadow-lg z-50">
      <h3 className="font-bold mb-2">Variables de Entorno</h3>
      <div className="text-xs space-y-1">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="font-mono">{key}:</span>
            <span className={value ? 'text-green-600' : 'text-red-600'}>
              {value ? '✅' : '❌'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
