
import { OrgConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const marketInsightsDemo: OrgConfig = {
  name: "Market Insights Inc.",
  llmConfig: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-preview-04-17',
  },
  environments: [
    {
      id: "research_database",
      initialState: {
        reports: [],
        competitor_analysis: {}
      },
      tools: [
        'web_search',
        'create_report',
        'list_reports',
        'get_report_details',
        'update_report_section',
        'analyze_data', 
        'summarize_findings',
        'human_input_research' // The key tool for this demo
      ],
      permissions: {}
    }
  ],
  masterAgent: {
    id: uuidv4(),
    name: "Research Lead",
    role: { name: "Research Lead", description: "Defines research objectives and synthesizes findings into final reports." },
    permissions: { canDelegate: true, canAssignRole: false, canHire: false, canCallMeeting: true },
    environmentId: "research_database",
    subordinates: [
      {
        id: uuidv4(),
        name: "Data Analyst",
        role: { name: "Data Analyst", description: "Gathers and processes data, looking for trends and key insights." },
        permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
        environmentId: "research_database",
      },
       {
        id: uuidv4(),
        name: "Junior Researcher",
        role: { name: "Junior Researcher", description: "Conducts web searches and initial information gathering." },
        permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: false },
        environmentId: "research_database",
      }
    ]
  },
  sopLibrary: [
    {
      id: "competitor_analysis_sop",
      name: "Competitor Analysis Workflow",
      goal_type: "competitor analysis",
      description: "Standard procedure for researching and producing a competitor analysis report.",
      roles_involved: ["Research Lead", "Junior Researcher", "Data Analyst"],
      steps: [
        {
          task_id: "initial_web_research",
          description: "Conduct initial web research on the specified competitor, gathering public information, news, and financial statements.",
          assignee_role: "Junior Researcher",
          dependencies: []
        },
        {
          task_id: "analyze_gathered_data",
          description: "Analyze the data gathered from the web research, identify key strengths, weaknesses, opportunities, and threats (SWOT).",
          assignee_role: "Data Analyst",
          dependencies: ["initial_web_research"]
        },
        {
            task_id: "human_expert_review",
            description: "Ask a human expert to review the initial SWOT analysis for any missing context or subjective errors.",
            assignee_role: "Data Analyst",
            dependencies: ["analyze_gathered_data"]
        },
        {
          task_id: "compile_final_report",
          description: "Compile all findings and the human expert's feedback into a final, comprehensive competitor analysis report.",
          assignee_role: "Research Lead",
          dependencies: ["human_expert_review"]
        }
      ]
    }
  ]
};
