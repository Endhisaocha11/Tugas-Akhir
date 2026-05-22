import { createContext, useContext, useState } from 'react';

interface DeviceContextValue {
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
}

const DeviceContext = createContext<DeviceContextValue>({
  selectedDeviceId: '',
  setSelectedDeviceId: () => {},
});

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string>(
    () => localStorage.getItem('selectedDeviceId') ?? ''
  );

  const setSelectedDeviceId = (id: string) => {
    if (id) {
      localStorage.setItem('selectedDeviceId', id);
    } else {
      localStorage.removeItem('selectedDeviceId');
    }
    setSelectedDeviceIdState(id);
  };

  return (
    <DeviceContext.Provider value={{ selectedDeviceId, setSelectedDeviceId }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  return useContext(DeviceContext);
}
