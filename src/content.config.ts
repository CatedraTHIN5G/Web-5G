import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';



const team = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/team" }),
  schema: z.object({
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
      'Alumni',
      'Professor / Associate Professor',
      'Professor / Ramón y Cajal Researcher',
      'Researcher',
      'Director'
    ]),
    title: z.array(z.string()).optional(), // For specific academic titles like "Academician", "Changjiang Scholar"
    avatar: z.string(),
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



const events = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/events" }),
  schema: z.object({
    title: z.string(),
    title_es: z.string().optional(),
    title_en: z.string().optional(),
    date: z.date(),
    cover: z.string().optional(),
    description: z.string().optional(),
    description_es: z.string().optional(),
    description_en: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    title_es: z.string().optional(),
    summary: z.string(),
    summary_es: z.string().optional(),
    tags: z.array(z.string()).optional(),
    tags_es: z.array(z.string()).optional(),
    team: z.array(z.string()).optional(),
    cover: z.string().optional(),
    docUrl: z.string().optional(),
    codeUrl: z.string().optional(),
    date: z.date(),
  }),
});

export const collections = {
  team,
  events,
  projects,
};
