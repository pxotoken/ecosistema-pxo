import { ThirdwebProvider as ThirdwebProviderBase } from "thirdweb/react";

interface ThirdwebProviderProps {
  children: React.ReactNode;
}

export const ThirdwebProvider: React.FC<ThirdwebProviderProps> = ({ children }) => {
  return (
    <ThirdwebProviderBase>
      {children}
    </ThirdwebProviderBase>
  );
}; 