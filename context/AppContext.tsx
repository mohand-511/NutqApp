import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  goal: string;
  level: string;
  dailyMinutes: number;
  language: "ar" | "en";
}

export interface AppContextValue {
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  profile: UserProfile;
  points: number;
  streak: number;
  completedStages: number[];
  login: (email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (goal: string, level: string, dailyMinutes: number) => Promise<void>;
  addPoints: (amount: number) => Promise<void>;
  completeStage: (stageId: number) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
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

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [language, setLanguageState] = useState<"ar" | "en">("ar");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [authStr, onboardStr, profileStr, pointsStr, streakStr, stagesStr, langStr] =
        await Promise.all([
          AsyncStorage.getItem("isAuthenticated"),
          AsyncStorage.getItem("hasCompletedOnboarding"),
          AsyncStorage.getItem("profile"),
          AsyncStorage.getItem("points"),
          AsyncStorage.getItem("streak"),
          AsyncStorage.getItem("completedStages"),
          AsyncStorage.getItem("language"),
        ]);

      if (authStr === "true") setIsAuthenticated(true);
      if (onboardStr === "true") setHasCompletedOnboarding(true);
      if (profileStr) setProfile(JSON.parse(profileStr));
      if (pointsStr) setPoints(parseInt(pointsStr));
      if (streakStr) setStreak(parseInt(streakStr));
      if (stagesStr) setCompletedStages(JSON.parse(stagesStr));
      if (langStr) setLanguageState(langStr as "ar" | "en");
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }

  async function login(email: string, name: string) {
    const updatedProfile = { ...defaultProfile, email, name };
    setProfile(updatedProfile);
    setIsAuthenticated(true);
    setStreak(1);
    await AsyncStorage.multiSet([
      ["isAuthenticated", "true"],
      ["profile", JSON.stringify(updatedProfile)],
      ["streak", "1"],
    ]);
  }

  async function logout() {
    setIsAuthenticated(false);
    setHasCompletedOnboarding(false);
    setProfile(defaultProfile);
    setPoints(0);
    setStreak(0);
    setCompletedStages([]);
    await AsyncStorage.multiRemove([
      "isAuthenticated",
      "hasCompletedOnboarding",
      "profile",
      "points",
      "streak",
      "completedStages",
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
    setPoints(newPoints);
    await AsyncStorage.setItem("points", String(newPoints));
  }

  async function completeStage(stageId: number) {
    if (completedStages.includes(stageId)) return;
    const updated = [...completedStages, stageId];
    setCompletedStages(updated);
    await AsyncStorage.setItem("completedStages", JSON.stringify(updated));
    await addPoints(50);
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await AsyncStorage.setItem("profile", JSON.stringify(updated));
  }

  function setLanguage(lang: "ar" | "en") {
    setLanguageState(lang);
    AsyncStorage.setItem("language", lang);
  }

  const value = useMemo<AppContextValue>(
    () => ({
      isAuthenticated,
      hasCompletedOnboarding,
      profile,
      points,
      streak,
      completedStages,
      login,
      logout,
      completeOnboarding,
      addPoints,
      completeStage,
      updateProfile,
      language,
      setLanguage,
    }),
    [isAuthenticated, hasCompletedOnboarding, profile, points, streak, completedStages, language]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
