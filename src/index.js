const express = require("express");
const morgan = require("morgan");
const app = express();

process.env.SECRET = "n)Puh#=,tD;w}$5Fh72E4%hhf1MEU$a!";
//Settings
app.set("port", process.env.PORT || 8000);
//Middlewares
app.use(express.json());
//Morgan
app.use(morgan("dev"));
//Routes
app.use(require("./routes/user"));
app.use(require("./routes/token"));
app.use(require("./routes/player"));
app.use(require("./routes/counseling_private"));
app.use(require("./routes/counseling_extra"));
app.use(require("./routes/counseling_main"));
//Starting the server
app.listen(app.get("port"), () => {
  console.log("Server on port", app.get("port"));
});
