"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  BookOpen,
  Star,
  GitFork,
  Users,
  Calendar,
  Filter,
  Search,
  SlidersHorizontal,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RepoSheet } from "@/components/dashboard/repo-sheet";

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

const allRecommendations: Repository[] = [
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
  {
    id: 4,
    name: "nodejs/node",
    description:
      "Node.js JavaScript runtime built on Chrome's V8 JavaScript engine",
    stars: 105000,
    language: "JavaScript",
    relevanceScore: 82,
    reason: "Perfect for your backend development",
    trending: false,
    url: "https://github.com/nodejs/node",
    forks: 28500,
    topics: ["javascript", "nodejs", "runtime", "backend"],
    lastUpdated: "2024-01-13",
    contributors: 3100,
  },
  {
    id: 5,
    name: "pytorch/pytorch",
    description:
      "Tensors and Dynamic neural networks in Python with strong GPU acceleration",
    stars: 82000,
    language: "Python",
    relevanceScore: 89,
    reason: "Complements your ML toolkit",
    trending: true,
    url: "https://github.com/pytorch/pytorch",
    forks: 22000,
    topics: ["machine-learning", "pytorch", "deep-learning", "neural-networks"],
    lastUpdated: "2024-01-16",
    contributors: 4200,
  },
  {
    id: 6,
    name: "docker/docker-ce",
    description:
      "Docker CE (Community Edition) is the new name for the Docker open source project",
    stars: 45000,
    language: "Go",
    relevanceScore: 76,
    reason: "Essential for modern DevOps workflows",
    trending: false,
    url: "https://github.com/docker/docker-ce",
    forks: 12000,
    topics: ["docker", "containers", "devops", "go"],
    lastUpdated: "2024-01-12",
    contributors: 890,
  },
];

export default function RecommendedPage() {
  const router = useRouter();
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [filterBy, setFilterBy] = useState("all");

  const handleRepoClick = (repo: Repository) => {
    setSelectedRepo(repo);
    setIsSheetOpen(true);
  };

  const handleBack = () => {
    router.back();
  };

  const filteredRepos = allRecommendations
    .filter((repo) => {
      const matchesSearch =
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterBy === "all" ||
        (filterBy === "trending" && repo.trending) ||
        (filterBy === "language" &&
          repo.language.toLowerCase() === filterBy.toLowerCase());
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "relevance":
          return b.relevanceScore - a.relevanceScore;
        case "stars":
          return b.stars - a.stars;
        case "updated":
          return (
            new Date(b.lastUpdated).getTime() -
            new Date(a.lastUpdated).getTime()
          );
        default:
          return 0;
      }
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-primary to-primary/80 rounded-xl">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    AI Recommendations
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {filteredRepos.length} repositories curated for you
                  </p>
                </div>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Powered by AI
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="stars">Most Stars</SelectItem>
                  <SelectItem value="updated">Recently Updated</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-[120px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterBy === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterBy("all")}
            >
              All Repos
            </Button>
            <Button
              variant={filterBy === "trending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterBy("trending")}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Trending
            </Button>
            <Button
              variant={filterBy === "python" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterBy("python")}
            >
              Python
            </Button>
            <Button
              variant={filterBy === "javascript" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterBy("javascript")}
            >
              JavaScript
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredRepos.map((repo) => (
            <Card
              key={repo.id}
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-muted/30 transition-all duration-200 cursor-pointer group"
              onClick={() => handleRepoClick(repo)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {repo.name}
                        </h3>
                      </div>

                      <div className="flex items-center space-x-2">
                        {repo.trending && (
                          <Badge
                            variant="outline"
                            className="bg-orange-50 text-orange-700 border-orange-200"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Trending
                          </Badge>
                        )}
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-medium">
                          {repo.relevanceScore}% match
                        </Badge>
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {repo.description}
                    </p>

                    <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm text-primary font-medium">
                        {repo.reason}
                      </p>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-primary/60 rounded-full"></div>
                        <span>{repo.language}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4" />
                        <span>{(repo.stars / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <GitFork className="h-4 w-4" />
                        <span>{(repo.forks / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{repo.contributors.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Updated {formatDate(repo.lastUpdated)}</span>
                      </div>
                    </div>

                    {/* Topics */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {repo.topics.slice(0, 4).map((topic) => (
                        <Badge
                          key={topic}
                          variant="secondary"
                          className="text-xs"
                        >
                          {topic}
                        </Badge>
                      ))}
                      {repo.topics.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{repo.topics.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full border-2 border-primary/20">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">
                          {repo.relevanceScore}
                        </div>
                        <div className="text-xs text-primary/80">match</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRepos.length === 0 && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mx-auto mb-4">
              <Code2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No repositories found
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setFilterBy("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      <RepoSheet
        repository={selectedRepo}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
}
