import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { PatientBottomTabBar } from "../components/patient/PatientBottomTabBar";
import { ConsultationsScreen } from "../screens/patient/ConsultationsScreen";
import { MedicinesScreen } from "../screens/patient/MedicinesScreen";
import { PatientDashboardScreen } from "../screens/patient/PatientDashboardScreen";
import { PatientOrdersScreen } from "../screens/patient/PatientOrdersScreen";
import { VitalsScreen } from "../screens/patient/VitalsScreen";
import type {
  PatientTabParamList,
  RootStackParamList,
} from "../types/navigation";

type PatientTabNavigatorProps = NativeStackScreenProps<
  RootStackParamList,
  "PatientTabs"
>;

const Tab = createBottomTabNavigator<PatientTabParamList>();

export const PatientTabNavigator = ({ route }: PatientTabNavigatorProps) => {
  const user = route.params?.user;
  const initialScreen = route.params?.screen || "Home";

  return (
    <Tab.Navigator
      initialRouteName={initialScreen}
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <PatientBottomTabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={PatientDashboardScreen}
        initialParams={{
          user,
        }}
      />

      <Tab.Screen name="Medicines" component={MedicinesScreen} />

      <Tab.Screen name="Vitals" component={VitalsScreen} />

      <Tab.Screen name="Consultations" component={ConsultationsScreen} />

      <Tab.Screen name="PatientOrders" component={PatientOrdersScreen} />
    </Tab.Navigator>
  );
};