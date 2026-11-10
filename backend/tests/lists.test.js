/**
 * Feature 2: Todo List Management
 * Spec: features/feature-2-todo-list-management.md
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

describe("Feature 2 — Todo List Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      const user = await signIn();

      const response = await request(app)
        .post("/todo/lists")
        .set(user.auth)
        .send({ name: "Groceries" });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: "Groceries",
        userId: user.userId,
      });
      expect(response.body.id).toEqual(expect.any(Number));
    });

    it("User creates a list with an empty name", async () => {
      const user = await signIn();

      const response = await request(app)
        .post("/todo/lists")
        .set(user.auth)
        .send({ name: "   " });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "List name is required." });
      expect(await db.list.count()).toBe(0);
    });

    it("User creates a list with a name that is too long", async () => {
      const user = await signIn();

      const response = await request(app)
        .post("/todo/lists")
        .set(user.auth)
        .send({ name: "a".repeat(101) });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "List name must be 100 characters or fewer." });
      expect(await db.list.count()).toBe(0);
    });
  });

  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      const user = await signIn();

      await request(app).post("/todo/lists").set(user.auth).send({ name: "Work" });
      await request(app).post("/todo/lists").set(user.auth).send({ name: "Personal" });

      const response = await request(app).get("/todo/lists").set(user.auth);

      expect(response.status).toBe(200);
      expect(response.body.map((list) => list.name)).toEqual(["Personal", "Work"]);
      expect(response.body.every((list) => list.userId === user.userId)).toBe(true);
    });

    it("User cannot see another user's lists", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });

      await request(app).post("/todo/lists").set(userA.auth).send({ name: "Work" });
      await request(app).post("/todo/lists").set(userB.auth).send({ name: "Secret Project" });

      const response = await request(app).get("/todo/lists").set(userA.auth);

      expect(response.status).toBe(200);
      expect(response.body.map((list) => list.name)).toEqual(["Work"]);
      expect(response.body.some((list) => list.name === "Secret Project")).toBe(false);
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      const user = await signIn();
      const created = await request(app)
        .post("/todo/lists")
        .set(user.auth)
        .send({ name: "Groceries" });

      const response = await request(app)
        .put(`/todo/lists/${created.body.id}`)
        .set(user.auth)
        .send({ name: "Shopping" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.body.id,
        name: "Shopping",
        userId: user.userId,
      });
    });

    it("User deletes a list", async () => {
      const user = await signIn();
      const created = await request(app)
        .post("/todo/lists")
        .set(user.auth)
        .send({ name: "Groceries" });

      const response = await request(app)
        .delete(`/todo/lists/${created.body.id}`)
        .set(user.auth);

      expect([200, 204]).toContain(response.status);

      const remaining = await request(app).get("/todo/lists").set(user.auth);
      expect(remaining.body).toEqual([]);
    });
  });

  describe("US-2.5 — Private lists only", () => {
    it("User attempts to rename another user's list", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });
      const created = await request(app)
        .post("/todo/lists")
        .set(userB.auth)
        .send({ name: "Groceries" });

      const response = await request(app)
        .put(`/todo/lists/${created.body.id}`)
        .set(userA.auth)
        .send({ name: "Hijacked" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: `List with id=${created.body.id} not found.` });

      const stored = await db.list.findByPk(created.body.id);
      expect(stored.name).toBe("Groceries");
    });

    it("User attempts to delete another user's list", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });
      const created = await request(app)
        .post("/todo/lists")
        .set(userB.auth)
        .send({ name: "Groceries" });

      const response = await request(app)
        .delete(`/todo/lists/${created.body.id}`)
        .set(userA.auth);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: `List with id=${created.body.id} not found.` });
      expect(await db.list.findByPk(created.body.id)).not.toBeNull();
    });

    it("Client cannot assign a list to another user on create", async () => {
      const user = await signIn();

      const response = await request(app)
        .post("/todo/lists")
        .set(user.auth)
        .send({ name: "Groceries", userId: 999 });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(user.userId);
      expect(response.body.userId).not.toBe(999);

      const stored = await db.list.findByPk(response.body.id);
      expect(stored.userId).toBe(user.userId);
    });

    it("Unauthenticated API request to lists", async () => {
      const response = await request(app).get("/todo/lists");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/);
    });
  });
});
