import React from "react";
import { useNavigate } from "react-router-dom";

export function AboutPage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center">About MentorConnect</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">🧭 Our Mission</h2>
          <p className="text-gray-700">
            At MentorConnect, our mission is simple yet powerful: To connect learners with the right mentors who can guide, inspire, and empower them at every step of their journey.
          </p>
          <p className="text-gray-700 mt-2">
            We aim to create a space where mentorship is not just occasional advice but a long-term, trusted relationship that helps unlock true potential.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">🌱 Our Story</h2>
          <p className="text-gray-700">
            MentorConnect was born from a shared realization among four students: meaningful mentorship is hard to find, yet crucial for growth. Whether you're a beginner navigating career paths or a student seeking domain-specific guidance, having someone who's “been there, done that” can make all the difference.
          </p>
          <p className="text-gray-700 mt-2">
            As students ourselves, we experienced this gap firsthand. That’s why we built MentorConnect — a dynamic, student-centric platform designed to break barriers, connect generations, and foster genuine learning through personalized mentorship.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">👩‍💻 Meet the Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center transform transition-transform duration-300 hover:translate-y-[-5px] hover:shadow-lg">
              <img
                src="../images/priyanka.png"
                alt="Priyanka Hotkar"
                className="w-32 h-32 rounded-full mx-auto mb-4"
              />
              <h3 className="font-bold">Priyanka Hotkar</h3>
              <p className="text-gray-600">Team Leader, Full-Stack Developer</p>
            </div>
            <div className="text-center transform transition-transform duration-300 hover:translate-y-[-5px] hover:shadow-lg">
              <img
                src="../images/arpita.png"
                alt="Arpita Baraskar"
                className="w-32 h-32 rounded-full mx-auto mb-4"
              />
              <h3 className="font-bold">Arpita Baraskar</h3>
              <p className="text-gray-600">Backend & Database Specialist</p>
            </div>
            <div className="text-center transform transition-transform duration-300 hover:translate-y-[-5px] hover:shadow-lg">
              <img
                src="../images/nayan.jpg"
                alt="Nayan Fulambarkar"
                className="w-32 h-32 rounded-full mx-auto mb-4"
              />
              <h3 className="font-bold">Nayan Fulambarkar</h3>
              <p className="text-gray-600">UI/UX Designer & Frontend Developer</p>
            </div>
            <div className="text-center transform transition-transform duration-300 hover:translate-y-[-5px] hover:shadow-lg">
              <img
                src="../images/pragati.jpg"
                alt="Pragati Chavan"
                className="w-32 h-32 rounded-full mx-auto mb-4"
              />
              <h3 className="font-bold">Aditya BInjagermath</h3>
              <p className="text-gray-600">Content Support & Desigining</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">🚀 Our Vision</h2>
          <p className="text-gray-700">
            We envision a future where mentorship is:
          </p>
          <ul className="list-disc list-inside text-gray-700 mt-2">
            <li>Accessible to Everyone – across regions, languages, and disciplines</li>
            <li>Community-Driven – powered by peers, alumni, and professionals</li>
            <li>Sustainable & Scalable – a continuous relationship, not just a one-time consultation</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">💡 Our Core Values</h2>
          <ul className="list-disc list-inside text-gray-700">
            <li>Empathy – Because we’ve all been learners</li>
            <li>Integrity – Transparent, honest, and value-driven connections</li>
            <li>Inclusivity – Everyone deserves access to guidance</li>
            <li>Curiosity – We never stop learning, and neither should you</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">💬 Join the Movement</h2>
          <p className="text-gray-700">
            Whether you're here to learn or to lead, there's a place for you at MentorConnect.
          </p>
          <p className="text-gray-700 mt-2">
            Ready to grow? Ready to guide? We’re just getting started.
          </p>
          <div className="mt-4 flex justify-center space-x-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transform transition-transform duration-300"
              onClick={() => navigate('/auth?role=mentee')}
            >
              Become a Mentee
            </button>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transform transition-transform duration-300"
              onClick={() => navigate('/auth?role=mentor')}
            >
              Join as a Mentor
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
