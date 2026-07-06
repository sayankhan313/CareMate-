import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, type AppStateStatus } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { healthConnectService } from "../services/healthConnectService";
import { vitalsSyncService } from "../services/vitalsSyncService";
import type { VitalReading, VitalStatus } from "../types/vitals";

const HEALTH_CONNECT_CONNECTED_KEY = "@caremate_health_connect_connected";
const HEALTH_CONNECT_DEVICE_NAME_KEY = "@caremate_health_connect_device_name";

const AUTO_SYNC_INTERVAL_MS = 30000;

type SyncMode = "connect" | "manual" | "auto";

type HealthConnectDeviceContextValue = {
  isDeviceStateLoaded: boolean;
  isHealthConnectConnected: boolean;
  isHealthConnectSyncing: boolean;
  connectedDeviceName: string;
  lastSyncAt: string | null;
  lastSyncStatus: VitalStatus | null;
  lastSyncedReading: VitalReading | null;
  lastSyncError: string;
  connectHealthConnect: () => Promise<VitalReading | null>;
  disconnectHealthConnect: () => Promise<void>;
  syncHealthConnectNow: (mode?: SyncMode) => Promise<VitalReading | null>;
};

const HealthConnectDeviceContext =
  createContext<HealthConnectDeviceContextValue | undefined>(undefined);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to sync Health Connect data.";
};

export const HealthConnectDeviceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isDeviceStateLoaded, setIsDeviceStateLoaded] = useState(false);
  const [isHealthConnectConnected, setIsHealthConnectConnected] =
    useState(false);
  const [isHealthConnectSyncing, setIsHealthConnectSyncing] = useState(false);

  const [connectedDeviceName, setConnectedDeviceName] = useState(
    "Android Health Connect"
  );
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncStatus, setLastSyncStatus] = useState<VitalStatus | null>(
    null
  );
  const [lastSyncedReading, setLastSyncedReading] =
    useState<VitalReading | null>(null);
  const [lastSyncError, setLastSyncError] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncRunningRef = useRef(false);
  const isConnectedRef = useRef(false);
  const lastSyncedReadingRef = useRef<VitalReading | null>(null);

  useEffect(() => {
    isConnectedRef.current = isHealthConnectConnected;
  }, [isHealthConnectConnected]);

  useEffect(() => {
    lastSyncedReadingRef.current = lastSyncedReading;
  }, [lastSyncedReading]);

  useEffect(() => {
    const loadConnectionState = async () => {
      try {
        const [storedConnected, storedDeviceName] = await Promise.all([
          AsyncStorage.getItem(HEALTH_CONNECT_CONNECTED_KEY),
          AsyncStorage.getItem(HEALTH_CONNECT_DEVICE_NAME_KEY),
        ]);

        setIsHealthConnectConnected(storedConnected === "true");

        if (storedDeviceName) {
          setConnectedDeviceName(storedDeviceName);
        }
      } finally {
        setIsDeviceStateLoaded(true);
      }
    };

    loadConnectionState();
  }, []);

  const saveDeviceName = useCallback(async (deviceName: string) => {
    setConnectedDeviceName(deviceName);
    await AsyncStorage.setItem(HEALTH_CONNECT_DEVICE_NAME_KEY, deviceName);
  }, []);

  const syncHealthConnectNow = useCallback(
    async (mode: SyncMode = "manual") => {
      if (isSyncRunningRef.current) {
        return lastSyncedReadingRef.current;
      }

      const shouldShowLoading = mode !== "auto";

      try {
        isSyncRunningRef.current = true;

        if (shouldShowLoading) {
          setIsHealthConnectSyncing(true);
        }

        setLastSyncError("");

        const savedReading =
          await vitalsSyncService.syncLatestVitalsFromHealthConnect();

        if (!savedReading) {
          return null;
        }

        const deviceName =
          savedReading.deviceSource || "Android Health Connect";

        await saveDeviceName(deviceName);

        lastSyncedReadingRef.current = savedReading;

        setLastSyncedReading(savedReading);
        setLastSyncAt(new Date().toISOString());
        setLastSyncStatus(savedReading.status);

        return savedReading;
      } catch (error) {
        const message = getErrorMessage(error);

        setLastSyncError(message);

        throw error;
      } finally {
        isSyncRunningRef.current = false;

        if (shouldShowLoading) {
          setIsHealthConnectSyncing(false);
        }
      }
    },
    [saveDeviceName]
  );

  const connectHealthConnect = useCallback(async () => {
    try {
      setLastSyncError("");

      await healthConnectService.requestVitalsPermission();

      await AsyncStorage.setItem(HEALTH_CONNECT_CONNECTED_KEY, "true");

      setIsHealthConnectConnected(true);

      try {
        const savedReading = await syncHealthConnectNow("connect");
        return savedReading;
      } catch (syncError) {
        setLastSyncError(getErrorMessage(syncError));
        return null;
      }
    } catch (error) {
      const message = getErrorMessage(error);

      setLastSyncError(message);
      setIsHealthConnectConnected(false);

      await AsyncStorage.removeItem(HEALTH_CONNECT_CONNECTED_KEY);

      throw error;
    }
  }, [syncHealthConnectNow]);

  const disconnectHealthConnect = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    isSyncRunningRef.current = false;
    isConnectedRef.current = false;
    lastSyncedReadingRef.current = null;

    setIsHealthConnectConnected(false);
    setIsHealthConnectSyncing(false);
    setLastSyncError("");
    setLastSyncStatus(null);
    setLastSyncAt(null);
    setLastSyncedReading(null);
    setConnectedDeviceName("Android Health Connect");

    await vitalsSyncService.resetHealthConnectSignature();

    await Promise.all([
      AsyncStorage.removeItem(HEALTH_CONNECT_CONNECTED_KEY),
      AsyncStorage.removeItem(HEALTH_CONNECT_DEVICE_NAME_KEY),
    ]);
  }, []);

  useEffect(() => {
    if (!isDeviceStateLoaded || !isHealthConnectConnected) {
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    syncHealthConnectNow("auto").catch(() => {
     
    });

    timerRef.current = setInterval(() => {
      if (AppState.currentState === "active" && isConnectedRef.current) {
        syncHealthConnectNow("auto").catch(() => {
          
        });
      }
    }, AUTO_SYNC_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isDeviceStateLoaded, isHealthConnectConnected, syncHealthConnectNow]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && isConnectedRef.current) {
        syncHealthConnectNow("auto").catch(() => {
         
        });
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [syncHealthConnectNow]);

  const value = useMemo(
    () => ({
      isDeviceStateLoaded,
      isHealthConnectConnected,
      isHealthConnectSyncing,
      connectedDeviceName,
      lastSyncAt,
      lastSyncStatus,
      lastSyncedReading,
      lastSyncError,
      connectHealthConnect,
      disconnectHealthConnect,
      syncHealthConnectNow,
    }),
    [
      isDeviceStateLoaded,
      isHealthConnectConnected,
      isHealthConnectSyncing,
      connectedDeviceName,
      lastSyncAt,
      lastSyncStatus,
      lastSyncedReading,
      lastSyncError,
      connectHealthConnect,
      disconnectHealthConnect,
      syncHealthConnectNow,
    ]
  );

  return (
    <HealthConnectDeviceContext.Provider value={value}>
      {children}
    </HealthConnectDeviceContext.Provider>
  );
};

export const useHealthConnectDevice = () => {
  const context = useContext(HealthConnectDeviceContext);

  if (!context) {
    throw new Error(
      "useHealthConnectDevice must be used inside HealthConnectDeviceProvider."
    );
  }

  return context;
};