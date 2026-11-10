/**
 * Feature 1: User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import router from "../src/router.js";
import Utils from "../src/config/utils.js";

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("Signed-in user visits login page", async () => {
      Utils.setStore("user", {
        userId: 1,
        username: "jdoe",
        fName: "Jane",
        token: "session-token",
        role: "worker",
      });

      await router.push({ name: "register" });
      await router.push({ name: "login" });
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("home");
    });
  });

  describe("US-1.5 — Block unauthenticated access", () => {
    it("Unauthenticated user accesses a protected route", async () => {
      await router.push({ name: "register" });
      await router.push({ name: "home" });
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});
