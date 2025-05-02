import React, { useEffect, useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Compass, Users, Calendar, MessageSquare } from 'lucide-react';
import { collection, getDocs } from "firebase/firestore";
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
        const snapshot = await getDocs(mentorsRef);

        const fetchedMentors = snapshot.docs.map((doc) => {
          const data = doc.data();
          const ratings = data.ratings || [];

          // Calculate the frequency of each rating (1-5)
          const ratingFrequency = ratings.reduce((acc: Record<number, number>, rating: number) => {
            acc[rating] = (acc[rating] || 0) + 1;
            return acc;
          }, {});

          // Find the rating with the highest frequency
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
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">MentorConnect</span>
          </div>
          <div className="hidden md:flex space-x-4">
            <Button variant="ghost" onClick={() => navigate('/about')}>About</Button>
            <Button variant="ghost">Features</Button>
            <Button variant="ghost">Testimonials</Button>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
          Connect, Learn, Grow
        </h1>
        <p className="text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">
          Find your perfect mentor and accelerate your career growth with personalized guidance from industry experts.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button size="lg" className="text-lg" onClick={() => navigate('/auth')}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" className="text-lg" onClick={() => navigate('/auth')}>
            Learn More
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-background p-6 rounded-lg shadow-lg">
            <Users className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Expert Mentors</h3>
            <p className="text-foreground/70">Connect with industry professionals who can guide your career journey.</p>
          </div>
          <div className="bg-background p-6 rounded-lg shadow-lg">
            <Calendar className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Flexible Scheduling</h3>
            <p className="text-foreground/70">Book sessions that fit your schedule with our easy-to-use calendar.</p>
          </div>
          <div className="bg-background p-6 rounded-lg shadow-lg">
            <MessageSquare className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Chat</h3>
            <p className="text-foreground/70">Stay connected with your mentor through our integrated chat system.</p>
          </div>
        </div>
      </section>

      {/* Top Mentors Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-4">Top Mentors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="p-4 bg-white rounded-lg shadow-md">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={mentor.photoURL} alt={mentor.name} />
                  <AvatarFallback>{mentor.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{mentor.name}</h3>
                  <p className="text-sm text-gray-500">{mentor.expertise}</p>
                  <p className="text-sm text-gray-400">Domain: {mentor.domain}</p>
                  <p className="text-sm text-yellow-500">
                    Most Frequent Rating: {mentor.highestFrequencyRating}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="bg-primary rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-primary-foreground/90 mb-8 max-w-xl mx-auto">
            Join thousands of professionals who have accelerated their careers through mentorship.
          </p>
          <Button 
            size="lg" 
            variant="outline" 
            className="bg-white hover:bg-white/90"
            onClick={() => navigate('/auth')}
          >
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  );
};