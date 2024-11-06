const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const xss = require("xss");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/petshop", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// scheman
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
});

const User = mongoose.model("User", userSchema);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stockCount: { type: Number, required: true, default: 0 },
});

const Product = mongoose.model("Product", productSchema);

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
    maxLength: 1000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Review = mongoose.model("Review", reviewSchema);

const reservationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 24 * 60 * 60,
  },
});

const Reservation = mongoose.model("Reservation", reservationSchema);

// Schema för inloggningsloggar
const loginLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  email: { type: String, required: true },
  success: { type: Boolean, required: true },
});

const LoginLog = mongoose.model("LoginLog", loginLogSchema);

const JWT_SECRET = "JWT_SECRET";
const JWT_EXPIRATION = "8h";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 60 * 1000;

async function logLoginAttempt(email, success) {
  try {
    const loginLog = new LoginLog({
      email: xss(email),
      success,
    });
    await loginLog.save();
  } catch (error) {
    console.error("Fel vid loggning av inloggningsförsök:", error);
  }
}

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
  const sanitizedEmail = xss(req.body.email).toLowerCase();
  const password = req.body.password;
  const isAdmin = Boolean(req.body.isAdmin);

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Lösenordet måste vara minst 8 tecken långt." });
  }

  if (password.toLowerCase() === sanitizedEmail.toLowerCase()) {
    return res
      .status(400)
      .json({ message: "Lösenordet får inte vara samma som e-posten." });
  }

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
      email: sanitizedEmail,
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
  const normalizedEmail = req.body.email.toLowerCase();
  const password = req.body.password;

  try {
    const escapedEmail = normalizedEmail.replace(/[*+?^${}()|[\]\\"'\$]/g, "");
    console.log(escapedEmail);

    const user = await User.findOne({
      $and: [
        // { email: { $eq: normalizedEmail } },
        { email: { $regex: `^${escapedEmail}$` } },
      ],
    });

    if (!user) {
      await logLoginAttempt(normalizedEmail, false);
      return res.status(400).json({ message: "Användare hittades inte" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockUntil - new Date()) / 1000);
      await logLoginAttempt(normalizedEmail, false);
      return res.status(403).json({
        message: `För många misslyckade inloggningsförsök. Vänta ${remainingTime} sekunder innan du försöker igen.`,
        locked: true,
        remainingTime,
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      await logLoginAttempt(normalizedEmail, false);

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

    await logLoginAttempt(normalizedEmail, true);

    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = jwt.sign(
      {
        email: normalizedEmail,
        isAdmin: user.isAdmin,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    res.json({ token, isAdmin: user.isAdmin });
  } catch (error) {
    console.error("Inloggningsfel:", error);
    res.status(500).json({ message: "Serverfel" });
  }
});

app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ message: "Detta är en skyddad rutt", user: req.user });
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();

    const sanitizedProducts = products.map((product) => ({
      ...product.toObject(),
      name: xss(product.name),
    }));

    res.json(sanitizedProducts);
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

  const sanitizedName = xss(req.body.name);
  const price = Number(req.body.price);
  const stockCount = Number(req.body.stockCount);

  if (isNaN(price) || isNaN(stockCount)) {
    return res.status(400).json({
      message: "Pris och lagersaldo måste vara giltiga nummer.",
    });
  }

  try {
    const product = new Product({
      name: sanitizedName,
      price: price,
      stockCount: stockCount,
    });

    await product.save();
    res.status(201).json({
      message: "Produkt skapad",
      product: {
        ...product.toObject(),
        name: sanitizedName,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Kunde inte skapa produkt", error: error.message });
  }
});

app.get("/api/products/:productId/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate("userId", "email")
      .sort({ createdAt: -1 });

    const sanitizedReviews = reviews.map((review) => ({
      ...review.toObject(),
      comment: xss(review.comment),
    }));

    res.json(sanitizedReviews);
  } catch (error) {
    res.status(500).json({
      message: "Kunde inte hämta recensioner",
      error: error.message,
    });
  }
});

app.post(
  "/api/products/:productId/reviews",
  authenticateToken,
  async (req, res) => {
    try {
      const user = await User.findOne({ email: req.user.email });
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const product = await Product.findById(req.params.productId);
      if (!product) {
        return res.status(404).json({ message: "Produkt hittades inte" });
      }

      const existingReview = await Review.findOne({
        productId: req.params.productId,
        userId: user._id,
      });

      if (existingReview) {
        return res.status(400).json({
          message: "Du har redan recenserat denna produkt",
        });
      }

      const rating = parseInt(req.body.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          message: "Rating måste vara mellan 1 och 5",
        });
      }

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
          userId: { email: user.email },
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

app.put("/api/reviews/:reviewId", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: "Recension hittades inte" });
    }

    if (review.userId.toString() !== user._id.toString()) {
      return res.status(403).json({
        message: "Du har inte behörighet att ändra denna recension",
      });
    }

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

app.delete("/api/reviews/:reviewId", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: "Recension hittades inte" });
    }

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

app.post("/api/reservations", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const { productId } = req.body;

    const userReservationsCount = await Reservation.countDocuments({
      userId: user._id,
    });
    if (userReservationsCount >= 5) {
      return res.status(400).json({
        message: "Du har redan maximalt antal reservationer (5)",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Produkt hittades inte" });
    }

    if (product.stockCount <= 0) {
      return res.status(400).json({ message: "Produkten är slut i lager" });
    }

    const existingReservation = await Reservation.findOne({
      userId: user._id,
      productId: product._id,
    });

    if (existingReservation) {
      return res.status(400).json({
        message: "Du har redan reserverat denna produkt",
      });
    }

    const reservation = new Reservation({
      userId: user._id,
      productId: product._id,
    });

    product.stockCount -= 1;

    await Promise.all([reservation.save(), product.save()]);

    res.status(201).json({
      message: "Reservation skapad",
      reservation: {
        ...reservation.toObject(),
        productName: product.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Kunde inte skapa reservation",
      error: error.message,
    });
  }
});

app.get("/api/reservations", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const reservations = await Reservation.find({ userId: user._id }).populate(
      "productId",
      "name price"
    );

    res.json(reservations);
  } catch (error) {
    res.status(500).json({
      message: "Kunde inte hämta reservationer",
      error: error.message,
    });
  }
});

app.delete(
  "/api/reservations/:reservationId",
  authenticateToken,
  async (req, res) => {
    try {
      const user = await User.findOne({ email: req.user.email });
      const reservation = await Reservation.findById(req.params.reservationId);

      if (!reservation) {
        return res.status(404).json({ message: "Reservation hittades inte" });
      }

      if (reservation.userId.toString() !== user._id.toString()) {
        return res.status(403).json({
          message: "Du har inte behörighet att ta bort denna reservation",
        });
      }

      const product = await Product.findById(reservation.productId);
      if (product) {
        product.stockCount += 1;
        await product.save();
      }

      await reservation.deleteOne();
      res.json({ message: "Reservation borttagen" });
    } catch (error) {
      res.status(500).json({
        message: "Kunde inte ta bort reservation",
        error: error.message,
      });
    }
  }
);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server kör på port ${PORT}`));
