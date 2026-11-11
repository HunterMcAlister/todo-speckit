<script setup>
import { onMounted, ref } from "vue";
import listServices from "../services/listServices.js";
import todoServices from "../services/todoServices.js";

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

const itemsOpen = ref(false);
const itemsList = ref(null);
const todos = ref([]);
const todosLoading = ref(false);
const todosError = ref("");

const addItemOpen = ref(false);
const addTitle = ref("");
const addItemError = ref("");
const addItemLoading = ref(false);
const addItemForm = ref(null);

const editItemOpen = ref(false);
const editTodoId = ref(null);
const editTitle = ref("");
const editItemError = ref("");
const editItemLoading = ref(false);
const editItemForm = ref(null);

const deleteItemOpen = ref(false);
const deleteTodoTarget = ref(null);
const deleteItemLoading = ref(false);

const nameRules = [(value) => !!value?.trim() || "List name is required."];
const titleRules = [(value) => !!value?.trim() || "Todo title is required."];

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
    if (itemsList.value?.id === deleteTarget.value.id) {
      itemsOpen.value = false;
    }
    await loadLists();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Unable to delete list.";
  } finally {
    deleteLoading.value = false;
  }
}

async function loadTodos() {
  todosLoading.value = true;
  todosError.value = "";

  try {
    const response = await todoServices.getTodos(itemsList.value.id);
    todos.value = response.data;
  } catch (error) {
    todos.value = [];
    todosError.value = error.response?.data?.message || "Unable to load todos.";
  } finally {
    todosLoading.value = false;
  }
}

async function openItems(list) {
  itemsList.value = list;
  itemsOpen.value = true;
  addItemOpen.value = false;
  editItemOpen.value = false;
  deleteItemOpen.value = false;
  await loadTodos();
}

function closeItems() {
  itemsOpen.value = false;
  addItemOpen.value = false;
  editItemOpen.value = false;
  deleteItemOpen.value = false;
}

function openAddItem() {
  addTitle.value = "";
  addItemError.value = "";
  addItemOpen.value = true;
}

async function createTodo() {
  addItemError.value = "";
  const { valid } = await addItemForm.value.validate();

  if (!valid) {
    return;
  }

  addItemLoading.value = true;

  try {
    await todoServices.createTodo(itemsList.value.id, { title: addTitle.value.trim() });
    addItemOpen.value = false;
    await loadTodos();
  } catch (error) {
    addItemError.value = error.response?.data?.message || "Unable to add todo.";
  } finally {
    addItemLoading.value = false;
  }
}

async function toggleCompleted(todo, completed) {
  todosError.value = "";

  try {
    await todoServices.updateTodo(todo.id, { completed });
    await loadTodos();
  } catch (error) {
    todosError.value = error.response?.data?.message || "Unable to update todo.";
  }
}

function openEditItem(todo) {
  editTodoId.value = todo.id;
  editTitle.value = todo.title;
  editItemError.value = "";
  editItemOpen.value = true;
}

async function saveTodoTitle() {
  editItemError.value = "";
  const { valid } = await editItemForm.value.validate();

  if (!valid) {
    return;
  }

  editItemLoading.value = true;

  try {
    await todoServices.updateTodo(editTodoId.value, { title: editTitle.value.trim() });
    editItemOpen.value = false;
    await loadTodos();
  } catch (error) {
    editItemError.value = error.response?.data?.message || "Unable to update todo.";
  } finally {
    editItemLoading.value = false;
  }
}

function openDeleteItem(todo) {
  deleteTodoTarget.value = todo;
  deleteItemOpen.value = true;
}

async function confirmDeleteItem() {
  deleteItemLoading.value = true;
  todosError.value = "";

  try {
    await todoServices.deleteTodo(deleteTodoTarget.value.id);
    deleteItemOpen.value = false;
    deleteTodoTarget.value = null;
    await loadTodos();
  } catch (error) {
    todosError.value = error.response?.data?.message || "Unable to delete todo.";
  } finally {
    deleteItemLoading.value = false;
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
          <v-btn
            size="small"
            icon
            variant="text"
            :aria-label="`View items for ${list.name}`"
            @click="openItems(list)"
          >
            <v-icon icon="mdi-format-list-checks" />
          </v-btn>
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

    <v-dialog v-model="itemsOpen" max-width="640">
      <v-card class="pa-4">
        <div class="d-flex align-center justify-space-between mb-4">
          <h2 class="text-h6">{{ itemsList?.name }} — Items</h2>
          <v-btn color="primary" variant="elevated" class="oc-cta" @click="openAddItem">+ Add Item</v-btn>
        </div>
        <v-progress-linear v-if="todosLoading" indeterminate color="primary" class="mb-4" />
        <v-alert v-if="todosError" type="error" class="mb-4">{{ todosError }}</v-alert>
        <p v-if="!todosLoading && todos.length === 0">No todos in this list yet.</p>
        <v-list v-else-if="!todosLoading">
          <v-list-item v-for="todo in todos" :key="todo.id">
            <template #prepend>
              <v-checkbox-btn
                :model-value="todo.completed"
                :aria-label="`Completed ${todo.title}`"
                @update:model-value="(value) => toggleCompleted(todo, value === true)"
              />
            </template>
            <v-list-item-title
              :class="{ 'text-decoration-line-through text-medium-emphasis': todo.completed }"
            >
              {{ todo.title }}
            </v-list-item-title>
            <template #append>
              <v-btn size="small" icon variant="text" aria-label="Edit todo" @click="openEditItem(todo)">
                <v-icon icon="mdi-pencil" />
              </v-btn>
              <v-btn size="small" icon variant="text" aria-label="Delete todo" @click="openDeleteItem(todo)">
                <v-icon icon="mdi-delete" />
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
        <div class="d-flex justify-end mt-4">
          <v-btn color="secondary" variant="text" @click="closeItems">Close</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="addItemOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h6 mb-4">Add item</h2>
        <v-alert v-if="addItemError" type="error" class="mb-4">{{ addItemError }}</v-alert>
        <v-form ref="addItemForm">
          <v-text-field v-model="addTitle" label="Todo title" :rules="titleRules" />
        </v-form>
        <div class="d-flex justify-end">
          <v-btn color="secondary" variant="text" class="mr-2" @click="addItemOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="addItemLoading"
            @click="createTodo"
          >
            Add
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editItemOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h6 mb-4">Edit item</h2>
        <v-alert v-if="editItemError" type="error" class="mb-4">{{ editItemError }}</v-alert>
        <v-form ref="editItemForm">
          <v-text-field v-model="editTitle" label="Todo title" :rules="titleRules" />
        </v-form>
        <div class="d-flex justify-end">
          <v-btn color="secondary" variant="text" class="mr-2" @click="editItemOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="editItemLoading"
            @click="saveTodoTitle"
          >
            Save
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteItemOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h6 mb-4">Delete todo</h2>
        <p class="mb-4">Delete {{ deleteTodoTarget?.title }}?</p>
        <div class="d-flex justify-end">
          <v-btn color="secondary" variant="text" class="mr-2" @click="deleteItemOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="deleteItemLoading"
            @click="confirmDeleteItem"
          >
            Delete
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>
