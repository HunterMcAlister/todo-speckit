export default async function globalTeardown() {
  const { default: db } = await import("../app/models/index.js");
  await db.sequelize.close();
}
