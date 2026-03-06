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
  addPoints: (amount: number, activityTitleAr?: string, activityTitleEn?: string, icon?: string, color?: string) => Promise<void>;
  completeStage: (stageId: number, stageTitleAr?: string, stageTitleEn?: string) => Promise<void>;
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

async function apiFetch(path: string, options: RequestInit) {
  try {
    const url = new URL(path, getApiUrl());
    const res = await fetch(url.toString(), options);
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function apiPatch(path: string, body: Record<string, unknown>) {
  return apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function apiPost(path: string, body: Record<string, unknown>) {
  return apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

  useEffect(() => { loadLocalData(); }, []);

  async function loadLocalData() {
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
      if (m.userId) {
        setUserId(m.userId);
        // Re-sync profile data from DB on app start if already logged in
        if (m.isAuthenticated === "true" && m.profile) {
          const prof = JSON.parse(m.profile) as UserProfile;
          refreshFromDb(m.userId, prof.email, prof.name);
        }
      }
      if (m.userSettings) setSettings(JSON.parse(m.userSettings));
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }

  async function refreshFromDb(uid: string, email: string, name: string) {
    const data = await apiPost("/api/user/sync", { email, name });
    if (!data) return;

    if (data.userId) {
      setUserId(data.userId);
      await AsyncStorage.setItem("userId", data.userId);
    }

    if (data.profile) {
      const dbProfile = data.profile;
      if (typeof dbProfile.points === "number") {
        setPoints(dbProfile.points);
        await AsyncStorage.setItem("points", String(dbProfile.points));
      }
      if (typeof dbProfile.xp === "number") {
        setXp(dbProfile.xp);
        await AsyncStorage.setItem("xp", String(dbProfile.xp));
      }
      if (typeof dbProfile.streak === "number") {
        setStreak(dbProfile.streak);
        await AsyncStorage.setItem("streak", String(dbProfile.streak));
      }
      if (Array.isArray(dbProfile.completedStages)) {
        setCompletedStages(dbProfile.completedStages as number[]);
        await AsyncStorage.setItem("completedStages", JSON.stringify(dbProfile.completedStages));
      }
    }

    if (data.settings) {
      const s: UserSettings = {
        notificationsEnabled: data.settings.notificationsEnabled ?? true,
        soundEnabled: data.settings.soundEnabled ?? true,
        dailyReminder: data.settings.dailyReminder ?? true,
        privacyMode: data.settings.privacyMode ?? false,
      };
      setSettings(s);
      if (data.settings.language) {
        setLanguageState(data.settings.language as "ar" | "en");
        await AsyncStorage.setItem("language", data.settings.language);
      }
      await AsyncStorage.setItem("userSettings", JSON.stringify(s));
    }
  }

  async function login(email: string, name: string) {
    const updatedProfile = { ...defaultProfile, email, name };
    setProfile(updatedProfile);
    setIsAuthenticated(true);

    await AsyncStorage.multiSet([
      ["isAuthenticated", "true"],
      ["profile", JSON.stringify(updatedProfile)],
    ]);

    // Sync with DB — this will load points/xp/streak/completedStages from DB
    const data = await apiPost("/api/user/sync", { email, name });
    if (data?.userId) {
      setUserId(data.userId);
      await AsyncStorage.setItem("userId", data.userId);

      if (data.profile) {
        const dbProfile = data.profile;
        const pts = dbProfile.points ?? 0;
        const xpVal = dbProfile.xp ?? 0;
        const stk = dbProfile.streak ?? 1;
        const stages = Array.isArray(dbProfile.completedStages) ? (dbProfile.completedStages as number[]) : [];

        setPoints(pts);
        setXp(xpVal);
        setStreak(stk);
        setCompletedStages(stages);

        await AsyncStorage.multiSet([
          ["points", String(pts)],
          ["xp", String(xpVal)],
          ["streak", String(stk)],
          ["completedStages", JSON.stringify(stages)],
        ]);
      } else {
        // New user — seed initial values
        setStreak(1);
        setXp(0);
        setPoints(0);
        await AsyncStorage.multiSet([["streak", "1"], ["xp", "0"], ["points", "0"]]);
        await apiPatch("/api/user/profile", { userId: data.userId, streak: 1 });
      }

      if (data.settings) {
        const s: UserSettings = {
          notificationsEnabled: data.settings.notificationsEnabled ?? true,
          soundEnabled: data.settings.soundEnabled ?? true,
          dailyReminder: data.settings.dailyReminder ?? true,
          privacyMode: data.settings.privacyMode ?? false,
        };
        setSettings(s);
        if (data.settings.language) {
          setLanguageState(data.settings.language as "ar" | "en");
          await AsyncStorage.setItem("language", data.settings.language);
        }
        await AsyncStorage.setItem("userSettings", JSON.stringify(s));
      }
    }
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
    // Persist goal and level to DB
    if (userId) {
      await apiPatch("/api/user/profile", { userId, goal, level });
    }
  }

  async function addPoints(
    amount: number,
    activityTitleAr = "نشاط تعليمي",
    activityTitleEn = "Learning activity",
    icon = "star",
    color = "#2563EB"
  ) {
    const newPoints = points + amount;
    const newXp = xp + Math.floor(amount * 1.5);
    setPoints(newPoints);
    setXp(newXp);
    await AsyncStorage.multiSet([
      ["points", String(newPoints)],
      ["xp", String(newXp)],
    ]);
    if (userId) {
      await apiPatch("/api/user/profile", { userId, points: newPoints, xp: newXp });
      await apiPost("/api/user/activity", {
        userId,
        type: "points",
        titleAr: activityTitleAr,
        titleEn: activityTitleEn,
        points: amount,
        icon,
        color,
      });
    }
  }

  async function completeStage(stageId: number, stageTitleAr = `مرحلة #${stageId}`, stageTitleEn = `Stage #${stageId}`) {
    if (completedStages.includes(stageId)) return;
    const updated = [...completedStages, stageId];
    setCompletedStages(updated);
    await AsyncStorage.setItem("completedStages", JSON.stringify(updated));

    const newPoints = points + 50;
    const newXp = xp + 75;
    setPoints(newPoints);
    setXp(newXp);
    await AsyncStorage.multiSet([["points", String(newPoints)], ["xp", String(newXp)]]);

    if (userId) {
      await apiPatch("/api/user/profile", {
        userId,
        points: newPoints,
        xp: newXp,
        completedStages: updated,
      });
      await apiPost("/api/user/activity", {
        userId,
        type: "stage_complete",
        titleAr: `أكملت ${stageTitleAr}`,
        titleEn: `Completed ${stageTitleEn}`,
        points: 50,
        icon: "trophy",
        color: "#F59E0B",
      });
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
