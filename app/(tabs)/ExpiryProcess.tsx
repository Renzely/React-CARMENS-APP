// import { Ionicons } from "@expo/vector-icons";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import DateTimePicker from "@react-native-community/datetimepicker";
// import { Picker } from "@react-native-picker/picker";
// import { useNavigation } from "@react-navigation/native";
// import { useRouter } from "expo-router";
// import React, { useEffect, useState } from "react";
// import {
//   Alert,
//   Platform,
//   StatusBar,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import DropDownPicker from "react-native-dropdown-picker";
// import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
// import styles from "./Style";

// type ExpiryEntry = {
//   month: string;
//   sku: string;
//   expiration: string;
// };

// type ExpirySubEntry = {
//   month: string;
//   expiration: string;
//   quantity: string; // or number if you prefer number type
// };

// type ExpiryData = {
//   [sku: string]: ExpirySubEntry[];
// };

// const Expiry = () => {
//   const navigation = useNavigation();
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);

//   const [date, setDate] = useState("");
//   const [merchandiser, setMerchandiser] = useState("");
//   const [skuDropdownOpen, setSkuDropdownOpen] = useState<boolean[]>([false]);

//   const [open, setOpen] = useState(false);
//   const [selectedOutlet, setSelectedOutlet] = useState("");
//   const [expiryEntries, setExpiryEntries] = useState<ExpiryEntry[]>([
//     { month: "", sku: "", expiration: "" },
//   ]);
//   const [outletOptions, setOutletOptions] = useState([
//     { label: "Select Branch", value: "" },
//   ]);

//   const [showDatePicker, setShowDatePicker] = useState<{
//     sku: string;
//     index: number;
//   } | null>(null);

//   const skuList = [
//     "COOKIE DOUGH 115ML X 1, CUP",
//     "STRAWBERRY 115ML X 1, CUP",
//     "DARK CHOCOLATE 115ML X 1, CUP",
//     "EVERYONE LOVES VANILLA 115ML X 1, CUP",
//     "SALTED CARAMEL 115ML X 1, CUP",
//     "COOKIES AND CREAM 115ML X 1, CUP",
//     "BBUTTER ALMOND BRITTLE 115ML X 1, CUP",
//     "COFFEE ALMOND FUDGE 115ML X 1, CUP",
//     "BRAZILLIAN COFFEE 115ML X 1, CUP",
//     "ROCKY ROAD 115ML X 1, CUP",
//     "MALTED MILK 115ML X 1, CUP",
//     "HE'S NOT WORTH IT 115ML X 1, CUP",
//     "BUTTER PECAN 115ML X 1, CUP",
//     "PISTACHIO 115ML X 1, CUP",
//     "PISTACHIO ALMOND FUDGE 115ML X 1, CUP",
//     "JOLLY OL' EGGNOG 115ML X 1, CUP",
//     "MERRY MINT CHOCOLATE 115ML X 1, CUP",
//     "S'MORES THE MERRIER 115ML X 1, CUP",
//     "LITE MANGO 115ML X 1, CUP",
//     "LITE STRAWBERRY 115ML X 1, CUP",
//     "LITE MIXED BERRIES 115ML X 1, CUP",
//     "STRAWBERRY CHEESECAKE 115ML X 1, CUP",
//     "COOKIE DOUGH 440ML X 1, PINT",
//     "STRAWBERRY 440ML X 1, PINT",
//     "DARK CHOCOLATE 440ML X 1, PINT",
//     "EVERYONE LOVES VANILLA 440ML X 1, PINT",
//     "SALTED CARAMEL 440ML X 1, PINT",
//     "COOKIES AND CREAM 440ML X 1, PINT",
//     "BBUTTER ALMOND BRITTLE 440ML X 1, PINT",
//     "COFFEE ALMOND FUDGE 440ML X 1, PINT",
//     "BRAZILLIAN COFFEE 440ML X 1, PINT",
//     "ROCKY ROAD 440ML X 1, PINT",
//     "MALTED MILK 440ML X 1, PINT",
//     "HE'S NOT WORTH IT 440ML X 1, PINT",
//     "BUTTER PECAN 440ML X 1, PINT",
//     "PISTACHIO 440ML X 1, PINT",
//     "PISTACHIO ALMOND FUDGE 440ML X 1, PINT",
//     "JOLLY OL' EGGNOG 440ML X 1, PINT",
//     "MERRY MINT CHOCOLATE 440ML X 1, PINT",
//     "S'MORES THE MERRIER 440ML X 1, PINT",
//     "LITE MANGO 440ML X 1, PINT",
//     "LITE STRAWBERRY 440ML X 1, PINT",
//     "LITE MIXED BERRIES 440ML X 1, PINT",
//     "STRAWBERRY CHEESECAKE 440ML X 1, PINT",
//     "PREMIUM WHOLE MILK 1L",
//     "PREMIUM WHOLE MILK 300ML",
//     "PREMIUM WHOLE MILK 200ML",
//     "PREMIUM LOW-FAT MILK 1L",
//     "PREMIUM LOW-FAT MILK 300ML",
//     "PREMIUM LOW-FAT MILK 200ML",
//     "PREMIUM CHOCOLATE MILK 1L",
//     "PREMIUM CHOCOLATE MILK 300ML",
//     "BARISTA FRESH MILK 1L",
//     "HOLLY'S LOW-FAT YOGHURT 1L",
//     "HOLLY'S LOW-FAT YOGHURT 200ML",
//     "HOLLY'S NON-FAT YOGHURT 500ML",
//     "KESONG PUTI 200G",
//     "CRISTAL LETTUCE",
//     "BUTTERHEAD LETTUCE",
//     "SALANOVA LETTUCE",
//     "ROMAINE LETTUCE",
//     "BATAVIA LETTUCE",
//   ];

//   const [expiryData, setExpiryData] = useState<ExpiryData>(() =>
//     skuList.reduce((acc, sku) => {
//       acc[sku] = [{ month: "", expiration: "", quantity: "" }];
//       return acc;
//     }, {} as ExpiryData)
//   );

//   useEffect(() => {
//     const today = new Date();
//     const formattedDate = today.toISOString().split("T")[0];
//     setDate(formattedDate);
//   }, []);

//   useEffect(() => {
//     const fetchUserInfo = async () => {
//       const userData = await AsyncStorage.getItem("user");
//       if (userData) {
//         const user = JSON.parse(userData);
//         setMerchandiser(`${user.firstName} ${user.lastName}`);
//       }
//     };
//     fetchUserInfo();
//   }, []);

//   useEffect(() => {
//     const loadOutlets = async () => {
//       try {
//         const token = await AsyncStorage.getItem("token");
//         if (!token) {
//           console.error("No auth token found");
//           return;
//         }

//         const response = await fetch("https://api-carmens-best.bmphrc.com/user/outlets", {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (response.ok) {
//           const outlets = await response.json();
//           const options = outlets.map((outlet: string) => ({
//             label: outlet,
//             value: outlet,
//           }));

//           setOutletOptions([{ label: "Select Branch", value: "" }, ...options]);
//         } else {
//           console.error("Failed to fetch outlets:", await response.text());
//         }
//       } catch (error) {
//         console.error("Failed to load outlets", error);
//       }
//     };

//     loadOutlets();
//   }, []);

//   const getFutureMonths = () => {
//     const now = new Date();
//     const months = [];
//     for (let i = now.getMonth() + 1; i < 12; i++) {
//       const monthName = new Date(0, i).toLocaleString("default", {
//         month: "long",
//       });
//       months.push({ label: monthName, value: monthName });
//     }
//     return months;
//   };

//   // New Save function to POST data to backend
//   const handleSubmit = async () => {
//     setLoading(true);
//     try {
//       if (!selectedOutlet) {
//         Alert.alert("Validation Error", "Please select an outlet.");
//         return;
//       }

//       const userEmail = await AsyncStorage.getItem("userEmail");
//       if (!userEmail) {
//         Alert.alert("Error", "User email not found. Please login again.");
//         return;
//       }

//       // Build the payload, only include entries with a selected month
//       const expiryEntries: {
//         sku: string;
//         month: string;
//         expiration: string;
//         quantity: string;
//       }[] = [];

//       for (const [sku, entries] of Object.entries(expiryData)) {
//         for (const entry of entries) {
//           if (!entry.month) continue; // skip if month not selected

//           if (!entry.quantity.trim() || !entry.expiration.trim()) {
//             Alert.alert(
//               "Validation Error",
//               `Please complete quantity and expiration for SKU: ${sku}`
//             );
//             setLoading(false);
//             return;
//           }

//           expiryEntries.push({
//             sku,
//             month: entry.month,
//             expiration: entry.expiration,
//             quantity: entry.quantity,
//           });
//         }
//       }

//       if (expiryEntries.length === 0) {
//         Alert.alert("Validation Error", "No valid expiry data to submit.");
//         setLoading(false);
//         return;
//       }

//       const formData = {
//         date,
//         merchandiser,
//         outlet: selectedOutlet,
//         expiryEntries,
//         userEmail,
//       };

//       const response = await fetch("https://api-carmens-best.bmphrc.com/expiry/save", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });

//       if (response.ok) {
//         Alert.alert("Success", "Expiry data saved successfully.");
//         navigation.goBack();
//       } else {
//         Alert.alert("Error", "Failed to save data.");
//       }
//     } catch (error) {
//       console.error("Submit error:", error);
//       Alert.alert("Error", "An unexpected error occurred.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View
//       style={{
//         flex: 1,
//         backgroundColor: "#fff",
//         paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
//       }}
//     >
//       <KeyboardAwareScrollView
//         style={{ flex: 1 }}
//         contentContainerStyle={{ paddingBottom: 40 }}
//         enableOnAndroid
//         extraScrollHeight={100}
//         keyboardShouldPersistTaps="handled"
//       >
//         <View>
//           <View style={styles.appBarCompetitor}>
//             <Text style={styles.appBarTitleCompetitor}>EXPIRY PROCESS</Text>
//           </View>
//         </View>

//         <Text style={styles.labelQTT}>Date</Text>
//         <TextInput
//           value={date}
//           editable={false}
//           style={styles.pickerWrapperQTT}
//         />

//         <Text style={styles.labelQTT}>Merchandiser</Text>
//         <TextInput
//           style={styles.pickerWrapperQTT}
//           editable={false}
//           value={merchandiser}
//           onChangeText={setMerchandiser}
//         />

//         <Text style={styles.labelQTT}>Select Outlet</Text>
//         <View style={styles.pickerQTT}>
//           <DropDownPicker
//             open={open}
//             value={selectedOutlet}
//             items={outletOptions}
//             setOpen={setOpen}
//             setValue={setSelectedOutlet}
//             setItems={setOutletOptions}
//             searchable
//             placeholder="Select Branch"
//             style={{ width: 407 }}
//             dropDownContainerStyle={{ width: 407 }}
//             listMode="SCROLLVIEW"
//           />
//         </View>

//         {skuList.map((sku, skuIndex) => (
//           <View key={sku} style={{ marginBottom: 20 }}>
//             {/* Divider - except before the first item */}
//             {skuIndex !== 0 && (
//               <View
//                 style={{
//                   height: 2,
//                   backgroundColor: "#844515",
//                   marginVertical: 10,
//                 }}
//               />
//             )}

//             {/* Centered SKU Title */}
//             <Text
//               style={[
//                 styles.labelQTT,
//                 {
//                   fontWeight: "bold",
//                   fontSize: 16,
//                   textAlign: "center",
//                   marginBottom: 10,
//                 },
//               ]}
//             >
//               {sku}
//             </Text>

//             {expiryData[sku].map((entry, entryIndex) => (
//               <View key={entryIndex} style={{ marginBottom: 10 }}>
//                 <Text style={styles.labelQTT}>Month</Text>
//                 <View style={styles.pickerWrapperQTT}>
//                   <Picker
//                     selectedValue={entry.month}
//                     onValueChange={(value) => {
//                       const updated = { ...expiryData };
//                       updated[sku][entryIndex].month = value;
//                       setExpiryData(updated);
//                     }}
//                     dropdownIconColor={"black"}
//                     style={styles.pickerWrapperQTT}
//                   >
//                     <Picker.Item label="Select Month" value="" />
//                     {getFutureMonths().map((month, idx) => (
//                       <Picker.Item
//                         key={idx}
//                         label={month.label}
//                         value={month.value}
//                       />
//                     ))}
//                   </Picker>
//                 </View>

//                 <Text style={styles.labelQTT}>Quantity</Text>
//                 <TextInput
//                   style={[
//                     styles.pickerWrapperQTT,
//                     {
//                       backgroundColor: entry.month ? "#fff" : "#eee", // Light gray if disabled
//                       color: entry.month ? "#000" : "#888", // Dark text if enabled
//                     },
//                   ]}
//                   value={entry.quantity}
//                   onChangeText={(text) => {
//                     if (/^\d*$/.test(text)) {
//                       const updated = { ...expiryData };
//                       updated[sku][entryIndex].quantity = text;
//                       setExpiryData(updated);
//                     }
//                   }}
//                   placeholder="Enter Quantity"
//                   placeholderTextColor="#222021"
//                   keyboardType="numeric"
//                   editable={!!entry.month}
//                 />

//                 <Text style={styles.labelQTT}>Expiration</Text>
//                 <TouchableOpacity
//                   onPress={() => {
//                     if (!entry.month) return; // 🔐 prevent opening if no month
//                     setShowDatePicker({ sku, index: entryIndex });
//                   }}
//                   style={[
//                     styles.pickerWrapperQTT,
//                     {
//                       justifyContent: "center",
//                       backgroundColor: entry.month ? "#fff" : "#eee",
//                     },
//                   ]}
//                   disabled={!entry.month}
//                 >
//                   <Text
//                     style={{ color: entry.expiration ? "#000" : "#222021" }}
//                   >
//                     {entry.expiration
//                       ? entry.expiration
//                       : "Select Expiration Date"}
//                   </Text>
//                 </TouchableOpacity>

//                 {showDatePicker?.sku === sku &&
//                   showDatePicker?.index === entryIndex && (
//                     <DateTimePicker
//                       value={
//                         entry.expiration
//                           ? new Date(entry.expiration)
//                           : new Date()
//                       }
//                       mode="date"
//                       display="default"
//                       onChange={(event, selectedDate) => {
//                         setShowDatePicker(null);
//                         if (selectedDate) {
//                           const formattedDate = selectedDate
//                             .toISOString()
//                             .split("T")[0]; // YYYY-MM-DD
//                           const updated = { ...expiryData };
//                           updated[sku][entryIndex].expiration = formattedDate;
//                           setExpiryData(updated);
//                         }
//                       }}
//                     />
//                   )}

//                 <View
//                   style={{
//                     flexDirection: "row",
//                     justifyContent: "space-between",
//                     marginTop: 5,
//                   }}
//                 >
//                   {(() => {
//                     const entries = expiryData[sku];

//                     // Check if last entry is complete
//                     const lastEntry = entries[entries.length - 1];
//                     const isLastEntryComplete =
//                       lastEntry?.month &&
//                       /^\d+$/.test(lastEntry.quantity) &&
//                       lastEntry?.expiration;

//                     // Show add icon only if last entry is complete
//                     if (!isLastEntryComplete) return null;

//                     return (
//                       <TouchableOpacity
//                         onPress={() => {
//                           if (!isLastEntryComplete) return;
//                           const updated = { ...expiryData };
//                           updated[sku].push({
//                             month: "",
//                             expiration: "",
//                             quantity: "",
//                           });
//                           setExpiryData(updated);
//                         }}
//                       >
//                         <Ionicons
//                           name="add-circle-outline"
//                           size={24}
//                           color="#007AFF"
//                         />
//                       </TouchableOpacity>
//                     );
//                   })()}

//                   {expiryData[sku].length > 1 && (
//                     <TouchableOpacity
//                       onPress={() => {
//                         const updated = { ...expiryData };
//                         updated[sku].splice(entryIndex, 1);
//                         setExpiryData(updated);
//                       }}
//                     >
//                       <Ionicons name="trash" size={24} color="red" />
//                     </TouchableOpacity>
//                   )}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}

//         <View
//           style={[
//             styles.buttonRowQTT,
//             { flexDirection: "row", justifyContent: "space-between" },
//           ]}
//         >
//           <TouchableOpacity
//             style={[
//               styles.submitButton,
//               { flex: 1, marginRight: 5, backgroundColor: "#d9534f" },
//             ]}
//             onPress={() => navigation.goBack()}
//           >
//             <Text style={styles.submitButtonText}>Cancel</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[
//               styles.submitButton,
//               {
//                 flex: 1,
//                 marginLeft: 5,
//                 backgroundColor: "#844515",
//                 opacity: loading ? 0.5 : 1,
//               },
//             ]}
//             onPress={handleSubmit}
//             disabled={loading}
//           >
//             <Text style={styles.submitButtonText}>
//               {loading ? "Submitting..." : "Submit"}
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAwareScrollView>
//     </View>
//   );
// };

// export default Expiry;
