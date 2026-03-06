import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#050508" } }}>
      <Stack.Screen name="goals" />
    </Stack>
  );
}
