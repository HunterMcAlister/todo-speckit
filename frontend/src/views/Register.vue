<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { emailRules } from "../config/validation.js";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const router = useRouter();
const formRef = ref(null);
const fName = ref("");
const lName = ref("");
const email = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMessage = ref("");

const requiredName = (label) => [(value) => !!value?.trim() || `${label} is required.`];
const usernameRules = [(value) => !!value?.trim() || "Username is required."];
const passwordRules = [
  (value) => !!value || "Password is required.",
  (value) => !value || value.length >= 8 || "Password must be at least 8 characters.",
];
const confirmPasswordRules = [
  (value) => !!value || "Password is required.",
  (value) => value === password.value || "Passwords do not match.",
];

async function submit() {
  errorMessage.value = "";
  const { valid } = await formRef.value.validate();

  if (!valid) {
    return;
  }

  loading.value = true;

  try {
    const response = await authServices.registerUser({
      fName: fName.value.trim(),
      lName: lName.value.trim(),
      email: email.value.trim(),
      username: username.value.trim(),
      password: password.value,
    });

    Utils.setStore("user", response.data);
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    await router.push({ name: "home" });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Unable to create account.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5">
        <v-card class="pa-6" elevation="2">
          <h1 class="text-h4 mb-6">Create account</h1>
          <v-alert v-if="errorMessage" type="error" class="mb-4">{{ errorMessage }}</v-alert>
          <v-form ref="formRef">
            <v-text-field v-model="fName" label="First name" :rules="requiredName('First name')" />
            <v-text-field v-model="lName" label="Last name" :rules="requiredName('Last name')" />
            <v-text-field v-model="email" label="Email" :rules="emailRules" autocomplete="email" />
            <v-text-field
              v-model="username"
              label="Username"
              :rules="usernameRules"
              autocomplete="username"
            />
            <v-text-field
              v-model="password"
              label="Password"
              type="password"
              :rules="passwordRules"
              autocomplete="new-password"
            />
            <v-text-field
              v-model="confirmPassword"
              label="Confirm password"
              type="password"
              :rules="confirmPasswordRules"
              autocomplete="new-password"
            />
            <v-btn
              color="primary"
              variant="elevated"
              class="oc-cta"
              :loading="loading"
              @click="submit"
            >
              Create account
            </v-btn>
          </v-form>
          <p class="mt-4 mb-0">
            <router-link :to="{ name: 'login' }">Sign in</router-link>
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
