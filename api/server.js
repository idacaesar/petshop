const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const xss = require("xss"); // Nytt paket för XSS-skydd

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/petshop", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Uppdaterat userSchema med nya fält för inloggningsförsök
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 }, // Nytt fält
  lockUntil: { type: Date }, // Nytt fält
});

const User = mongoose.model("User", userSchema);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

const Product = mongoose.model("Product", productSchema);

// Nytt schema för reviews
const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
    maxLength: 1000, // Begränsa kommentarslängden
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Review = mongoose.model("Review", reviewSchema);

const JWT_SECRET = "JWT_SECRET"; // TO DO: Ändra detta till en säker nyckel i produktion
const JWT_EXPIRATION = "8h";

// Konstanter för inloggningsförsök
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 60 * 1000; // 1 minut i millisekunder

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
    return res
      .status(400)
      .json({ message: "Lösenordet måste vara minst 8 tecken långt." });
  }

  // Kontrollera om lösenordet är samma som e-posten
  if (password.toLowerCase() === email.toLowerCase()) {
    return res
      .status(400)
      .json({ message: "Lösenordet får inte vara samma som e-posten." });
  }

  // Kontrollera om lösenordet är bara samma tecken upprepat
  const isRepeatedChars = password
    .split("")
    .every((char) => char === password[0]);
  if (isRepeatedChars) {
    return res
      .status(400)
      .json({ message: "Lösenordet får inte vara samma tecken upprepat." });
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

    // Kontrollera om kontot är låst
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockUntil - new Date()) / 1000);
      return res.status(403).json({
        message: `För många misslyckade inloggningsförsök. Vänta ${remainingTime} sekunder innan du försöker igen.`,
        locked: true,
        remainingTime,
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      // Öka antalet misslyckade inloggningsförsök
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME);
        await user.save();
        return res.status(403).json({
          message: "För många misslyckade försök. Kontot är låst i 1 minut.",
          locked: true,
          remainingTime: 60,
        });
      }

      await user.save();
      return res.status(400).json({
        message: `Ogiltigt lösenord. ${
          MAX_LOGIN_ATTEMPTS - user.loginAttempts
        } försök kvar.`,
      });
    }

    // Återställ räknaren vid lyckad inloggning
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

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

// Nya routes för reviews
// Hämta alla reviews för en produkt
app.get("/api/products/:productId/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate("userId", "email") // Inkludera endast email från user
      .sort({ createdAt: -1 }); // Sortera efter senaste först

    // Sanitera kommentarer innan de skickas
    const sanitizedReviews = reviews.map((review) => ({
      ...review.toObject(),
      comment: xss(review.comment), // Sanitera kommentaren
    }));

    res.json(sanitizedReviews);
  } catch (error) {
    res.status(500).json({
      message: "Kunde inte hämta recensioner",
      error: error.message,
    });
  }
});

// Skapa en ny review
app.post(
  "/api/products/:productId/reviews",
  authenticateToken,
  async (req, res) => {
    try {
      // Hitta användaren baserat på email från JWT
      const user = await User.findOne({ email: req.user.email });
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      // Validera att produkten existerar
      const product = await Product.findById(req.params.productId);
      if (!product) {
        return res.status(404).json({ message: "Produkt hittades inte" });
      }

      // Kontrollera om användaren redan har recenserat denna produkt
      const existingReview = await Review.findOne({
        productId: req.params.productId,
        userId: user._id,
      });

      if (existingReview) {
        return res.status(400).json({
          message: "Du har redan recenserat denna produkt",
        });
      }

      // Validera rating
      const rating = parseInt(req.body.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          message: "Rating måste vara mellan 1 och 5",
        });
      }

      // Sanitera kommentaren och skapa review
      const sanitizedComment = xss(req.body.comment);

      const review = new Review({
        productId: req.params.productId,
        userId: user._id,
        rating: rating,
        comment: sanitizedComment,
      });

      await review.save();

      res.status(201).json({
        message: "Recension skapad",
        review: {
          ...review.toObject(),
          userId: { email: user.email }, // Inkludera användarens email i svaret
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Kunde inte skapa recension",
        error: error.message,
      });
    }
  }
);

// Uppdatera en review
app.put("/api/reviews/:reviewId", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: "Recension hittades inte" });
    }

    // Kontrollera att användaren äger recensionen
    if (review.userId.toString() !== user._id.toString()) {
      return res.status(403).json({
        message: "Du har inte behörighet att ändra denna recension",
      });
    }

    // Validera och uppdatera
    if (req.body.rating) {
      const rating = parseInt(req.body.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          message: "Rating måste vara mellan 1 och 5",
        });
      }
      review.rating = rating;
    }

    if (req.body.comment) {
      review.comment = xss(req.body.comment);
    }

    await review.save();
    res.json({ message: "Recension uppdaterad", review });
  } catch (error) {
    res.status(500).json({
      message: "Kunde inte uppdatera recension",
      error: error.message,
    });
  }
});

// Ta bort en review
app.delete("/api/reviews/:reviewId", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: "Recension hittades inte" });
    }

    // Tillåt borttagning om användaren äger recensionen eller är admin
    if (review.userId.toString() !== user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Du har inte behörighet att ta bort denna recension",
      });
    }

    await review.deleteOne();
    res.json({ message: "Recension borttagen" });
  } catch (error) {
    res.status(500).json({
      message: "Kunde inte ta bort recension",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server kör på port ${PORT}`));
