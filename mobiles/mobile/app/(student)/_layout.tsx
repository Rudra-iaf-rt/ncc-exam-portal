import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PortalColors } from '@/constants/portal';
import { useAuth } from '@/context/auth-context';

export default function StudentTabLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator color={PortalColors.navy} size="large" />
      </View>
    );
  }

  if (!user || user.role !== 'STUDENT') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PortalColors.gold,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        headerShown: false,
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
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="materials"
        options={{
          title: 'Materials',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="exam"
        options={{
          title: 'Exam',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
