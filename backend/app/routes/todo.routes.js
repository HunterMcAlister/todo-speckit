import { Router } from "express";
import todoController from "../controllers/todo.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.get("/lists/:listId/todos", [authenticate], todoController.findAll);
router.post("/lists/:listId/todos", [authenticate], todoController.create);
router.put("/todos/:id", [authenticate], todoController.update);
router.delete("/todos/:id", [authenticate], todoController.remove);

export default router;
