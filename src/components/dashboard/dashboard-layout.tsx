"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  TrendingUp,
  Code2,
  BookOpen,
  Star,
  ChevronRight,
  Target,
  Zap,
  User,
  Container,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RepoSheet } from "@/components/dashboard/repo-sheet";
import Image from "next/image";

interface UserData {
  name: string;
  email: string;
  avatar_url?: string;
}

interface UserStats {
  totalRepos: number;
  skills: string[];
  githubProfile: string;
}

interface Repository {
  id: number;
  name: string;
  description: string;
  stars: number;
  language: string;
  relevanceScore: number;
  reason: string;
  trending: boolean;
  url: string;
  forks: number;
  topics: string[];
  lastUpdated: string;
  contributors: number;
}

interface DashboardLayoutProps {
  userData: UserData | null;
  userStats: UserStats | null;
}

// Mock data for recommended repositories (this would come from your AI engine)
const mockRecommendations: Repository[] = [
  {
    id: 1,
    name: "tensorflow/tensorflow",
    description: "An Open Source Machine Learning Framework for Everyone",
    stars: 185000,
    language: "Python",
    relevanceScore: 92,
    reason: "Matches your Python and ML skills",
    trending: true,
    url: "https://github.com/tensorflow/tensorflow",
    forks: 88000,
    topics: ["machine-learning", "deep-learning", "python", "tensorflow"],
    lastUpdated: "2024-01-15",
    contributors: 3500,
  },
  {
    id: 2,
    name: "microsoft/vscode",
    description: "Visual Studio Code - Open Source ('Code - OSS')",
    stars: 163000,
    language: "TypeScript",
    relevanceScore: 88,
    reason: "Based on your TypeScript experience",
    trending: false,
    url: "https://github.com/microsoft/vscode",
    forks: 28000,
    topics: ["editor", "typescript", "electron", "ide"],
    lastUpdated: "2024-01-14",
    contributors: 1800,
  },
  {
    id: 3,
    name: "vercel/next.js",
    description: "The React Framework for the Web",
    stars: 125000,
    language: "JavaScript",
    relevanceScore: 85,
    reason: "Aligns with your React projects",
    trending: true,
    url: "https://github.com/vercel/next.js",
    forks: 26000,
    topics: ["react", "nextjs", "javascript", "framework"],
    lastUpdated: "2024-01-16",
    contributors: 2200,
  },
];

export function DashboardLayout({ userData, userStats }: DashboardLayoutProps) {
  const router = useRouter();
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleRepoClick = (repo: Repository) => {
    setSelectedRepo(repo);
    setIsSheetOpen(true);
  };

  const handleViewAll = () => {
    router.push("/recommended");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-xl">
                <Code2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Codula</h1>
            </div>
            <div className="flex items-center space-x-4">
              {userData?.avatar_url ? (
                <Image
                  src={userData.avatar_url}
                  width={32}
                  height={32}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Setup Complete
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-4xl">👋</div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Welcome back, {userData?.name}!
              </h1>
              <p className="text-xl text-muted-foreground mt-1">
                Ready to discover amazing open source projects?
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Connected Repos
                </CardTitle>
                <Container className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {userStats?.totalRepos || 3}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">+2</span> from last sync
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Skills Tracked
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {userStats?.skills?.length || 12}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across multiple categories
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  AI Recommendations
                </CardTitle>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">24</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-primary">+8</span> new this week
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Match Score
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">94%</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">+5%</span> improved
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-primary to-primary/80 rounded-xl">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        AI-Powered Recommendations
                      </CardTitle>
                      <CardDescription>
                        Discover open source projects that match your skills and
                        interests
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      <Zap className="h-3 w-3 mr-1" />
                      Powered by AI
                    </Badge>
                    <Button
                      onClick={handleViewAll}
                      size="sm"
                      className="cursor-pointer"
                    >
                      View All
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockRecommendations.slice(0, 3).map((repo) => (
                  <div
                    key={repo.id}
                    className="flex items-start justify-between p-3 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => handleRepoClick(repo)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-foreground">
                            {repo.name}
                          </h3>
                        </div>
                        {repo.trending && (
                          <Badge
                            variant="outline"
                            className="bg-orange-50 text-orange-700 border-orange-200"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Trending
                          </Badge>
                        )}
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          {repo.relevanceScore}% match
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {repo.description}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-primary/60 rounded-full"></div>
                          <span>{repo.language}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3" />
                          <span>{(repo.stars / 1000).toFixed(0)}k</span>
                        </div>
                        <div className="text-primary font-medium">
                          {repo.reason}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors ml-4 flex-shrink-0" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Your Skills</CardTitle>
                <CardDescription>
                  Skills we&apos;re using for recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(
                    userStats?.skills?.slice(0, 6) || [
                      "JavaScript",
                      "Python",
                      "React",
                      "Node.js",
                      "TypeScript",
                      "AWS",
                    ]
                  ).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {(userStats?.skills?.length || 6) > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{(userStats?.skills?.length || 12) - 6} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-green-200/50 bg-green-50/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                      <Container className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">
                        GitHub Connected
                      </p>
                      <p className="text-sm text-green-700">
                        All repositories synced
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200/50 bg-blue-50/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">
                        Profile Complete
                      </p>
                      <p className="text-sm text-blue-700">
                        Ready for recommendations
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <RepoSheet
        repository={selectedRepo}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
}
