import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";

/** Recreate tables before each test so cases do not share rows. */
export const syncTestDatabase = async () => {
  await db.sequelize.sync({ force: true });
};

export const validRegistration = (overrides = {}) => ({
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  password: "password123",
  ...overrides,
});

export const registerUser = async (overrides = {}) => {
  const payload = validRegistration(overrides);
  const response = await request(app).post("/todo/register").send(payload);
  return { payload, response };
};
