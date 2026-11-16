<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { emailRules } from "../config/validation.js";
import authServices from "../services/authServices.js";
import userServices from "../services/userServices.js";
import Utils from "../config/utils.js";

const router = useRouter();
const user = ref(Utils.getStore("user"));
const menuOpen = ref(false);
const editOpen = ref(false);
const signingOut = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const formRef = ref(null);
const fName = ref("");
const lName = ref("");
const email = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");

const requiredName = (label) => [(value) => !!value?.trim() || `${label} is required.`];
const usernameRules = [(value) => !!value?.trim() || "Username is required."];
const passwordRules = [
  (value) => !value || value.length >= 8 || "Password must be at least 8 characters.",
];
const confirmPasswordRules = [
  (value) => (value || "") === (password.value || "") || "Passwords do not match.",
];

const displayName = computed(() => {
  const current = user.value;

  if (!current) {
    return "";
  }

  return [current.fName, current.lName].filter(Boolean).join(" ");
});

function refreshUser() {
  user.value = Utils.getStore("user");
}

function applyProfile(profile) {
  fName.value = profile?.fName || "";
  lName.value = profile?.lName || "";
  email.value = profile?.email || "";
  username.value = profile?.username || "";
}

onMounted(() => {
  window.addEventListener("user-logged-in", refreshUser);
});

onUnmounted(() => {
  window.removeEventListener("user-logged-in", refreshUser);
});

async function openEdit() {
  errorMessage.value = "";
  password.value = "";
  confirmPassword.value = "";
  menuOpen.value = false;
  applyProfile(user.value);

  const userId = user.value?.userId;

  if (userId) {
    try {
      const response = await userServices.getUser(userId);
      applyProfile(response.data);
    } catch {
      // The session copy stays in the form when the profile request fails.
    }
  }

  editOpen.value = true;
}

function cancelEdit() {
  editOpen.value = false;
  errorMessage.value = "";
}

async function saveProfile() {
  errorMessage.value = "";
  const { valid } = await formRef.value.validate();

  if (!valid) {
    return;
  }

  const payload = {
    fName: fName.value.trim(),
    lName: lName.value.trim(),
    email: email.value.trim(),
    username: username.value.trim(),
  };

  if (password.value) {
    payload.password = password.value;
  }

  saving.value = true;

  try {
    const response = await userServices.updateUser(user.value.userId, payload);
    const stored = Utils.getStore("user") || {};

    Utils.setStore("user", {
      ...stored,
      userId: stored.userId ?? response.data.id,
      token: stored.token,
      fName: response.data.fName,
      lName: response.data.lName,
      email: response.data.email,
      username: response.data.username,
      role: response.data.role ?? stored.role,
    });
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    editOpen.value = false;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Unable to update profile.";
  } finally {
    saving.value = false;
  }
}

async function signOut() {
  signingOut.value = true;

  try {
    await authServices.logoutUser();
  } catch {
    // Local session is cleared even when the token is already invalid.
  } finally {
    Utils.removeItem("user");
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    signingOut.value = false;
    menuOpen.value = false;
    await router.push({ name: "login" });
  }
}
</script>

<template>
  <v-app-bar color="surface" elevation="1">
    <v-app-bar-title>Todo</v-app-bar-title>
    <v-spacer />
    <v-menu v-model="menuOpen" location="bottom end" :close-on-content-click="false">
      <template #activator="{ props }">
        <v-btn icon="mdi-account-circle" aria-label="User menu" v-bind="props" />
      </template>
      <v-card min-width="260">
        <v-list>
          <v-list-item>
            <v-list-item-title>{{ displayName }}</v-list-item-title>
            <v-list-item-subtitle>{{ user?.username }}</v-list-item-subtitle>
            <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <v-card-actions>
          <v-btn color="primary" variant="elevated" class="oc-cta" @click="openEdit">
            Edit Profile
          </v-btn>
          <v-btn variant="text" :loading="signingOut" @click="signOut">Log out</v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
    <v-dialog v-model="editOpen" max-width="480">
      <v-card class="pa-4">
        <v-card-title>Edit Profile</v-card-title>
        <v-card-text>
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
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelEdit">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="saving"
            @click="saveProfile"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app-bar>
</template>
