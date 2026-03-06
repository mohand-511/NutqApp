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
  AppContext.tsx           # Global state: auth, points, streak, stages

components/
  Avatar.tsx               # 3D-like Saudi avatar with speaking animation
  GridBackground.tsx       # Subtle grid background pattern
  ErrorBoundary.tsx        # Error handling
```

## Design System
- **Background**: #050508 (near black) with subtle square grid
- **Primary**: #2563EB (Blue) 
- **Secondary**: #7C3AED (Purple)
- **Text**: #F0F0FF
- **Font**: Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold

## Key Features
1. **Authentication**: Email login/register, mock Google/Apple login
2. **Onboarding**: 3-step goal selection with card-based UI
3. **Gamified Path**: 8 learning stages with unlock progression, XP rewards
4. **Solif (سوالف)**: AI chat with Saudi avatar, 4 conversation modes, animated typing indicator
5. **Loyalty**: Points system with 6 Saudi partner rewards (Jarir, STC, AlBaik, Extra, Flynas, Starbucks)
6. **Profile**: Edit name, achievements, dark mode toggle, language switch, logout

## Workflows
- `Start Backend`: `npm run server:dev` on port 5000
- `Start Frontend`: `npm run expo:dev` on port 8081

## Packages Added
- `@expo-google-fonts/cairo` - Arabic font support
