/**
 * Feature 4: User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { registerUser, syncTestDatabase } from "./helpers.js";

async function signIn(overrides = {}) {
  const { response } = await registerUser(overrides);

  return {
    userId: response.body.userId,
    token: response.body.token,
    auth: { Authorization: `Bearer ${response.body.token}` },
  };
}

function profileBody(overrides = {}) {
  return {
    fName: "Janet",
    lName: "Doe",
    email: "janet@example.com",
    username: "janet",
    ...overrides,
  };
}

describe("Feature 4 — User Profile Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  describe("US-4.2 — Edit profile", () => {
    it("User saves profile changes", async () => {
      const user = await signIn();
      const before = await db.user.unscoped().findByPk(user.userId);

      const response = await request(app)
        .put(`/todo/users/${user.userId}`)
        .set(user.auth)
        .send(profileBody({ username: "  Janet  ", email: "Janet@Example.com", role: "admin" }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: user.userId,
        fName: "Janet",
        lName: "Doe",
        email: "janet@example.com",
        username: "janet",
        role: "worker",
      });
      expect(response.body.password).toBeUndefined();
      expect(response.body).toEqual(
        expect.objectContaining({
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );

      const after = await db.user.unscoped().findByPk(user.userId);
      expect(after.password).toBe(before.password);
      expect(after.role).toBe("worker");
    });

    it("User fetches their own profile", async () => {
      const user = await signIn();

      const response = await request(app).get(`/todo/users/${user.userId}`).set(user.auth);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: user.userId,
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
        role: "worker",
      });
      expect(response.body.password).toBeUndefined();
    });

    it("User attempts to fetch another user's profile", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });

      const response = await request(app).get(`/todo/users/${userB.userId}`).set(userA.auth);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: `User with id=${userB.userId} not found.` });
    });

    it("User attempts to update another user's profile", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });

      const response = await request(app)
        .put(`/todo/users/${userB.userId}`)
        .set(userA.auth)
        .send(profileBody({ fName: "Hacker" }));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: `User with id=${userB.userId} not found.` });

      const stored = await db.user.findByPk(userB.userId);
      expect(stored.fName).toBe("Jane");
      expect(stored.username).toBe("userb");
    });

    it("Unauthenticated profile API request", async () => {
      const response = await request(app).get("/todo/users/1");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/);
    });

    it("Profile update rejects a password that is too short", async () => {
      const user = await signIn();
      const before = await db.user.unscoped().findByPk(user.userId);

      const response = await request(app)
        .put(`/todo/users/${user.userId}`)
        .set(user.auth)
        .send({ password: "short" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Password must be at least 8 characters." });

      const after = await db.user.unscoped().findByPk(user.userId);
      expect(after.password).toBe(before.password);
    });

    it("Profile update rejects missing required fields", async () => {
      const user = await signIn();

      const body = profileBody();
      delete body.fName;

      const response = await request(app).put(`/todo/users/${user.userId}`).set(user.auth).send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "First name is required." });

      const stored = await db.user.findByPk(user.userId);
      expect(stored.fName).toBe("Jane");
      expect(stored.email).toBe("jane@example.com");
    });

    it("Profile update rejects a duplicate username", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });

      const response = await request(app)
        .put(`/todo/users/${userA.userId}`)
        .set(userA.auth)
        .send(profileBody({ username: "userb", email: "usera@example.com" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Username is already taken." });

      const stored = await db.user.findByPk(userB.userId);
      expect(stored.username).toBe("userb");
    });

    it("Profile update rejects a duplicate email", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "b@example.com" });

      const response = await request(app)
        .put(`/todo/users/${userA.userId}`)
        .set(userA.auth)
        .send(profileBody({ username: "usera", email: "b@example.com" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Email is already registered." });

      const stored = await db.user.findByPk(userB.userId);
      expect(stored.email).toBe("b@example.com");
    });

    it("Unauthenticated profile update API request", async () => {
      const response = await request(app).put("/todo/users/1").send(profileBody());

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/);
    });

    it("Optional password is hashed when provided", async () => {
      const user = await signIn();
      const before = await db.user.unscoped().findByPk(user.userId);

      const response = await request(app)
        .put(`/todo/users/${user.userId}`)
        .set(user.auth)
        .send(profileBody({ password: "newpassword123" }));

      expect(response.status).toBe(200);
      expect(response.body.password).toBeUndefined();

      const after = await db.user.unscoped().findByPk(user.userId);
      expect(after.password).not.toBe(before.password);

      const login = await request(app)
        .post("/todo/login")
        .send({ username: "janet", password: "newpassword123" });

      expect(login.status).toBe(200);

      const oldPassword = await request(app)
        .post("/todo/login")
        .send({ username: "janet", password: "password123" });

      expect(oldPassword.status).toBe(401);
    });
  });
});
