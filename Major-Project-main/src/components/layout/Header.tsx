import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { GraduationCap } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-blue-600" aria-label="MentorConnect Logo" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              BeaconBond
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/booking" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Book Session
                </Link>
                <Link 
                  to="/chat" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Messages
                </Link>
                <Link 
                  to="/discussion-forum" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Forum
                </Link>
                <Link 
                  to="/roadmap" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Roadmap
                </Link>
                <Link 
                  to="/leaderboard" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Leaderboard
                </Link>
                <Link 
                  to="/progress" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Progress
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2">
                    <img 
                      src={user.photoURL || '/default-avatar.png'} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full border-2 border-gray-200"
                    />
                    <span className="text-gray-700">{user.displayName}</span>
                  </button>
                  <div className="absolute right-0 w-48 mt-2 py-2 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link 
                      to="/profile" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </Link>
                    <button 
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
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