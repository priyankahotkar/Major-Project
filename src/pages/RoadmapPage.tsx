import React, { useState } from 'react';
import { GeminiService } from '@/services/gemini';
import ReactMarkdown from 'react-markdown';
import { useNotification } from '@/contexts/NotificationContext';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Input, Textarea, Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { FadeIn } from '@/components/ui/animations';
import { Trophy } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';

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
    <Layout>
      <Container>
        <FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 md:items-start gap-10">
            <Card className="flex flex-col justify-start">
              <CardTitle>Generate Your Learning Roadmap</CardTitle>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <Input
                    label="GitHub Username"
                    name="githubUsername"
                    value={formData.githubUsername}
                    onChange={handleInputChange}
                    placeholder="e.g. priyanka-dev"
                    required
                  />
                  <Input
                    label="LeetCode Username"
                    name="leetcodeUsername"
                    value={formData.leetcodeUsername}
                    onChange={handleInputChange}
                    placeholder="e.g. codechamp123"
                    required
                  />
                  <Input
                    label="Codeforces Username"
                    name="codeforcesUsername"
                    value={formData.codeforcesUsername}
                    onChange={handleInputChange}
                    placeholder="e.g. coderforcepro"
                    required
                  />
                  <Textarea
                    label="Your Learning Goal"
                    name="goal"
                    value={formData.goal}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="e.g., Master full-stack development, Prepare for FAANG interviews..."
                    required
                  />
                  <Select
                    label="Target Duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    options={[
                      { value: '', label: 'Select duration' },
                      { value: '1 month', label: '1 month' },
                      { value: '3 months', label: '3 months' },
                      { value: '6 months', label: '6 months' },
                      { value: '1 year', label: '1 year' },
                    ]}
                    required
                  />
                  <Button type="submit" disabled={isLoading} className="w-full text-white">
                    {isLoading ? 'Generating...' : 'Generate Roadmap'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <FadeIn delay={0.11}>
              <Card className="flex flex-col justify-start">
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400/80 to-orange-400/80 p-2 shadow-sm">
                      <Trophy className="w-6 h-6 text-white" />
                    </span>
                    <span>Your Personalized Roadmap</span>
                  </div>
                  <span className="block text-sm text-gray-500 font-normal ml-10 mt-1">Tailored steps to reach your goal 🚀</span>
                </CardTitle>
                <CardContent className="max-h-[70vh] overflow-y-auto rounded-xl bg-gradient-to-br from-blue-50 via-white to-orange-50 transition-shadow shadow-xs pb-3 md:pb-4 mt-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : roadmap ? (
                    <FadeIn delay={0.2}>
                      <div className="prose max-w-none mx-auto text-gray-800">
                        <div className="flex items-center mb-4">
                          <Trophy className="w-7 h-7 text-yellow-400 mr-2 animate-bounce" />
                          <span className="text-lg font-semibold text-orange-600">Congratulations! Here is your plan:</span>
                        </div>
                        <ReactMarkdown>{roadmap}</ReactMarkdown>
                      </div>
                    </FadeIn>
                  ) : (
                    <div className="flex flex-col items-center py-10">
                      <span className="text-[40px] mb-2">📈</span>
                      <p className="text-gray-500 text-center text-base font-medium max-w-xs">Fill out the form to generate a visually-rich, step-by-step roadmap tailored just for you!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </FadeIn>
      </Container>
    </Layout>
  );
}