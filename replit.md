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
1. **Authentication**: Email login/register with NutqLogo branding on auth screens
2. **Onboarding**: 3-step goal selection with card-based UI
3. **Gamified Path**: 8 stages, glassmorphism cards with colored accent bars, animated active node
4. **AI Voice Chat (TTS)**: Floating mic button on home → voice modal with Web SpeechRecognition + OpenAI TTS audio playback (shimmer voice) — phases: idle → listening → processing → speaking → done
5. **Solif (سوالف)**: AI chat (GPT-4o-mini, SSE streaming), 4 modes, chat messages persisted to PostgreSQL
6. **Loyalty**: Points + 6 Saudi partner rewards, theme-responsive colors
7. **Profile (redesigned)**: Premium card-based layout with:
   - Hero card: avatar gradient, name, level badge, XP progress bar
   - 4 stats grid: points, streak, stages, XP
   - 3-tab layout: Overview (achievements + AI coaching), Activity log, Settings
   - Settings: all toggles (dark mode, notifications, daily reminder, sounds, privacy) save to DB
8. **NutqLogo Branding**: Brand component with "ن" badge, shown on login, register, and profile header
9. **Dark/Light Mode**: Smooth theme switching with animated transition, full ThemeContext
10. **Bilingual RTL/LTR**: Complete RTL/LTR for all screens; language toggle persists to DB
11. **PostgreSQL + Drizzle ORM**: Real database for user profiles, settings, chat history, activity log

## Database Schema (shared/schema.ts)
- `users`: id, email, name, password, created_at
- `user_profiles`: userId, points, streak, xp, level, goal, completed_stages
- `user_settings`: userId, theme, language, notifications_enabled, sound_enabled, daily_reminder, privacy_mode
- `chat_messages`: userId, role, content, mode, created_at
- `user_activity`: userId, type, title_ar, title_en, points, icon, color, created_at

## API Endpoints (server/routes.ts)
- `POST /api/chat` — SSE streaming AI chat (persists to chat_messages)
- `POST /api/tts` — OpenAI TTS audio synthesis (returns MP3)
- `POST /api/user/sync` — Sync/create user in DB, return settings+profile
- `PATCH /api/user/settings` — Update user settings
- `PATCH /api/user/profile` — Update user profile data
- `GET /api/user/chat-history` — Fetch chat history
- `DELETE /api/user/chat-history` — Clear chat history
- `GET /api/user/activity` — Fetch activity log
- `POST /api/user/activity` — Log a new activity
- `POST /api/stage-hint` — AI tip for a stage
- `POST /api/coaching-tip` — AI coaching message
- `GET /api/word-of-day` — AI-generated word

## Workflows
- `Start Backend`: `npm run server:dev` on port 5000
- `Start Frontend`: `npm run expo:dev` on port 8081

## Packages Added
- `@expo-google-fonts/cairo` - Arabic font support
