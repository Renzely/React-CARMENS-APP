// import React, { useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   Platform,
//   ScrollView,
//   StatusBar,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";

// import { Ionicons } from "@expo/vector-icons";
// import styles from "./Style";

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useIsFocused, useNavigation } from "@react-navigation/native";
// import { NativeStackNavigationProp } from "@react-navigation/native-stack";
// import { useRouter } from "expo-router";

// type ExpiryData = {
//   _id: string;
//   date: string;
//   merchandiser: string;
//   outlet: string;
//   userEmail: string;
//   expiryEntries: {
//     month: string;
//     sku: string;
//     quantity: String;
//     expiration: string;
//   }[];
// };

// type RootStackParamList = {
//   Navigator: undefined;
//   ExpiryProcess: undefined;
//   ExpiryScreen: undefined;
// };

// type ExpiryScreenNavigationProp = NativeStackNavigationProp<
//   RootStackParamList,
//   "ExpiryProcess"
// >;

// const ExpiryScreen = () => {
//   const router = useRouter();
//   const navigation = useNavigation<ExpiryScreenNavigationProp>();
//   const isFocused = useIsFocused();
//   const [expiryData, setExpiryData] = useState<ExpiryData[]>([]);
//   const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [userEmail, setUserEmail] = useState<string | null>(null);

//   useEffect(() => {
//     const getUserEmail = async () => {
//       const email = await AsyncStorage.getItem("userEmail");
//       setUserEmail(email);
//     };
//     getUserEmail();
//   }, []);

//   useEffect(() => {
//     if (userEmail && isFocused) {
//       fetchExpiryHistory(userEmail);
//     }
//   }, [userEmail, isFocused]);

//   const fetchExpiryHistory = async (email: string) => {
//     try {
//       setLoading(true);
//       const response = await fetch(
//         `https://api-carmens-best.bmphrc.com/expiry/history?email=${encodeURIComponent(
//           email
//         )}`
//       );
//       if (!response.ok) throw new Error("Failed to fetch expiry data");

//       const data = await response.json();
//       setExpiryData(data);
//     } catch (error) {
//       console.error("Fetch error:", error);
//       setExpiryData([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const toggleExpand = (index: number) => {
//     setExpandedIndex(expandedIndex === index ? null : index);
//   };

//   return (
//     <View
//       style={[
//         styles.pageContainer,
//         { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
//       ]}
//     >
//       <View style={styles.appBarExpiry}>
//         <Text style={styles.appBarTitleExpiry}>EXPIRY HISTORY</Text>
//       </View>

//       <ScrollView contentContainerStyle={styles.containerQTTHistory}>
//         {loading ? (
//           <ActivityIndicator size="large" color="#844515" />
//         ) : expiryData.length === 0 ? (
//           <Text style={styles.noHistoryText}>No history found.</Text>
//         ) : (
//           expiryData.map((item, index) => {
//             const isExpanded = expandedIndex === index;

//             return (
//               <TouchableOpacity
//                 key={item._id}
//                 onPress={() => toggleExpand(index)}
//                 style={styles.tileContainer}
//                 activeOpacity={0.8}
//               >
//                 <View
//                   style={{
//                     marginBottom: 10,
//                     flexDirection: "row",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                   }}
//                 >
//                   <View>
//                     <Text style={[styles.tileHeader, { fontWeight: "bold" }]}>
//                       {item.outlet || "No Outlet"}
//                     </Text>
//                     <Text style={[styles.tileHeader, { color: "#666" }]}>
//                       {new Date(item.date).toLocaleDateString("en-US", {
//                         year: "numeric",
//                         month: "long",
//                         day: "numeric",
//                       })}
//                     </Text>
//                   </View>
//                 </View>

//                 {isExpanded && (
//                   <View style={styles.tileDetails}>
//                     <Text style={styles.itemText}>
//                       Merchandiser: {item.merchandiser}
//                     </Text>
//                     <Text style={styles.itemText}>Outlet: {item.outlet}</Text>

//                     {item.expiryEntries.map((entry, i) => (
//                       <View key={i} style={{ marginVertical: 4 }}>
//                         <Text style={styles.itemText}>SKU: {entry.sku}</Text>
//                         <Text style={styles.itemText}>
//                           Month: {entry.month}
//                         </Text>
//                         <Text style={styles.itemText}>
//                           Expiration:{" "}
//                           {new Date(entry.expiration).toLocaleDateString(
//                             "en-US",
//                             {
//                               year: "numeric",
//                               month: "short",
//                               day: "numeric",
//                             }
//                           )}
//                         </Text>
//                         <Text style={styles.itemText}>
//                           Quantity: {entry.quantity}
//                         </Text>
//                       </View>
//                     ))}
//                   </View>
//                 )}
//               </TouchableOpacity>
//             );
//           })
//         )}
//       </ScrollView>

//       <TouchableOpacity
//         style={styles.fab}
//         onPress={() => navigation.navigate("ExpiryProcess")}
//       >
//         <Ionicons name="add" size={30} color="white" />
//       </TouchableOpacity>
//     </View>
//   );
// };

// export default ExpiryScreen;
