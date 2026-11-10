/**
 * Feature 1: User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { registerUser, syncTestDatabase } from "./helpers.js";

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("API request includes session token", async () => {
      const { response: registered } = await registerUser();

      const response = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${registered.body.token}`);

      expect(response.status).toBe(200);
      expect(registered.body.token).toEqual(expect.any(String));
    });

    it("Protected API request succeeds with a valid session", async () => {
      const { response: userA } = await registerUser({
        username: "usera",
        email: "usera@example.com",
      });
      const { response: userB } = await registerUser({
        username: "userb",
        email: "userb@example.com",
      });

      await db.list.create({ name: "Alpha", userId: userA.body.userId });
      await db.list.create({ name: "Beta", userId: userB.body.userId });

      const response = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${userA.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        name: "Alpha",
        userId: userA.body.userId,
      });
    });

    it("Expired or invalid session token", async () => {
      const { response: registered } = await registerUser();
      await db.session.update(
        { expirationDate: new Date(Date.now() - 60 * 1000) },
        { where: { token: registered.body.token } }
      );

      const expired = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${registered.body.token}`);
      const invalid = await request(app)
        .get("/todo/lists")
        .set("Authorization", "Bearer not-a-real-token");

      expect(expired.status).toBe(401);
      expect(expired.body.message).toMatch(/Unauthorized/);
      expect(invalid.status).toBe(401);
      expect(invalid.body.message).toMatch(/Unauthorized/);
    });
  });

  describe("US-1.5 — Block unauthenticated access", () => {
    it("Unauthenticated user accesses a protected route", async () => {
      const response = await request(app).get("/todo/lists");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/);
    });
  });
});
