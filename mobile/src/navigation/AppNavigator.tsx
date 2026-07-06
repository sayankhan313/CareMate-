import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SplashScreen } from "../screens/auth/SplashScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RoleSelectionScreen } from "../screens/auth/RoleSelectionScreen";
import { PatientSignupScreen } from "../screens/auth/PatientSignupScreen";
import { EmailVerificationScreen } from "../screens/auth/EmailVerificationScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";

import { WelcomeScreen } from "../screens/onboarding/WelcomeScreen";
import { AddMedicineScreen } from "../screens/patient/AddMedicineScreen";
import { ConfirmReminderScreen } from "../screens/patient/ConfirmReminderScreen";
import { PatientTabNavigator } from "./PatientTabNavigator";
import { ConnectedDeviceScreen } from "../screens/patient/ConnectedDeviceScreen";
import type { RootStackParamList } from "../types/navigation";
import { HealthConnectDeviceProvider } from "../context/HealthConnectDeviceContext";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    
<HealthConnectDeviceProvider>


    <NavigationContainer>
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

        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        <Stack.Screen name="PatientTabs" component={PatientTabNavigator} />

        <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />

        <Stack.Screen
          name="ConfirmReminder"
          component={ConfirmReminderScreen}
        />

        <Stack.Screen
  name="ConnectedDevice"
  component={ConnectedDeviceScreen}
  options={{ headerShown: false }}
/>
      </Stack.Navigator>
    </NavigationContainer>
    </HealthConnectDeviceProvider>
  );
};