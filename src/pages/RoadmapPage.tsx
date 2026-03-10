import React, { useMemo, useState } from 'react';
import { GeminiService } from '@/services/gemini';
import ReactMarkdown from 'react-markdown';
import { useNotification } from '@/contexts/NotificationContext';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Input, Textarea, Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { FadeIn } from '@/components/ui/animations';
import { Trophy, Flag, Star, MapPin } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'map' | 'text'>('map');
  const { showNotification } = useNotification();

  const roadmapSteps = useMemo(() => {
    if (!roadmap) return [];

    const lines = roadmap.split('\n');

    // Match headings like "Week 1 - title" or "## Week 2 - title"
    const weekRegex = /^(#+\s*)?week\s*(\d+)\s*[-:]\s*(.*)$/i;
    const steps: { id: number; title: string; detail: string; index: number }[] = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const match = line.trim().match(weekRegex);

      if (!match) {
        i += 1;
        continue;
      }

      const weekNumber = parseInt(match[2], 10);
      let titleFromHeading = (match[3] || '').trim();

      // Collect all lines until the next "Week N" heading
      const detailLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        if (lines[j].trim().match(weekRegex)) break;
        detailLines.push(lines[j]);
        j += 1;
      }

      // Derive title
      let title = titleFromHeading;
      if (!title) {
        const firstContentLine = detailLines.find(l => l.trim().length > 0) || '';
        title = firstContentLine.replace(/^(\*|-|\d+\.)\s+/, '').trim();
      }
      if (!title) {
        title = `Week ${isNaN(weekNumber) ? steps.length + 1 : weekNumber}`;
      }

      // Clean overly long titles
      const maxTitleLength = 70;
      if (title.length > maxTitleLength) {
        title = `${title.slice(0, maxTitleLength).trimEnd()}…`;
      }

      const detail = detailLines.join('\n').trim();

      // Skip weeks that have no meaningful detail
      const plainDetail = detail
        .replace(/[#*_`>-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!plainDetail || plainDetail.length < 10) {
        i = j;
        continue;
      }

      steps.push({
        id: steps.length,
        title,
        detail,
        index: !isNaN(weekNumber) ? weekNumber : steps.length + 1,
      });

      i = j;
    }

    // Remove meta / assessment-only weeks from visual map
    const assessmentKeywords = [
      'assessment of current skills',
      'areas for improvement',
      'strengths:',
      'weaknesses:',
      'overall assessment',
      'skill gaps',
    ];

    const cleanedSteps = steps.filter((step) => {
      const text = `${step.title}\n${step.detail}`.toLowerCase();
      const isAssessment = assessmentKeywords.some((k) => text.includes(k));
      return !isAssessment;
    });

    // Fallback: if no explicit "Week N" sections or all filtered out, do not break existing behavior
    if (cleanedSteps.length === 0) {
      const chunks: string[] = [];
      let current = '';

      for (const line of lines) {
        if (!line.trim()) {
          if (current.trim()) {
            chunks.push(current.trim());
            current = '';
          }
        } else {
          current += (current ? ' ' : '') + line.trim();
        }
      }
      if (current.trim()) {
        chunks.push(current.trim());
      }

      return chunks.map((raw, index) => ({
        id: index,
        title: raw,
        detail: raw,
        index: index + 1,
      }));
    }

    // Sort by week index to ensure proper order if model skips numbers
    return cleanedSteps.sort((a, b) => a.index - b.index);
  }, [roadmap]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 md:items-start gap-6 md:gap-10">
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
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400/80 to-orange-400/80 p-2 shadow-sm">
                        <Trophy className="w-6 h-6 text-white" />
                      </span>
                      <div className="flex flex-col">
                        <span>Your Personalized Roadmap</span>
                        <span className="text-xs text-gray-500 font-normal">
                          Follow the weeks to reach your goal.
                        </span>
                      </div>
                    </div>
                  </div>
                </CardTitle>
                <CardContent className="rounded-2xl bg-gradient-to-br from-slate-950/[0.02] via-background to-primary/5 transition-shadow shadow-xs pb-4 md:pb-6 mt-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : roadmap ? (
                    <FadeIn delay={0.2}>
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <div className="inline-flex items-center gap-1 rounded-full bg-white/70 backdrop-blur px-1 py-1 shadow-sm border border-slate-100">
                            <button
                              type="button"
                              onClick={() => setViewMode('map')}
                              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition ${
                                viewMode === 'map'
                                  ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-100/70'
                              }`}
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              Visual Map
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewMode('text')}
                              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition ${
                                viewMode === 'text'
                                  ? 'bg-slate-900 text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-100/70'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Text View
                            </button>
                          </div>
                        </div>

                        {viewMode === 'map' && (
                          <div className="relative min-h-[420px] rounded-3xl overflow-hidden bg-gradient-to-b from-background via-muted to-primary/5 border border-border shadow-inner">
                            {/* Decorative clouds / shapes */}
                            <div className="pointer-events-none absolute -top-10 -left-20 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
                            <div className="pointer-events-none absolute top-10 -right-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
                            <div className="pointer-events-none absolute bottom-0 left-[-10%] h-40 w-60 rounded-[100%] bg-muted/60 blur-2xl" />
                            <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-40 w-60 rounded-[100%] bg-primary/20 blur-3xl" />

                            {/* Path spine */}
                            <div className="absolute inset-y-6 left-1/2 -translate-x-1/2 w-1.5 rounded-full bg-gradient-to-b from-primary/40 via-primary/70 to-primary shadow-[0_0_0_3px_rgba(255,255,255,0.7)]" />

                            {/* Start marker */}
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                              <div className="flex items-center justify-center rounded-full bg-background shadow-md h-9 w-9 border border-border">
                                <Star className="w-5 h-5 text-primary" />
                              </div>
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground bg-background/90 px-2 py-0.5 rounded-full shadow-sm border border-border/60">
                                Start
                              </span>
                            </div>

                            {/* Goal marker */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 translate-y-1/2 flex flex-col items-center gap-1">
                              <div className="flex items-center justify-center rounded-full bg-primary shadow-md h-10 w-10 border border-primary/70">
                                <Flag className="w-5 h-5 text-white" />
                              </div>
                              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground bg-background/95 px-2.5 py-0.5 rounded-full shadow-sm border border-border/70">
                                Final Goal
                              </span>
                            </div>

                            {/* Level nodes */}
                            <div className="relative h-full w-full flex flex-col gap-6 justify-center py-8">
                              {roadmapSteps.map((step, idx) => {
                                const isLeft = idx % 2 === 0;

                                return (
                                  <div key={step.id}>
                                    <div
                                      className={`flex items-center px-6 md:px-10 ${
                                        isLeft ? 'justify-start' : 'justify-end'
                                      }`}
                                    >
                                      <div
                                        className={`relative group max-w-xs md:max-w-sm ${
                                          isLeft ? 'md:mr-10' : 'md:ml-10'
                                        }`}
                                      >
                                        <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-primary/10 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
                                        <div className="relative flex items-center gap-3 rounded-3xl bg-background/95 backdrop-blur-sm px-3 py-2.5 md:px-4 md:py-3 shadow-[0_12px_40px_rgba(15,23,42,0.18)] border border-border">
                                          <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground h-8 w-8 text-sm font-semibold shadow-sm border border-primary/80">
                                              {step.index}
                                            </div>
                                            <div className="flex items-center justify-center rounded-full bg-muted text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-2 py-0.5 shadow-inner border border-border/70">
                                              Week
                                            </div>
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                                              Week {step.index}
                                            </p>
                                            <p className="text-sm md:text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">
                                              {step.title}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Hover detail tooltip */}
                                        <div className="pointer-events-none absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition duration-200 ease-out">
                                          <div className="relative max-w-xs md:max-w-sm">
                                            <div className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-slate-900/95 border-l border-t border-slate-700/80" />
                                            <div className="relative rounded-2xl bg-slate-900/95 text-slate-50 px-3 py-2.5 shadow-xl border border-slate-700/80">
                                              <p className="text-[11px] font-semibold mb-1">
                                                Week {step.index} details
                                              </p>
                                              <p className="text-[11px] leading-snug line-clamp-4 text-slate-100/90">
                                                {step.detail}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {viewMode === 'text' && (
                          <div className="prose max-w-none mx-auto text-gray-800 bg-white/80 rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
                            <ReactMarkdown>{roadmap}</ReactMarkdown>
                          </div>
                        )}
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