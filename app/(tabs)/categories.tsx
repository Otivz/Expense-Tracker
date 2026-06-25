import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function CategoriesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Categories</ThemedText>
      <ThemedText style={styles.text}>Coming Soon: Customize spending and income categories.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4FAF8',
    padding: 20,
  },
  text: {
    marginTop: 10,
    textAlign: 'center',
    color: '#6B7B77',
  },
});
