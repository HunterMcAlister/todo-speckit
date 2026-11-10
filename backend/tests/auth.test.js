/**
 * Feature 1: User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../server.js";
import db from "../app/models/index.js";
import { registerUser, syncTestDatabase } from "./helpers.js";

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  describe("US-1.1 — Register an account", () => {
    it("User registers with valid information", async () => {
      const response = await request(app).post("/todo/register").send({
        fName: "Jane",
        lName: "Doe",
        email: "jdoe@example.com",
        username: "JDoe",
        password: "password123",
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        username: "jdoe",
        email: "jdoe@example.com",
        fName: "Jane",
        lName: "Doe",
        role: "worker",
      });
      expect(response.body.userId).toEqual(expect.any(Number));
      expect(typeof response.body.token).toBe("string");
      expect(response.body.password).toBeUndefined();

      const stored = await db.user.unscoped().findByPk(response.body.userId);
      expect(stored.username).toBe("jdoe");
      expect(stored.password).not.toBe("password123");
      expect(await bcrypt.compare("password123", stored.password)).toBe(true);

      const session = await db.session.findOne({ where: { userId: response.body.userId } });
      expect(session.token).toBe(response.body.token);
    });

    it("User submits registration with missing email", async () => {
      const response = await request(app).post("/todo/register").send({
        fName: "Jane",
        lName: "Doe",
        username: "jdoe",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Email is required." });
      expect(await db.user.count()).toBe(0);
    });

    it("User submits registration with password too short", async () => {
      const response = await request(app).post("/todo/register").send({
        fName: "Jane",
        lName: "Doe",
        email: "jdoe@example.com",
        username: "jdoe",
        password: "short",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Password must be at least 8 characters." });
      expect(await db.user.count()).toBe(0);
    });

    it("User registers with a duplicate username", async () => {
      await registerUser({ username: "jdoe", email: "jane@example.com" });

      const response = await request(app).post("/todo/register").send({
        fName: "John",
        lName: "Smith",
        email: "john@example.com",
        username: "jdoe",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Username is already taken." });
    });

    it("User registers with a duplicate email", async () => {
      await registerUser({ username: "jdoe", email: "jane@example.com" });

      const response = await request(app).post("/todo/register").send({
        fName: "John",
        lName: "Smith",
        email: "jane@example.com",
        username: "jsmith",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Email is already registered." });
    });
  });

  describe("US-1.2 — Sign in", () => {
    it("User signs in with valid credentials", async () => {
      await registerUser();

      const first = await request(app).post("/todo/login").send({
        username: "jdoe",
        password: "password123",
      });
      const second = await request(app).post("/todo/login").send({
        username: "JDoe",
        password: "password123",
      });

      expect(first.status).toBe(200);
      expect(first.body).toMatchObject({
        username: "jdoe",
        role: "worker",
      });
      expect(first.body.userId).toEqual(expect.any(Number));
      expect(typeof first.body.token).toBe("string");
      expect(first.body.password).toBeUndefined();
      expect(second.body.token).toBe(first.body.token);
      expect(await db.session.count({ where: { userId: first.body.userId } })).toBe(1);
    });

    it("User signs in with invalid password", async () => {
      await registerUser();

      const response = await request(app).post("/todo/login").send({
        username: "jdoe",
        password: "wrong-password",
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Invalid username or password." });
    });

    it("User signs in with missing username", async () => {
      const response = await request(app).post("/todo/login").send({
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Username is required." });
    });

    it("User signs in with missing password", async () => {
      const response = await request(app).post("/todo/login").send({
        username: "jdoe",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Password is required." });
    });
  });

  describe("US-1.4 — Sign out", () => {
    it("User signs out", async () => {
      const { response: registered } = await registerUser();
      const token = registered.body.token;

      const response = await request(app)
        .post("/todo/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(await db.session.count({ where: { token } })).toBe(0);

      const reused = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${token}`);

      expect(reused.status).toBe(401);
    });
  });
});
