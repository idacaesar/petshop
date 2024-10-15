const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/petshop", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
});

const User = mongoose.model("User", userSchema);

const JWT_SECRET = "JWT_SECRET"; // TO DO
const JWT_EXPIRATION = "8h";

// Middleware för att verifiera JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post("/api/signup", async (req, res) => {
  const { email, password, isAdmin } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      email,
      password: hashedPassword,
      isAdmin: isAdmin || false,
    });

    await user.save();
    res.status(201).json({ message: "Användare skapad" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Kunde inte skapa användare", error: error.message });
  }
});

app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;

  // try {
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Användare hittades inte" });
  }
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ message: "Ogiltigt lösenord" });
  }

  const token = jwt.sign(
    { email: user.email, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );

  res.json({ token, isAdmin: user.isAdmin });
  // } catch (error) {
  //   res.status(500).json({ message: "Serverfel" });
  // }
});

app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ message: "Detta är en skyddad rutt", user: req.user });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server kör på port ${PORT}`));
