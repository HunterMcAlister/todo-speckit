import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleListOrNull, getAccessibleTodoOrNull } from "../authorization/authorization.js";

const exports = {};

function titleError(title) {
  if (typeof title !== "string" || title.trim().length === 0) {
    return "Todo title is required.";
  }

  if (title.trim().length > 255) {
    return "Todo title must be 255 characters or fewer.";
  }

  return null;
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DUE_DATE_MESSAGE = "Due date must be a valid date in YYYY-MM-DD format.";

function dueDateError(value) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) {
    return DUE_DATE_MESSAGE;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const valid =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  return valid ? null : DUE_DATE_MESSAGE;
}

function parseId(value, res, label) {
  const id = parseInt(value, 10);

  if (Number.isNaN(id)) {
    res.status(400).send({ message: `${label} must be a number.` });
    return null;
  }

  return id;
}

exports.findAll = async (req, res) => {
  const listId = parseId(req.params.listId, res, "List id");

  if (listId === null) {
    return undefined;
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);

    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    const todos = await db.todo.findAll({
      where: { listId: list.id, userId: req.user.id },
      order: [
        ["completed", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    return res.status(200).send(todos);
  } catch (err) {
    logger.error(`Todo fetch failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to load todos." });
  }
};

exports.create = async (req, res) => {
  const listId = parseId(req.params.listId, res, "List id");

  if (listId === null) {
    return undefined;
  }

  const message = titleError(req.body?.title);

  if (message) {
    return res.status(400).send({ message });
  }

  const hasDueDate = Object.prototype.hasOwnProperty.call(req.body ?? {}, "dueDate");
  const dueDate = hasDueDate ? req.body.dueDate : null;
  const dateMessage = hasDueDate ? dueDateError(dueDate) : null;

  if (dateMessage) {
    return res.status(400).send({ message: dateMessage });
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);

    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    const todo = await db.todo.create({
      title: req.body.title.trim(),
      completed: false,
      listId: list.id,
      userId: req.user.id,
      dueDate,
    });

    return res.status(201).send(todo);
  } catch (err) {
    logger.error(`Todo create failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to create todo." });
  }
};

exports.update = async (req, res) => {
  const todoId = parseId(req.params.id, res, "Todo id");

  if (todoId === null) {
    return undefined;
  }

  const hasTitle = Object.prototype.hasOwnProperty.call(req.body ?? {}, "title");
  const message = hasTitle ? titleError(req.body.title) : null;

  if (message) {
    return res.status(400).send({ message });
  }

  const hasDueDate = Object.prototype.hasOwnProperty.call(req.body ?? {}, "dueDate");
  const dateMessage = hasDueDate ? dueDateError(req.body.dueDate) : null;

  if (dateMessage) {
    return res.status(400).send({ message: dateMessage });
  }

  try {
    const todo = await getAccessibleTodoOrNull(req, todoId);

    if (!todo) {
      return res.status(404).send({ message: `Todo with id=${todoId} not found.` });
    }

    if (hasTitle) {
      todo.title = req.body.title.trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "completed")) {
      todo.completed = req.body.completed === true;
    }

    if (hasDueDate) {
      todo.dueDate = req.body.dueDate;
    }

    await todo.save();

    return res.status(200).send(todo);
  } catch (err) {
    logger.error(`Todo update failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to update todo." });
  }
};

exports.remove = async (req, res) => {
  const todoId = parseId(req.params.id, res, "Todo id");

  if (todoId === null) {
    return undefined;
  }

  try {
    const todo = await getAccessibleTodoOrNull(req, todoId);

    if (!todo) {
      return res.status(404).send({ message: `Todo with id=${todoId} not found.` });
    }

    await todo.destroy();

    return res.status(200).send({ message: "Todo deleted." });
  } catch (err) {
    logger.error(`Todo delete failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to delete todo." });
  }
};

export default exports;
