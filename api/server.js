const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/petshop", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model("User", {
  email: String,
  password: String,
});

app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Användare hittades inte" });
    }

    // const validPassword = await bcrypt.compare(password, user.password);
    // if (!validPassword) {
    //   return res.status(400).json({ message: "Ogiltigt lösenord" });
    // }

    res.json({ message: "Inloggning lyckades" });
  } catch (error) {
    res.status(500).json({ message: "Serverfel" });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server kör på port ${PORT}`));
