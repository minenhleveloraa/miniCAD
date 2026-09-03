import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Redirect, Tabs, usePathname } from "expo-router";
import { View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthLoadingScreen } from "@/components/auth-loading-screen";
import { useAuth } from "@/features/auth/auth-provider";
import { OfficerWorkspaceProvider } from "@/features/workspace/officer-workspace-provider";
import { colors, radius } from "@/theme";

type TabIconProps = {
  color: ColorValue;
  focused: boolean;
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
};

function TabIcon({ color, focused, name }: TabIconProps) {
  return (
    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? colors.ink : "transparent",
      }}
    >
      <MaterialCommunityIcons name={name} color={focused ? colors.onDark : color} size={22} />
    </View>
  );
}

export default function OfficerTabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isLoading, session } = useAuth();
  const responseDetailOpen = pathname.startsWith("/incidents/");

  if (isLoading) return <AuthLoadingScreen />;
  if (!session) return <Redirect href="/login" />;

  return (
    <OfficerWorkspaceProvider officerId={session.user.id}>
      <Tabs
        initialRouteName="overview"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            display: responseDetailOpen ? "none" : "flex",
            position: "absolute",
            left: 24,
            right: 24,
            bottom: Math.max(insets.bottom, 12),
            height: 68,
            paddingTop: 10,
            paddingBottom: 10,
            borderTopWidth: 0,
            borderRadius: radius.full,
            borderCurve: "continuous",
            backgroundColor: colors.surfaceStrong,
            boxShadow: "0 18px 42px rgba(26, 26, 46, 0.20)",
          },
        }}
      >
        <Tabs.Screen
          name="overview"
          options={{
            title: "Overview",
            tabBarAccessibilityLabel: "Overview tab",
            tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="view-dashboard-outline" />,
          }}
        />
        <Tabs.Screen
          name="incidents"
          options={{
            title: "Incidents",
            tabBarAccessibilityLabel: "Active incidents tab",
            tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="access-point" />,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarAccessibilityLabel: "Officer account tab",
            tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="account-outline" />,
          }}
        />
      </Tabs>
    </OfficerWorkspaceProvider>
  );
}
