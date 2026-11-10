import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleListOrNull } from "../authorization/authorization.js";

const exports = {};

function nameError(name) {
  if (typeof name !== "string" || name.trim().length === 0) {
    return "List name is required.";
  }

  if (name.trim().length > 100) {
    return "List name must be 100 characters or fewer.";
  }

  return null;
}

function parseListId(req, res) {
  const listId = parseInt(req.params.listId, 10);

  if (Number.isNaN(listId)) {
    res.status(400).send({ message: "List id must be a number." });
    return null;
  }

  return listId;
}

exports.findAll = async (req, res) => {
  try {
    const lists = await db.list.findAll({
      where: { userId: req.user.id },
      order: [["name", "ASC"]],
    });

    return res.status(200).send(lists);
  } catch (err) {
    logger.error(`List fetch failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to load lists." });
  }
};

exports.create = async (req, res) => {
  const message = nameError(req.body?.name);

  if (message) {
    return res.status(400).send({ message });
  }

  try {
    const list = await db.list.create({
      name: req.body.name.trim(),
      userId: req.user.id,
    });

    return res.status(201).send(list);
  } catch (err) {
    logger.error(`List create failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to create list." });
  }
};

exports.update = async (req, res) => {
  const listId = parseListId(req, res);

  if (listId === null) {
    return undefined;
  }

  const message = nameError(req.body?.name);

  if (message) {
    return res.status(400).send({ message });
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);

    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    list.name = req.body.name.trim();
    await list.save();

    return res.status(200).send(list);
  } catch (err) {
    logger.error(`List update failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to rename list." });
  }
};

exports.remove = async (req, res) => {
  const listId = parseListId(req, res);

  if (listId === null) {
    return undefined;
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);

    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    await list.destroy();

    return res.status(200).send({ message: "List deleted." });
  } catch (err) {
    logger.error(`List delete failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to delete list." });
  }
};

export default exports;
