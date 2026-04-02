/**
 * The Expo client lives in `mobile/mobile` and uses `lib/api.ts` (axios with base URL from
 * `app.json` → `expo.extra.apiUrl`). This file is not imported by the app.
 */
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = axios.create({
  baseURL: "http://10.213.52.55:5000",
});

API.interceptors.request.use(async (req) => {
  const token = await AsyncStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;