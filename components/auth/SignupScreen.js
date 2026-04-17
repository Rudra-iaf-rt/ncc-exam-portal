import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "../ui/PrimaryButton";
import { Screen } from "../ui/Screen";
import { Colors, Spacing } from "../../constants/theme";
import { api, getErrorMessage } from "../../lib/api";
import FormField from "./FormField";
import { signupStyles as styles } from "./signup.styles";

const YEAR_OPTIONS = ["1st", "2nd", "3rd", "4th"];

const initialErrors = () => ({
  name: "",
  regimentalNumber: "",
  email: "",
  mobile: "",
  college: "",
  batch: "",
  year: "",
  password: "",
  confirmPassword: "",
});

export default function SignupScreen() {
  const router = useRouter();
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const [name, setName] = useState("");
  const [regimentalNumber, setRegimentalNumber] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [college, setCollege] = useState("");
  const [batch, setBatch] = useState("");
  const [year, setYear] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [yearModal, setYearModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState(initialErrors);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [serverError, setServerError] = useState("");
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showSuccessToast = useCallback((message) => {
    setToast({ visible: true, message });
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToast({ visible: false, message: "" }));
  }, [toastOpacity]);

  useEffect(() => {
    return () => {
      toastOpacity.stopAnimation();
    };
  }, [toastOpacity]);

  const validate = useCallback(() => {
    const e = initialErrors();
    let ok = true;

    if (!name.trim()) {
      e.name = "Full name is required";
      ok = false;
    }
    if (!regimentalNumber.trim()) {
      e.regimentalNumber = "Regimental number is required";
      ok = false;
    } else if (regimentalNumber.trim().length < 2) {
      e.regimentalNumber = "Enter a valid regimental number";
      ok = false;
    }

    const em = email.trim();
    if (!em) {
      e.email = "Email is required";
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      e.email = "Enter a valid email address";
      ok = false;
    }

    const digits = mobile.replace(/\D/g, "");
    if (!mobile.trim()) {
      e.mobile = "Mobile number is required";
      ok = false;
    } else if (digits.length !== 10) {
      e.mobile = "Mobile number must be 10 digits";
      ok = false;
    }

    if (!college.trim()) {
      e.college = "College name is required";
      ok = false;
    }
    if (!batch.trim()) {
      e.batch = "Batch is required (e.g. 2023-2026)";
      ok = false;
    }
    if (!year) {
      e.year = "Select year of study";
      ok = false;
    }

    if (!password) {
      e.password = "Password is required";
      ok = false;
    } else if (password.length < 6) {
      e.password = "Password must be at least 6 characters";
      ok = false;
    }

    if (!confirmPassword) {
      e.confirmPassword = "Confirm your password";
      ok = false;
    } else if (confirmPassword !== password) {
      e.confirmPassword = "Passwords do not match";
      ok = false;
    }

    setErrors(e);
    return ok;
  }, [
    name,
    regimentalNumber,
    email,
    mobile,
    college,
    batch,
    year,
    password,
    confirmPassword,
  ]);

  async function onSubmit() {
    setErrors(initialErrors());
    if (!validate()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSubmitting(true);
    setServerError("");
    try {
      const payload = {
        name: name.trim(),
        regimentalNumber: regimentalNumber.trim(),
        email: email.trim(),
        mobile: mobile.replace(/\D/g, ""),
        college: college.trim(),
        batch: batch.trim(),
        year,
        password,
      };

      await api.post("/api/auth/register", payload);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccessToast("Registration successful! Please sign in.");
      setTimeout(() => {
        router.replace("/login");
      }, 800);
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setServerError(getErrorMessage(err, "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.screenPad}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Ionicons name="ribbon" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.badge}>NATIONAL CADET CORPS</Text>
            <Text style={styles.title}>NCC Cadet Registration</Text>
            <Text style={styles.subtitle}>
              Create your cadet profile to access the exam portal and study materials.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cadet details</Text>

            {serverError ? (
              <Text
                style={{
                  color: Colors.danger,
                  fontSize: 14,
                  marginBottom: Spacing.md,
                  lineHeight: 20,
                }}
              >
                {serverError}
              </Text>
            ) : null}

            <FormField
              label="Full name"
              value={name}
              onChangeText={setName}
              error={errors.name}
              placeholder="As per NCC records"
              autoCapitalize="words"
              returnKeyType="next"
            />

            <FormField
              label="Regimental number"
              value={regimentalNumber}
              onChangeText={setRegimentalNumber}
              error={errors.regimentalNumber}
              placeholder="Unique cadet ID"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <FormField
              label="Mobile number"
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/\D/g, "").slice(0, 10))}
              error={errors.mobile}
              placeholder="10-digit mobile"
              keyboardType="phone-pad"
              maxLength={10}
            />

            <FormField
              label="College name"
              value={college}
              onChangeText={setCollege}
              error={errors.college}
              placeholder="Your institution"
            />

            <FormField
              label="Batch"
              value={batch}
              onChangeText={setBatch}
              error={errors.batch}
              placeholder="e.g. 2023-2026"
            />

            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 }}>
                Year of study
              </Text>
              <Pressable
                onPress={() => setYearModal(true)}
                style={[
                  styles.yearSelector,
                  errors.year ? { borderColor: Colors.danger, backgroundColor: "#FEF2F2" } : null,
                ]}
              >
                <Text style={[styles.yearSelectorText, !year && styles.yearSelectorPlaceholder]}>
                  {year ? `${year} year` : "Select year"}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
              </Pressable>
              {errors.year ? (
                <Text style={{ color: Colors.danger, fontSize: 12, marginTop: 4 }}>{errors.year}</Text>
              ) : null}
            </View>

            <FormField
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              placeholder="Minimum 6 characters"
              secureTextEntry={!showPassword}
              inputRef={passwordRef}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              rightAdornment={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={Colors.textMuted}
                  />
                </Pressable>
              }
            />

            <FormField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              placeholder="Re-enter password"
              secureTextEntry={!showConfirm}
              inputRef={confirmRef}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              rightAdornment={
                <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={10}>
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={Colors.textMuted}
                  />
                </Pressable>
              }
            />

            <PrimaryButton
              label="Create account"
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.submitBtn}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already registered?</Text>
            <Pressable onPress={() => router.replace("/login")} hitSlop={8}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={yearModal} transparent animationType="fade" onRequestClose={() => setYearModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setYearModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Year of study</Text>
            <ScrollView>
              {YEAR_OPTIONS.map((y) => (
                <Pressable
                  key={y}
                  style={styles.modalItem}
                  onPress={() => {
                    setYear(y);
                    setYearModal(false);
                    setErrors((prev) => ({ ...prev, year: "" }));
                  }}
                >
                  <Text style={styles.modalItemText}>{y} year</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {toast.visible ? (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
