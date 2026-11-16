/**
 * Feature 4: User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */
import { flushPromises } from "@vue/test-utils";
import { defineComponent } from "vue";
import MenuBar from "../src/components/MenuBar.vue";
import authServices from "../src/services/authServices.js";
import userServices from "../src/services/userServices.js";
import Utils from "../src/config/utils.js";
import appRouter from "../src/router.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    logoutUser: vi.fn(),
  },
}));

vi.mock("../src/services/userServices.js", () => ({
  default: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

const sessionUser = {
  userId: 7,
  username: "jdoe",
  email: "jane@example.com",
  fName: "Jane",
  lName: "Doe",
  role: "worker",
  token: "session-token",
};

const profile = {
  id: 7,
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  role: "worker",
  createdAt: "2026-07-02T12:00:00.000Z",
  updatedAt: "2026-07-02T12:00:00.000Z",
};

function activeOverlayText() {
  return [...document.querySelectorAll(".v-overlay--active")]
    .map((node) => node.textContent)
    .join(" ");
}

const MenuBarHarness = defineComponent({
  components: { MenuBar },
  template: "<v-app><MenuBar /></v-app>",
});

async function mountMenuBar() {
  await appRouter.push({ name: "home" });
  await appRouter.isReady();
  const mounted = await mountWithPlugins(MenuBarHarness, {
    router: appRouter,
    attachTo: document.body,
  });
  await flushPromises();
  return mounted;
}

async function clickExact(text) {
  const button = [...document.querySelectorAll("button")].find(
    (node) => node.textContent.trim() === text
  );

  if (!button) {
    const labels = [...document.querySelectorAll("button")]
      .map((node) => node.textContent.trim())
      .join(" | ");
    throw new Error(`No button exactly ${JSON.stringify(text)}. Seen: ${labels}`);
  }

  button.click();
  await flushPromises();
}

async function openMenu() {
  const button = document.querySelector("[aria-label='User menu']");

  if (!button) {
    throw new Error("Missing user menu button");
  }

  button.click();
  await flushPromises();
}

async function openEditDialog() {
  await openMenu();
  await clickExact("Edit Profile");
}

function field(wrapper, label) {
  return wrapper
    .findAllComponents({ name: "VTextField" })
    .find((component) => component.props("label") === label);
}

async function fillField(wrapper, label, value) {
  await field(wrapper, label).setValue(value);
}

describe("Feature 4 — User Profile Management", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Utils.setStore("user", sessionUser);
    userServices.getUser.mockResolvedValue({ data: profile });
    authServices.logoutUser.mockResolvedValue({ data: { message: "Signed out." } });
  });

  describe("US-4.1 — View profile from the menu bar", () => {
    it("User opens the profile dropdown from the menu bar", async () => {
      const { wrapper } = await mountMenuBar();

      await openMenu();

      expect(activeOverlayText()).toContain("Jane Doe");
      expect(activeOverlayText()).toContain("jdoe");
      expect(activeOverlayText()).toContain("jane@example.com");
      expect(activeOverlayText()).toContain("Edit Profile");
      expect(activeOverlayText()).toContain("Log out");
      wrapper.unmount();
    });
  });

  describe("US-4.2 — Edit profile", () => {
    it("User opens the edit profile dialog", async () => {
      const { wrapper } = await mountMenuBar();

      await openEditDialog();

      expect(activeOverlayText()).toContain("Edit Profile");
      expect(field(wrapper, "First name").props("modelValue")).toBe("Jane");
      expect(field(wrapper, "Last name").props("modelValue")).toBe("Doe");
      expect(field(wrapper, "Email").props("modelValue")).toBe("jane@example.com");
      expect(field(wrapper, "Username").props("modelValue")).toBe("jdoe");
      wrapper.unmount();
    });

    it("User cancels the edit profile dialog", async () => {
      const { wrapper } = await mountMenuBar();

      await openEditDialog();
      await fillField(wrapper, "First name", "Janet");
      await clickExact("Cancel");

      expect(activeOverlayText()).not.toContain("First name");
      expect(userServices.updateUser).not.toHaveBeenCalled();
      expect(Utils.getStore("user")).toEqual(sessionUser);
      wrapper.unmount();
    });

    it("User saves profile changes", async () => {
      userServices.updateUser.mockResolvedValue({
        data: {
          id: 7,
          fName: "Janet",
          lName: "Smith",
          email: "janet@example.com",
          username: "janet",
          role: "worker",
          createdAt: "2026-07-02T12:00:00.000Z",
          updatedAt: "2026-07-02T12:05:00.000Z",
        },
      });

      const { wrapper } = await mountMenuBar();

      await openEditDialog();
      await fillField(wrapper, "First name", "Janet");
      await fillField(wrapper, "Last name", "Smith");
      await fillField(wrapper, "Email", "janet@example.com");
      await fillField(wrapper, "Username", "janet");
      await clickExact("Save");

      expect(userServices.updateUser).toHaveBeenCalledWith(7, {
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "janet",
      });
      expect(activeOverlayText()).not.toContain("First name");
      expect(Utils.getStore("user")).toEqual({
        userId: 7,
        token: "session-token",
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "janet",
        role: "worker",
      });

      await openMenu();

      expect(activeOverlayText()).toContain("Janet Smith");
      expect(activeOverlayText()).toContain("janet");
      expect(activeOverlayText()).toContain("janet@example.com");
      wrapper.unmount();
    });

    it("User saves profile with invalid email format", async () => {
      const { wrapper } = await mountMenuBar();

      await openEditDialog();
      await fillField(wrapper, "Email", "notanemail");
      await clickExact("Save");

      expect(activeOverlayText()).toContain("Enter a valid email address.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("User saves profile with mismatched passwords", async () => {
      const { wrapper } = await mountMenuBar();

      await openEditDialog();
      await fillField(wrapper, "Password", "password123");
      await fillField(wrapper, "Confirm password", "different123");
      await clickExact("Save");

      expect(activeOverlayText()).toContain("Passwords do not match.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("User saves profile with a password that is too short", async () => {
      const { wrapper } = await mountMenuBar();

      await openEditDialog();
      await fillField(wrapper, "Password", "short");
      await fillField(wrapper, "Confirm password", "short");
      await clickExact("Save");

      expect(activeOverlayText()).toContain("Password must be at least 8 characters.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("Profile update API returns an error", async () => {
      userServices.updateUser.mockRejectedValue({
        response: { status: 400, data: { message: "Username is already taken." } },
      });

      const { wrapper } = await mountMenuBar();

      await openEditDialog();
      await fillField(wrapper, "Username", "userb");
      await clickExact("Save");

      expect(document.querySelector(".v-alert")?.textContent).toContain(
        "Username is already taken."
      );
      expect(activeOverlayText()).toContain("First name");
      wrapper.unmount();
    });
  });

  describe("US-4.3 — Log out from profile", () => {
    it("User logs out from the profile dropdown", async () => {
      const { wrapper } = await mountMenuBar();

      await openMenu();
      await clickExact("Log out");

      expect(authServices.logoutUser).toHaveBeenCalled();
      expect(Utils.getStore("user")).toBeNull();
      await flushPromises();
      expect(appRouter.currentRoute.value.name).toBe("login");
      wrapper.unmount();
    });
  });

  describe("US-4.4 — Single logout entry point", () => {
    it("Menu bar does not show Sign out", async () => {
      const { wrapper } = await mountMenuBar();
      const signOutButtons = [...document.querySelectorAll("button")].filter(
        (node) => node.textContent.trim() === "Sign out"
      );

      expect(signOutButtons).toHaveLength(0);
      expect(document.body.textContent).not.toContain("Sign out");
      wrapper.unmount();
    });
  });
});
