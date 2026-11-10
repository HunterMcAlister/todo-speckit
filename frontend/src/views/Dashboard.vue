<script setup>
import { onMounted, ref } from "vue";
import listServices from "../services/listServices.js";

const lists = ref([]);
const loading = ref(false);
const errorMessage = ref("");

const addOpen = ref(false);
const addName = ref("");
const addError = ref("");
const addLoading = ref(false);
const addForm = ref(null);

const editOpen = ref(false);
const editId = ref(null);
const editName = ref("");
const editError = ref("");
const editLoading = ref(false);
const editForm = ref(null);

const deleteOpen = ref(false);
const deleteTarget = ref(null);
const deleteLoading = ref(false);

const nameRules = [(value) => !!value?.trim() || "List name is required."];

async function loadLists() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await listServices.getLists();
    lists.value = response.data;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Unable to load lists.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadLists);

function openAdd() {
  addName.value = "";
  addError.value = "";
  addOpen.value = true;
}

async function createList() {
  addError.value = "";
  const { valid } = await addForm.value.validate();

  if (!valid) {
    return;
  }

  addLoading.value = true;

  try {
    await listServices.createList({ name: addName.value.trim() });
    addOpen.value = false;
    await loadLists();
  } catch (error) {
    addError.value = error.response?.data?.message || "Unable to create list.";
  } finally {
    addLoading.value = false;
  }
}

function openEdit(list) {
  editId.value = list.id;
  editName.value = list.name;
  editError.value = "";
  editOpen.value = true;
}

async function renameList() {
  editError.value = "";
  const { valid } = await editForm.value.validate();

  if (!valid) {
    return;
  }

  editLoading.value = true;

  try {
    await listServices.updateList(editId.value, { name: editName.value.trim() });
    editOpen.value = false;
    await loadLists();
  } catch (error) {
    editError.value = error.response?.data?.message || "Unable to rename list.";
  } finally {
    editLoading.value = false;
  }
}

function openDelete(list) {
  deleteTarget.value = list;
  deleteOpen.value = true;
}

async function confirmDelete() {
  deleteLoading.value = true;
  errorMessage.value = "";

  try {
    await listServices.deleteList(deleteTarget.value.id);
    deleteOpen.value = false;
    await loadLists();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Unable to delete list.";
  } finally {
    deleteLoading.value = false;
  }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h4">My Lists</h1>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openAdd">+ New List</v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
    <v-alert v-if="errorMessage" type="error" class="mb-4">{{ errorMessage }}</v-alert>

    <p v-if="!loading && lists.length === 0">No lists yet. Create your first list.</p>

    <v-list v-else-if="!loading" rounded="lg" bg-color="surface">
      <v-list-item v-for="list in lists" :key="list.id" :title="list.name">
        <template #append>
          <v-btn size="small" icon variant="text" aria-label="Edit list" @click="openEdit(list)">
            <v-icon icon="mdi-pencil" />
          </v-btn>
          <v-btn size="small" icon variant="text" aria-label="Delete list" @click="openDelete(list)">
            <v-icon icon="mdi-delete" />
          </v-btn>
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="addOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h6 mb-4">New list</h2>
        <v-alert v-if="addError" type="error" class="mb-4">{{ addError }}</v-alert>
        <v-form ref="addForm">
          <v-text-field v-model="addName" label="List name" :rules="nameRules" />
        </v-form>
        <div class="d-flex justify-end">
          <v-btn color="secondary" variant="text" class="mr-2" @click="addOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="addLoading"
            @click="createList"
          >
            Create
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h6 mb-4">Rename list</h2>
        <v-alert v-if="editError" type="error" class="mb-4">{{ editError }}</v-alert>
        <v-form ref="editForm">
          <v-text-field v-model="editName" label="List name" :rules="nameRules" />
        </v-form>
        <div class="d-flex justify-end">
          <v-btn color="secondary" variant="text" class="mr-2" @click="editOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="editLoading"
            @click="renameList"
          >
            Save
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h6 mb-4">Delete list</h2>
        <p class="mb-4">Delete {{ deleteTarget?.name }}?</p>
        <div class="d-flex justify-end">
          <v-btn color="secondary" variant="text" class="mr-2" @click="deleteOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="deleteLoading"
            @click="confirmDelete"
          >
            Delete
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>
