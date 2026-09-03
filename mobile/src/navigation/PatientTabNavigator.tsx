import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { PatientBottomTabBar } from "../components/patient/PatientBottomTabBar";
import { useLanguage } from "../context/LanguageContext";
import ConsultationsScreen from "../screens/patient/ConsultationsScreen";
import MedicinesScreen from "../screens/patient/MedicinesScreen";
import { PatientDashboardScreen } from "../screens/patient/PatientDashboardScreen";
import { PatientOrdersScreen } from "../screens/patient/PatientOrdersScreen";
import { VitalsScreen } from "../screens/patient/VitalsScreen";
import type { PatientTabParamList, RootStackParamList } from "../types/navigation";

type PatientTabNavigatorProps = NativeStackScreenProps<RootStackParamList, "PatientTabs">;

const Tab = createBottomTabNavigator<PatientTabParamList>();

export const PatientTabNavigator = ({ route }: PatientTabNavigatorProps) => {
  const { t } = useLanguage();
  const user = route.params?.user;
  const initialScreen = route.params?.screen || "Home";

  return (
    <Tab.Navigator initialRouteName={initialScreen} screenOptions={{ headerShown: false }} tabBar={props => <PatientBottomTabBar {...props} />}>
      <Tab.Screen name="Home" component={PatientDashboardScreen} initialParams={{ user }} options={{ title: t("tabs.patient.home") }} />
      <Tab.Screen name="Medicines" component={MedicinesScreen} options={{ title: t("tabs.patient.medicines") }} />
      <Tab.Screen name="Vitals" component={VitalsScreen} options={{ title: t("tabs.patient.vitals") }} />
      <Tab.Screen name="Consultations" component={ConsultationsScreen} options={{ title: t("tabs.patient.consult") }} />
      <Tab.Screen name="PatientOrders" component={PatientOrdersScreen} options={{ title: t("tabs.patient.orders") }} />
    </Tab.Navigator>
  );
};