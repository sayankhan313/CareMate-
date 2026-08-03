import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, Home, Package, Pill, Video } from "lucide-react-native";

import { useLanguage } from "../../context/LanguageContext";
import { colors } from "../../constants/colors";

const ACTIVE_COLOR = colors.primary;
const INACTIVE_COLOR = "#8A94A6";

type TabIconProps = { routeName: string; focused: boolean };

const TabIcon = ({ routeName, focused }: TabIconProps) => {
  const iconColor = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
  const iconStrokeWidth = focused ? 2.6 : 2.2;

  if (routeName === "Medicines") return <Pill size={25} color={iconColor} strokeWidth={iconStrokeWidth} />;
  if (routeName === "Vitals") return <Activity size={26} color={iconColor} strokeWidth={iconStrokeWidth} />;
  if (routeName === "Consultations") return <Video size={25} color={iconColor} strokeWidth={iconStrokeWidth} />;
  if (routeName === "PatientOrders") return <Package size={25} color={iconColor} strokeWidth={iconStrokeWidth} />;
  return <Home size={25} color={iconColor} strokeWidth={iconStrokeWidth} />;
};

export const PatientBottomTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { t, palette, scaleFont } = useLanguage();

  const getTabLabel = (routeName: string) => {
    if (routeName === "Medicines") return t("tabs.patient.medicines");
    if (routeName === "Vitals") return t("tabs.patient.vitals");
    if (routeName === "Consultations") return t("tabs.patient.consult");
    if (routeName === "PatientOrders") return t("tabs.patient.orders");
    return t("tabs.patient.home");
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: palette.surface, borderTopColor: palette.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[styles.tabBar, { backgroundColor: palette.surface }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const label = getTabLabel(route.name);

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity key={route.key} style={styles.tabItem} onPress={onPress} activeOpacity={0.75} accessibilityRole="tab" accessibilityState={{ selected: isFocused }} accessibilityLabel={label}>
              <View style={styles.iconWrapper}><TabIcon routeName={route.name} focused={isFocused} /></View>
              <Text style={[styles.label, { fontSize: scaleFont(12), color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR }]} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { borderTopWidth: 1 },
  tabBar: { height: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 8 },
  tabItem: { flex: 1, height: 58, alignItems: "center", justifyContent: "center" },
  iconWrapper: { height: 28, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  label: { fontWeight: "700" },
});
