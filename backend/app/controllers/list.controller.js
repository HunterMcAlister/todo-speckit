import db from "../models/index.js";
import logger from "../config/logger.js";

const exports = {};

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

export default exports;
