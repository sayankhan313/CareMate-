import React, { useEffect, useRef, type ComponentType } from "react";
import {
  createNavigationContainerRef,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SplashScreen } from "../screens/auth/SplashScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RoleSelectionScreen } from "../screens/auth/RoleSelectionScreen";
import { PatientSignupScreen } from "../screens/auth/PatientSignupScreen";
import { EmailVerificationScreen } from "../screens/auth/EmailVerificationScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";

import { WelcomeScreen } from "../screens/onboarding/WelcomeScreen";

import { AddMedicineScreen } from "../screens/patient/AddMedicineScreen";
import { ConfirmReminderScreen } from "../screens/patient/ConfirmReminderScreen";
import {ConnectedDeviceScreen} from "../screens/patient/ConnectedDeviceScreen";
import { SafetyResponseScreen } from "../screens/patient/SafetyResponseScreen";
import VideoConsultationScreen from "../screens/patient/VideoConsultationScreen";
import ConsultationEndedScreen from "../screens/patient/ConsultationEndedScreen";
import ScanMedicineScreen from "../screens/patient/ScanMedicineScreen";
import ScanMedicineResultScreen from "../screens/patient/ScanMedicineResultScreen";
import PrescriptionScanResultScreen from "../screens/patient/PrescriptionScanResultScreen";
import { ManualSafetyResponseScreen } from "../screens/patient/ManualSafetyResponseScreen";
import { PatientProfileScreen } from "../screens/patient/PatientProfileScreen";

import { PatientTabNavigator } from "./PatientTabNavigator";

import type { RootStackParamList } from "../types/navigation";

import {
  HealthConnectDeviceProvider,
  useHealthConnectDevice,
} from "../context/HealthConnectDeviceContext";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

const ConnectedDeviceStackScreen =
  ConnectedDeviceScreen as ComponentType<any>;

const CriticalVitalWatcher = () => {
  const { lastSyncedReading } = useHealthConnectDevice();

  const lastHandledReadingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastSyncedReading) {
      return;
    }

    if (lastSyncedReading.status !== "CRITICAL") {
      return;
    }

    if (!lastSyncedReading.id) {
      return;
    }

    if (lastHandledReadingIdRef.current === lastSyncedReading.id) {
      return;
    }

    if (!navigationRef.isReady()) {
      return;
    }

    const currentRoute = navigationRef.getCurrentRoute();

    if (
      currentRoute?.name === "SafetyResponse" ||
      currentRoute?.name === "VideoConsultation" ||
      currentRoute?.name === "ConsultationEnded"
    ) {
      return;
    }

    lastHandledReadingIdRef.current = lastSyncedReading.id;

    navigationRef.navigate("SafetyResponse", {
      vitalReading: lastSyncedReading,
      triggerSource: "Health Connect Auto Sync",
    });
  }, [lastSyncedReading]);

  return null;
};

export const AppNavigator = () => {
  return (
    <SafeAreaProvider>
      <HealthConnectDeviceProvider>
        <NavigationContainer ref={navigationRef}>
          <CriticalVitalWatcher />

          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />

            <Stack.Screen name="Welcome" component={WelcomeScreen} />

            <Stack.Screen name="Login" component={LoginScreen} />

            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />

            <Stack.Screen name="PatientSignup" component={PatientSignupScreen} />

            <Stack.Screen
              name="EmailVerification"
              component={EmailVerificationScreen}
            />

            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />

            <Stack.Screen name="PatientTabs" component={PatientTabNavigator} />
            <Stack.Screen name="PatientProfile" component={PatientProfileScreen} />

            <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />

            <Stack.Screen
              name="ConfirmReminder"
              component={ConfirmReminderScreen}
            />

            <Stack.Screen
              name="ConnectedDevice"
              component={ConnectedDeviceStackScreen}
            />
            <Stack.Screen
              name="ManualSafetyResponse"
              component={ManualSafetyResponseScreen}
            />

            <Stack.Screen
              name="SafetyResponse"
              component={SafetyResponseScreen}
            />

            <Stack.Screen
              name="VideoConsultation"
              component={VideoConsultationScreen}
            />

            <Stack.Screen
              name="ConsultationEnded"
              component={ConsultationEndedScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="ScanMedicine" component={ScanMedicineScreen} />

            <Stack.Screen
              name="ScanMedicineResult"
              component={ScanMedicineResultScreen}
            />

            <Stack.Screen
              name="PrescriptionScanResult"
              component={PrescriptionScanResultScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </HealthConnectDeviceProvider>
    </SafeAreaProvider>
  );
};