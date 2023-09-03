const { Router } = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const secret = process.env.SECRET;
const mysqlConnection = require("../database/database");

router.get("/player-info", (req, res) => {
  const token = req.headers["token"];
  try {
    const payload = jwt.verify(token, secret);
    if (Date.now() > payload.exp) {
      return res.status(403).send({ error: "token expired" });
    }
    const idUser = jwt.decode(token, secret).idUser;
    console.log(idUser);
    if (idUser.length == 10 && !isNaN(idUser)) {
      mysqlConnection.query(
        "SELECT p.points,p.idUser,p.type,p.level FROM player p inner join user u WHERE p.idUser = ?",
        [idUser],
        (error, rows, fields) => {
          if (!error) {
            if (rows.length === 0) {
              res.status(404).send({ error: "Invalid username" });
            } else {
              res.status(200).send(rows[0]);
            }
          } else {
            res.status(500).send({ error: "Invalid username" });
          }
        }
      );
    } else {
      res.status(500).send({ error: "Invalid username" });
    }
  } catch (error) {
    res.status(403).send({ error: error.message });
  }
});

module.exports = router;
