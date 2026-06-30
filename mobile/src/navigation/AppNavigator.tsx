import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SplashScreen } from "../screens/auth/SplashScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RoleSelectionScreen } from "../screens/auth/RoleSelectionScreen";
import { PatientSignupScreen } from "../screens/auth/PatientSignupScreen";
import { EmailVerificationScreen } from "../screens/auth/EmailVerificationScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import { PatientDashboardScreen } from "../screens/patient/PatientDashboardScreen";
import type { RootStackParamList } from "../types/navigation";
import { WelcomeScreen } from "../screens/onboarding/WelcomeScreen";
const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
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

        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        <Stack.Screen
          name="PatientDashboard"
          component={PatientDashboardScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};