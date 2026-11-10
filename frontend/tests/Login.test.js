/**
 * Feature 1: User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { flushPromises } from "@vue/test-utils";
import Login from "../src/views/Login.vue";
import authServices from "../src/services/authServices.js";
import { createTestRouter, mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

async function fill(wrapper, label, value) {
  const field = wrapper
    .findAllComponents({ name: "VTextField" })
    .find((component) => component.props("label") === label);

  await field.setValue(value);
}

async function mountLogin() {
  const router = await createTestRouter("/login");
  return mountWithPlugins(Login, { router });
}

async function submit(wrapper) {
  const button = wrapper.findAll("button").find((node) => node.text().includes("Sign in"));
  await button.trigger("click");
  await flushPromises();
}

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("US-1.2 — Sign in", () => {
    it("User signs in with invalid password", async () => {
      authServices.loginUser.mockRejectedValue({
        response: { status: 401, data: { message: "Invalid username or password." } },
      });

      const { wrapper, router } = await mountLogin();
      await fill(wrapper, "Username", "jdoe");
      await fill(wrapper, "Password", "wrong-password");
      await submit(wrapper);

      expect(wrapper.find(".v-alert").text()).toContain("Invalid username or password.");
      expect(router.currentRoute.value.name).toBe("login");
    });

    it("User signs in with missing username", async () => {
      const { wrapper } = await mountLogin();

      await fill(wrapper, "Password", "password123");
      await submit(wrapper);

      expect(wrapper.text()).toContain("Username is required.");
      expect(authServices.loginUser).not.toHaveBeenCalled();
    });

    it("User signs in with missing password", async () => {
      const { wrapper } = await mountLogin();

      await fill(wrapper, "Username", "jdoe");
      await submit(wrapper);

      expect(wrapper.text()).toContain("Password is required.");
      expect(authServices.loginUser).not.toHaveBeenCalled();
    });
  });
});
