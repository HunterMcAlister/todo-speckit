/**
 * Feature 2: Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 * Feature 3: Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
 */
import { flushPromises } from "@vue/test-utils";
import Dashboard from "../src/views/Dashboard.vue";
import listServices from "../src/services/listServices.js";
import todoServices from "../src/services/todoServices.js";
import router from "../src/router.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/listServices.js", () => ({
  default: {
    getLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
  },
}));

vi.mock("../src/services/todoServices.js", () => ({
  default: {
    getTodos: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
  },
}));

const groceries = { id: 1, name: "Groceries", userId: 7 };

async function mountDashboard() {
  const mounted = await mountWithPlugins(Dashboard, { attachTo: document.body });
  await flushPromises();
  return mounted;
}

function visibleText() {
  return document.body.textContent;
}

async function clickButton(wrapper, text) {
  const buttons = [
    ...wrapper.findAll("button"),
    ...wrapper.findAllComponents({ name: "VBtn" }),
  ];
  const button = buttons.find((node) => node.text().includes(text));

  if (!button) {
    const labels = buttons.map((node) => node.text()).join(" | ");
    throw new Error(`No button containing ${JSON.stringify(text)}. Seen: ${labels}`);
  }

  await button.trigger("click");
  await flushPromises();
}

async function clickExact(wrapper, text) {
  const buttons = [
    ...wrapper.findAll("button"),
    ...wrapper.findAllComponents({ name: "VBtn" }),
  ];
  const button = buttons.find((node) => node.text().trim() === text);

  if (!button) {
    const labels = buttons.map((node) => node.text().trim()).join(" | ");
    throw new Error(`No button exactly ${JSON.stringify(text)}. Seen: ${labels}`);
  }

  await button.trigger("click");
  await flushPromises();
}

async function clickLastButton(wrapper, text) {
  const buttons = [
    ...wrapper.findAll("button"),
    ...wrapper.findAllComponents({ name: "VBtn" }),
  ];
  const matches = buttons.filter((node) => node.text().includes(text));
  const button = matches[matches.length - 1];

  if (!button) {
    throw new Error(`No button containing ${JSON.stringify(text)}`);
  }

  await button.trigger("click");
  await flushPromises();
}

async function fillListName(wrapper, value) {
  const field = wrapper
    .findAllComponents({ name: "VTextField" })
    .find((component) => component.props("label") === "List name");

  await field.setValue(value);
}

async function clickInDocument(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Missing ${selector}`);
  }

  element.click();
  await flushPromises();
}

async function fillTodoTitle(wrapper, value) {
  const fields = wrapper
    .findAllComponents({ name: "VTextField" })
    .filter((component) => component.props("label") === "Todo title");

  await fields[fields.length - 1].setValue(value);
}

describe("Feature 2 — Todo List Management", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    listServices.getLists.mockResolvedValue({ data: [] });
    todoServices.getTodos.mockResolvedValue({ data: [] });
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      listServices.getLists
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValue({ data: [groceries] });
      listServices.createList.mockResolvedValue({ status: 201, data: groceries });

      const { wrapper } = await mountDashboard();
      await clickButton(wrapper, "+ New List");
      await fillListName(wrapper, "Groceries");
      await clickButton(wrapper, "Create");

      expect(listServices.createList).toHaveBeenCalledWith({ name: "Groceries" });
      expect(visibleText()).toContain("Groceries");
      expect(document.querySelector(".v-overlay--active")).toBeNull();
      wrapper.unmount();
    });

    it("User creates a list with an empty name", async () => {
      const { wrapper } = await mountDashboard();

      await clickButton(wrapper, "+ New List");
      await fillListName(wrapper, "   ");
      await clickButton(wrapper, "Create");

      expect(visibleText()).toContain("List name is required.");
      expect(listServices.createList).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("User creates a list with a name that is too long", async () => {
      listServices.createList.mockRejectedValue({
        response: {
          status: 400,
          data: { message: "List name must be 100 characters or fewer." },
        },
      });

      const { wrapper } = await mountDashboard();
      await clickButton(wrapper, "+ New List");
      await fillListName(wrapper, "a".repeat(101));
      await clickButton(wrapper, "Create");

      expect(listServices.createList).toHaveBeenCalled();
      expect(document.querySelector(".v-alert").textContent).toContain(
        "List name must be 100 characters or fewer."
      );
      wrapper.unmount();
    });
  });

  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      listServices.getLists.mockResolvedValue({
        data: [
          { id: 2, name: "Personal", userId: 7 },
          { id: 3, name: "Work", userId: 7 },
        ],
      });

      const { wrapper } = await mountDashboard();
      const text = wrapper.text();

      expect(text.indexOf("Personal")).toBeGreaterThan(-1);
      expect(text.indexOf("Personal")).toBeLessThan(text.indexOf("Work"));
      expect(wrapper.findAll("[aria-label='Edit list']")).toHaveLength(2);
      expect(wrapper.findAll("[aria-label='Delete list']")).toHaveLength(2);
      wrapper.unmount();
    });

    it("User has no lists", async () => {
      const { wrapper } = await mountDashboard();

      expect(wrapper.text()).toContain("No lists yet. Create your first list.");
      wrapper.unmount();
    });
  });

  describe("US-2.3 — Manage list rows", () => {
    it("List rows show edit and delete actions", async () => {
      listServices.getLists.mockResolvedValue({ data: [groceries] });

      const { wrapper } = await mountDashboard();

      expect(wrapper.text()).toContain("Groceries");
      expect(wrapper.find("[aria-label='Edit list']").exists()).toBe(true);
      expect(wrapper.find("[aria-label='Delete list']").exists()).toBe(true);
      wrapper.unmount();
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      listServices.getLists
        .mockResolvedValueOnce({ data: [groceries] })
        .mockResolvedValue({ data: [{ ...groceries, name: "Shopping" }] });
      listServices.updateList.mockResolvedValue({
        status: 200,
        data: { ...groceries, name: "Shopping" },
      });

      const { wrapper } = await mountDashboard();
      await wrapper.get("[aria-label='Edit list']").trigger("click");
      await flushPromises();
      await fillListName(wrapper, "Shopping");
      await clickButton(wrapper, "Save");

      expect(listServices.updateList).toHaveBeenCalledWith(1, { name: "Shopping" });
      expect(wrapper.text()).toContain("Shopping");
      expect(wrapper.text()).not.toContain("Groceries");
      wrapper.unmount();
    });

    it("User deletes a list", async () => {
      listServices.getLists
        .mockResolvedValueOnce({ data: [groceries] })
        .mockResolvedValue({ data: [] });
      listServices.deleteList.mockResolvedValue({ status: 200, data: { message: "List deleted." } });

      const { wrapper } = await mountDashboard();
      await wrapper.get("[aria-label='Delete list']").trigger("click");
      await flushPromises();
      await clickButton(wrapper, "Delete");

      expect(listServices.deleteList).toHaveBeenCalledWith(1);
      expect(wrapper.text()).not.toContain("Groceries");
      expect(wrapper.text()).toContain("No lists yet. Create your first list.");
      wrapper.unmount();
    });
  });

  describe("US-2.5 — Private lists only", () => {
    it("Unauthenticated user accesses the dashboard", async () => {
      await router.push({ name: "register" });
      await router.push({ name: "home" });
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});

const milk = {
  id: 10,
  listId: 1,
  title: "Buy milk",
  completed: false,
  userId: 7,
};

describe("Feature 3 — Todo List Item Management", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    listServices.getLists.mockResolvedValue({ data: [groceries] });
    todoServices.getTodos.mockResolvedValue({ data: [] });
  });

  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValue({ data: [milk] });
      todoServices.createTodo.mockResolvedValue({ status: 201, data: milk });

      const { wrapper } = await mountDashboard();
      await wrapper.get("[aria-label='View items for Groceries']").trigger("click");
      await flushPromises();
      await clickButton(wrapper, "+ Add Item");
      await fillTodoTitle(wrapper, "Buy milk");
      await clickExact(wrapper, "Add");

      expect(todoServices.createTodo).toHaveBeenCalledWith(1, { title: "Buy milk" });
      expect(visibleText()).toContain("Buy milk");
      expect(wrapper.find(".text-decoration-line-through").exists()).toBe(false);
      wrapper.unmount();
    });

    it("User adds a todo with an empty title", async () => {
      const { wrapper } = await mountDashboard();

      await wrapper.get("[aria-label='View items for Groceries']").trigger("click");
      await flushPromises();
      await clickButton(wrapper, "+ Add Item");
      await fillTodoTitle(wrapper, "   ");
      await clickExact(wrapper, "Add");

      expect(visibleText()).toContain("Todo title is required.");
      expect(todoServices.createTodo).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("Add item is only available inside the items dialog", async () => {
      const { wrapper } = await mountDashboard();

      expect(wrapper.text()).not.toContain("+ Add Item");

      await wrapper.get("[aria-label='View items for Groceries']").trigger("click");
      await flushPromises();

      expect(visibleText()).toContain("+ Add Item");
      wrapper.unmount();
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("List items dialog shows empty state", async () => {
      listServices.getLists.mockResolvedValue({
        data: [{ id: 2, name: "Personal", userId: 7 }],
      });
      todoServices.getTodos.mockResolvedValue({ data: [] });

      const { wrapper } = await mountDashboard();
      await wrapper.get("[aria-label='View items for Personal']").trigger("click");
      await flushPromises();

      expect(visibleText()).toContain("Personal — Items");
      expect(visibleText()).toContain("No todos in this list yet.");
      wrapper.unmount();
    });

    it("User opens items for different lists", async () => {
      const personal = { id: 2, name: "Personal", userId: 7 };
      const work = { id: 3, name: "Work", userId: 7 };

      listServices.getLists.mockResolvedValue({ data: [personal, work] });
      todoServices.getTodos.mockImplementation((listId) => {
        if (listId === personal.id) {
          return Promise.resolve({
            data: [{ id: 21, listId: personal.id, title: "Call mom", completed: false, userId: 7 }],
          });
        }

        return Promise.resolve({
          data: [
            { id: 31, listId: work.id, title: "Email client", completed: false, userId: 7 },
            { id: 32, listId: work.id, title: "Write report", completed: false, userId: 7 },
          ],
        });
      });

      const { wrapper } = await mountDashboard();
      await wrapper.get("[aria-label='View items for Personal']").trigger("click");
      await flushPromises();

      expect(visibleText()).toContain("Call mom");
      expect(visibleText()).not.toContain("Email client");
      expect(visibleText()).not.toContain("Write report");

      await clickButton(wrapper, "Close");
      await wrapper.get("[aria-label='View items for Work']").trigger("click");
      await flushPromises();

      expect(visibleText()).toContain("Email client");
      expect(visibleText()).toContain("Write report");
      expect(visibleText()).not.toContain("Call mom");
      wrapper.unmount();
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      const completed = { ...milk, completed: true };

      todoServices.getTodos
        .mockResolvedValueOnce({ data: [milk] })
        .mockResolvedValue({ data: [completed] });
      todoServices.updateTodo.mockResolvedValue({ status: 200, data: completed });

      const { wrapper } = await mountDashboard();
      await wrapper.get("[aria-label='View items for Groceries']").trigger("click");
      await flushPromises();
      await clickInDocument("[aria-label='Completed Buy milk']");

      expect(todoServices.updateTodo).toHaveBeenCalledWith(10, { completed: true });
      expect(document.querySelector(".text-decoration-line-through")).not.toBeNull();
      wrapper.unmount();
    });

    it("User marks a completed todo as incomplete", async () => {
      const completed = { ...milk, completed: true };

      todoServices.getTodos
        .mockResolvedValueOnce({ data: [completed] })
        .mockResolvedValue({ data: [milk] });
      todoServices.updateTodo.mockResolvedValue({ status: 200, data: milk });

      const { wrapper } = await mountDashboard();
      await wrapper.get("[aria-label='View items for Groceries']").trigger("click");
      await flushPromises();
      await clickInDocument("[aria-label='Completed Buy milk']");

      expect(todoServices.updateTodo).toHaveBeenCalledWith(10, { completed: false });
      expect(document.querySelector(".text-decoration-line-through")).toBeNull();
      wrapper.unmount();
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      const renamed = { ...milk, title: "Buy oat milk" };

      todoServices.getTodos
        .mockResolvedValueOnce({ data: [milk] })
        .mockResolvedValue({ data: [renamed] });
      todoServices.updateTodo.mockResolvedValue({ status: 200, data: renamed });

      const { wrapper } = await mountDashboard();
      await wrapper.get("[aria-label='View items for Groceries']").trigger("click");
      await flushPromises();
      await clickInDocument("[aria-label='Edit todo']");
      await fillTodoTitle(wrapper, "Buy oat milk");
      await clickLastButton(wrapper, "Save");

      expect(todoServices.updateTodo).toHaveBeenCalledWith(10, { title: "Buy oat milk" });
      expect(visibleText()).toContain("Buy oat milk");
      wrapper.unmount();
    });

    it("User deletes a todo", async () => {
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [milk] })
        .mockResolvedValue({ data: [] });
      todoServices.deleteTodo.mockResolvedValue({ status: 200, data: { message: "Todo deleted." } });

      const { wrapper } = await mountDashboard();
      await wrapper.get("[aria-label='View items for Groceries']").trigger("click");
      await flushPromises();
      await clickInDocument("[aria-label='Delete todo']");
      await clickLastButton(wrapper, "Delete");

      expect(todoServices.deleteTodo).toHaveBeenCalledWith(10);
      expect(visibleText()).not.toContain("Buy milk");
      expect(visibleText()).toContain("No todos in this list yet.");
      wrapper.unmount();
    });
  });
});
