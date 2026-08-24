import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, ChevronLeft, Clock3, CreditCard, FileCheck2, Package, RefreshCw, Store, Stethoscope, Truck } from "lucide-react-native";

import { caregiverPharmacyOrderApi, type CaregiverPharmacyOrder } from "../../services/caregiver/caregiverPharmacyOrderApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "CaregiverPharmacyOrderDetail">;

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
const DANGER = "#DC4C57";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FDEBED";
const BLUE = "#5579D9";
const BLUE_LIGHT = "#EDF2FF";

const formatStatus = (value?: string | null) => value ? value.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") : "Not recorded";

const formatDate = (value?: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatMoney = (amountPence: number | null, currency: string) => {
  if (amountPence === null) return "Not set";
  const amount = (amountPence / 100).toFixed(2);
  return currency.toUpperCase() === "GBP" ? `£${amount}` : `${currency.toUpperCase()} ${amount}`;
};

export const CaregiverPharmacyOrderDetailScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<CaregiverPharmacyOrder | null>(null);
  const [patientName, setPatientName] = useState(route.params.patientName || "Patient");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrder = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await caregiverPharmacyOrderApi.getPatientOrder(route.params.patientId, route.params.orderId);
      setOrder(result.order);
      setPatientName(result.patient.fullName);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load pharmacy order.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [route.params.orderId, route.params.patientId]);

  useFocusEffect(useCallback(() => {
    void loadOrder("initial");
  }, [loadOrder]));

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={23} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Order details</Text>
            <Text style={styles.headerSubtitle}>{patientName}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 30, 46) }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadOrder("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? <View style={styles.stateCard}><ActivityIndicator color={PRIMARY} /><Text style={styles.stateTitle}>Loading order</Text></View> : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateCard}>
              <RefreshCw size={27} color={DANGER} strokeWidth={2.6} />
              <Text style={styles.stateTitle}>Couldn't load order</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
            </View>
          ) : null}

          {!isLoading && !errorMessage && order ? (
            <>
              <LinearGradient colors={[PRIMARY, "#F2B75D"]} style={styles.heroCard}>
                <View style={styles.heroIcon}><Package size={29} color={PRIMARY_DARK} strokeWidth={2.6} /></View>
                <Text style={styles.heroEyebrow}>ORDER {order.orderNumber}</Text>
                <Text style={styles.heroTitle}>{formatStatus(order.status)}</Text>
                <Text style={styles.heroSubtitle}>Updated {formatDate(order.updatedAt)}</Text>
              </LinearGradient>

              {order.statusReason ? (
                <View style={styles.reasonCard}>
                  <Text style={styles.reasonLabel}>Status update</Text>
                  <Text style={styles.reasonText}>{order.statusReason}</Text>
                </View>
              ) : null}

              <SectionTitle title="Pharmacy" />

              <InfoCard icon={<Store size={21} color={BLUE} strokeWidth={2.5} />} title={order.pharmacy?.pharmacyName || "Not assigned"} subtitle={[order.pharmacy?.city, order.pharmacy?.postcode].filter(Boolean).join(" · ") || "Pharmacy details unavailable"} />

              <SectionTitle title="Medicines" />

              <View style={styles.card}>
                {order.items.length ? order.items.map((item, index) => (
                  <View key={item.id} style={[styles.itemRow, index === order.items.length - 1 ? styles.lastRow : undefined]}>
                    <View style={styles.itemIcon}><Package size={18} color={PRIMARY_DARK} strokeWidth={2.5} /></View>
                    <View style={styles.itemText}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemMeta}>{item.dose || "Dose not recorded"} · {item.quantity} {item.quantityUnit || "unit"}{item.quantity === 1 ? "" : "s"}</Text>
                      {item.dispensedQuantity !== null ? <Text style={styles.dispensedText}>Dispensed: {item.dispensedQuantity}</Text> : null}
                    </View>
                  </View>
                )) : (
                  <View style={styles.itemRow}>
                    <View style={styles.itemIcon}><Package size={18} color={PRIMARY_DARK} strokeWidth={2.5} /></View>
                    <View style={styles.itemText}>
                      <Text style={styles.itemName}>{order.medicine.name || "Medicine"}</Text>
                      <Text style={styles.itemMeta}>{order.medicine.dose || "Dose not recorded"}</Text>
                    </View>
                  </View>
                )}
              </View>

              {order.payment ? (
                <>
                  <SectionTitle title="Payment" />

                  <View style={styles.paymentCard}>
                    <View style={styles.paymentIcon}><CreditCard size={21} color={SUCCESS_DARK} strokeWidth={2.5} /></View>
                    <View style={styles.paymentTextBlock}>
                      <Text style={styles.paymentAmount}>{formatMoney(order.payment.amountPence, order.payment.currency)}</Text>
                      <Text style={styles.paymentStatus}>{formatStatus(order.payment.status)}</Text>
                      <Text style={styles.paymentPreference}>{formatStatus(order.payment.chargePreference)}</Text>
                    </View>
                    {order.payment.paidAt ? <CheckCircle2 size={22} color={SUCCESS_DARK} strokeWidth={2.6} /> : null}
                  </View>
                </>
              ) : null}

              {order.verification || order.doctor ? (
                <>
                  <SectionTitle title="Prescription review" />

                  <View style={styles.card}>
                    {order.doctor ? (
                      <View style={styles.infoRow}>
                        <View style={styles.infoIcon}><Stethoscope size={19} color={BLUE} strokeWidth={2.5} /></View>
                        <View style={styles.infoText}>
                          <Text style={styles.infoLabel}>Doctor</Text>
                          <Text style={styles.infoValue}>{order.doctor.fullName}</Text>
                          {order.doctor.specialization ? <Text style={styles.infoSub}>{order.doctor.specialization}</Text> : null}
                        </View>
                      </View>
                    ) : null}

                    {order.verification ? (
                      <View style={styles.infoRow}>
                        <View style={styles.infoIcon}><FileCheck2 size={19} color={PRIMARY_DARK} strokeWidth={2.5} /></View>
                        <View style={styles.infoText}>
                          <Text style={styles.infoLabel}>Verification</Text>
                          <Text style={styles.infoValue}>{formatStatus(order.verification.doctorVerificationStatus || order.verification.status)}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : null}

              <SectionTitle title="Order progress" />

              <View style={styles.timelineCard}>
                <TimelineRow title="Order received" time={order.createdAt} complete />

                {order.timeline.map(item => (
                  <TimelineRow key={item.id} title={formatStatus(item.toStatus)} time={item.createdAt} complete />
                ))}

                {order.timeline.length === 0 ? <Text style={styles.timelineEmpty}>Further updates will appear here.</Text> : null}
              </View>

              <View style={styles.readOnlyCard}>
                <Truck size={20} color={PRIMARY_DARK} strokeWidth={2.5} />
                <View style={styles.readOnlyText}>
                  <Text style={styles.readOnlyTitle}>Tracking only</Text>
                  <Text style={styles.readOnlySubtitle}>You can monitor this order. Pharmacy actions and payment remain with the patient and pharmacy.</Text>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SectionTitle = ({ title }: { title: string }) => <Text style={styles.sectionTitle}>{title}</Text>;

const InfoCard = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <View style={styles.infoCard}>
    <View style={styles.infoCardIcon}>{icon}</View>
    <View style={styles.infoCardText}>
      <Text style={styles.infoCardTitle}>{title}</Text>
      <Text style={styles.infoCardSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

const TimelineRow = ({ title, time, complete }: { title: string; time: string; complete: boolean }) => (
  <View style={styles.timelineRow}>
    <View style={styles.timelineSide}>
      <View style={[styles.timelineDot, complete ? styles.timelineDotComplete : undefined]} />
      <View style={styles.timelineLine} />
    </View>
    <View style={styles.timelineText}>
      <Text style={styles.timelineTitle}>{title}</Text>
      <Text style={styles.timelineTime}>{formatDate(time)}</Text>
    </View>
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
  content: { paddingHorizontal: 16, paddingTop: 5 },
  heroCard: { borderRadius: 23, padding: 18 },
  heroIcon: { width: 57, height: 57, borderRadius: 18, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  heroEyebrow: { color: "#FFF8EC", fontSize: 8, fontWeight: "800", letterSpacing: 1, marginTop: 15 },
  heroTitle: { color: SURFACE, fontSize: 23, fontWeight: "800", marginTop: 4 },
  heroSubtitle: { color: "#FFF8EC", fontSize: 9, fontWeight: "600", marginTop: 4 },
  reasonCard: { backgroundColor: DANGER_LIGHT, borderRadius: 15, padding: 13, marginTop: 12 },
  reasonLabel: { color: DANGER_DARK, fontSize: 8, fontWeight: "800" },
  reasonText: { color: DANGER_DARK, fontSize: 10, lineHeight: 15, fontWeight: "600", marginTop: 4 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "800", marginTop: 21, marginBottom: 9 },
  infoCard: { backgroundColor: BLUE_LIGHT, borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center" },
  infoCardIcon: { width: 47, height: 47, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  infoCardText: { flex: 1 },
  infoCardTitle: { color: TEXT, fontSize: 13, fontWeight: "800" },
  infoCardSubtitle: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },
  card: { backgroundColor: SURFACE, borderRadius: 17, paddingHorizontal: 13 },
  itemRow: { minHeight: 70, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  lastRow: { borderBottomWidth: 0 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  itemText: { flex: 1 },
  itemName: { color: TEXT, fontSize: 12, fontWeight: "800" },
  itemMeta: { color: MUTED, fontSize: 8.5, fontWeight: "600", marginTop: 3 },
  dispensedText: { color: SUCCESS_DARK, fontSize: 8, fontWeight: "700", marginTop: 3 },
  paymentCard: { backgroundColor: SUCCESS_LIGHT, borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center" },
  paymentIcon: { width: 47, height: 47, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  paymentTextBlock: { flex: 1 },
  paymentAmount: { color: TEXT, fontSize: 15, fontWeight: "800" },
  paymentStatus: { color: SUCCESS_DARK, fontSize: 9, fontWeight: "800", marginTop: 3 },
  paymentPreference: { color: MUTED, fontSize: 8, fontWeight: "600", marginTop: 2 },
  infoRow: { minHeight: 67, flexDirection: "row", alignItems: "center" },
  infoIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: BLUE_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  infoText: { flex: 1 },
  infoLabel: { color: MUTED, fontSize: 8, fontWeight: "700" },
  infoValue: { color: TEXT, fontSize: 11, fontWeight: "800", marginTop: 2 },
  infoSub: { color: BLUE, fontSize: 8, fontWeight: "600", marginTop: 2 },
  timelineCard: { backgroundColor: SURFACE, borderRadius: 17, padding: 14 },
  timelineRow: { minHeight: 57, flexDirection: "row" },
  timelineSide: { width: 28, alignItems: "center" },
  timelineDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: BORDER, marginTop: 4 },
  timelineDotComplete: { backgroundColor: SUCCESS },
  timelineLine: { width: 2, flex: 1, backgroundColor: BORDER, marginVertical: 4 },
  timelineText: { flex: 1, paddingLeft: 7 },
  timelineTitle: { color: TEXT, fontSize: 10, fontWeight: "800" },
  timelineTime: { color: MUTED, fontSize: 8, fontWeight: "600", marginTop: 3 },
  timelineEmpty: { color: MUTED, fontSize: 9, fontWeight: "600", marginLeft: 35, marginBottom: 7 },
  readOnlyCard: { backgroundColor: PRIMARY_LIGHT, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", marginTop: 18 },
  readOnlyText: { flex: 1, marginLeft: 10 },
  readOnlyTitle: { color: PRIMARY_DARK, fontSize: 11, fontWeight: "800" },
  readOnlySubtitle: { color: "#7F6B53", fontSize: 8.5, lineHeight: 13, fontWeight: "600", marginTop: 3 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 30, alignItems: "center" },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 5 },
});