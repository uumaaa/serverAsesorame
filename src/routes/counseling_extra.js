const { Router } = require("express");
const router = Router();
const mysqlConnection = require("../database/database");
const { queryAsync } = require("../utils/functions");

router.get("/counselings/extra", (req, res) => {
  mysqlConnection.query(
    `SELECT 
        idCounseling
    FROM
        counseling
    WHERE
        type = ?;`,
    ["Actividad extracurricular"],
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

router.post("/counselings/extra", async (req, res) => {
  const {
    name,
    start_time,
    end_time,
    extracurricular_category,
    advisorsKeys,
    days,
  } = req.body;
  let idCounseling;

  try {
    await queryAsync("START TRANSACTION");
    // Realizar la primera consulta de inserción usando async/await
    const result = await queryAsync(
      "INSERT INTO counseling(name,start_time,end_time,type,extracurricular_category) VALUES(?,?,?,?,?)",
      [
        name,
        start_time,
        end_time,
        "Actividad extracurricular",
        extracurricular_category,
      ]
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
    console.log(err);
    res.status(500).send({ error: err });
  }
});

router.get("/counselings/extra/:idCounseling/advisors", async (req, res) => {
  const { idCounseling } = req.params;

  try {
    const rows = await queryAsync(
      `SELECT 
          c.idCounseling,
          c.name counselingName,
          c.start_time,
          c.end_time,
          c.extracurricular_category,
          u.name,
          u.idUser,
          ca.name caname
        FROM
          counseling c,
          counseling_advisor a,
          extracurricular_category ca,
          user u
        WHERE
          c.idCounseling = ?
          AND a.idUser = u.idUser
          AND c.idCounseling = a.idCounseling
          AND ca.idCategory = c.extracurricular_category
          AND c.type = ?;`,
      [idCounseling, "Actividad extracurricular"]
    );

    if (rows.length === 0) {
      res.status(404).send({ error: "invalid id" });
      return;
    }

    const advisorsNames = [];
    const advisorsKeys = [];

    for (const key in rows) {
      if (Object.hasOwnProperty.call(rows, key)) {
        advisorsNames.push(rows[key].name);
        advisorsKeys.push(rows[key].idUser);
      }
    }

    console.log(advisorsNames);
    console.log(advisorsKeys);

    res.status(200).send({
      idCounseling: rows[0].idCounseling,
      name: rows[0].counselingName,
      start_time: rows[0].start_time,
      end_time: rows[0].end_time,
      type: "Actividad extracurricular",
      extracurricular_category: rows[0].extracurricular_category,
      extra_name: rows[0].caname,
      advisorsNames: advisorsNames,
      advisorsKeys: advisorsKeys,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: err });
  }
});

router.get("/counselings/extra/:idCounseling/days", async (req, res) => {
  const { idCounseling } = req.params;

  try {
    const rows = await queryAsync(
      `SELECT 
        d.idModule_start,
        d.day,
        d.idModule_end,
        d.idDayOfCounseling,
        c.idCounseling,
        c.name,
        c.extracurricular_category,
        c.end_time,
        c.start_time,
        ca.name caname
    FROM
        counseling c,
        extracurricular_category ca,
        day_of_counseling d
    WHERE
        c.idCounseling = ?
            AND ca.idCategory = c.extracurricular_category
            AND c.type = 'Actividad extracurricular'
            AND c.idCounseling = d.idCounseling;`,
      [idCounseling]
    );

    if (rows.length === 0) {
      res.status(404).send({ error: "invalid id" });
      return;
    }

    const days = [];

    for (const key in rows) {
      if (Object.hasOwnProperty.call(rows, key)) {
        const day = {
          day: rows[key].day,
          idModule_start: rows[key].idModule_start,
          idModule_end: rows[key].idModule_end,
          idDay: rows[key].idDayOfCounseling,
          confirmed: 1,
        };
        days.push(day);
      }
    }

    res.status(200).send({
      idCounseling: rows[0].idCounseling,
      name: rows[0].name,
      type: "Acvividad extracurricular",
      extracurricular_category: rows[0].extracurricular_category,
      start_time: rows[0].start_time,
      end_time: rows[0].end_time,
      extra_name: rows[0].caname,
      days: days,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "error" });
  }
});

router.get("/counselings/extra/:idCounseling/all-data", async (req, res) => {
  const { idCounseling } = req.params;
  try {
    const dayRows = await queryAsync(
      `SELECT 
        d.idModule_start,
        d.day,
        d.idModule_end,
        d.idDayOfCounseling,
        c.idCounseling,
        c.name,
        c.extracurricular_category,
        c.end_time,
        c.start_time,
        ca.name caname
    FROM
        counseling c,
        extracurricular_category ca,
        day_of_counseling d
    WHERE
        c.idCounseling = ?
            AND ca.idCategory = c.extracurricular_category
            AND c.type = ?
            AND c.idCounseling = d.idCounseling;`,
      [idCounseling, "Actividad extracurricular"]
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
      c.extracurricular_category,
      u.name,
      u.idUser,
      ca.name caname
    FROM
      counseling c,
      counseling_advisor a,
      extracurricular_category ca,
      user u
    WHERE
      c.idCounseling = ?
      AND a.idUser = u.idUser
      AND c.idCounseling = a.idCounseling
      AND ca.idCategory = c.extracurricular_category
      AND c.type = ?;`,
      [idCounseling, "Actividad extracurricular"]
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
      extracurricular_category: dayRows[0].extracurricular_category,
      type: "Actividad extracurricular",
      advisorsNames: advisorsNames,
      advisorsKeys: advisorsKeys,
      days: days,
      extra_name: dayRows[0].caname,
    });
  } catch (err) {
    res.status(500).send({ error: err });
  }
});

router.get("/extracurricular", (req, res) => {
  mysqlConnection.query(
    "SELECT * from extracurricular_category",
    [],
    (err, rows, fields) => {
      if (!err) {
        res.status(200).send(rows);
      }
    }
  );
});

module.exports = router;
