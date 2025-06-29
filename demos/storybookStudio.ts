
import { OrgConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const storybookStudioDemo: OrgConfig = {
  name: "Storybook Studio",
  llmConfig: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-preview-04-17',
  },
  environments: [
    {
      id: "bookshelf",
      initialState: {
        books: []
      },
      tools: [
        'list_books',
        'get_book_details',
        'create_story_outline',
        'write_chapter',
        'create_illustrations',
        'publish_book',
        'delete_book',
        'web_search',
        'start_conversation'
      ],
      permissions: {
        'publish_book': ['Editor'],
        'delete_book': ['Editor']
      }
    }
  ],
  masterAgent: {
    id: uuidv4(),
    name: "Editor",
    role: { name: "Editor", description: "Manages the creative process, reviews content, and publishes the final work." },
    permissions: { canDelegate: true, canAssignRole: true, canHire: true, canCallMeeting: true },
    environmentId: "bookshelf",
    memory: [],
    subordinates: [
      {
        id: uuidv4(),
        name: "Author",
        role: { name: "Author", description: "Writes story content based on outlines and instructions." },
        permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
        environmentId: "bookshelf",
        memory: [],
      },
      {
        id: uuidv4(),
        name: "Illustrator",
        role: { name: "Illustrator", description: "Creates illustrations based on story content." },
        permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: false },
        environmentId: "bookshelf",
        memory: [],
      }
    ]
  },
  sopLibrary: [
    {
      id: "children_book_creation_sop",
      name: "Children's Book Creation Workflow",
      goal_type: "storybook",
      description: "Standard procedure for creating a new children's storybook from concept to draft. This SOP requires roles like 'Editor', 'Author', and 'Illustrator' to be present in the organization.",
      roles_involved: ["Editor", "Author", "Illustrator"],
      steps: [
        {
          task_id: "plan_book_concept",
          description: "Brainstorm and create a detailed story outline, including characters, plot points, and chapter breakdown for a children's book.",
          assignee_role: "Editor",
          dependencies: []
        },
        {
          task_id: "write_chapter_1",
          description: "Write the full text for the first chapter based on the approved story concept.",
          assignee_role: "Author",
          dependencies: ["plan_book_concept"]
        },
         {
          task_id: "write_chapter_2",
          description: "Write the full text for the second chapter based on the approved story concept.",
          assignee_role: "Author",
          dependencies: ["plan_book_concept"]
        },
        {
          task_id: "create_illustrations_for_story",
          description: "Create one illustration for each chapter of the story.",
          assignee_role: "Illustrator",
          dependencies: ["write_chapter_1", "write_chapter_2"]
        },
        {
          task_id: "review_and_publish_book",
          description: "Review all written chapters and illustrations for quality and cohesion, then publish the final book.",
          assignee_role: "Editor",
          dependencies: ["create_illustrations_for_story"]
        }
      ]
    }
  ]
};
