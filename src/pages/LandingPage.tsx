import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Compass, Users, Calendar, MessageSquare, Star, ArrowRight } from 'lucide-react';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Mentor {
  id: string;
  name: string;
  photoURL: string;
  domain: string;
  expertise: string;
  highestFrequencyRating: string;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mentors, setMentors] = useState<Mentor[]>([]);

  

  useEffect(() => {
    const fetchTopMentors = async () => {
      try {
        const mentorsRef = collection(db, "users");
        const q = query(mentorsRef, where("role", "==", "mentor"));
        const snapshot = await getDocs(q);

        const fetchedMentors = snapshot.docs.map((doc) => {
          const data = doc.data();
          const ratings = data.ratings || [];

          const ratingFrequency = ratings.reduce((acc: Record<number, number>, rating: number) => {
            acc[rating] = (acc[rating] || 0) + 1;
            return acc;
          }, {});

          const highestFrequencyRating = Object.keys(ratingFrequency).reduce((a, b) => {
            return ratingFrequency[Number(a)] > ratingFrequency[Number(b)] ? a : b;
          }, "1");

          return {
            id: doc.id,
            name: data.name,
            photoURL: data.photoURL,
            domain: data.domain,
            expertise: data.expertise,
            highestFrequencyRating,
          };
        });

        setMentors(fetchedMentors);
      } catch (error) {
        console.error("Error fetching mentors:", error);
      }
    };

    fetchTopMentors();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background">

      {/* Navbar */}
      <nav className="container mx-auto px-6 py-5 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Compass className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold">CareerMentix</span>
        </div>
        <div className="hidden md:flex space-x-6 font-medium">
          <Button variant="ghost" onClick={() => navigate('/about')}>About</Button>
          <Button variant="ghost">Features</Button>
          <Button variant="ghost">Testimonials</Button>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-60 blur-3xl bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-400 rounded-full w-[40rem] h-[40rem] top-[-10rem] left-[-10rem]"></div>
        <div className="absolute inset-0 -z-10 opacity-60 blur-3xl bg-gradient-to-r from-primary/40 via-indigo-400 to-blue-400 rounded-full w-[35rem] h-[35rem] bottom-[-10rem] right-[-10rem]"></div>

        <section className="container mx-auto px-6 py-32 text-center">
          <h1 className="text-6xl md:text-7xl font-extrabold leading-tight text-foreground mb-6">
            Empower Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-500">Learning Journey</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto mb-12">
            Discover mentors who truly understand your ambitions and guide you with real-world expertise.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="px-10 py-6 text-lg" onClick={() => navigate('/auth')}>
              Start Learning <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="px-10 py-6 text-lg" onClick={() => navigate('/about')}>
              How It Works
            </Button>
          </div>
        </section>
      </section>

      {/* Features */}
<section className="container mx-auto px-6 py-24">
  <div className="grid md:grid-cols-3 gap-10">
    {[ 
      {
        icon: <Users className="h-12 w-12 text-primary mx-auto mb-4" />,
        title: "Community of Experts",
        desc: "Learn from experienced industry mentors ready to guide you."
      },
      {
        icon: <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />,
        title: "Flexible Scheduling",
        desc: "Schedule sessions that work with your time and pace."
      },
      {
        icon: <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />,
        title: "1:1 Personalized Guidance",
        desc: "Real-time discussions, feedback, and growth tracking."
      }
    ].map((feature, idx) => (
      <div
        key={idx}
        className="backdrop-blur-xl bg-white/40 border border-white/30 rounded-2xl shadow-md p-10 text-center transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:bg-white/60"
      >
        {feature.icon}
        <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
        <p className="text-foreground/60">{feature.desc}</p>
      </div>
    ))}
  </div>
</section>

     {/* Top Mentors */}
<section className="container mx-auto px-6 py-6 -mt-8">
  <h2 className="text-3xl font-bold mb-6">Top Mentors</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {mentors.map((mentor) => (
      <div key={mentor.id} className="p-6 bg-white rounded-xl shadow flex space-x-4 items-center hover:shadow-lg hover:-translate-y-1 transition">
        <Avatar className="h-16 w-16">
          <AvatarImage src={mentor.photoURL} alt={mentor.name || ""} />
          <AvatarFallback>{mentor.name ? mentor.name[0] : "M"}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-bold">{mentor.name}</h3>
          <p className="text-sm text-foreground/60">{mentor.expertise}</p>
          <p className="text-xs text-foreground/40">Domain: {mentor.domain}</p>
          <p className="flex items-center text-sm text-yellow-500 mt-1">
            <Star className="h-4 w-4 mr-1" /> {mentor.highestFrequencyRating}
          </p>
        </div>
      </div>
    ))}
  </div>
</section>

{/*CTA */}
    <section className="w-full flex justify-center mt-20">
  <div className="w-[90%] md:w-[85%] max-w-6xl rounded-2xl p-10 md:p-14 
      bg-gradient-to-r from-[#ecebff] to-[#f5e8ff] text-center shadow-sm border border-[#e5e7eb]">
      
    <h2 className="text-2xl md:text-3xl font-bold mb-4">
      Begin Your Journey <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5A5BF3] to-[#C768F6]">Today</span> ✨
    </h2>

    <p className="text-gray-600 mb-8 md:w-3/4 mx-auto">
      Connect with mentors who truly understand your learning goals and guide your future.
    </p>

    <button className="px-6 py-3 bg-gradient-to-r from-[#5A5BF3] to-[#C768F6] text-white rounded-lg hover:opacity-90 transition">
      Find Your Mentor →
    </button>

  </div>
</section>





    </div>
  );
};
