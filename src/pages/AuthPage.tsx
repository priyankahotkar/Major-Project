import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // Ensure correct import

const AuthPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth) {
    console.error("Auth context is not available");
    return <p>Error: Authentication context is missing.</p>;
  }

  const { user, signInWithGoogle, signInWithEmail, registerWithEmail, logout } = auth;

  const [role, setRole] = useState<"mentor" | "mentee" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setRole(userData.role || null);

        // Redirect to profile completion if user hasn't filled details
        if (!userData.detailsCompleted && userData.role) {
          navigate(`/FillDetails/${userData.role}`); // Redirect to profile form with role
        } else if (!userData.role) {
          setShowRoleSelection(true); // Show role selection only if role is not set
        } else {
          // Redirect to the respective dashboard for existing users
          navigate(userData.role === "mentor" ? "/mentor-dashboard" : "/dashboard");
        }
      } else {
        setShowRoleSelection(true); // Show role selection for new users
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
      setError("Failed to fetch user role.");
    }
  };

  const handleRoleSelection = async (selectedRole: "mentor" | "mentee") => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { 
        role: selectedRole, 
        detailsCompleted: false, // Reset details completion status
        updatedAt: new Date() // Add a timestamp for updates
      }, { merge: true });
      setRole(selectedRole);
      setShowRoleSelection(false);

      // Redirect to the respective dashboard immediately after role selection
      navigate(selectedRole === "mentor" ? "/mentor-dashboard" : "/dashboard");
    } catch (err) {
      console.error("Error updating user role:", err);
      setError("Failed to update role.");
    }
  };

  const handleRoleChange = async (newRole: "mentor" | "mentee") => {
    if (!newRole || newRole === role) return; // Prevent unnecessary updates
    await auth.updateRole(newRole); // Call updateRole from AuthContext
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isRegistering) {
        if (!role) {
          setError("Please select a role before registering.");
          return;
        }

        await registerWithEmail(email, password, role); // Pass the role to registerWithEmail
        navigate(`/FillDetails/${role}`); // Redirect to FillDetails page after registration
      } else {
        await signInWithEmail(email, password); // Use signInWithEmail for login

        // Wait for the user object to be available
        if (!auth.user) {
          setError("User object is not available. Please try signing in again.");
          return;
        }

        // Fetch the user's role from Firestore
        const userRef = doc(db, "users", auth.user.uid); // Ensure correct document reference
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (!userData?.role) {
          setError("User role is not defined. Please contact support.");
          return;
        }

        // Redirect based on role
        if (userData.role === "mentor") {
          navigate("/mentor-dashboard");
        } else if (userData.role === "mentee") {
          navigate("/dashboard");
        } else {
          setError("Invalid role. Please contact support.");
        }
      }
    } catch (err: any) {
      console.error("Authentication error:", err.message || err);
      setError(err.message || "Failed to authenticate. Please check your credentials.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Welcome to MentorConnect
        </h1>
        <p className="text-center text-gray-600 mb-4">
          Sign in to continue and connect with mentors and mentees.
        </p>

        {error && (
          <p className="text-red-500 mb-4 text-center" role="alert">
            {error}
          </p>
        )}

        {/* Google Authentication */}
        <button
          className="w-full py-3 px-4 rounded text-white font-bold flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 transition duration-200 mb-4"
          onClick={signInWithGoogle}
        >
          Sign in with Google
        </button>

        {/* Email Authentication */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {isRegistering && (
            <div className="mb-4">
              <label htmlFor="role" className="block text-gray-700 font-medium mb-2">
                Select Your Role
              </label>
              <select
                id="role"
                className="border border-gray-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={role || ""}
                onChange={(e) => setRole(e.target.value as "mentor" | "mentee")}
                required
              >
                <option value="">Select Role</option>
                <option value="mentee">Mentee</option>
                <option value="mentor">Mentor</option>
              </select>
            </div>
          )}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded text-white font-bold bg-blue-500 hover:bg-blue-600 transition duration-200"
          >
            {isRegistering ? "Register" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-blue-500 hover:underline"
          >
            {isRegistering ? "Sign in" : "Register"}
          </button>
        </p>

        {user && (
          <div className="mt-6 text-center">
            <p>Welcome, {user.displayName || user.email}</p>
            <button
              onClick={logout}
              className="mt-2 text-red-500 hover:underline"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
