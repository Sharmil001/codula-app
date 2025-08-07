import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const POPULAR_SKILLS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "React",
  "Vue.js",
  "Angular",
  "Node.js",
  "Next.js",
  "Express",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Git",
  "Linux",
  "Machine Learning",
  "Data Science",
  "DevOps",
] as const;

export const SKILL_CATEGORIES = {
  programming_languages: [
    "javascript",
    "typescript",
    "python",
    "java",
    "c++",
    "c#",
    "go",
    "rust",
    "php",
    "ruby",
    "swift",
    "kotlin",
  ],
  frameworks: [
    "react",
    "vue.js",
    "angular",
    "node.js",
    "next.js",
    "express",
    "django",
    "flask",
    "spring",
    "laravel",
  ],
  databases: [
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "sqlite",
    "elasticsearch",
    "cassandra",
  ],
  cloud_platforms: [
    "aws",
    "azure",
    "gcp",
    "heroku",
    "vercel",
    "netlify",
    "digitalocean",
  ],
} as const;
