"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  GitFork,
  Users,
  Calendar,
  ExternalLink,
  TrendingUp,
  BookOpen,
  Code2,
  Tag,
  Activity,
  Heart,
  Eye,
} from "lucide-react";

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

interface RepoSheetProps {
  repository: Repository | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RepoSheet({ repository, isOpen, onClose }: RepoSheetProps) {
  if (!repository) return null;

  const handleVisitRepo = () => {
    window.open(repository.url, "_blank");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl flex-shrink-0">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl leading-tight pr-8">
                {repository.name}
              </SheetTitle>
              <SheetDescription className="text-base mt-2 leading-relaxed">
                {repository.description}
              </SheetDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 py-2">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4" />
              <span className="font-medium">
                {repository.stars.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <GitFork className="h-4 w-4" />
              <span className="font-medium">
                {repository.forks.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-medium">
                {repository.contributors.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">
                {formatDate(repository.lastUpdated)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 font-medium">
              {repository.relevanceScore}% Match
            </Badge>
            {repository.trending && (
              <Badge
                variant="outline"
                className="bg-orange-50 text-orange-700 border-orange-200"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending
              </Badge>
            )}
            <Badge variant="secondary" className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary/60 rounded-full"></div>
              <span>{repository.language}</span>
            </Badge>
          </div>
        </SheetHeader>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold text-foreground">
              Why This Repository?
            </h3>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-primary font-medium">
              {repository.reason}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Based on your coding patterns, skills, and project history
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Topics</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {repository.topics.map((topic) => (
              <Badge key={topic} variant="outline" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Repository Stats</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">
                {(repository.stars / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-muted-foreground">Stars</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">
                {(repository.forks / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-muted-foreground">Forks</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">
                {repository.contributors}
              </div>
              <div className="text-xs text-muted-foreground">Contributors</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">A+</div>
              <div className="text-xs text-muted-foreground">Health Score</div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">
              Contribution Opportunities
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-green-50/50 border border-green-200/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-900">
                  Good First Issues
                </p>
                <p className="text-xs text-green-700">
                  42 open issues perfect for beginners
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                New
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-200/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Documentation
                </p>
                <p className="text-xs text-blue-700">
                  Help improve project documentation
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                Help Wanted
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50/50 border border-purple-200/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-purple-900">
                  Feature Requests
                </p>
                <p className="text-xs text-purple-700">
                  18 features awaiting implementation
                </p>
              </div>
              <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                Enhancement
              </Badge>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-3 pt-2">
          <Button onClick={handleVisitRepo} className="w-full" size="lg">
            <ExternalLink className="h-4 w-4 mr-2" />
            Visit Repository
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" className="w-full">
              <Star className="h-4 w-4 mr-2" />
              Star
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Watch
            </Button>
          </div>

          <Button variant="secondary" size="sm" className="w-full">
            <Heart className="h-4 w-4 mr-2" />
            Save for Later
          </Button>
        </div>

        <div className="mt-6 p-3 bg-muted/20 rounded-lg border">
          <p className="text-xs text-muted-foreground text-center">
            💡 This recommendation was generated based on your coding patterns
            and interests
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
