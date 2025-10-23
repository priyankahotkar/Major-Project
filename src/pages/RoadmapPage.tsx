import React, { useState } from 'react';
import { GeminiService } from '@/services/gemini';
import ReactMarkdown from 'react-markdown';
import { useNotification } from '@/contexts/NotificationContext';

interface RoadmapForm {
  githubUsername: string;
  leetcodeUsername: string;
  codeforcesUsername: string;
  goal: string;
  duration: string;
}

export function RoadmapPage() {
  const [formData, setFormData] = useState<RoadmapForm>({
    githubUsername: '',
    leetcodeUsername: '',
    codeforcesUsername: '',
    goal: '',
    duration: ''
  });
  const [roadmap, setRoadmap] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const geminiService = new GeminiService();
      const generatedRoadmap = await geminiService.generateRoadmap(formData);
      setRoadmap(generatedRoadmap);
      showNotification({
        title: 'Success',
        message: 'Your personalized roadmap has been generated!'
      });
    } catch (error) {
      console.error('Error generating roadmap:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate roadmap. Please try again.';
      showNotification({
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Generate Your Learning Roadmap</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="githubUsername" className="block text-sm font-medium text-gray-700">
                GitHub Username
              </label>
              <input
                type="text"
                id="githubUsername"
                name="githubUsername"
                value={formData.githubUsername}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="leetcodeUsername" className="block text-sm font-medium text-gray-700">
                LeetCode Username
              </label>
              <input
                type="text"
                id="leetcodeUsername"
                name="leetcodeUsername"
                value={formData.leetcodeUsername}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="codeforcesUsername" className="block text-sm font-medium text-gray-700">
                Codeforces Username
              </label>
              <input
                type="text"
                id="codeforcesUsername"
                name="codeforcesUsername"
                value={formData.codeforcesUsername}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="goal" className="block text-sm font-medium text-gray-700">
                Your Learning Goal
              </label>
              <textarea
                id="goal"
                name="goal"
                value={formData.goal}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                placeholder="e.g., Master full-stack development, Prepare for FAANG interviews..."
                required
              />
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                Target Duration
              </label>
              <select
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                required
              >
                <option value="">Select duration</option>
                <option value="1 month">1 month</option>
                <option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
                <option value="1 year">1 year</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Generating...' : 'Generate Roadmap'}
            </button>
          </form>
        </div>

        {/* Roadmap Display Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Your Personalized Roadmap</h2>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : roadmap ? (
            <div className="prose max-w-none">
              <ReactMarkdown>{roadmap}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-500 text-center">
              Fill out the form to generate your personalized learning roadmap
            </p>
          )}
        </div>
      </div>
    </div>
  );
}