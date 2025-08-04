import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "./Style";

type ExpiryEntry = {
  month: string;
  quantity: number;
};

type RootStackParamList = {
  //   Navigator: undefined;
  //   Competitors: undefined;
  InventoryProcess: undefined;
};

type InventoryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "InventoryProcess"
>;

type SKUCarried = {
  sku: string;
  skuCode: string;
  beginningPCS: number;
  deliveryPCS: number;
  endingPCS: number;
  offtake: number;
  oos: string;
  expiry: ExpiryEntry[];
};

type SKUInfo = {
  sku: string;
  skuCode: string;
};

type VersionGroup = {
  Carried: SKUCarried[];
  "Not Carried": SKUInfo[];
  Delisted: SKUInfo[];
};

//PROFILE

export interface InventoryItem {
  _id: string;
  date: string;
  email: string;
  merchandiser: string;
  outlet: string;
  month: string;
  week: string;
  locked?: boolean;
  versions: {
    V1: VersionGroup;
    V2: VersionGroup;
    V3: VersionGroup;
  };
  isOffline?: boolean;
}

type TimeLog = {
  outlet: string;
  timeIn: string;
  timeOut?: string | null;
  addressTimeIn?: string | null;
  addressTimeOut?: string | null;
  timeInSelfieUri?: string | null;
  timeOutSelfieUri?: string | null;
};

const InventoryContent = () => {
  const navigation = useNavigation<InventoryScreenNavigationProp>();
  const isFocused = useIsFocused();
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [email, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const fetchInventoryData = async (userEmail: string) => {
    try {
      const netState = await NetInfo.fetch();
      let combinedData: InventoryItem[] = [];

      if (netState.isConnected) {
        const res = await fetch(
          `https://api-carmens-best.bmphrc.com/inventoryHistory?email=${encodeURIComponent(
            userEmail
          )}`
        );

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data: InventoryItem[] = await res.json();

        combinedData = data.map((item) => ({ ...item, isOffline: false }));

        // Cache the server data locally for offline use
        await AsyncStorage.setItem(
          `inventoryHistory_${userEmail}`,
          JSON.stringify(combinedData)
        );
      } else {
        // Offline: load cached data
        const savedData = await AsyncStorage.getItem(
          `inventoryHistory_${userEmail}`
        );
        if (savedData) {
          combinedData = JSON.parse(savedData);
        }
      }

      // // Load offline-only inventories, stored as OfflineInventoryItem { data, previousWeekId }
      // const offlineRaw = await AsyncStorage.getItem("offlineInventories");
      // const offlineList: OfflineInventoryItem[] = offlineRaw
      //   ? JSON.parse(offlineRaw)
      //   : [];

      // // Filter offline inventories where data.email matches userEmail
      // const userOffline = offlineList
      //   .filter((inv) => inv.data?.email === userEmail)
      //   .map((inv) => ({ ...inv.data, isOffline: true }));

      // Combine online + offline and sort by date descending
      const fullList = [...combinedData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setInventoryData(fullList);
    } catch (error) {
      console.error("❌ Error fetching inventory:", error);
      Alert.alert("Error", "Failed to load inventory.");
    }
  };

  // ✅ Refresh handler just calls the reusable fetch function
  const handleRefresh = async () => {
    if (!email) return;
    try {
      setLoading(true);
      await fetchInventoryData(email);
    } catch (error) {
      console.error("Failed to refresh inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const email = await AsyncStorage.getItem("userEmail");
        if (email) {
          setUserEmail(email);
          console.log("📥 userEmail retrieved:", email);
          await fetchInventoryData(email); // fetch initial inventory
        } else {
          console.warn("⚠️ No userEmail found in AsyncStorage.");
        }
      } catch (e) {
        console.error("Failed to load userEmail:", e);
      }
    };

    fetchUserEmail();
  }, []);

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <InventoryCard item={item} />
  );

  return (
    <View
      style={[
        styles.pageContainer,
        { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
      ]}
    >
      <View style={styles.appBarExpiry}>
        <Text style={styles.appBarTitle}>INVENTORY</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={inventoryData}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        initialNumToRender={10}
        maxToRenderPerBatch={20}
        removeClippedSubviews
        refreshing={loading}
        onRefresh={handleRefresh}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("InventoryProcess")}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const InventoryCard: React.FC<{ item: InventoryItem }> = ({ item }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isLocked =
    item.locked ||
    Object.values(item.versions || {}).every((version) => {
      const totalSKUs =
        (version.Carried?.length || 0) +
        (version["Not Carried"]?.length || 0) +
        (version.Delisted?.length || 0);

      const inactiveSKUs =
        (version["Not Carried"]?.length || 0) + (version.Delisted?.length || 0);

      return totalSKUs > 0 && totalSKUs === inactiveSKUs;
    });

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Destructure required values
  const { merchandiser, outlet, email, versions } = item;
  const version = ["V1", "V2", "V3"] as const;
  type VersionKey = (typeof version)[number];

  const skuValues: {
    ending: Record<VersionKey, Record<string, string>>;
    expiry: Record<VersionKey, Record<string, number>>;
    quantity: Record<VersionKey, Record<string, string>>;
  } = {
    ending: {} as Record<VersionKey, Record<string, string>>,
    expiry: {} as Record<VersionKey, Record<string, number>>,
    quantity: {} as Record<VersionKey, Record<string, string>>,
  };

  const availability: Record<VersionKey, Record<string, string>> = {} as Record<
    VersionKey,
    Record<string, string>
  >;

  version.forEach((ver) => {
    const carriedSKUs = versions[ver]?.Carried || [];

    // Safely convert endingPCS to string
    skuValues.ending[ver] = Object.fromEntries(
      carriedSKUs.map((sku) => [
        sku.skuCode,
        sku.endingPCS !== undefined && sku.endingPCS !== null
          ? sku.endingPCS.toString()
          : "0",
      ])
    );

    const allSKUs = [
      ...(versions[ver]?.Carried || []),
      ...(versions[ver]?.["Not Carried"] || []),
      ...(versions[ver]?.Delisted || []),
    ];

    const carriedCodes = new Set(
      (versions[ver]?.Carried || []).map((s) => s.skuCode)
    );
    const notCarriedCodes = new Set(
      (versions[ver]?.["Not Carried"] || []).map((s) => s.skuCode)
    );

    availability[ver] = Object.fromEntries(
      allSKUs.map((sku) => [
        sku.skuCode,
        carriedCodes.has(sku.skuCode)
          ? "Carried"
          : notCarriedCodes.has(sku.skuCode)
          ? "Not Carried"
          : "Delisted",
      ])
    );
  });

  const renderSkuDetails = (sku: any, status: string, version: string) => (
    <View key={sku.skuCode} style={{ marginBottom: 10 }}>
      {version !== "MVP" && sku.code && (
        <Text style={styles.itemText}>Status: {status}</Text>
      )}
      <Text style={styles.itemText}>SKU: {sku.sku}</Text>

      {/* Always hidden but keeps SKU Code in DOM */}
      <Text style={[styles.itemText, { height: 0, opacity: 0 }]}>
        SKU Code: {sku.skuCode}
      </Text>

      {/* ✅ Only show barcode/code for DAIRY and ICECREAM */}
      {version !== "MVP" && sku.code && (
        <Text style={styles.itemText}>Barcode: {sku.code}</Text>
      )}

      {status === "Carried" && (
        <View>
          {/* ✅ For ICECREAM & DAIRY */}
          {version !== "MVP" && (
            <View>
              <Text style={styles.itemText}>
                Beginning PCS: {sku.beginningPCS}
              </Text>
              <Text style={styles.itemText}>
                Delivery PCS: {sku.deliveryPCS}
              </Text>
              <Text style={styles.itemText}>RTV PCS: {sku.rtvPCS}</Text>
              <Text style={styles.itemText}>Ending PCS: {sku.endingPCS}</Text>
              <Text style={styles.itemText}>Offtake: {sku.offtake}</Text>

              {/* ✅ Show OOS in history */}
              <Text style={styles.itemText}>OOS: {sku.oos}</Text>

              {/* ✅ Show Expiry if ICECREAM and has entries */}
              {version === "ICECREAM" &&
                Array.isArray(sku.expiry) &&
                sku.expiry.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={[styles.itemText, { fontWeight: "bold" }]}>
                      Expiry Entries:
                    </Text>
                    {sku.expiry.map(
                      (
                        entry: { date?: string; quantity?: number },
                        index: number
                      ) =>
                        entry?.date ? (
                          <Text key={index} style={styles.itemText}>
                            {new Date(entry.date).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            — Qty: {entry.quantity ?? 0}
                          </Text>
                        ) : null
                    )}
                  </View>
                )}
            </View>
          )}

          {/* ✅ For MVP (Harvest only using date) */}
          {version === "MVP" && (
            <>
              {Array.isArray(sku.harvest) && sku.harvest.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  <Text style={[styles.itemText, { fontWeight: "bold" }]}>
                    Harvest Entries:
                  </Text>
                  {sku.harvest.map(
                    (
                      entry: { date?: string; quantity?: number },
                      index: number
                    ) =>
                      entry?.date ? (
                        <Text key={index} style={styles.itemText}>
                          {new Date(entry.date).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}{" "}
                          — Qty: {entry.quantity ?? 0}
                        </Text>
                      ) : null
                  )}
                </View>
              )}

              {/* ✅ Show OOS also for MVP */}
              <Text style={styles.itemText}>OOS: {sku.oos}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );

  const renderVersion = (versionKey: string, versionData: any) => (
    <View key={versionKey} style={{ marginBottom: 10 }}>
      <Text style={{ fontWeight: "bold", fontSize: 15, marginTop: 8 }}>
        {versionKey}
      </Text>

      {["Carried", "Not Carried", "Delisted"].map((status) =>
        versionData[status]?.map(
          (sku: any) => renderSkuDetails(sku, status, versionKey) // ✅ FIX: Use versionKey
        )
      )}
    </View>
  );

  // const handleGoToNextWeek = () => {
  //   try {
  //     const getNextWeekInfo = (currentRange: string) => {
  //       const [startStr] = currentRange.split("-");
  //       const thisYear = moment().year();
  //       const startDate = moment(`${startStr} ${thisYear}`, "MMMDD YYYY");
  //       if (!startDate.isValid())
  //         throw new Error(`Invalid start date: ${startStr} ${thisYear}`);

  //       const nextStartDate = startDate.clone().add(7, "days");
  //       const nextEndDate = nextStartDate.clone().add(6, "days");

  //       const newStart = nextStartDate.format("MMMDD");
  //       const newEnd = nextEndDate.format("MMMDD");
  //       const newWeeksCovered = `${newStart}-${newEnd}`;
  //       const newMonth = nextStartDate.format("MMMM");

  //       const startOfYear = moment().startOf("year");
  //       const firstFriday =
  //         startOfYear.day() <= 5
  //           ? startOfYear.clone().day(5)
  //           : startOfYear.clone().add(1, "week").day(5);
  //       const newWeekNumber = nextEndDate.diff(firstFriday, "weeks") + 1;
  //       const newWeek = `Week ${newWeekNumber}`;

  //       return { newWeeksCovered, newMonth, newWeek };
  //     };

  //     const nextWeekInfo = getNextWeekInfo(weeksCovered);

  //     const nextWeekData = {
  //       date: moment().format("YYYY-MM-DD"),
  //       email,
  //       merchandiser,
  //       outlet,
  //       weeksCovered: nextWeekInfo.newWeeksCovered,
  //       month: nextWeekInfo.newMonth,
  //       week: nextWeekInfo.newWeek,
  //       availability,
  //       version,
  //       skuValues: {
  //         beginning: skuValues.ending,
  //         delivery: {},
  //         ending: {},
  //         offtake: {},
  //         inventoryDays: {},
  //         expiry: skuValues.expiry,
  //         quantity: skuValues.quantity,
  //       },
  //       previousWeekId: item._id,
  //       isOffline: isOffline, // optional flag
  //     };

  //     router.push({
  //       pathname: "/InventoryNextWeek",
  //       params: {
  //         data: JSON.stringify(nextWeekData),
  //         previousWeekId: item._id,
  //       },
  //     });
  //   } catch (error) {
  //     Alert.alert("Navigation Error", (error as Error).message);
  //   }
  // };

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      style={[styles.tileContainer, isLocked && styles.lockedContainer]}
    >
      <View
        style={{
          marginBottom: 10,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text style={[styles.tileHeader, { fontWeight: "bold" }]}>
            {item.outlet}
          </Text>
          <Text style={[styles.tileHeader, { color: "#666" }]}>
            {new Date(item.date).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {/* <TouchableOpacity
          style={{
            backgroundColor: isLocked ? "#e0e0e0" : "#4caf50",
            padding: 8,
            borderRadius: 20,
          }}
          onPress={() => {
            if (!isLocked) {
              handleGoToNextWeek();
            }
          }}
          disabled={isLocked}
        >
          <Icon name="edit-document" size={20} color="#fff" />
        </TouchableOpacity> */}
      </View>

      {expanded && (
        <View style={styles.tileDetails}>
          {/* <Text style={styles.itemText}>
            Weeks Covered: {item.weeksCovered}
          </Text> */}

          {/* <Text style={styles.itemText}>
            Date:{" "}
            {new Date(item.date).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text> */}

          {Object.entries(item.versions).map(([versionKey, versionData]) =>
            renderVersion(versionKey, versionData)
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default InventoryContent;
