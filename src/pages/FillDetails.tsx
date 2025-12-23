import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { doc, setDoc, getDoc, getFirestore } from "firebase/firestore";

const db = getFirestore();

const FillDetails = () => {
  const { user } = useAuth();
  const { role } = useParams(); // Extract role from URL params
  const navigate = useNavigate();

  // Ensure role is either 'mentor' or 'mentee'
  const validRole = role === "mentor" || role === "mentee" ? role : null;

  const [formData, setFormData] = useState({
    fullName: user?.displayName || "",
    domain: "",
    experience: "",
    education: "",
    year: "",
    organization: "",
    expertise: "",
  });

  const [loading, setLoading] = useState(true); // Add loading state
  const [error, setError] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]); // Add state for time slots

  useEffect(() => {
    if (!user) {
      setError("User not logged in. Please log in again.");
      setLoading(false);
      return;
    }

    if (!validRole) {
      setError("Invalid role. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(false); // Data is ready
  }, [user, validRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setTimeSlots([...timeSlots, value]);
    } else {
      setTimeSlots(timeSlots.filter((slot) => slot !== value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validRole) return;

    setLoading(true);
    setError(null);

    try {
      const userRef = doc(db, "users", user.uid);
      const userData = {
        uid: user.uid,
        name: user.displayName || formData.fullName,
        email: user.email,
        role: validRole, // Ensure role is saved
        detailsCompleted: true, // Mark as completed
        details: formData, // Store form data in Firestore
        availableTimeSlots: validRole === "mentor" ? timeSlots : [], // Save time slots for mentors
        updatedAt: new Date(), // Add a timestamp for updates
      };

      await setDoc(userRef, userData, { merge: true }); // Save or update user details

      navigate(validRole === "mentor" ? "/mentor-dashboard" : "/dashboard"); // Redirect to dashboard
    } catch (err) {
      console.error("Error saving details:", err);
      setError("Failed to save details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p>Loading...</p>; // Show loading state
  }

  if (error) {
    return <p className="text-red-500">{error}</p>; // Show error message
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Fill Your Details</h1>

        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        {!validRole ? (
          <p className="text-red-500 text-center">Invalid role. Please log in again.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              className="border p-2 mb-4 w-full rounded"
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />

            {validRole === "mentor" && (
              <>
                <input
                  className="border p-2 mb-4 w-full rounded"
                  type="text"
                  name="domain"
                  placeholder="Domain"
                  onChange={handleChange}
                  required
                />
                <input
                  className="border p-2 mb-4 w-full rounded"
                  type="text"
                  name="experience"
                  placeholder="Experience (years)"
                  onChange={handleChange}
                  required
                />
                <input
                  className="border p-2 mb-4 w-full rounded"
                  type="text"
                  name="organization"
                  placeholder="Organization Name"
                  onChange={handleChange}
                  required
                />
                <input
                  className="border p-2 mb-4 w-full rounded"
                  type="text"
                  name="expertise"
                  placeholder="Expertise"
                  onChange={handleChange}
                  required
                />
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Select Your Available Time Slots
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"].map((slot) => (
                      <label key={slot} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={slot}
                          onChange={handleTimeSlotChange}
                          className="form-checkbox"
                        />
                        <span>{slot}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {validRole === "mentee" && (
              <>
                <input
                  className="border p-2 mb-4 w-full rounded"
                  type="text"
                  name="education"
                  placeholder="Education (B.Tech, MSc, etc.)"
                  onChange={handleChange}
                  required
                />
                <input
                  className="border p-2 mb-4 w-full rounded"
                  type="text"
                  name="year"
                  placeholder="Year (if pursuing) or Experience"
                  onChange={handleChange}
                  required
                />
              </>
            )}

            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full transition duration-200 disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FillDetails;
