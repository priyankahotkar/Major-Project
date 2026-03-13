import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

export function Header() {
  const { user, logout, userName } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getLinkClass = (path: string) => {
    const baseClass = "transition-colors";
    if (isActive(path)) {
      return `${baseClass} text-blue-600 font-semibold text-lg`;
    }
    return `${baseClass} text-gray-600 hover:text-blue-600`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-blue-600" aria-label="MentorConnect Logo" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              CareerMentix
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={getLinkClass("/dashboard")}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/booking" 
                  className={getLinkClass("/booking")}
                >
                  Book Session
                </Link>
                <Link 
                  to="/chat" 
                  className={getLinkClass("/chat")}
                >
                  Messages
                </Link>
                <Link 
                  to="/discussion-forum" 
                  className={getLinkClass("/discussion-forum")}
                >
                  Forum
                </Link>
                <Link 
                  to="/roadmap" 
                  className={getLinkClass("/roadmap")}
                >
                  Roadmap
                </Link>
                <Link 
                  to="/ai-interview" 
                  className={getLinkClass("/ai-interview")}
                >
                  AI Interview
                </Link>

                <Link 
                  to="/notes" 
                  className={getLinkClass("/notes")}
                >
                  Notes
                </Link>
    
                <Link to="/profile" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full border-2 border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{getInitials(userName || user.displayName || user.email)}</span>
                    </div>
                  )}
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link to="/register">
                  <Button>Get Started</Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}