import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleUserOrNull } from "../authorization/authorization.js";

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const exports = {};

function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

function notFound(res, id) {
  return res.status(404).send({ message: `User with id=${id} not found.` });
}

exports.findOne = async (req, res) => {
  try {
    const user = await getAccessibleUserOrNull(req, req.params.id);

    if (!user) {
      return notFound(res, req.params.id);
    }

    return res.status(200).send(user);
  } catch (err) {
    logger.error(`Profile fetch failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to load profile." });
  }
};

exports.update = async (req, res) => {
  const password =
    typeof req.body?.password === "string" && req.body.password.length > 0
      ? req.body.password
      : null;

  if (password && password.length < 8) {
    return res.status(400).send({ message: "Password must be at least 8 characters." });
  }

  const fName = trimmed(req.body?.fName);
  const lName = trimmed(req.body?.lName);
  const email = trimmed(req.body?.email).toLowerCase();
  const username = trimmed(req.body?.username).toLowerCase();

  if (!fName) {
    return res.status(400).send({ message: "First name is required." });
  }

  if (!lName) {
    return res.status(400).send({ message: "Last name is required." });
  }

  if (!email) {
    return res.status(400).send({ message: "Email is required." });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).send({ message: "Enter a valid email address." });
  }

  if (!username) {
    return res.status(400).send({ message: "Username is required." });
  }

  if (username.length > 100) {
    return res.status(400).send({ message: "Username must be 100 characters or fewer." });
  }

  try {
    const user = await getAccessibleUserOrNull(req, req.params.id);

    if (!user) {
      return notFound(res, req.params.id);
    }

    const usernameTaken = await db.user.findOne({
      where: { username, id: { [Op.ne]: user.id } },
    });

    if (usernameTaken) {
      return res.status(400).send({ message: "Username is already taken." });
    }

    const emailTaken = await db.user.findOne({
      where: { email, id: { [Op.ne]: user.id } },
    });

    if (emailTaken) {
      return res.status(400).send({ message: "Email is already registered." });
    }

    const values = { fName, lName, email, username };

    if (password) {
      values.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    await db.user.update(values, { where: { id: user.id } });

    const updated = await db.user.findByPk(user.id);

    return res.status(200).send(updated);
  } catch (err) {
    logger.error(`Profile update failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to update profile." });
  }
};

export default exports;
