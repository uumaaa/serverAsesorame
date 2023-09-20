const { Router } = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const secret = process.env.SECRET;
const mysqlConnection = require("../database/database");

router.get("/", (req, res) => {
  res.status(200).json("Server on port 8000 and database is connected");
});

router.get("/users/:mail", (req, res) => {
  const { mail } = req.params;
  const { password } = req.body;
  mysqlConnection.query(
    "SELECT hash FROM user where mail = ?",
    [mail],
    (error, rows, fields) => {
      if (!error) {
        if (rows.length === 0) {
          res.status(404).send(false);
        } else {
          hash = rows[0].hash;
          bcrypt.compare(password, hash, (err, succes) => {
            if (succes) {
              res.status(200).send(true);
            } else {
              res.status(200).send(false);
            }
          });
        }
      } else {
        res.status(500).send(false);
      }
    }
  );
});

router.post("/users", (req, res) => {
  const encryptationPhases = 10;
  const { idUser, name, username, type, password, mail } = req.body;
  bcrypt.hash(password, encryptationPhases, (err, hash) => {
    if (!err) {
      mysqlConnection.query(
        "INSERT INTO user(idUser,name,hash,username,type,mail) values (?,?,?,?,?,?);",
        [idUser, name, hash, username, type, mail],
        (error, row, fields) => {
          if (!error) {
            res.status(201).send({ Status: "User saved" });
          } else {
            res.status(400).send({ error: error });
          }
        }
      );
    } else {
      res.status(500).send({ error: "Error" });
    }
  });
});

router.delete("/users/:id", (req, res) => {
  const { id } = req.params;
  mysqlConnection.query(
    "DELETE FROM user WHERE idUser = ?",
    [id],
    (error, rows, fields) => {
      if (!error) {
        res.status(200).send({ Status: "User deleted" });
      } else {
        res.status(500).send({ error: error });
      }
    }
  );
});

router.get("/user-info", (req, res) => {
  const token = req.headers["token"];
  try {
    const payload = jwt.verify(token, secret);
    if (Date.now() > payload.exp) {
      return res.status(403).send({ error: "token expired" });
    }
    const idUser = jwt.decode(token, secret).idUser;
    if (idUser.length == 10 && !isNaN(idUser)) {
      mysqlConnection.query(
        "SELECT * FROM user where idUser = ?",
        [idUser],
        (error, rows, fields) => {
          if (!error) {
            if (rows.length === 0) {
              res.status(404).send({ error: "Invalid username" });
            } else {
              res.status(200).send(rows[0]);
            }
          } else {
            res.status(500).send({ error: error });
          }
        }
      );
    }
  } catch (error) {
    res.status(403).send({ error: error.message });
  }
});

router.put("/users/:id/update", (req, res) => {
  const token = req.headers["token"];
  const type = jwt.decode(token).type;
  if (type != "Admin") {
    res.status(403).send(false);
  }
  const { id } = req.params;
  mysqlConnection.query(
    "UPDATE user SET type = ? WHERE idUser = ?",
    ["Asesor", id],
    (error, rows, fields) => {
      if (!error) {
        res.status(200).send(true);
      } else {
        res.status(500).send(false);
      }
    }
  );
});

module.exports = router;
