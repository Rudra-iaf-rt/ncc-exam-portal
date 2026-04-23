import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PortalColors } from '@/constants/portal';
import { useAuth } from '@/context/auth-context';

export default function StaffLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PortalColors.navy }}>
        <ActivityIndicator color={PortalColors.gold} size="large" />
      </View>
    );
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR')) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PortalColors.gold,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarStyle: {
          backgroundColor: PortalColors.navy,
          borderTopColor: 'rgba(255,255,255,0.1)',
          height: 66,
          paddingTop: 8,
        },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="exams"
        options={{
          title: 'Exams',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="chart.bar.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
