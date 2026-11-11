/**
 * Feature 3: Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
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

async function createList(auth, name) {
  const response = await request(app).post("/todo/lists").set(auth).send({ name });
  return response.body;
}

describe("Feature 3 — Todo List Item Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      const user = await signIn();
      const list = await createList(user.auth, "Groceries");

      const response = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "Buy milk" });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: "Buy milk",
        completed: false,
        userId: user.userId,
        listId: list.id,
      });
      expect(response.body.id).toEqual(expect.any(Number));
    });

    it("User adds a todo with an empty title", async () => {
      const user = await signIn();
      const list = await createList(user.auth, "Groceries");

      const response = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "   " });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Todo title is required." });
      expect(await db.todo.count()).toBe(0);
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("User only sees their own todos when opening items", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });
      const listA = await createList(userA.auth, "Work");
      const listB = await createList(userB.auth, "Work");

      await request(app).post(`/todo/lists/${listA.id}/todos`).set(userA.auth).send({ title: "My task" });
      await request(app).post(`/todo/lists/${listB.id}/todos`).set(userB.auth).send({ title: "Their task" });

      const response = await request(app).get(`/todo/lists/${listA.id}/todos`).set(userA.auth);

      expect(response.status).toBe(200);
      expect(response.body.map((todo) => todo.title)).toEqual(["My task"]);
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      const user = await signIn();
      const list = await createList(user.auth, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "Buy milk" });

      const response = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(user.auth)
        .send({ completed: true });

      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(true);
      expect(response.body.title).toBe("Buy milk");
    });

    it("User marks a completed todo as incomplete", async () => {
      const user = await signIn();
      const list = await createList(user.auth, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "Buy milk" });

      await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(user.auth)
        .send({ completed: true });

      const response = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(user.auth)
        .send({ completed: false });

      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(false);
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      const user = await signIn();
      const list = await createList(user.auth, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "Buy milk" });

      const response = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(user.auth)
        .send({ title: "Buy oat milk" });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Buy oat milk");
      expect(response.body.completed).toBe(false);
    });

    it("User deletes a todo", async () => {
      const user = await signIn();
      const list = await createList(user.auth, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "Buy milk" });

      const response = await request(app).delete(`/todo/todos/${created.body.id}`).set(user.auth);

      expect([200, 204]).toContain(response.status);
      expect(await db.todo.findByPk(created.body.id)).toBeNull();
    });
  });

  describe("US-3.5 — Private items only", () => {
    it("User cannot read todos in another user's list", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });
      const secret = await createList(userB.auth, "Secret");

      await request(app)
        .post(`/todo/lists/${secret.id}/todos`)
        .set(userB.auth)
        .send({ title: "Hidden task" });

      const response = await request(app).get(`/todo/lists/${secret.id}/todos`).set(userA.auth);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: `List with id=${secret.id} not found.` });
      expect(JSON.stringify(response.body)).not.toContain("Hidden task");
    });

    it("User attempts to add a todo to another user's list", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });
      const list = await createList(userB.auth, "Groceries");

      const response = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(userA.auth)
        .send({ title: "Intruder task" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: `List with id=${list.id} not found.` });
      expect(await db.todo.count({ where: { listId: list.id } })).toBe(0);
    });

    it("User attempts to rename another user's todo", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });
      const list = await createList(userB.auth, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(userB.auth)
        .send({ title: "Buy milk" });

      const response = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(userA.auth)
        .send({ title: "Hijacked" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: `Todo with id=${created.body.id} not found.` });

      const stored = await db.todo.findByPk(created.body.id);
      expect(stored.title).toBe("Buy milk");
    });

    it("User attempts to delete another user's todo", async () => {
      const userA = await signIn({ username: "usera", email: "usera@example.com" });
      const userB = await signIn({ username: "userb", email: "userb@example.com" });
      const list = await createList(userB.auth, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(userB.auth)
        .send({ title: "Buy milk" });

      const response = await request(app).delete(`/todo/todos/${created.body.id}`).set(userA.auth);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: `Todo with id=${created.body.id} not found.` });
      expect(await db.todo.findByPk(created.body.id)).not.toBeNull();
    });

    it("Client cannot assign a todo to another user on create", async () => {
      const user = await signIn();
      const list = await createList(user.auth, "Groceries");

      const response = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "Buy milk", userId: 999 });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(user.userId);
      expect(response.body.userId).not.toBe(999);

      const stored = await db.todo.findByPk(response.body.id);
      expect(stored.userId).toBe(user.userId);
    });

    it("Client cannot assign a todo to another list on create", async () => {
      const user = await signIn();
      const groceries = await createList(user.auth, "Groceries");
      const work = await createList(user.auth, "Work");

      const response = await request(app)
        .post(`/todo/lists/${groceries.id}/todos`)
        .set(user.auth)
        .send({ title: "Buy milk", listId: work.id });

      expect(response.status).toBe(201);
      expect(response.body.listId).toBe(groceries.id);
      expect(response.body.listId).not.toBe(work.id);

      const stored = await db.todo.findByPk(response.body.id);
      expect(stored.listId).toBe(groceries.id);
    });

    it("Unauthenticated API request for todos", async () => {
      const response = await request(app).get("/todo/lists/1/todos");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/);
    });
  });

  describe("US-3.6 — Lists carry their items", () => {
    it("Deleting a list removes its todos", async () => {
      const user = await signIn();
      const list = await createList(user.auth, "Groceries");

      await request(app).post(`/todo/lists/${list.id}/todos`).set(user.auth).send({ title: "Buy milk" });
      await request(app).post(`/todo/lists/${list.id}/todos`).set(user.auth).send({ title: "Buy eggs" });

      const deleted = await request(app).delete(`/todo/lists/${list.id}`).set(user.auth);
      expect([200, 204]).toContain(deleted.status);

      expect(await db.todo.count({ where: { listId: list.id } })).toBe(0);

      const remaining = await request(app).get(`/todo/lists/${list.id}/todos`).set(user.auth);
      expect(remaining.status).toBe(404);
      expect(remaining.body).toEqual({ message: `List with id=${list.id} not found.` });
    });
  });

  describe("FR-009 — Todo sort order", () => {
    it("Todos are ordered incomplete first, then by createdAt ascending", async () => {
      const user = await signIn();
      const list = await createList(user.auth, "Work");

      const doneLater = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "Done later" });
      const openLater = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "Open later" });
      const doneFirst = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "Done first" });
      const openFirst = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(user.auth)
        .send({ title: "Open first" });

      await db.todo.update(
        { completed: true, createdAt: new Date("2026-03-02T00:00:00Z") },
        { where: { id: doneLater.body.id }, silent: true }
      );
      await db.todo.update(
        { completed: false, createdAt: new Date("2026-02-02T00:00:00Z") },
        { where: { id: openLater.body.id }, silent: true }
      );
      await db.todo.update(
        { completed: true, createdAt: new Date("2026-01-02T00:00:00Z") },
        { where: { id: doneFirst.body.id }, silent: true }
      );
      await db.todo.update(
        { completed: false, createdAt: new Date("2026-01-01T00:00:00Z") },
        { where: { id: openFirst.body.id }, silent: true }
      );

      const response = await request(app).get(`/todo/lists/${list.id}/todos`).set(user.auth);

      expect(response.status).toBe(200);
      expect(response.body.map((todo) => todo.title)).toEqual([
        "Open first",
        "Open later",
        "Done first",
        "Done later",
      ]);
    });
  });
});
