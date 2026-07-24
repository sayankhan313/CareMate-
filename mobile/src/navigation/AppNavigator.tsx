import React, {
  useEffect,
  useRef,
  type ComponentType,
} from "react";
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
import { DoctorSignupScreen } from "../screens/auth/DoctorSignupScreen";
import { DoctorPendingApprovalScreen } from "../screens/auth/DoctorPendingApprovalScreen";
import { EmailVerificationScreen } from "../screens/auth/EmailVerificationScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { PharmacySignupScreen } from "../screens/auth/PharmacySignupScreen";
import { PharmacyPendingApprovalScreen } from "../screens/auth/PharmacyPendingApprovalScreen";

import { WelcomeScreen } from "../screens/onboarding/WelcomeScreen";

import { AddMedicineScreen } from "../screens/patient/AddMedicineScreen";
import { ConfirmReminderScreen } from "../screens/patient/ConfirmReminderScreen";
import { ConnectedDeviceScreen } from "../screens/patient/ConnectedDeviceScreen";
import { SafetyResponseScreen } from "../screens/patient/SafetyResponseScreen";
import VideoConsultationScreen from "../screens/patient/VideoConsultationScreen";
import ConsultationEndedScreen from "../screens/patient/ConsultationEndedScreen";
import ScanMedicineScreen from "../screens/patient/ScanMedicineScreen";
import ScanMedicineResultScreen from "../screens/patient/ScanMedicineResultScreen";
import PrescriptionScanResultScreen from "../screens/patient/PrescriptionScanResultScreen";
import { ManualSafetyResponseScreen } from "../screens/patient/ManualSafetyResponseScreen";
import { PatientProfileScreen } from "../screens/patient/PatientProfileScreen";
import { SelectDoctorScreen } from "../screens/patient/SelectDoctorScreen";

import { DoctorPatientDetailScreen } from "../screens/doctor/DoctorPatientDetailScreen";
import DoctorPrescriptionScreen from "../screens/doctor/DoctorPrescriptionScreen";

import { PatientTabNavigator } from "./PatientTabNavigator";
import { DoctorTabNavigator } from "./DoctorTabNavigator";
import { AdminTabNavigator } from "./AdminTabNavigator";

import { AdminDoctorVerificationDetailScreen } from "../screens/admin/AdminDoctorVerificationDetailScreen";
import { AdminPharmacyVerificationDetailScreen } from "../screens/admin/AdminPharmacyVerificationDetailScreen";
import { AdminRegisterWebViewScreen } from "../screens/admin/AdminRegisterWebViewScreen";

import { PharmacyDashboardScreen } from "../screens/pharmacy/PharmacyDashboardScreen";

import type { RootStackParamList } from "../types/navigation";

import {
  HealthConnectDeviceProvider,
  useHealthConnectDevice,
} from "../context/HealthConnectDeviceContext";

const Stack =
  createNativeStackNavigator<RootStackParamList>();

const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

const ConnectedDeviceStackScreen =
  ConnectedDeviceScreen as ComponentType<any>;

const AdminTabsLegacyScreen =
  AdminTabNavigator as ComponentType<any>;

const DoctorPatientDetailStackScreen =
  DoctorPatientDetailScreen as ComponentType<any>;

const DoctorPrescriptionStackScreen =
  DoctorPrescriptionScreen as ComponentType<any>;

const CriticalVitalWatcher = () => {
  const { lastSyncedReading } =
    useHealthConnectDevice();

  const lastHandledReadingIdRef =
    useRef<string | null>(null);

  useEffect(() => {
    if (!lastSyncedReading) {
      return;
    }

    if (
      lastSyncedReading.status !==
      "CRITICAL"
    ) {
      return;
    }

    if (!lastSyncedReading.id) {
      return;
    }

    if (
      lastHandledReadingIdRef.current ===
      lastSyncedReading.id
    ) {
      return;
    }

    if (!navigationRef.isReady()) {
      return;
    }

    const currentRoute =
      navigationRef.getCurrentRoute();

    if (
      currentRoute?.name ===
        "SafetyResponse" ||
      currentRoute?.name ===
        "VideoConsultation" ||
      currentRoute?.name ===
        "ConsultationEnded"
    ) {
      return;
    }

    lastHandledReadingIdRef.current =
      lastSyncedReading.id;

    navigationRef.navigate(
      "SafetyResponse",
      {
        vitalReading:
          lastSyncedReading,
        triggerSource:
          "Health Connect Auto Sync",
      }
    );
  }, [lastSyncedReading]);

  return null;
};

export const AppNavigator = () => {
  return (
    <SafeAreaProvider>
      <HealthConnectDeviceProvider>
        <NavigationContainer
          ref={navigationRef}
        >
          <CriticalVitalWatcher />

          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen
              name="Splash"
              component={SplashScreen}
            />

            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
            />

            <Stack.Screen
              name="Login"
              component={LoginScreen}
            />

            <Stack.Screen
              name="RoleSelection"
              component={
                RoleSelectionScreen
              }
            />

            <Stack.Screen
              name="PatientSignup"
              component={
                PatientSignupScreen
              }
            />

            <Stack.Screen
              name="DoctorSignup"
              component={
                DoctorSignupScreen
              }
            />

            <Stack.Screen
              name="PharmacySignup"
              component={
                PharmacySignupScreen
              }
            />

            <Stack.Screen
              name="PharmacyPendingApproval"
              component={
                PharmacyPendingApprovalScreen
              }
            />

            <Stack.Screen
              name="DoctorPendingApproval"
              component={
                DoctorPendingApprovalScreen
              }
            />

            <Stack.Screen
              name="EmailVerification"
              component={
                EmailVerificationScreen
              }
            />

            <Stack.Screen
              name="ForgotPassword"
              component={
                ForgotPasswordScreen
              }
            />

            <Stack.Screen
              name="PatientTabs"
              component={
                PatientTabNavigator
              }
            />

            <Stack.Screen
              name="DoctorTabs"
              component={
                DoctorTabNavigator
              }
            />

            <Stack.Screen
              name="DoctorPatientDetail"
              component={
                DoctorPatientDetailStackScreen
              }
            />

            <Stack.Screen
              name="DoctorPrescription"
              component={
                DoctorPrescriptionStackScreen
              }
            />

            <Stack.Screen
              name="AdminTabs"
              component={
                AdminTabNavigator
              }
            />

            <Stack.Screen
              name="PharmacyDashboard"
              component={
                PharmacyDashboardScreen
              }
            />

            <Stack.Screen
              name="AdminDashboard"
              component={
                AdminTabsLegacyScreen
              }
            />

            <Stack.Screen
              name="AdminDoctorVerificationDetail"
              component={
                AdminDoctorVerificationDetailScreen
              }
            />

            <Stack.Screen
              name="AdminPharmacyVerificationDetail"
              component={
                AdminPharmacyVerificationDetailScreen
              }
            />

            <Stack.Screen
              name="AdminRegisterWebView"
              component={
                AdminRegisterWebViewScreen
              }
            />

            <Stack.Screen
              name="PatientProfile"
              component={
                PatientProfileScreen
              }
            />

            <Stack.Screen
              name="AddMedicine"
              component={
                AddMedicineScreen
              }
            />

            <Stack.Screen
              name="ConfirmReminder"
              component={
                ConfirmReminderScreen
              }
            />

            <Stack.Screen
              name="ConnectedDevice"
              component={
                ConnectedDeviceStackScreen
              }
            />

            <Stack.Screen
              name="ManualSafetyResponse"
              component={
                ManualSafetyResponseScreen
              }
            />

            <Stack.Screen
              name="SafetyResponse"
              component={
                SafetyResponseScreen
              }
            />

            <Stack.Screen
              name="VideoConsultation"
              component={
                VideoConsultationScreen
              }
            />

            <Stack.Screen
              name="ConsultationEnded"
              component={
                ConsultationEndedScreen
              }
            />

            <Stack.Screen
              name="ScanMedicine"
              component={
                ScanMedicineScreen
              }
            />

            <Stack.Screen
              name="ScanMedicineResult"
              component={
                ScanMedicineResultScreen
              }
            />

            <Stack.Screen
              name="PrescriptionScanResult"
              component={
                PrescriptionScanResultScreen
              }
            />

            <Stack.Screen
              name="SelectDoctor"
              component={
                SelectDoctorScreen
              }
            />
          </Stack.Navigator>
        </NavigationContainer>
      </HealthConnectDeviceProvider>
    </SafeAreaProvider>
  );
};