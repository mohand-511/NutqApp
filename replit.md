# نطق (Nutq) - AI-Powered Arabic Learning App

## Overview
نطق (Nutq) is a modern AI-powered mobile application for Arabic speakers to learn, talk, and complete tasks using AI. Built with Expo Router, React Native, and an Express backend.

## Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54, Expo Router for file-based routing
- **Language**: TypeScript
- **Fonts**: Cairo (Arabic-optimized), all weights
- **State**: React Context (AppContext) + AsyncStorage for persistence
- **UI**: Custom dark theme with Blue/Purple gradients, grid background
- **Animations**: react-native-reanimated

### Backend (Express)
- Simple Express server on port 5000
- Serves landing page and static Expo files
- API routes prefixed with /api

## App Structure

```
app/
  _layout.tsx              # Root layout - Cairo fonts, providers
  index.tsx                # Welcome / splash screen
  (auth)/
    _layout.tsx
    login.tsx              # Email login
    register.tsx           # New account
    forgot-password.tsx    # Password reset
  (onboarding)/
    _layout.tsx
    goals.tsx              # 3-step onboarding: goal, level, time
  (tabs)/
    _layout.tsx            # NativeTabs (liquid glass iOS 26+) / Classic tabs
    index.tsx              # Home - Gamified learning path
    solif.tsx              # Free Talk AI chat ("سوالف")
    loyalty.tsx            # Points & Saudi partner rewards
    profile.tsx            # Profile, settings, achievements

context/
  AppContext.tsx           # Global state: auth, points, streak, stages, language
  ThemeContext.tsx         # Dark/Light mode theme provider + useTheme() hook

components/
  Avatar.tsx               # 3D-like Saudi avatar with speaking animation
  GridBackground.tsx       # Subtle grid background pattern (theme-aware)
  ErrorBoundary.tsx        # Error handling
```

## Design System
- **Dark Mode** (default): Background #050508, card rgba(20,20,42,0.75) glassmorphism
- **Light Mode**: Background #F0F2FF, card rgba(255,255,255,0.82) glass
- **Primary**: #2563EB (Blue), **Secondary**: #7C3AED (Purple)
- **Font**: Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold
- **Theme**: useTheme() hook from context/ThemeContext.tsx — {isDark, toggleTheme, colors}
- **Direction**: isRTL = language === "ar" — applied to flexDirection, textAlign throughout tabs

## Key Features
1. **Authentication**: Email login/register, mock Google/Apple login
2. **Onboarding**: 3-step goal selection with card-based UI
3. **Gamified Path**: 8 stages, glassmorphism cards with colored accent bars, animated active node
4. **Voice Chat FAB**: Floating mic button on home → voice modal with SpeechRecognition (web) + AI streaming
5. **Solif (سوالف)**: Redesigned AI chat, inverted FlatList, 4 modes, larger message area
6. **Loyalty**: Points + 6 Saudi partner rewards, theme-responsive colors
7. **Profile**: AI coaching, achievements, dark/light theme toggle, AR/EN language toggle
8. **Dark/Light Mode**: Full theme support via ThemeContext, persisted in AsyncStorage
9. **Bilingual RTL/LTR**: Language toggle switches text direction across all tab screens

## Workflows
- `Start Backend`: `npm run server:dev` on port 5000
- `Start Frontend`: `npm run expo:dev` on port 8081

## Packages Added
- `@expo-google-fonts/cairo` - Arabic font support
