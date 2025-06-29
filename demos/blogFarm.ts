
import { OrgConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const blogFarmDemo: OrgConfig = {
  name: "The Blog Farm",
  llmConfig: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-preview-04-17',
  },
  environments: [
    {
      id: "cms",
      initialState: {
        articles: [],
      },
      tools: [
        'list_articles',
        'get_article_content',
        'write_article',
        'edit_article',
        'publish_article',
        'delete_article',
        'web_search'
      ],
      permissions: {
        'publish_article': ['Chief Editor'],
        'delete_article': ['Chief Editor']
      }
    }
  ],
  masterAgent: {
    id: uuidv4(),
    name: "Chief Editor",
    role: { name: "Chief Editor", description: "Assigns article topics, reviews drafts, and publishes final content." },
    permissions: { canDelegate: true, canAssignRole: false, canHire: false, canCallMeeting: false },
    environmentId: "cms",
    subordinates: [
      {
        id: uuidv4(),
        name: "Staff Writer",
        role: { name: "Staff Writer", description: "Researches and writes articles based on assigned topics." },
        permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: false },
        environmentId: "cms",
      }
    ]
  },
  // No complex SOPs, the workflow is implicit in the roles.
  sopLibrary: [] 
};
