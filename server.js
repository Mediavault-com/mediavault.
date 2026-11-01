
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    app: "Media Vault",
    status: "Backend Connected"
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Media Vault server started");
});
