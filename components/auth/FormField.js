import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Colors, Radius, Spacing } from "../../constants/theme";

/**
 * Reusable labeled input with error line.
 */
export default function FormField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "sentences",
  autoCorrect = true,
  editable = true,
  maxLength,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  rightAdornment,
  testID,
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          error ? styles.inputShellError : null,
          !editable ? styles.inputDisabled : null,
        ]}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          testID={testID}
        />
        {rightAdornment ? (
          <View style={styles.adornment}>{rightAdornment}</View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    minHeight: 50,
    paddingHorizontal: 4,
  },
  inputShellError: {
    borderColor: Colors.danger,
    backgroundColor: "#FEF2F2",
  },
  inputDisabled: {
    opacity: 0.65,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  adornment: {
    paddingRight: 8,
  },
  error: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
});
