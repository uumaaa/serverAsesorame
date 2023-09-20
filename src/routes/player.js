const { Router } = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const secret = process.env.SECRET;
const mysqlConnection = require("../database/database");
const { queryAsync } = require("../utils/functions");

router.get("/player-info", async (req, res) => {
  const token = req.headers["token"];
  try {
    const payload = jwt.verify(token, secret);
    if (Date.now() > payload.exp) {
      return res.status(403).send({ error: "token expired" });
    }
    const idUser = jwt.decode(token, secret).idUser;
    if (idUser.length == 10 && !isNaN(idUser)) {
      player = await queryAsync(
        "SELECT p.points,p.idUser,p.type,p.level,p.score,p.counselings_completed FROM player p WHERE p.idUser = ?;",
        [idUser]
      );
      const achievements = await queryAsync(
        "SELECT a.name,a.description,a.points,a.url FROM player p, player_achievement pa, achievement a WHERE p.idUser = pa.idUser AND a.name = pa.achievement_name AND p.idUser = ?;",
        [idUser]
      );
      player = player[0];
      let achivementsList = [];
      for (const key in achievements) {
        if (Object.hasOwnProperty.call(achievements, key)) {
          const element = achievements[key];
          const achievement = {
            name: element.name,
            description: element.description,
            points: element.points,
            url: element.url,
          };
          achivementsList.push(achievement);
        }
      }
      map = {
        points: player.points,
        idUser: player.idUser,
        type: player.type,
        level: player.level,
        score: player.score,
        counselings_completed: player.counselings_completed,
        achievements: achievements,
      };
      res.status(200).send(map);
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({ error: "error" });
  }
});

module.exports = router;
