
import { OrgConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const agileInnovatorsDemo: OrgConfig = {
  name: "Agile Innovators",
  llmConfig: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-preview-04-17',
  },
  environments: [
    {
      id: "git_repository",
      initialState: {
        files: [],
        pull_requests: []
      },
      tools: [
        'plan_feature',
        'list_files',
        'read_file_content',
        'write_code',
        'create_pull_request',
        'run_tests',
        'merge_pr',
        'start_conversation'
      ],
      permissions: {
        'merge_pr': ['Project Manager'] 
      }
    }
  ],
  masterAgent: {
    id: uuidv4(),
    name: "Project Manager",
    role: { name: "Project Manager", description: "Plans features, manages the project board, and merges completed work." },
    permissions: { canDelegate: true, canAssignRole: false, canHire: false, canCallMeeting: true },
    environmentId: "git_repository",
    subordinates: [
      {
        id: uuidv4(),
        name: "Software Engineer",
        role: { name: "Software Engineer", description: "Writes and implements code based on feature plans." },
        permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
        environmentId: "git_repository",
      },
      {
        id: uuidv4(),
        name: "QA Engineer",
        role: { name: "QA Engineer", description: "Tests new code to ensure quality and find bugs." },
        permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
        environmentId: "git_repository",
      }
    ]
  },
  sopLibrary: [
    {
      id: "software_development_sop",
      name: "Feature Development Workflow",
      goal_type: "feature",
      description: "Standard procedure for developing, testing, and releasing a new software feature.",
      roles_involved: ["Project Manager", "Software Engineer", "QA Engineer"],
      steps: [
        {
          task_id: "plan_feature_work",
          description: "Based on the high-level request, create a detailed technical specification for the new feature.",
          assignee_role: "Project Manager",
          dependencies: []
        },
        {
          task_id: "implement_feature_code",
          description: "Write the source code for the feature according to the technical specification.",
          assignee_role: "Software Engineer",
          dependencies: ["plan_feature_work"]
        },
        {
          task_id: "test_feature",
          description: "Rigorously test the newly implemented code, checking for bugs and ensuring it meets the specification.",
          assignee_role: "QA Engineer",
          dependencies: ["implement_feature_code"]
        },
        {
          task_id: "review_and_merge",
          description: "Review the code and test results, and if everything is approved, merge the feature into the main codebase.",
          assignee_role: "Project Manager",
          dependencies: ["test_feature"]
        }
      ]
    }
  ]
};
