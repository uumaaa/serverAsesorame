const { Router } = require("express");
const router = Router();
const mysqlConnection = require("../database/database");
const { queryAsync } = require("../utils/functions");
const jwt = require("jsonwebtoken");
const secret = process.env.SECRET;

router.get("/counselings/private/:idUser", (req, res) => {
  const { idUser } = req.params;
  const token = req.headers["token"];
  const idUserC = jwt.decode(token).idUser;
  if (idUser != idUserC) {
    res.status(403).send({ error: "Invalid username" });
  }
  try {
    const payload = jwt.verify(token, secret);
    if (Date.now() > payload.exp) {
      return res.status(403).send({ error: "token expired" });
    }
    if (idUser.length == 10 && !isNaN(idUser)) {
      mysqlConnection.query(
        "SELECT c.idCounseling from counseling c, counseling_enrolled ce WHERE c.type = ? AND ce.idUser = ? AND ce.idCounseling = c.idCounseling AND end_time is null;",
        ["Privada", idUser],
        (error, rows, fields) => {
          if (!error) {
            const idCounselings = [];
            for (const key in rows) {
              if (Object.hasOwnProperty.call(rows, key)) {
                idCounselings.push(rows[key].idCounseling);
              }
            }
            res.status(200).send({
              idCounselings: idCounselings,
            });
          } else {
            res.status(500).send({ error: error });
          }
        }
      );
    } else {
      res.status(500).send({ error: "Invalid id form" });
    }
  } catch (error) {
    res.status(403).send({ error: error.message });
  }
});

router.put("/counselings/private/:idCounseling/end", async (req, res) => {
  const { idCounseling } = req.params;
  const end_time = req.body["end_time"];
  const advised = req.body.idAdvisedUser;
  const advisor = req.body.advisorKey;
  try {
    await queryAsync("START TRANSACTION");
    advisedCount = await queryAsync(
      "SELECT counselings_completed FROM player WHERE idUser = ?",
      [advised]
    );
    advisedCount = advisedCount[0].counselings_completed;
    advisorCount = await queryAsync(
      "SELECT counselings_completed FROM player WHERE idUser = ?",
      [advisor]
    );
    advisorCount = advisorCount[0].counselings_completed;
    result1 = await queryAsync(
      "UPDATE counseling SET end_time = ? WHERE idCounseling = ?",
      [end_time, idCounseling]
    );
    result2 = await queryAsync(
      "UPDATE player SET counselings_completed = ? WHERE idUser = ?",
      [advisedCount + 1, advised]
    );
    result3 = await queryAsync(
      "UPDATE player SET counselings_completed = ? WHERE idUser = ?",
      [advisorCount + 1, advisor]
    );
    await queryAsync("COMMIT");
    res.status(200).send(true);
  } catch (e) {
    console.log(e);
    await queryAsync("ROLLBACK");
    res.status(500).send(false);
  }
});

router.get("/counselings/private", (req, res) => {
  const token = req.headers["token"];
  try {
    const payload = jwt.verify(token, secret);
    if (Date.now() > payload.exp) {
      return res.status(403).send({ error: "token expired" });
    }
    const idUser = jwt.decode(token).idUser;
    if (idUser.length == 10 && !isNaN(idUser)) {
      mysqlConnection.query(
        `SELECT 
      c.idCounseling
  FROM
      counseling c,
      counseling_enrolled ce,
      day_of_counseling d
  WHERE
      type = ?
          AND ce.idUser != ?
          AND c.idCounseling = ce.idCounseling
          AND d.idCounseling = c.idCounseling
          AND d.confirmed = 0
          AND c.end_time is null
          AND d.idAdvisor is null
  GROUP BY c.idCounseling;`,
        ["Privada", idUser],
        (error, rows, fields) => {
          if (!error) {
            const idCounselings = [];
            for (const key in rows) {
              if (Object.hasOwnProperty.call(rows, key)) {
                idCounselings.push(rows[key].idCounseling);
              }
            }
            console.log(idCounselings);
            res.status(200).send({
              idCounselings: idCounselings,
            });
          }
        }
      );
    } else {
      res.status(500).send({ error: "Invalid id form" });
    }
  } catch (error) {
    res.status(403).send({ error: error.message });
  }
});

router.get("/counselings/private/advising/me", (req, res) => {
  const token = req.headers["token"];
  try {
    const payload = jwt.verify(token, secret);
    if (Date.now() > payload.exp) {
      return res.status(403).send({ error: "token expired" });
    }
    const idUser = jwt.decode(token).idUser;
    if (idUser.length == 10 && !isNaN(idUser)) {
      mysqlConnection.query(
        `SELECT 
        c.idCounseling
    FROM
        counseling c,
        counseling_advisor ca
    WHERE
        type = ?
            AND ca.idUser = ?
            AND ca.idCounseling = c.idCounseling
            AND c.end_time IS null
    GROUP BY c.idCounseling;`,
        ["Privada", idUser],
        (error, rows, fields) => {
          if (!error) {
            const idCounselings = [];
            for (const key in rows) {
              if (Object.hasOwnProperty.call(rows, key)) {
                idCounselings.push(rows[key].idCounseling);
              }
            }
            console.log(idCounselings);
            res.status(200).send({
              idCounselings: idCounselings,
            });
          }
        }
      );
    } else {
      res.status(500).send({ error: "Invalid id form" });
    }
  } catch (error) {
    res.status(403).send({ error: error.message });
  }
});

router.post("/counselings/private", async (req, res) => {
  const { name, start_time, days, idAdvisedUser, topics } = req.body;
  let idCounseling;
  try {
    await queryAsync("START TRANSACTION");
    // Realizar la primera consulta de inserción usando async/await
    const result = await queryAsync(
      "INSERT INTO counseling(name,start_time,type,topics) VALUES(?,?,?,?)",
      [name, start_time, "Privada", topics]
    );

    idCounseling = result.insertId;
    console.log("Counseling created");
    console.log(idCounseling);

    // Realizar las inserciones de los días y los consejeros en bucles utilizando async/await
    for (const key in days) {
      if (Object.hasOwnProperty.call(days, key)) {
        const element = days[key];
        const day = element.day;
        const idModule_start = element.idModule_start;
        const idModule_end = element.idModule_end;
        const idAdvisor = element.idAdvisor;
        await queryAsync(
          `INSERT INTO day_of_counseling(idCounseling,day,idModule_start,idModule_end,confirmed,idAdvisor)
             VALUES(?,?,?,?,?,?)`,
          [idCounseling, day, idModule_start, idModule_end, 0, idAdvisor]
        );
        console.log("Days assigned");
      }
    }
    await queryAsync(
      `INSERT INTO counseling_enrolled(idCounseling,idUser)
         VALUES(?,?)`,
      [idCounseling, idAdvisedUser]
    );
    await queryAsync("COMMIT");
    res.status(201).send({ message: "ok" });
  } catch (err) {
    await queryAsync("ROLLBACK");
    console.log(err);
    res.status(500).send({ error: err });
  }
});

router.post("/counselings/private/days", async (req, res) => {
  const { idCounseling, days, idAdvisor } = req.body;
  try {
    await queryAsync("START TRANSACTION");
    const deleteRows = await queryAsync(
      "DELETE FROM day_of_counseling WHERE idCounseling = ? AND idAdvisor = ?",
      [idCounseling, idAdvisor]
    );
    for (const key in days) {
      if (Object.hasOwnProperty.call(days, key)) {
        const element = days[key];
        const day = element.day;
        const idModule_start = element.idModule_start;
        const idModule_end = element.idModule_end;
        const confirmed = element.confirmed;
        const result = await queryAsync(
          "INSERT INTO day_of_counseling(idCounseling,day,idModule_start,idModule_end,confirmed,idAdvisor) VALUES(?,?,?,?,?,?)",
          [
            idCounseling,
            day,
            idModule_start,
            idModule_end,
            confirmed,
            idAdvisor,
          ]
        );
      }
    }
    await queryAsync("COMMIT");
    res.status(201).send({ message: "ok" });
  } catch (err) {
    await queryAsync("ROLLBACK");
    console.log(err);
    res.status(400).send({ error: err });
  }
});

router.get("/counselings/private/:idCounseling/days", async (req, res) => {
  const { idAdvisor } = req.body;
  const { idCounseling } = req.params;
  try {
    const result = await queryAsync(
      `SELECT 
          *
      FROM
          day_of_counseling
      WHERE
          idAdvisor = ?
              AND idCounseling = ?
              AND confirmed = 0;
              `,
      [idAdvisor, idCounseling]
    );
    if (result.length === 0) {
      res.status(200).send(true);
    } else {
      res.status(200).send(false);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(false);
  }
});

router.get("/counselings/private/:idCounseling/all-data", async (req, res) => {
  const { idCounseling } = req.params;
  try {
    const counselingRow = await queryAsync(
      `SELECT 
      c.idCounseling,
      c.name counselingName,
      c.start_time,
      c.end_time,
      ce.idUser idAdvisedUser,
      c.topics,
      u.name advisedName
  FROM
      counseling c,
      counseling_enrolled ce,
      user u
  WHERE
      c.idCounseling = ?
          AND u.idUser = ce.idUser
          AND c.idCounseling = ce.idCounseling;`,
      [idCounseling]
    );

    const dayRows = await queryAsync(
      `SELECT 
      d.idAdvisor,
      d.idModule_start,
      d.day,
      d.idModule_end,
      d.idDayOfCounseling,
      d.confirmed,
      c.name,
      c.start_time,
      c.end_time
  FROM
      counseling c
          INNER JOIN
      day_of_counseling d ON c.idCounseling = d.idCounseling
  WHERE
      c.idCounseling = ?
          AND c.type = ?
          AND d.idAdvisor IS NULL;`,
      [idCounseling, "Privada"]
    );

    const days = [];

    for (const key in dayRows) {
      if (Object.hasOwnProperty.call(dayRows, key)) {
        const day = {
          day: dayRows[key].day,
          idModule_start: dayRows[key].idModule_start,
          idModule_end: dayRows[key].idModule_end,
          idDay: dayRows[key].idDayOfCounseling,
          confirmed: dayRows[key].confirmed,
          idAdvisor: dayRows[key].idAdvisor,
        };
        days.push(day);
      }
    }

    const requestsDayRows = await queryAsync(
      `SELECT 
      d.idAdvisor,
      d.idModule_start,
      d.day,
      d.idModule_end,
      d.idDayOfCounseling,
      d.confirmed,
      c.name,
      c.start_time,
      c.end_time
  FROM
      counseling c
          INNER JOIN
      day_of_counseling d ON c.idCounseling = d.idCounseling
  WHERE
      c.idCounseling = ?
          AND c.type = ?
          AND d.idAdvisor IS NOT NULL;`,
      [idCounseling, "Privada"]
    );

    const requestDays = {};

    for (const key in requestsDayRows) {
      if (Object.hasOwnProperty.call(requestsDayRows, key)) {
        const day = {
          day: requestsDayRows[key].day,
          idModule_start: requestsDayRows[key].idModule_start,
          idModule_end: requestsDayRows[key].idModule_end,
          idDay: requestsDayRows[key].idDayOfCounseling,
          confirmed: requestsDayRows[key].confirmed,
          idAdvisor: requestsDayRows[key].idAdvisor,
        };
        if (day.idAdvisor in requestDays) {
          requestDays[day.idAdvisor].push(day);
        } else {
          requestDays[day.idAdvisor] = [day];
        }
      }
    }

    const advisorRows = await queryAsync(
      `SELECT 
      sub1.*, u.name advisedName
  FROM
      (SELECT 
          c.idCounseling,
              c.name counselingName,
              c.start_time,
              c.end_time,
              u.name advisorName,
              u.idUser,
              ce.idUser idAdvisedUser
      FROM
          counseling c, counseling_advisor a, user u, counseling_enrolled ce
      WHERE
          c.idCounseling = ?
              AND a.idUser = u.idUser
              AND c.idCounseling = a.idCounseling
              AND ce.idCounseling = c.idCounseling 
              AND c.type = ?) sub1,
      user u
  WHERE
      sub1.idAdvisedUser = u.idUser;`,
      [idCounseling, "Privada"]
    );
    let advisorName = null;
    let advisorKey = null;
    if (advisorRows.length !== 0) {
      advisorName = advisorRows[0].advisorName;
      advisorKey = advisorRows[0].idUser;
    }
    let map = {
      idCounseling: counselingRow[0].idCounseling,
      name: counselingRow[0].counselingName,
      start_time: counselingRow[0].start_time,
      end_time: counselingRow[0].end_time,
      type: "Privada",
      advisedName: counselingRow[0].advisedName,
      idAdvisedUser: counselingRow[0].idAdvisedUser,
      advisorName: advisorName,
      advisorKey: advisorKey,
      topics: counselingRow[0].topics,
      days: days,
      requestDays: requestDays,
    };
    res.status(200).send(map);
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: err });
  }
});

router.get(
  "/counselings/private/:idCounseling/me/all-data",
  async (req, res) => {
    const { idCounseling } = req.params;
    try {
      const counselingRow = await queryAsync(
        `SELECT 
      c.idCounseling,
      c.name counselingName,
      c.start_time,
      c.end_time,
      ce.idUser idAdvisedUser,
      c.topics,
      u.name advisedName
  FROM
      counseling c,
      counseling_enrolled ce,
      user u
  WHERE
      c.idCounseling = ?
          AND u.idUser = ce.idUser
          AND c.idCounseling = ce.idCounseling;`,
        [idCounseling]
      );

      const dayRows = await queryAsync(
        `SELECT 
      d.idAdvisor,
      d.idModule_start,
      d.day,
      d.idModule_end,
      d.idDayOfCounseling,
      d.confirmed,
      c.name,
      c.start_time,
      c.end_time
  FROM
      counseling c
          INNER JOIN
      day_of_counseling d ON c.idCounseling = d.idCounseling
  WHERE
      c.idCounseling = ?
          AND c.type = ?
          AND d.idAdvisor IS NULL;`,
        [idCounseling, "Privada"]
      );

      const days = [];

      for (const key in dayRows) {
        if (Object.hasOwnProperty.call(dayRows, key)) {
          const day = {
            day: dayRows[key].day,
            idModule_start: dayRows[key].idModule_start,
            idModule_end: dayRows[key].idModule_end,
            idDay: dayRows[key].idDayOfCounseling,
            confirmed: dayRows[key].confirmed,
            idAdvisor: dayRows[key].idAdvisor,
          };
          days.push(day);
        }
      }

      const advisorRows = await queryAsync(
        `SELECT 
      ca.idUser advisorKey,
        u.name advisorName
        FROM
          counseling_advisor ca,
                user u
      WHERE
          u.idUser = ca.idUser
      AND
          ca.idCounseling = ?`,
        [idCounseling]
      );
      let advisorName = null;
      let advisorKey = null;
      if (advisorRows.length !== 0) {
        advisorName = advisorRows[0].advisorName;
        advisorKey = advisorRows[0].idUser;
      }
      let map = {
        idCounseling: counselingRow[0].idCounseling,
        name: counselingRow[0].counselingName,
        start_time: counselingRow[0].start_time,
        end_time: counselingRow[0].end_time,
        type: "Privada",
        advisedName: counselingRow[0].advisedName,
        idAdvisedUser: counselingRow[0].idAdvisedUser,
        advisorName: advisorName,
        advisorKey: advisorKey,
        topics: counselingRow[0].topics,
        days: days,
      };
      res.status(200).send(map);
    } catch (err) {
      console.log(err);
      res.status(500).send({ error: err });
    }
  }
);

router.post("/counselings/private/:idCounseling/days", async (req, res) => {
  const { idAdvisor } = req.body;
  const { idCounseling } = req.params;
  try {
    await queryAsync("START TRANSACTION");
    const deleteRows = await queryAsync(
      "DELETE FROM day_of_counseling WHERE idCounseling = ? AND (idAdvisor != ? OR idAdvisor IS NULL);",
      [idCounseling, idAdvisor]
    );
    const updateDays = await queryAsync(
      "UPDATE day_of_counseling SET confirmed = 1, idAdvisor = null WHERE idCounseling = ? AND idAdvisor = ?;",
      [idCounseling, idAdvisor]
    );
    const insertAdvisors = await queryAsync(
      "INSERT INTO counseling_advisor(idUser,idCounseling) VALUES(?,?);",
      [idAdvisor, idCounseling]
    );
    res.status(201).send(true);
  } catch (err) {
    console.log(err);
    res.status(500).send(false);
  }
});
module.exports = router;
