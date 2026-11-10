/**
 * Feature 2: Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 */
import { flushPromises } from "@vue/test-utils";
import Dashboard from "../src/views/Dashboard.vue";
import listServices from "../src/services/listServices.js";
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

async function fillListName(wrapper, value) {
  const field = wrapper
    .findAllComponents({ name: "VTextField" })
    .find((component) => component.props("label") === "List name");

  await field.setValue(value);
}

describe("Feature 2 — Todo List Management", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    listServices.getLists.mockResolvedValue({ data: [] });
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
