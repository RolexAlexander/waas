import { AgentConfig } from "../../types";

// Agent templates for the builder library
export const AGENT_LIBRARY: Omit<AgentConfig, 'id' | 'subordinates'>[] = [
  {
    name: "Author",
    role: { name: "Author", description: "Writes story content based on outlines and instructions." },
    permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
    environmentId: "bookshelf",
    memory: [],
  },
   {
    name: "Illustrator",
    role: { name: "Illustrator", description: "Creates illustrations based on story content." },
    permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: false },
    environmentId: "bookshelf",
    memory: [],
  },
  {
    name: "Researcher",
    role: { name: "Researcher", description: "Gathers and analyzes information for projects."},
    permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: false },
    environmentId: "bookshelf",
    memory: [],
  },
  {
    name: "Software Engineer",
    role: { name: "Software Engineer", description: "Writes and implements code based on feature plans." },
    permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
    environmentId: "git_repository",
  },
  {
    name: "QA Engineer",
    role: { name: "QA Engineer", description: "Tests new code to ensure quality and find bugs." },
    permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
    environmentId: "git_repository",
  },
  {
    name: "Copywriter",
    role: { name: "Copywriter", description: "Writes compelling text for advertisements." },
    permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
    environmentId: "campaign_brief",
  },
  {
    name: "Graphic Designer",
    role: { name: "Graphic Designer", description: "Creates visual elements, logos, and layouts for ads." },
    permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
    environmentId: "campaign_brief",
  },
];
