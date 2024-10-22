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

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

const Product = mongoose.model("Product", productSchema);

const JWT_SECRET = "JWT_SECRET"; // TO DO: Ändra detta till en säker nyckel i produktion
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

  // Kontrollera om lösenordet är minst 8 tecken
  if (password.length < 8) {
    return res.status(400).json({ message: "Lösenordet måste vara minst 8 tecken långt." });
  }

  // Kontrollera om lösenordet är samma som e-posten
  if (password.toLowerCase() === email.toLowerCase()) {
    return res.status(400).json({ message: "Lösenordet får inte vara samma som e-posten." });
  }

  // Kontrollera om lösenordet är bara samma tecken upprepat
  const isRepeatedChars = password.split("").every((char) => char === password[0]);
  if (isRepeatedChars) {
    return res.status(400).json({ message: "Lösenordet får inte vara samma tecken upprepat." });
  }

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

  try {
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
  } catch (error) {
    res.status(500).json({ message: "Serverfel" });
  }
});

app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ message: "Detta är en skyddad rutt", user: req.user });
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Kunde inte hämta produkter", error: error.message });
  }
});

app.post("/api/products", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      message: "Åtkomst nekad. Endast administratörer kan skapa produkter.",
    });
  }

  const { name, price } = req.body;

  try {
    const product = new Product({ name, price });
    await product.save();
    res.status(201).json({ message: "Produkt skapad", product });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Kunde inte skapa produkt", error: error.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server kör på port ${PORT}`));
