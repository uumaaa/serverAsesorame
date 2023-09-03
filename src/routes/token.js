const { Router } = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const { queryAsync } = require("../utils/functions");
const secret = process.env.SECRET;

router.post("/login", async (req, res) => {
  const { idUser } = req.body;
  const expiresIn = 86400;
  let token;
  let type;

  try {
    if (idUser.length === 10 && !isNaN(idUser)) {
      const rows = await queryAsync("SELECT type FROM user WHERE idUser = ?", [
        idUser,
      ]);

      if (rows.length === 0) {
        res.status(403).send({ error: "Invalid id" });
        return;
      }
      type = rows[0].type;
    } else {
      res.status(403).send({ error: "Invalid id" });
    }

    // Generar el token después de la consulta
    token = jwt.sign(
      {
        idUser,
        type,
        exp: Date.now() + expiresIn * 1000,
      },
      secret
    );

    res.status(200).send({ token, expiresIn });
  } catch (err) {
    res.status(403).send({ error: "Invalid username" });
  }
});

router.post("/refresh-token", (req, res) => {
  console.log(req.headers);
  const refreshToken = req.headers["refreshtoken"];
  try {
    const payload = jwt.verify(refreshToken, secret);
  } catch (e) {
    res.status(403).send({ error: "Invalid signature" });
  }
  const expiresIn = 86400;
  idUser = jwt.decode(refreshToken).idUser;
  type = jwt.decode(refreshToken).type;
  const token = jwt.sign(
    {
      idUser,
      type,
      exp: Date.now() + expiresIn * 1000,
    },
    secret
  );
  console.log("Token refrescado" + token);
  res.status(200).send({ token, expiresIn });
});

module.exports = router;
