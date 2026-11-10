import db from "../models/index.js";
import logger from "../config/logger.js";

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export const authenticate = async (req, res, next) => {
  const token = readBearerToken(req);

  if (!token) {
    return res.status(401).send({ message: "Unauthorized! No token provided." });
  }

  try {
    const session = await db.session.findOne({
      where: { token },
      include: [{ model: db.user }],
    });

    if (!session || !session.user || new Date(session.expirationDate).getTime() < Date.now()) {
      return res.status(401).send({ message: "Unauthorized! Invalid or expired token." });
    }

    req.user = {
      id: session.user.id,
      role: session.user.role,
    };

    return next();
  } catch (err) {
    logger.error(`Authentication failed: ${err.message}`);
    return res.status(401).send({ message: "Unauthorized! Invalid or expired token." });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role === "admin" || req.user?.role === "superadmin") {
    return next();
  }

  return res.status(403).send({ message: "Require admin role." });
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role === "superadmin") {
    return next();
  }

  return res.status(403).send({ message: "Require superadmin role." });
};

export const getAccessibleListOrNull = async (req, listId) => {
  const row = await db.list.findOne({
    where: { id: listId, userId: req.user.id },
  });

  return row ?? null;
};
