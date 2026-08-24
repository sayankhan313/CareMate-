import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, CreditCard, Package, RefreshCw, Store, Truck } from "lucide-react-native";

import { caregiverPharmacyOrderApi, type CaregiverPharmacyOrder } from "../../services/caregiver/caregiverPharmacyOrderApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "CaregiverPharmacyOrders">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#F6A545";
const PRIMARY_DARK = "#8A520E";
const PRIMARY_LIGHT = "#FFF3E2";
const SUCCESS = "#3A9D75";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#E8F7F0";
const WARNING = "#D18425";
const WARNING_DARK = "#9A5B12";
const WARNING_LIGHT = "#FFF3E1";
const DANGER = "#DC4C57";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FDEBED";
const BLUE = "#5579D9";
const BLUE_LIGHT = "#EDF2FF";

const ACTIVE = new Set(["RECEIVED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"]);
const COMPLETED = new Set(["DELIVERED", "COLLECTED"]);
const ATTENTION = new Set(["REJECTED", "DELAYED", "OUT_OF_STOCK", "CANCELLED"]);

const formatStatus = (value: string) => value.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

const formatDate = (value?: string | null) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const getTone = (status: string) => {
  if (COMPLETED.has(status)) return { background: SUCCESS_LIGHT, color: SUCCESS_DARK };
  if (ATTENTION.has(status)) return { background: DANGER_LIGHT, color: DANGER_DARK };
  if (status === "READY") return { background: BLUE_LIGHT, color: BLUE };
  return { background: WARNING_LIGHT, color: WARNING_DARK };
};

export const CaregiverPharmacyOrdersScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<CaregiverPharmacyOrder[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, completed: 0, needsAttention: 0 });
  const [patientName, setPatientName] = useState(route.params.patientName || "Patient");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await caregiverPharmacyOrderApi.listPatientOrders(route.params.patientId);
      setOrders(result.orders);
      setSummary(result.summary);
      setPatientName(result.patient.fullName);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load pharmacy orders.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [route.params.patientId]);

  useFocusEffect(useCallback(() => {
    void loadOrders("initial");
  }, [loadOrders]));

  const activeOrders = useMemo(() => orders.filter(order => ACTIVE.has(order.status)), [orders]);
  const attentionOrders = useMemo(() => orders.filter(order => ATTENTION.has(order.status)), [orders]);
  const historyOrders = useMemo(() => orders.filter(order => COMPLETED.has(order.status)), [orders]);

  const openOrder = (order: CaregiverPharmacyOrder) => {
    navigation.navigate("CaregiverPharmacyOrderDetail", { patientId: route.params.patientId, patientName, orderId: order.id });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.82} onPress={() => navigation.goBack()}>
            <ChevronLeft size={23} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Pharmacy orders</Text>
            <Text style={styles.headerSubtitle}>{patientName}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 30, 46) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadOrders("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading orders</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateCard}>
              <View style={styles.errorIcon}><RefreshCw size={24} color={DANGER} strokeWidth={2.6} /></View>
              <Text style={styles.stateTitle}>Couldn't load orders</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => void loadOrders("initial")}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <LinearGradient colors={[PRIMARY, "#F2B75D"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <View style={styles.heroIcon}><Package size={28} color={PRIMARY_DARK} strokeWidth={2.6} /></View>

                  <View style={styles.heroText}>
                    <Text style={styles.heroEyebrow}>PHARMACY TRACKING</Text>
                    <Text style={styles.heroTitle}>Medicine orders</Text>
                    <Text style={styles.heroSubtitle}>Track fulfilment and delivery progress</Text>
                  </View>
                </View>

                <View style={styles.heroStats}>
                  <HeroStat value={summary.active} label="Active" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={summary.completed} label="Completed" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={summary.needsAttention} label="Attention" />
                </View>
              </LinearGradient>

              {attentionOrders.length ? (
                <>
                  <SectionTitle title="Needs attention" subtitle="Orders with an issue or change" count={attentionOrders.length} danger />
                  <View style={styles.stack}>{attentionOrders.map(order => <OrderCard key={order.id} order={order} onPress={() => openOrder(order)} />)}</View>
                </>
              ) : null}

              <SectionTitle title="Active orders" subtitle="Current pharmacy progress" count={activeOrders.length} />

              {activeOrders.length ? (
                <View style={styles.stack}>{activeOrders.map(order => <OrderCard key={order.id} order={order} onPress={() => openOrder(order)} />)}</View>
              ) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}><CheckCircle2 size={26} color={SUCCESS_DARK} strokeWidth={2.6} /></View>
                  <Text style={styles.emptyTitle}>No active orders</Text>
                  <Text style={styles.emptyText}>Current pharmacy orders will appear here.</Text>
                </View>
              )}

              {historyOrders.length ? (
                <>
                  <SectionTitle title="Completed" subtitle="Delivered and collected orders" count={historyOrders.length} />
                  <View style={styles.stack}>{historyOrders.map(order => <OrderCard key={order.id} order={order} onPress={() => openOrder(order)} />)}</View>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SectionTitle = ({ title, subtitle, count, danger = false }: { title: string; subtitle: string; count: number; danger?: boolean }) => (
  <View style={styles.sectionHeader}>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>

    {count > 0 ? <View style={[styles.countBadge, danger ? styles.countBadgeDanger : undefined]}><Text style={styles.countText}>{count}</Text></View> : null}
  </View>
);

const OrderCard = ({ order, onPress }: { order: CaregiverPharmacyOrder; onPress: () => void }) => {
  const tone = getTone(order.status);
  const displayMedicine = order.items[0]?.name || order.medicine.name || "Medicine order";

  return (
    <TouchableOpacity style={styles.orderCard} activeOpacity={0.86} onPress={onPress}>
      <View style={styles.orderTop}>
        <View style={[styles.orderIcon, { backgroundColor: tone.background }]}>
          {order.status === "OUT_FOR_DELIVERY" ? <Truck size={21} color={tone.color} strokeWidth={2.5} /> : ATTENTION.has(order.status) ? <AlertTriangle size={21} color={tone.color} strokeWidth={2.5} /> : <Package size={21} color={tone.color} strokeWidth={2.5} />}
        </View>

        <View style={styles.orderTitleBlock}>
          <Text style={styles.orderMedicine}>{displayMedicine}</Text>
          <Text style={styles.orderNumber}>Order {order.orderNumber}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
          <Text style={[styles.statusText, { color: tone.color }]}>{formatStatus(order.status)}</Text>
        </View>
      </View>

      <View style={styles.orderMeta}>
        <View style={styles.metaRow}>
          <Store size={15} color={BLUE} strokeWidth={2.4} />
          <Text style={styles.metaText}>{order.pharmacy?.pharmacyName || "Pharmacy not assigned"}</Text>
        </View>

        <View style={styles.metaRow}>
          <Clock3 size={15} color={MUTED} strokeWidth={2.4} />
          <Text style={styles.metaText}>{formatDate(order.updatedAt)}</Text>
        </View>
      </View>

      {order.payment ? (
        <View style={styles.paymentRow}>
          <CreditCard size={15} color={order.payment.status === "PAID" ? SUCCESS_DARK : WARNING_DARK} strokeWidth={2.5} />
          <Text style={[styles.paymentText, { color: order.payment.status === "PAID" ? SUCCESS_DARK : WARNING_DARK }]}>Payment {formatStatus(order.payment.status)}</Text>
        </View>
      ) : null}

      <View style={styles.viewRow}>
        <Text style={styles.viewText}>View order progress</Text>
        <ChevronRight size={18} color={PRIMARY_DARK} strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
};

const HeroStat = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.heroStat}>
    <Text style={styles.heroStatValue}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { height: 68, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerText: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 20, fontWeight: "800" },
  headerSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 2 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 5 },
  heroCard: { borderRadius: 23, padding: 18 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 13 },
  heroText: { flex: 1 },
  heroEyebrow: { color: "#FFF8EC", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: SURFACE, fontSize: 21, fontWeight: "800", marginTop: 4 },
  heroSubtitle: { color: "#FFF8EC", fontSize: 10, fontWeight: "600", marginTop: 3 },
  heroStats: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 15, marginTop: 18, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: SURFACE, fontSize: 20, fontWeight: "800" },
  heroStatLabel: { color: "#FFF8EC", fontSize: 8, fontWeight: "700", marginTop: 3 },
  heroDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.28)" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 21, marginBottom: 10, paddingHorizontal: 2 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },
  countBadge: { minWidth: 30, height: 30, borderRadius: 10, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  countBadgeDanger: { backgroundColor: DANGER },
  countText: { color: SURFACE, fontSize: 11, fontWeight: "800" },
  stack: { gap: 11 },
  orderCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: BORDER },
  orderTop: { flexDirection: "row", alignItems: "center" },
  orderIcon: { width: 47, height: 47, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 10 },
  orderTitleBlock: { flex: 1, paddingRight: 7 },
  orderMedicine: { color: TEXT, fontSize: 13, fontWeight: "800" },
  orderNumber: { color: MUTED, fontSize: 8, fontWeight: "600", marginTop: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  statusText: { fontSize: 7.5, fontWeight: "800" },
  orderMeta: { backgroundColor: "#F7F8FC", borderRadius: 12, padding: 10, marginTop: 11 },
  metaRow: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
  metaText: { color: MUTED, fontSize: 9, fontWeight: "600", marginLeft: 7 },
  paymentRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  paymentText: { fontSize: 9, fontWeight: "800", marginLeft: 6 },
  viewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  viewText: { color: PRIMARY_DARK, fontSize: 9, fontWeight: "800" },
  emptyCard: { backgroundColor: SUCCESS_LIGHT, borderRadius: 18, padding: 28, alignItems: "center" },
  emptyIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontSize: 14, fontWeight: "800", marginTop: 12 },
  emptyText: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 4 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 30, alignItems: "center" },
  errorIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 5 },
  retryButton: { backgroundColor: PRIMARY, borderRadius: 11, paddingHorizontal: 17, paddingVertical: 10, marginTop: 15 },
  retryText: { color: SURFACE, fontSize: 11, fontWeight: "700" },
});