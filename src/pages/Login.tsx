import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Google } from "lucide-react";

const Login: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"mentee" | "mentor" | "">("");

  const handleLogin = async () => {
    if (!selectedRole) {
      setError("Please select a role before logging in.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Login failed:", err);
      setError("Failed to log in. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Welcome to MentorConnect
        </h1>
        <p className="text-center text-gray-600 mb-4">
          Sign in to continue and connect with mentors and mentees.
        </p>

        {error && (
          <p
            className="text-red-500 mb-4 text-center"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}

        <div className="mb-4">
          <label htmlFor="role" className="block text-gray-700 font-medium mb-2">
            Select Your Role
          </label>
          <select
            id="role"
            className="border border-gray-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as "mentee" | "mentor" | "")}
          >
            <option value="">Select Role</option>
            <option value="mentee">Mentee</option>
            <option value="mentor">Mentor</option>
          </select>
        </div>

        <button
          className={`w-full py-3 px-4 rounded text-white font-bold flex items-center justify-center gap-2 transition duration-200 ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
          onClick={handleLogin}
          disabled={loading}
        >
          <Google className="h-5 w-5" />
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            By signing in, you agree to our{" "}
            <a href="#" className="text-blue-500 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-blue-500 hover:underline">
              Privacy Policy
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
