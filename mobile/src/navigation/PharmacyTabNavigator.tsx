import type { ComponentType } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ClipboardList, LayoutDashboard, Pill, ShieldCheck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "../context/LanguageContext";
import { PharmacyDashboardScreen } from "../screens/pharmacy/PharmacyDashboardScreen";
import PharmacyOrdersScreen from "../screens/pharmacy/PharmacyOrdersScreen";
import PharmacyInventoryScreen from "../screens/pharmacy/PharmacyInventoryScreen";
import PharmacyExemptionReviewsScreen from "../screens/pharmacy/PharmacyExemptionReviewsScreen";
import type { PharmacyTabParamList, RootStackParamList } from "../types/navigation";

type PharmacyTabNavigatorProps = NativeStackScreenProps<RootStackParamList, "PharmacyTabs">;

const Tab = createBottomTabNavigator<PharmacyTabParamList>();

const PharmacyDashboardTabScreen = PharmacyDashboardScreen as ComponentType<any>;
const PharmacyOrdersTabScreen = PharmacyOrdersScreen as ComponentType<any>;
const PharmacyInventoryTabScreen = PharmacyInventoryScreen as ComponentType<any>;
const PharmacyReviewsTabScreen = PharmacyExemptionReviewsScreen as ComponentType<any>;

const SURFACE = "#FFFFFF";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PHARMACY = "#15803D";

export const PharmacyTabNavigator = ({ route }: PharmacyTabNavigatorProps) => {
  const insets = useSafeAreaInsets();
  const { scaleFont } = useLanguage();

  const user = route.params?.user;
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PHARMACY,
        tabBarInactiveTintColor: MUTED,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: SURFACE,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: 58 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarLabelStyle: {
          fontSize: scaleFont(10),
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={PharmacyDashboardTabScreen}
        initialParams={{ user }}
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={21} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="Orders"
        component={PharmacyOrdersTabScreen}
        initialParams={{ title: "Pharmacy orders" }}
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => (
            <ClipboardList size={21} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="Inventory"
        component={PharmacyInventoryTabScreen}
        options={{
          title: "Inventory",
          tabBarIcon: ({ color }) => (
            <Pill size={21} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="Reviews"
        component={PharmacyReviewsTabScreen}
        initialParams={{ status: "PENDING" }}
        options={{
          title: "Exemptions",
          tabBarIcon: ({ color }) => (
            <ShieldCheck size={21} color={color} strokeWidth={2.5} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default PharmacyTabNavigator;