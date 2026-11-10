<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const router = useRouter();
const formRef = ref(null);
const username = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");

const usernameRules = [(value) => !!value?.trim() || "Username is required."];
const passwordRules = [(value) => !!value || "Password is required."];

async function submit() {
  errorMessage.value = "";
  const { valid } = await formRef.value.validate();

  if (!valid) {
    return;
  }

  loading.value = true;

  try {
    const response = await authServices.loginUser({
      username: username.value.trim(),
      password: password.value,
    });

    Utils.setStore("user", response.data);
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    await router.push({ name: "home" });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Unable to sign in.";
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
          <h1 class="text-h4 mb-6">Sign in</h1>
          <v-alert v-if="errorMessage" type="error" class="mb-4">{{ errorMessage }}</v-alert>
          <v-form ref="formRef">
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
              autocomplete="current-password"
            />
            <v-btn
              color="primary"
              variant="elevated"
              class="oc-cta"
              :loading="loading"
              @click="submit"
            >
              Sign in
            </v-btn>
          </v-form>
          <p class="mt-4 mb-0">
            <router-link :to="{ name: 'register' }">Create an account</router-link>
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
