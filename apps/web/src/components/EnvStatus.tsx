import React from 'react';

export const EnvStatus: React.FC = () => {
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_THIRDWEB_CLIENT_ID': import.meta.env.VITE_THIRDWEB_CLIENT_ID || import.meta.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
    'NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN': import.meta.env.VITE_THIRDWEB_AUTH_DOMAIN || import.meta.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN,
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
