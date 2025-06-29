
import { OrgConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const adAgencyDemo: OrgConfig = {
  name: "Creative Ad Agency",
  llmConfig: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-preview-04-17',
  },
  environments: [
    {
      id: "campaign_brief",
      initialState: {
        concept: null,
        copy: null,
        visuals: []
      },
      tools: [
        'get_campaign_brief',
        'develop_ad_concept',
        'create_ad_copy',
        'design_visuals',
        'start_conversation' // Key tool for this demo
      ],
      permissions: {}
    }
  ],
  masterAgent: {
    id: uuidv4(),
    name: "Creative Director",
    role: { name: "Creative Director", description: "Leads brainstorming, defines the high-level vision, and approves final campaign assets." },
    permissions: { canDelegate: true, canAssignRole: false, canHire: false, canCallMeeting: true },
    environmentId: "campaign_brief",
    subordinates: [
      {
        id: uuidv4(),
        name: "Copywriter",
        role: { name: "Copywriter", description: "Writes compelling text for advertisements." },
        permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
        environmentId: "campaign_brief",
      },
      {
        id: uuidv4(),
        name: "Graphic Designer",
        role: { name: "Graphic Designer", description: "Creates visual elements, logos, and layouts for ads." },
        permissions: { canDelegate: false, canAssignRole: false, canHire: false, canCallMeeting: true },
        environmentId: "campaign_brief",
      }
    ]
  },
  // No SOP library for this demo, to encourage unstructured, conversational problem-solving.
  sopLibrary: [] 
};
