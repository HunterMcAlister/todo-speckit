<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const router = useRouter();
const loading = ref(false);
const user = Utils.getStore("user");

async function signOut() {
  loading.value = true;

  try {
    await authServices.logoutUser();
  } catch {
    // Local session is cleared even when the token is already invalid.
  } finally {
    Utils.removeItem("user");
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    loading.value = false;
    await router.push({ name: "login" });
  }
}
</script>

<template>
  <v-container class="py-10">
    <h1 class="text-h4 mb-6">Welcome, {{ user?.fName }}</h1>
    <v-btn color="primary" variant="elevated" class="oc-cta" :loading="loading" @click="signOut">
      Sign out
    </v-btn>
  </v-container>
</template>
