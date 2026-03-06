import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";

export interface UserProfile {
  name: string;
  email: string;
  goal: string;
  level: string;
  dailyMinutes: number;
  language: "ar" | "en";
}

export interface UserSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  dailyReminder: boolean;
  privacyMode: boolean;
}

export interface AppContextValue {
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  profile: UserProfile;
  userId: string | null;
  points: number;
  streak: number;
  xp: number;
  completedStages: number[];
  settings: UserSettings;
  login: (email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (goal: string, level: string, dailyMinutes: number) => Promise<void>;
  addPoints: (amount: number) => Promise<void>;
  completeStage: (stageId: number) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  language: "ar" | "en";
  setLanguage: (lang: "ar" | "en") => void;
}

const defaultProfile: UserProfile = {
  name: "مستخدم",
  email: "",
  goal: "",
  level: "beginner",
  dailyMinutes: 15,
  language: "ar",
};

const defaultSettings: UserSettings = {
  notificationsEnabled: true,
  soundEnabled: true,
  dailyReminder: true,
  privacyMode: false,
};

const AppContext = createContext<AppContextValue | null>(null);

async function apiPatch(path: string, body: Record<string, unknown>) {
  try {
    const url = new URL(path, getApiUrl());
    await fetch(url.toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {}
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [userId, setUserId] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [language, setLanguageState] = useState<"ar" | "en">("ar");
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const keys = ["isAuthenticated", "hasCompletedOnboarding", "profile", "points", "streak", "xp", "completedStages", "language", "userId", "userSettings"];
      const vals = await AsyncStorage.multiGet(keys);
      const m = Object.fromEntries(vals.map(([k, v]) => [k, v]));

      if (m.isAuthenticated === "true") setIsAuthenticated(true);
      if (m.hasCompletedOnboarding === "true") setHasCompletedOnboarding(true);
      if (m.profile) setProfile(JSON.parse(m.profile));
      if (m.points) setPoints(parseInt(m.points));
      if (m.streak) setStreak(parseInt(m.streak));
      if (m.xp) setXp(parseInt(m.xp));
      if (m.completedStages) setCompletedStages(JSON.parse(m.completedStages));
      if (m.language) setLanguageState(m.language as "ar" | "en");
      if (m.userId) setUserId(m.userId);
      if (m.userSettings) setSettings(JSON.parse(m.userSettings));
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }

  async function syncWithServer(email: string, name: string) {
    try {
      const url = new URL("/api/user/sync", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (data.userId) {
        setUserId(data.userId);
        await AsyncStorage.setItem("userId", data.userId);
        if (data.settings) {
          const s: UserSettings = {
            notificationsEnabled: data.settings.notificationsEnabled ?? true,
            soundEnabled: data.settings.soundEnabled ?? true,
            dailyReminder: data.settings.dailyReminder ?? true,
            privacyMode: data.settings.privacyMode ?? false,
          };
          setSettings(s);
          await AsyncStorage.setItem("userSettings", JSON.stringify(s));
        }
      }
    } catch {}
  }

  async function login(email: string, name: string) {
    const updatedProfile = { ...defaultProfile, email, name };
    setProfile(updatedProfile);
    setIsAuthenticated(true);
    setStreak(1);
    setXp(100);
    await AsyncStorage.multiSet([
      ["isAuthenticated", "true"],
      ["profile", JSON.stringify(updatedProfile)],
      ["streak", "1"],
      ["xp", "100"],
    ]);
    syncWithServer(email, name);
  }

  async function logout() {
    setIsAuthenticated(false);
    setHasCompletedOnboarding(false);
    setProfile(defaultProfile);
    setPoints(0);
    setStreak(0);
    setXp(0);
    setCompletedStages([]);
    setUserId(null);
    setSettings(defaultSettings);
    await AsyncStorage.multiRemove([
      "isAuthenticated", "hasCompletedOnboarding", "profile", "points",
      "streak", "xp", "completedStages", "userId", "userSettings",
    ]);
  }

  async function completeOnboarding(goal: string, level: string, dailyMinutes: number) {
    const updated = { ...profile, goal, level, dailyMinutes };
    setProfile(updated);
    setHasCompletedOnboarding(true);
    await AsyncStorage.multiSet([
      ["hasCompletedOnboarding", "true"],
      ["profile", JSON.stringify(updated)],
    ]);
  }

  async function addPoints(amount: number) {
    const newPoints = points + amount;
    const newXp = xp + Math.floor(amount * 1.5);
    setPoints(newPoints);
    setXp(newXp);
    await AsyncStorage.multiSet([
      ["points", String(newPoints)],
      ["xp", String(newXp)],
    ]);
    if (userId) await apiPatch("/api/user/profile", { userId, points: newPoints, xp: newXp });
  }

  async function completeStage(stageId: number) {
    if (completedStages.includes(stageId)) return;
    const updated = [...completedStages, stageId];
    setCompletedStages(updated);
    await AsyncStorage.setItem("completedStages", JSON.stringify(updated));
    await addPoints(50);
    if (userId) {
      try {
        const url = new URL("/api/user/activity", getApiUrl());
        await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            type: "stage_complete",
            titleAr: `أكملت مرحلة #${stageId}`,
            titleEn: `Completed Stage #${stageId}`,
            points: 50,
            icon: "trophy",
            color: "#F59E0B",
          }),
        });
      } catch {}
    }
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await AsyncStorage.setItem("profile", JSON.stringify(updated));
  }

  async function updateSettings(updates: Partial<UserSettings>) {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await AsyncStorage.setItem("userSettings", JSON.stringify(updated));
    if (userId) await apiPatch("/api/user/settings", { userId, ...updates });
  }

  function setLanguage(lang: "ar" | "en") {
    setLanguageState(lang);
    AsyncStorage.setItem("language", lang);
    if (userId) apiPatch("/api/user/settings", { userId, language: lang });
  }

  const value = useMemo<AppContextValue>(
    () => ({
      isAuthenticated, hasCompletedOnboarding, profile, userId, points,
      streak, xp, completedStages, settings, login, logout, completeOnboarding,
      addPoints, completeStage, updateProfile, updateSettings, language, setLanguage,
    }),
    [isAuthenticated, hasCompletedOnboarding, profile, userId, points, streak, xp, completedStages, settings, language]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
