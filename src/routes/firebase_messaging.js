const admin = require("firebase-admin");
const ServiceAccount = require("../data/ServiceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(ServiceAccount),
});
