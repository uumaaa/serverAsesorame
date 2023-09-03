const mysqlConnection = require("../database/database");

function queryAsync(sql, params) {
  return new Promise((resolve, reject) => {
    mysqlConnection.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}
module.exports = { queryAsync };
