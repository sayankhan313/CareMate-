import React, { useEffect, useRef, type ComponentType } from "react";
import { NavigationContainer } from "@react-navigation/native";
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
import EditPatientProfileScreen from "../screens/patient/EditPatientProfileScreen";
import NotificationPreferencesScreen from "../screens/patient/NotificationPreferencesScreen";
import { SelectDoctorScreen } from "../screens/patient/SelectDoctorScreen";
import PatientActiveCallsScreen from "../screens/patient/PatientActiveCallsScreen";
import MedicineUpdatesScreen from "../screens/patient/MedicineUpdatesScreen";
import PatientReportsScreen from "../screens/patient/PatientReportsScreen";
import PatientUploadReportScreen from "../screens/patient/PatientUploadReportScreen";
import ReminderSettingsScreen from "../screens/patient/ReminderSettingsScreen";
import SafetyResponseSettingsScreen from "../screens/patient/SafetyResponseSettingsScreen";
import LanguageAccessibilityScreen from "../screens/patient/LanguageAccessibilityScreen";
import PrivacySecurityScreen from "../screens/patient/PrivacySecurityScreen";
import { DoctorPatientDetailScreen } from "../screens/doctor/DoctorPatientDetailScreen";
import DoctorSelectPrescriptionPatientScreen from "../screens/doctor/DoctorSelectPrescriptionPatientScreen";
import DoctorPrescriptionScreen from "../screens/doctor/DoctorPrescriptionScreen";
import DoctorSelectNotePatientScreen from "../screens/doctor/DoctorSelectNotePatientScreen";
import DoctorAddNoteScreen from "../screens/doctor/DoctorAddNoteScreen";
import DoctorPatientReportsScreen from "../screens/doctor/DoctorPatientReportsScreen";
import DoctorReportReviewsScreen from "../screens/doctor/DoctorReportReviewsScreen";
import DoctorReportReviewScreen from "../screens/doctor/DoctorReportReviewScreen";
import DoctorAvailabilityScreen from "../screens/doctor/DoctorAvailabilityScreen";
import { AdminDoctorVerificationDetailScreen } from "../screens/admin/AdminDoctorVerificationDetailScreen";
import { AdminPharmacyVerificationDetailScreen } from "../screens/admin/AdminPharmacyVerificationDetailScreen";
import { AdminAuditLogsScreen } from "../screens/admin/AdminAuditLogsScreen";
import { AdminAuditLogDetailScreen } from "../screens/admin/AdminAuditLogDetailScreen";
import { AdminRegisterWebViewScreen } from "../screens/admin/AdminRegisterWebViewScreen";
import { PharmacyDashboardScreen } from "../screens/pharmacy/PharmacyDashboardScreen";
import { NotificationsScreen } from "../screens/common/NotificationsScreen";
import { FCMInitializer } from "../components/common/FCMInitializer";
import { PatientTabNavigator } from "./PatientTabNavigator";
import { DoctorTabNavigator } from "./DoctorTabNavigator";
import { AdminTabNavigator } from "./AdminTabNavigator";
import type { RootStackParamList } from "../types/navigation";
import { HealthConnectDeviceProvider, useHealthConnectDevice } from "../context/HealthConnectDeviceContext";
import { LanguageProvider } from "../context/LanguageContext";
import { navigationRef } from "./navigationRef";

const Stack = createNativeStackNavigator<RootStackParamList>();

const ConnectedDeviceStackScreen = ConnectedDeviceScreen as ComponentType<any>;
const AdminTabsLegacyScreen = AdminTabNavigator as ComponentType<any>;
const EditPatientProfileStackScreen = EditPatientProfileScreen as ComponentType<any>;
const NotificationPreferencesStackScreen = NotificationPreferencesScreen as ComponentType<any>;
const SelectDoctorStackScreen = SelectDoctorScreen as ComponentType<any>;
const PatientActiveCallsStackScreen = PatientActiveCallsScreen as ComponentType<any>;
const MedicineUpdatesStackScreen = MedicineUpdatesScreen as ComponentType<any>;
const PatientReportsStackScreen = PatientReportsScreen as ComponentType<any>;
const PatientUploadReportStackScreen = PatientUploadReportScreen as ComponentType<any>;
const DoctorPatientDetailStackScreen = DoctorPatientDetailScreen as ComponentType<any>;
const DoctorPatientReportsStackScreen = DoctorPatientReportsScreen as ComponentType<any>;
const DoctorReportReviewsStackScreen = DoctorReportReviewsScreen as ComponentType<any>;
const DoctorReportReviewStackScreen = DoctorReportReviewScreen as ComponentType<any>;
const DoctorSelectPrescriptionPatientStackScreen = DoctorSelectPrescriptionPatientScreen as ComponentType<any>;
const DoctorPrescriptionStackScreen = DoctorPrescriptionScreen as ComponentType<any>;
const DoctorSelectNotePatientStackScreen = DoctorSelectNotePatientScreen as ComponentType<any>;
const DoctorAddNoteStackScreen = DoctorAddNoteScreen as ComponentType<any>;
const DoctorAvailabilityStackScreen = DoctorAvailabilityScreen as ComponentType<any>;
const ReminderSettingsStackScreen = ReminderSettingsScreen as ComponentType<any>;
const SafetyResponseSettingsStackScreen = SafetyResponseSettingsScreen as ComponentType<any>;
const LanguageAccessibilityStackScreen = LanguageAccessibilityScreen as ComponentType<any>;
const PrivacySecurityStackScreen = PrivacySecurityScreen as ComponentType<any>;
const AdminAuditLogsStackScreen = AdminAuditLogsScreen as ComponentType<any>;
const AdminAuditLogDetailStackScreen = AdminAuditLogDetailScreen as ComponentType<any>;
const NotificationsStackScreen = NotificationsScreen as ComponentType<any>;

const CriticalVitalWatcher = () => {
  const { lastSyncedReading } = useHealthConnectDevice();
  const lastHandledReadingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastSyncedReading) return;
    if (lastSyncedReading.status !== "CRITICAL") return;
    if (!lastSyncedReading.id) return;
    if (lastHandledReadingIdRef.current === lastSyncedReading.id) return;
    if (!navigationRef.isReady()) return;

    const currentRoute = navigationRef.getCurrentRoute();

    if (currentRoute?.name === "SafetyResponse" || currentRoute?.name === "VideoConsultation" || currentRoute?.name === "ConsultationEnded") return;

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
      <LanguageProvider>
        <HealthConnectDeviceProvider>
          <NavigationContainer ref={navigationRef}>
            <FCMInitializer />
            <CriticalVitalWatcher />

            <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
              <Stack.Screen name="PatientSignup" component={PatientSignupScreen} />
              <Stack.Screen name="DoctorSignup" component={DoctorSignupScreen} />
              <Stack.Screen name="PharmacySignup" component={PharmacySignupScreen} />
              <Stack.Screen name="PharmacyPendingApproval" component={PharmacyPendingApprovalScreen} />
              <Stack.Screen name="DoctorPendingApproval" component={DoctorPendingApprovalScreen} />
              <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

              <Stack.Screen name="PatientTabs" component={PatientTabNavigator} />
              <Stack.Screen name="DoctorTabs" component={DoctorTabNavigator} />

              <Stack.Screen name="DoctorPatientDetail" component={DoctorPatientDetailStackScreen} />
              <Stack.Screen name="DoctorPatientReports" component={DoctorPatientReportsStackScreen} />
              <Stack.Screen name="DoctorReportReviews" component={DoctorReportReviewsStackScreen} />
              <Stack.Screen name="DoctorReportReview" component={DoctorReportReviewStackScreen} />
              <Stack.Screen name="DoctorSelectPrescriptionPatient" component={DoctorSelectPrescriptionPatientStackScreen} />
              <Stack.Screen name="DoctorPrescription" component={DoctorPrescriptionStackScreen} />
              <Stack.Screen name="DoctorSelectNotePatient" component={DoctorSelectNotePatientStackScreen} />
              <Stack.Screen name="DoctorAddNote" component={DoctorAddNoteStackScreen} />
              <Stack.Screen name="DoctorAvailability" component={DoctorAvailabilityStackScreen} />

              <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
              <Stack.Screen name="PharmacyDashboard" component={PharmacyDashboardScreen} />
              <Stack.Screen name="Notifications" component={NotificationsStackScreen} />
              <Stack.Screen name="AdminDashboard" component={AdminTabsLegacyScreen} />
              <Stack.Screen name="AdminDoctorVerificationDetail" component={AdminDoctorVerificationDetailScreen} />
              <Stack.Screen name="AdminPharmacyVerificationDetail" component={AdminPharmacyVerificationDetailScreen} />
              <Stack.Screen name="AdminAuditLogs" component={AdminAuditLogsStackScreen} />
              <Stack.Screen name="AdminAuditLogDetail" component={AdminAuditLogDetailStackScreen} />
              <Stack.Screen name="AdminRegisterWebView" component={AdminRegisterWebViewScreen} />

              <Stack.Screen name="PatientProfile" component={PatientProfileScreen} />
              <Stack.Screen name="EditPatientProfile" component={EditPatientProfileStackScreen} />
              <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesStackScreen} />
              <Stack.Screen name="ReminderSettings" component={ReminderSettingsStackScreen} />
              <Stack.Screen name="SafetyResponseSettings" component={SafetyResponseSettingsStackScreen} />
              <Stack.Screen name="LanguageAccessibility" component={LanguageAccessibilityStackScreen} />
              <Stack.Screen name="PrivacySecurity" component={PrivacySecurityStackScreen} />
              <Stack.Screen name="SelectDoctor" component={SelectDoctorStackScreen} />
              <Stack.Screen name="PatientActiveCalls" component={PatientActiveCallsStackScreen} />
              <Stack.Screen name="MedicineUpdates" component={MedicineUpdatesStackScreen} />
              <Stack.Screen name="PatientReports" component={PatientReportsStackScreen} />
              <Stack.Screen name="PatientUploadReport" component={PatientUploadReportStackScreen} />
              <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
              <Stack.Screen name="ConfirmReminder" component={ConfirmReminderScreen} />
              <Stack.Screen name="ScanMedicine" component={ScanMedicineScreen} />
              <Stack.Screen name="ScanMedicineResult" component={ScanMedicineResultScreen} />
              <Stack.Screen name="PrescriptionScanResult" component={PrescriptionScanResultScreen} />
              <Stack.Screen name="ConnectedDevice" component={ConnectedDeviceStackScreen} />
              <Stack.Screen name="ManualSafetyResponse" component={ManualSafetyResponseScreen} />
              <Stack.Screen name="SafetyResponse" component={SafetyResponseScreen} />
              <Stack.Screen name="VideoConsultation" component={VideoConsultationScreen} />
              <Stack.Screen name="ConsultationEnded" component={ConsultationEndedScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </HealthConnectDeviceProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
};