/**
 * Feature 1: User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { flushPromises } from "@vue/test-utils";
import Register from "../src/views/Register.vue";
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

async function mountRegister() {
  const router = await createTestRouter("/register");
  const mounted = await mountWithPlugins(Register, { router });
  return mounted;
}

async function submit(wrapper) {
  const button = wrapper.findAll("button").find((node) => node.text().includes("Create account"));
  await button.trigger("click");
  await flushPromises();
}

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("US-1.1 — Register an account", () => {
    it("User submits registration with invalid email format", async () => {
      const { wrapper } = await mountRegister();

      await fill(wrapper, "First name", "Jane");
      await fill(wrapper, "Last name", "Doe");
      await fill(wrapper, "Email", "notanemail");
      await fill(wrapper, "Username", "jdoe");
      await fill(wrapper, "Password", "password123");
      await fill(wrapper, "Confirm password", "password123");
      await submit(wrapper);

      expect(wrapper.text()).toContain("Enter a valid email address.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with missing username", async () => {
      const { wrapper } = await mountRegister();

      await fill(wrapper, "First name", "Jane");
      await fill(wrapper, "Last name", "Doe");
      await fill(wrapper, "Email", "jane@example.com");
      await fill(wrapper, "Password", "password123");
      await fill(wrapper, "Confirm password", "password123");
      await submit(wrapper);

      expect(wrapper.text()).toContain("Username is required.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with password too short", async () => {
      const { wrapper } = await mountRegister();

      await fill(wrapper, "First name", "Jane");
      await fill(wrapper, "Last name", "Doe");
      await fill(wrapper, "Email", "jane@example.com");
      await fill(wrapper, "Username", "jdoe");
      await fill(wrapper, "Password", "short");
      await fill(wrapper, "Confirm password", "short");
      await submit(wrapper);

      expect(wrapper.text()).toContain("Password must be at least 8 characters.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with mismatched passwords", async () => {
      const { wrapper } = await mountRegister();

      await fill(wrapper, "First name", "Jane");
      await fill(wrapper, "Last name", "Doe");
      await fill(wrapper, "Email", "jane@example.com");
      await fill(wrapper, "Username", "jdoe");
      await fill(wrapper, "Password", "password123");
      await fill(wrapper, "Confirm password", "different123");
      await submit(wrapper);

      expect(wrapper.text()).toContain("Passwords do not match.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });
  });
});
