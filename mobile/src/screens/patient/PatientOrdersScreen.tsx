import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  CheckCircle2,
  Circle,
  Clock3,
  PackageCheck,
  Pill,
  RefreshCcw,
  Truck,
} from "lucide-react-native";

type OrderStepStatus = "COMPLETED" | "ACTIVE" | "PENDING";

type OrderStep = {
  id: string;
  title: string;
  description: string;
  status: OrderStepStatus;
};

type RefillMedicine = {
  id: string;
  name: string;
  doctorName: string;
  remainingDays: number;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";

const SUCCESS = "#42B883";
const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";

const orderSteps: OrderStep[] = [
  {
    id: "received",
    title: "Received",
    description: "Order confirmed by pharmacy",
    status: "COMPLETED",
  },
  {
    id: "preparing",
    title: "Preparing",
    description: "Medicine being prepared",
    status: "ACTIVE",
  },
  {
    id: "ready",
    title: "Ready for collection",
    description: "Waiting for processing",
    status: "PENDING",
  },
  {
    id: "collected",
    title: "Collected",
    description: "Order completion",
    status: "PENDING",
  },
];

const refillMedicines: RefillMedicine[] = [
  {
    id: "metformin",
    name: "Metformin 500mg",
    doctorName: "Dr. Fahad Zariwala",
    remainingDays: 3,
  },
  {
    id: "amlodipine",
    name: "Amlodipine 5mg",
    doctorName: "Dr. Fahad Zariwala",
    remainingDays: 5,
  },
];

export const PatientOrdersScreen = () => {
  const insets = useSafeAreaInsets();

  const handleRequestFulfilment = (medicineName: string) => {
    Alert.alert(
      "Demo pharmacy request",
      `${medicineName} refill request is shown as a demo. Pharmacy backend will be connected later.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <Text style={styles.appBarTitle}>Pharmacy Orders</Text>
          <Text style={styles.appBarSubtitle}>
            Track prescriptions and request refills
          </Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(120, insets.bottom + 110),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.orderCard}>
            <View style={styles.orderTopRow}>
              <View style={styles.orderIdRow}>
                <View style={styles.orderIconCircle}>
                  <PackageCheck size={18} color={PRIMARY} strokeWidth={2.5} />
                </View>

                <View>
                  <Text style={styles.orderLabel}>Active order</Text>
                  <Text style={styles.orderId}>#ORD-1024</Text>
                </View>
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Preparing</Text>
              </View>
            </View>

            <View style={styles.medicineMiniCard}>
              <View style={styles.medicineIconCircle}>
                <Pill size={20} color={PRIMARY} strokeWidth={2.5} />
              </View>

              <View style={styles.medicineTextBlock}>
                <Text style={styles.medicineName}>Metformin 500mg</Text>
                <Text style={styles.pharmacyName}>CareMate Demo Pharmacy</Text>
              </View>
            </View>

            <View style={styles.collectionBox}>
              <Clock3 size={16} color={PRIMARY} strokeWidth={2.5} />
              <Text style={styles.collectionText}>
                Medicine expected after 5 PM
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Order Progress</Text>

            <View style={styles.timeline}>
              {orderSteps.map((step, index) => {
                const isLast = index === orderSteps.length - 1;

                return (
                  <View key={step.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <StepIcon status={step.status} />
                      {!isLast ? <View style={styles.timelineLine} /> : null}
                    </View>

                    <View style={styles.timelineTextBlock}>
                      <Text
                        style={[
                          styles.timelineTitle,
                          step.status === "PENDING"
                            ? styles.timelineTitlePending
                            : undefined,
                        ]}
                      >
                        {step.title}
                      </Text>

                      <Text
                        style={[
                          styles.timelineDescription,
                          step.status === "PENDING"
                            ? styles.timelineDescriptionPending
                            : undefined,
                        ]}
                      >
                        {step.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.refillHeaderRow}>
            <Text style={styles.sectionHeading}>Eligible for Refill</Text>
          </View>

          <View style={styles.infoBox}>
            <RefreshCcw size={16} color={PRIMARY} strokeWidth={2.4} />
            <Text style={styles.infoBoxText}>
              Only doctor-confirmed medicines can be requested.
            </Text>
          </View>

          {refillMedicines.map((medicine) => (
            <View key={medicine.id} style={styles.refillCard}>
              <View style={styles.refillTopRow}>
                <View style={styles.refillIconCircle}>
                  <Pill size={18} color={PRIMARY} strokeWidth={2.5} />
                </View>

                <View style={styles.refillTextBlock}>
                  <Text style={styles.refillMedicineName}>
                    {medicine.name}
                  </Text>

                  <Text style={styles.refillDoctorText}>
                    Last prescribed by {medicine.doctorName}
                  </Text>

                  <View style={styles.daysRow}>
                    <Clock3 size={14} color={WARNING} strokeWidth={2.5} />
                    <Text style={styles.daysText}>
                      Remaining days: {medicine.remainingDays}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.requestButton}
                activeOpacity={0.87}
                onPress={() => handleRequestFulfilment(medicine.name)}
              >
                <Text style={styles.requestButtonText}>
                  Request Fulfilment
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.demoNotice}>
            <View style={styles.demoNoticeIconCircle}>
              <Truck size={18} color={PRIMARY} strokeWidth={2.4} />
            </View>

            <Text style={styles.demoNoticeText}>
              This is a demo pharmacy order screen. Real pharmacy integration can
              be added later with pharmacy accounts, stock status, and collection
              confirmation.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const StepIcon = ({ status }: { status: OrderStepStatus }) => {
  if (status === "COMPLETED") {
    return (
      <View style={[styles.stepCircle, styles.stepCompleted]}>
        <CheckCircle2 size={19} color={SURFACE} strokeWidth={2.7} />
      </View>
    );
  }

  if (status === "ACTIVE") {
    return (
      <View style={[styles.stepCircle, styles.stepActive]}>
        <Clock3 size={17} color={SURFACE} strokeWidth={2.7} />
      </View>
    );
  }

  return (
    <View style={[styles.stepCircle, styles.stepPending]}>
      <Circle size={15} color="#B7C1D4" strokeWidth={2.7} />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  appBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  orderCard: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  orderIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  orderLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  orderId: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  statusPill: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  statusPillText: {
    color: "#A85A13",
    fontSize: 11,
    fontWeight: "900",
  },
  medicineMiniCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: SOFT_PANEL,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: BORDER,
  },
  medicineIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  medicineTextBlock: {
    flex: 1,
  },
  medicineName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  pharmacyName: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  collectionBox: {
    marginTop: 14,
    backgroundColor: PRIMARY_LIGHT,
    borderWidth: 1,
    borderColor: "#C9D8FF",
    borderRadius: 15,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  collectionText: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 8,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 14,
  },
  timeline: {
    paddingBottom: 2,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 58,
  },
  timelineLeft: {
    width: 34,
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#DDE6F5",
    marginTop: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCompleted: {
    backgroundColor: SUCCESS,
  },
  stepActive: {
    backgroundColor: WARNING,
  },
  stepPending: {
    backgroundColor: SOFT_PANEL,
    borderWidth: 1,
    borderColor: BORDER,
  },
  timelineTextBlock: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  timelineTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  timelineTitlePending: {
    color: "#A7B0C2",
  },
  timelineDescription: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  timelineDescriptionPending: {
    color: "#B7C1D4",
  },
  refillHeaderRow: {
    marginBottom: 10,
  },
  sectionHeading: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
  },
  infoBox: {
    backgroundColor: PRIMARY_LIGHT,
    borderWidth: 1,
    borderColor: "#C9D8FF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoBoxText: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 8,
    flex: 1,
  },
  refillCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  refillTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  refillIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  refillTextBlock: {
    flex: 1,
  },
  refillMedicineName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  refillDoctorText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },
  daysText: {
    color: "#A85A13",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 5,
  },
  requestButton: {
    backgroundColor: PRIMARY,
    borderRadius: 15,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  requestButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "900",
  },
  demoNotice: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  demoNoticeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  demoNoticeText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    flex: 1,
  },
});