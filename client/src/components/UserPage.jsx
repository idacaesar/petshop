import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/UserPage.css";

const UserPage = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState({});
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: "",
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem("user"));
    if (userData) {
      setUser(userData);
    }
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get("http://localhost:5001/api/products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProducts(response.data);

      // Hämta recensioner för varje produkt
      const reviewsData = {};
      for (const product of response.data) {
        const reviewsResponse = await axios.get(
          `http://localhost:5001/api/products/${product._id}/reviews`
        );
        reviewsData[product._id] = reviewsResponse.data;
      }
      setReviews(reviewsData);
    } catch (error) {
      console.error("Kunde inte hämta data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (productId) => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        `http://localhost:5001/api/products/${productId}/reviews`,
        newReview,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Uppdatera recensionerna för denna produkt
      const reviewsResponse = await axios.get(
        `http://localhost:5001/api/products/${productId}/reviews`
      );
      setReviews({
        ...reviews,
        [productId]: reviewsResponse.data,
      });

      // Återställ formuläret
      setNewReview({ rating: 5, comment: "" });
      setSelectedProduct(null);
      setError("");
    } catch (error) {
      setError(error.response?.data?.message || "Kunde inte skapa recension");
    }
  };

  const handleDeleteReview = async (reviewId, productId) => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.delete(`http://localhost:5001/api/reviews/${reviewId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Uppdatera recensionerna för denna produkt
      const reviewsResponse = await axios.get(
        `http://localhost:5001/api/products/${productId}/reviews`
      );
      setReviews({
        ...reviews,
        [productId]: reviewsResponse.data,
      });
    } catch (error) {
      console.error("Kunde inte ta bort recension:", error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signinpage");
  };

  if (loading) {
    return <div className="loading">Laddar...</div>;
  }

  if (!user) {
    return <div className="loading">Var god logga in...</div>;
  }

  const calculateAverageRating = (productReviews) => {
    if (!productReviews || productReviews.length === 0)
      return "Ingen rating än";
    const average =
      productReviews.reduce((acc, review) => acc + review.rating, 0) /
      productReviews.length;
    return average.toFixed(1);
  };

  return (
    <div className="webshop">
      <header className="webshop-header">
        <h1>PetShop</h1>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
        <nav className={menuOpen ? "open" : ""}>
          <ul>
            <li>
              <a href="#" className="active">
                Hem
              </a>
            </li>
            <li>
              <a href="/adminpage">Skapa produkt</a>
            </li>
          </ul>
        </nav>
        <div className="user-info">
          <span>{user.email}</span>
          <button className="logout-button" onClick={handleLogout}>
            Logga ut
          </button>
        </div>
      </header>
      <main className="webshop-content">
        <aside className="sidebar">
          <h2>Kategorier</h2>
          <ul>
            <li>
              <a href="#">Hundar</a>
            </li>
            <li>
              <a href="#">Katter</a>
            </li>
            <li>
              <a href="#">Fåglar</a>
            </li>
            <li>
              <a href="#">Fiskar</a>
            </li>
          </ul>
        </aside>
        <section className="product-grid">
          <h2>Våra produkter</h2>
          <div className="products">
            {products.length > 0 ? (
              products.map((product) => (
                <div key={product._id} className="product-card">
                  <div className="product-image"></div>
                  <h3>{product.name}</h3>
                  <p>Pris: {product.price} kr</p>
                  <div className="product-rating">
                    <p>
                      Rating: {calculateAverageRating(reviews[product._id])}
                    </p>
                  </div>
                  <button>Lägg i varukorg</button>

                  {/* Recensioner */}
                  <div className="reviews-section">
                    <h4>Recensioner</h4>
                    {reviews[product._id]?.map((review) => (
                      <div key={review._id} className="review">
                        <div className="review-header">
                          <span>★ {review.rating}</span>
                          <span>{review.userId.email}</span>
                          {user.email === review.userId.email && (
                            <button
                              onClick={() =>
                                handleDeleteReview(review._id, product._id)
                              }
                              className="delete-review"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <p>{review.comment}</p>
                      </div>
                    ))}

                    {/* Formulär för ny recension */}
                    {selectedProduct === product._id ? (
                      <div className="review-form">
                        {error && <p className="error">{error}</p>}
                        <select
                          value={newReview.rating}
                          onChange={(e) =>
                            setNewReview({
                              ...newReview,
                              rating: Number(e.target.value),
                            })
                          }
                        >
                          {[5, 4, 3, 2, 1].map((num) => (
                            <option key={num} value={num}>
                              {num} ★
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={newReview.comment}
                          onChange={(e) =>
                            setNewReview({
                              ...newReview,
                              comment: e.target.value,
                            })
                          }
                          placeholder="Skriv din recension här..."
                          maxLength={1000}
                        />
                        <div className="review-buttons">
                          <button
                            onClick={() => handleReviewSubmit(product._id)}
                          >
                            Skicka
                          </button>
                          <button onClick={() => setSelectedProduct(null)}>
                            Avbryt
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedProduct(product._id)}
                        className="write-review"
                      >
                        Skriv recension
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p>Inga produkter tillgängliga för tillfället.</p>
            )}
          </div>
        </section>
      </main>
      <footer className="webshop-footer">
        <p>
          &copy; 2024 PetShop. Egendesignad av Ida Caesar och Andreas Ottoson.
        </p>
      </footer>
    </div>
  );
};

export default UserPage;
