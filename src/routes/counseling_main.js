const { Router } = require("express");
const router = Router();
const mysqlConnection = require("../database/database");
const { queryAsync } = require("../utils/functions");

router.get("/counselings/main", (req, res) => {
  mysqlConnection.query(
    "SELECT idCounseling from counseling WHERE type = ?;",
    ["Asesoria"],
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
});

router.post("/counselings/main", async (req, res) => {
  const { name, start_time, end_time, advisorsKeys, days } = req.body;
  let idCounseling;

  try {
    await queryAsync("START TRANSACTION");
    // Realizar la primera consulta de inserción usando async/await
    const result = await queryAsync(
      "INSERT INTO counseling(name,start_time,end_time,type) VALUES(?,?,?,?)",
      [name, start_time, end_time, "Asesoria"]
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
        await queryAsync(
          `INSERT INTO day_of_counseling(idCounseling,day,idModule_start,idModule_end,confirmed)
             VALUES(?,?,?,?,?)`,
          [idCounseling, day, idModule_start, idModule_end, 1]
        );
        console.log("Days assigned");
      }
    }

    for (const key in advisorsKeys) {
      if (Object.hasOwnProperty.call(advisorsKeys, key)) {
        const element = advisorsKeys[key];
        const idUser = element;
        await queryAsync(
          `INSERT INTO counseling_advisor(idCounseling,idUser) VALUES(?,?)`,
          [idCounseling, idUser]
        );
        console.log("Counselors assigned");
      }
    }
    await queryAsync("COMMIT");
    res.status(201).send({ message: "ok" });
  } catch (err) {
    await queryAsync("ROLLBACK");
    res.status(500).send({ error: err });
  }
});

router.get("/counselings/main/:idCounseling/all-data", async (req, res) => {
  const { idCounseling } = req.params;
  try {
    const dayRows = await queryAsync(
      `SELECT 
        d.idModule_start,
        d.day,
        d.idModule_end,
        d.idDayOfCounseling,
        c.name,
        c.start_time,
        c.end_time
    FROM
        counseling c
            INNER JOIN
        day_of_counseling d ON c.idCounseling = d.idCounseling
    WHERE
        c.idCounseling = ?
            AND c.type = ?`,
      [idCounseling, "Asesoria"]
    );

    if (dayRows.length === 0) {
      res.status(404).send({ error: "invalid id" });
      return;
    }

    const days = [];

    for (const key in dayRows) {
      if (Object.hasOwnProperty.call(dayRows, key)) {
        const day = {
          day: dayRows[key].day,
          idModule_start: dayRows[key].idModule_start,
          idModule_end: dayRows[key].idModule_end,
          idDay: dayRows[key].idDayOfCounseling,
          confirmed: 1,
        };
        days.push(day);
      }
    }

    const advisorRows = await queryAsync(
      `SELECT 
            c.idCounseling,
            c.name counselingName,
            c.start_time,
            c.end_time,
            u.name,
            u.idUser
        FROM
            counseling c,
            counseling_advisor a,
            user u
        WHERE
            c.idCounseling = ?
            AND a.idUser = u.idUser
            AND c.idCounseling = a.idCounseling;`,
      [idCounseling]
    );

    if (advisorRows.length === 0) {
      res.status(404).send({ error: "invalid id" });
      return;
    }

    const advisorsNames = [];
    const advisorsKeys = [];

    for (const key in advisorRows) {
      if (Object.hasOwnProperty.call(advisorRows, key)) {
        advisorsNames.push(advisorRows[key].name);
        advisorsKeys.push(advisorRows[key].idUser);
      }
    }

    console.log(advisorsNames);
    console.log(advisorsKeys);

    res.status(200).send({
      idCounseling: advisorRows[0].idCounseling,
      name: advisorRows[0].counselingName,
      start_time: advisorRows[0].start_time,
      end_time: advisorRows[0].end_time,
      extracurricular_category: null,
      type: "Asesoria",
      advisorsNames: advisorsNames,
      advisorsKeys: advisorsKeys,
      days: days,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: err });
  }
});

module.exports = router;
