// app/_layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider } from "../src/contexts/AuthContext";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "#F8FAFC" }}
          edges={["top"]}
        >
          <StatusBar style="dark" backgroundColor="#F8FAFC" />

          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen
                name="review/create"
                options={{
                  presentation: "modal",
                  title: "Avaliar Usuário",
                }}
              />
            </Stack>
          </AuthProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
