import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const publications = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/publications" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    title_es: z.string().optional(),
    authors: z.array(z.string()),
    year: z.number(),
    venue: z.string(),
    venue_es: z.string().optional(),
    type: z.enum(['paper', 'book', 'patent', 'software']).default('paper'),
    cover: image().optional(),
    doi: z.string().optional(),
    award: z.string().optional(),
    links: z.object({
      pdf: z.string().optional(),
      code: z.string().optional(),
      website: z.string().optional(),
      demo: z.string().optional(),
      slides: z.string().optional(),
      video: z.string().optional(),
    }).optional(),
    featured: z.boolean().default(false),
    badges: z.array(z.object({
      text: z.string(),
      type: z.enum(['gold', 'blue', 'red', 'green', 'default']).default('default')
    })).optional(),
  }),
});

const books = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/books" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    authors: z.array(z.string()),
    year: z.number(),
    venue: z.string(),
    cover: image().optional(),
    doi: z.string().optional(),
    award: z.string().optional(),
    links: z.object({
      pdf: z.string().optional(),
      code: z.string().optional(),
      website: z.string().optional(),
      demo: z.string().optional(),
      slides: z.string().optional(),
      video: z.string().optional(),
    }).optional(),
    // Removed featured as per user request
    badges: z.array(z.object({
      text: z.string(),
      type: z.enum(['gold', 'blue', 'red', 'green', 'default']).default('default')
    })).optional(),
  }),
});

const team = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/team" }),
  schema: ({ image }) => z.object({
    name: z.string(),
    role: z.enum([
      'Principal Investigator',
      'Professor',
      'Associate Professor',
      'Assistant Professor',
      'Postdoc',
      'Research Assistant',
      'PhD Student',
      'Master Student',
      'Undergraduate',
      'Student',
      'Alumni'
    ]),
    title: z.array(z.string()).optional(), // For specific academic titles like "Academician", "Changjiang Scholar"
    avatar: image(),
    bio: z.string().optional(), // Short bio for card
    email: z.string().optional(),
    website: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    twitter: z.string().optional(),
    googleScholar: z.string().optional(),
    weight: z.number().default(100),
    status: z.enum(['active', 'inactive', 'affiliate']).default('inactive'),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/news" }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string().optional(),
  }),
});

// Research collection removed

const patents = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/patents" }),
  schema: z.object({
    title: z.string(),
    inventors: z.array(z.string()),
    number: z.string(), // Patent Number
    date: z.date(),
    status: z.enum(['Granted', 'Pending', 'Filed']),
    link: z.string().optional(),
  }),
});

const softwares = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/softwares" }),
  schema: z.object({
    title: z.string(),
    developers: z.array(z.string()),
    number: z.string(), // Registration Number
    date: z.date(),
    description: z.string().optional(),
  }),
});

const honors = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/honors" }),
  schema: z.object({
    title: z.string(),
    award: z.string(), // e.g., "Gold Medal", "First Prize"
    date: z.date(),
    year: z.string(), // Display year on badge
    type: z.enum(['Challenge Cup', 'Internet+', 'Other']).default('Other'),
    level: z.enum(['Special', 'First', 'Second', 'Third']).default('Third'),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/events" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    title_es: z.string().optional(),
    title_en: z.string().optional(),
    date: z.date(),
    cover: image().optional(),
    description: z.string().optional(),
    description_es: z.string().optional(),
    description_en: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    title_es: z.string().optional(),
    summary: z.string(),
    summary_es: z.string().optional(),
    tags: z.array(z.string()).optional(),
    tags_es: z.array(z.string()).optional(),
    team: z.array(z.string()).optional(),
    cover: image().optional(),
    docUrl: z.string().optional(),
    codeUrl: z.string().optional(),
    date: z.date(),
  }),
});

export const collections = {
  publications,
  books,
  team,
  news,
  patents,
  softwares,
  honors,
  events,
  projects,
};
